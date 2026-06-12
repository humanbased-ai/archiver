"""
M1. batch close 生命周期 — 与 backend/test/batch-lifecycle.test.ts 1:1.
"""
from __future__ import annotations
from typing import Any

import pytest

from scheduler.db import as_system

from .helpers import (
    create_pipeline,
    delete_pipeline,
    post,
    req,
    unique_id,
)


_policy = {"timeoutMs": 30_000, "maxAttempts": 1, "baseBackoffMs": 1}


def _collect_review_steps() -> list[dict[str, Any]]:
    return [
        {"key": "ingest", "nodeKey": "ingest", "label": "采集",
         "params": {"source": "form"}, "policy": _policy},
        {"key": "review", "nodeKey": "review", "label": "审核",
         "params": {"rubric": "default"},
         "routes": {"on": "decision",
                    "cases": {"rejected": {"goto": "ingest", "maxLoops": 1}, "approved": "next"}},
         "policy": _policy},
        {"key": "store", "nodeKey": "export", "label": "入库",
         "params": {"format": "json"}, "policy": _policy},
    ]


async def _create_batch(task_id: str, target: int = 2) -> str:
    r = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b1"), "target": target})
    if r.status != 200:
        raise AssertionError(f"create batch failed: {r.body}")
    return r.body["batchId"]


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_m1_1_close_returns_archived_and_counts(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-1"))
    try:
        batch_id = await _create_batch(task_id, target=3)
        r = await post(f"/api/batches/{batch_id}/close",
                       {"reason": "业务提前结束", "operatorId": "admin-001"})
        assert r.status == 200, r.body
        assert r.body["status"] == "archived"
        assert r.body["cancelledItems"] == 3
        assert r.body["cancelledOutbox"] == 3
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_2_collect_claim_after_close_returns_batch_closed(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-2"))
    try:
        batch_id = await _create_batch(task_id, target=1)
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/batches/{batch_id}/close", {"reason": "测试"})
        claim = await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        assert claim.status == 409
        assert claim.body["error"]["code"] == "BATCH_CLOSED"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_4_close_releases_claimed_submissions(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-4"))
    try:
        batch_id = await _create_batch(task_id, target=1)
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        claim = await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        assert claim.status == 200
        close = await post(f"/api/batches/{batch_id}/close", {"reason": "中途停"})
        assert close.status == 200
        assert close.body["releasedSubmissions"] == 1, "claimed 提交应被释放回 returned"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_5_double_close_returns_already_closed(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-5"))
    try:
        batch_id = await _create_batch(task_id, target=1)
        r1 = await post(f"/api/batches/{batch_id}/close", {"reason": "first"})
        assert r1.status == 200
        r2 = await post(f"/api/batches/{batch_id}/close", {"reason": "second"})
        assert r2.status == 409
        assert r2.body["error"]["code"] == "BATCH_ALREADY_CLOSED"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_6_closed_batch_resume_returns_404(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-6"))
    try:
        batch_id = await _create_batch(task_id, target=1)
        await post(f"/api/batches/{batch_id}/close", {"reason": "test"})
        resume = await post(f"/api/batches/{batch_id}/resume", {})
        assert resume.status == 404, "archived 不属于 paused, resume 应 404"
        assert resume.body["error"]["code"] == "NOT_FOUND_OR_NOT_PAUSED"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_7_close_without_reason_returns_400(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-7"))
    try:
        batch_id = await _create_batch(task_id, target=1)
        r = await post(f"/api/batches/{batch_id}/close", {})
        assert r.status == 400
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_8_close_does_not_touch_done_items(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-8"))
    try:
        batch_id = await _create_batch(task_id, target=2)
        close = await post(f"/api/batches/{batch_id}/close", {"reason": "test"})
        assert close.body["cancelledItems"] == 2
        close2 = await post(f"/api/batches/{batch_id}/close", {"reason": "again"})
        assert close2.status == 409
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_9_close_also_fails_leased_outbox(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("m1-9"))
    try:
        batch_id = await _create_batch(task_id, target=1)

        async def _read_item(conn):
            return await conn.fetchrow(
                "SELECT item_id FROM batch_items WHERE batch_id = $1::uuid LIMIT 1",
                batch_id,
            )
        item = await as_system(_read_item)

        async def _fake_lease(conn):
            await conn.execute(
                """UPDATE outbox SET status = 'leased', leased_by = 'fake-worker',
                       leased_at = NOW(), expected_by = NOW() + INTERVAL '30 seconds'
                     WHERE item_id = $1::uuid AND status = 'pending'""",
                item["item_id"],
            )
        await as_system(_fake_lease)

        close = await post(f"/api/batches/{batch_id}/close", {"reason": "leased outbox 测试"})
        assert close.status == 200
        assert close.body["cancelledOutbox"] == 1, "close 应把 leased outbox 一并 fail"

        async def _read_status(conn):
            return await conn.fetchrow(
                "SELECT status FROM outbox WHERE item_id = $1::uuid",
                item["item_id"],
            )
        status_row = await as_system(_read_status)
        assert status_row["status"] == "failed", \
            "leased outbox 行 close 后必须是 failed, 否则 reconciler 会复活它"
    finally:
        await delete_pipeline(task_id)
