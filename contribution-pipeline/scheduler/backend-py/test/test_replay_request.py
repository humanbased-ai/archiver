"""
M8. stuck item 用户侧重放申请 — 与 backend/test/replay-request.test.ts 1:1.
"""
from __future__ import annotations
from typing import Any

import pytest

from .helpers import (
    PREFIX,
    claim_item,
    create_pipeline,
    delete_pipeline,
    get,
    get_item,
    post,
    post_result,
    req,
    unique_id,
)


_policy = {"timeoutMs": 30_000, "maxAttempts": 1, "baseBackoffMs": 1}


def _build_pipeline_steps() -> list[dict[str, Any]]:
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


async def _setup_stuck_item(label: str) -> tuple[str, str, str]:
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id(label))
    b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
    batch_id = b_res.body["batchId"]
    listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
    item_id = listing.body["items"][0]["id"]

    job = await claim_item(item_id, f"w-{label}")
    await post_result({
        "runId": job["runId"], "status": "failed",
        "error": {"code": "BAD_INPUT", "message": "test stuck", "retryable": False},
    })
    detail = await get_item(item_id)
    assert detail.body["item"]["current_step"] == "stuck", "fixture 应进 stuck"
    return task_id, item_id, batch_id


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_m8_1_stuck_item_replay_request_returns_200(db_pool):
    task_id, item_id, _ = await _setup_stuck_item("m8-1")
    try:
        r = await post(f"/api/items/{item_id}/replay-request",
                       {"userId": "user-x", "reason": "我看 30 分钟了还卡着"})
        assert r.status == 200, r.body
        assert r.body["requestId"]
        assert r.body["replayed"] is False
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m8_2_non_stuck_item_returns_409_item_not_stuck(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("m8-2"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={b_res.body['batchId']}")
        item_id = listing.body["items"][0]["id"]
        r = await post(f"/api/items/{item_id}/replay-request", {"userId": "user-x"})
        assert r.status == 409, r.body
        assert r.body["error"]["code"] == "ITEM_NOT_STUCK"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m8_3_duplicate_request_idempotent(db_pool):
    task_id, item_id, _ = await _setup_stuck_item("m8-3")
    try:
        r1 = await post(f"/api/items/{item_id}/replay-request",
                        {"userId": "user-x", "reason": "first"})
        r2 = await post(f"/api/items/{item_id}/replay-request",
                        {"userId": "user-y", "reason": "second (会被忽略)"})
        assert r1.body["requestId"] == r2.body["requestId"], "幂等返同一 id"
        assert r1.body["replayed"] is False
        assert r2.body["replayed"] is True
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m8_4_admin_replay_marks_request_resolved(db_pool):
    task_id, item_id, _ = await _setup_stuck_item("m8-4")
    try:
        await post(f"/api/items/{item_id}/replay-request",
                   {"userId": "user-x", "reason": "stuck"})
        replay = await post(f"{PREFIX}/admin/items/{item_id}/replay", {"stepKey": "ingest"})
        assert replay.status == 200, replay.body
        r2 = await post(f"/api/items/{item_id}/replay-request", {"userId": "user-y"})
        assert r2.status == 409, "replay 后 item=ingest, 不能再申请"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m8_5_admin_stuck_includes_replay_request(db_pool):
    task_id, item_id, _ = await _setup_stuck_item("m8-5")
    try:
        await post(f"/api/items/{item_id}/replay-request",
                   {"userId": "user-x", "reason": "user-reason-X"})
        r = await get(f"{PREFIX}/admin/stuck")
        found = next((it for it in r.body["items"] if it["id"] == item_id), None)
        assert found is not None, f"/admin/stuck 应含 {item_id}"
        assert found.get("replay_request") is not None, "应附 replay_request 字段"
        assert found["replay_request"]["status"] == "pending"
        assert found["replay_request"]["requester"] == "user-x"
    finally:
        await delete_pipeline(task_id)
