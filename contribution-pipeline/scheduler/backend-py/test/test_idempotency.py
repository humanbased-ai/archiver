"""
M5. Idempotency-Key 契约 — 与 backend/test/idempotency.test.ts 1:1.
"""
from __future__ import annotations
import asyncio
from typing import Any

import pytest

from .helpers import (
    create_pipeline,
    delete_pipeline,
    post,
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


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_m5_1_same_key_same_body_replays(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("idem-1"))
    try:
        key = unique_id("k1")
        body = {"pipelineId": task_id, "name": unique_id("b"), "target": 2}
        r1 = await post("/api/batches", body, {"idempotency-key": key})
        r2 = await post("/api/batches", body, {"idempotency-key": key})
        assert r1.status == 200, r1.body
        assert r2.status == 200, r2.body
        assert r1.body["batchId"] == r2.body["batchId"], "同 key 同 body 必须返回同一 batchId"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m5_2_same_key_different_body_returns_hash_mismatch(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("idem-2"))
    try:
        key = unique_id("k2")
        r1 = await post("/api/batches",
                        {"pipelineId": task_id, "name": unique_id("b-a"), "target": 1},
                        {"idempotency-key": key})
        assert r1.status == 200, r1.body
        r2 = await post("/api/batches",
                        {"pipelineId": task_id, "name": unique_id("b-b"), "target": 1},
                        {"idempotency-key": key})
        assert r2.status == 409, r2.body
        assert r2.body["error"]["code"] == "IDEMPOTENCY_HASH_MISMATCH"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m5_3_different_scope_same_key_does_not_collide(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("idem-3"))
    try:
        key = unique_id("k3")
        r1 = await post("/api/batches",
                        {"pipelineId": task_id, "name": unique_id("b"), "target": 1},
                        {"idempotency-key": key})
        assert r1.status == 200
        r2 = await post("/api/v1/pipelines/create",
                        {"name": unique_id("p"), "steps": _build_pipeline_steps()},
                        {"idempotency-key": key})
        assert r2.status != 409, f"不同 scope 用同 key 不应触发 hash mismatch, got {r2.status} {r2.body}"
        if r2.status == 200 and r2.body and "task_id" in r2.body:
            await delete_pipeline(r2.body["task_id"])
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m5_4_short_key_returns_400(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("idem-4"))
    try:
        r = await post("/api/batches",
                       {"pipelineId": task_id, "name": unique_id("b"), "target": 1},
                       {"idempotency-key": "abc"})
        assert r.status == 400, r.body
        assert r.body["error"]["code"] == "BAD_IDEMPOTENCY_KEY"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m5_5_no_key_falls_through_to_handler(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("idem-5"))
    try:
        body = {"pipelineId": task_id, "name": unique_id("b"), "target": 1}
        r1 = await post("/api/batches", body)
        r2 = await post("/api/batches", {**body, "name": unique_id("b2")})
        assert r1.body["batchId"] != r2.body["batchId"], "不带 key 必须每次创建新 batch"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m5_6_concurrent_same_key_serializes(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("idem-6"))
    try:
        key = unique_id("k6")
        body = {"pipelineId": task_id, "name": unique_id("b"), "target": 1}
        results = await asyncio.gather(
            *(post("/api/batches", body, {"idempotency-key": key}) for _ in range(5))
        )
        ok = [r for r in results if r.status == 200]
        in_progress = [
            r for r in results
            if r.status == 409 and (r.body or {}).get("error", {}).get("code") == "IDEMPOTENCY_IN_PROGRESS"
        ]
        statuses = [r.status for r in results]
        assert len(ok) >= 1, f"至少 1 个 200, got {statuses}"
        assert len(ok) + len(in_progress) == 5, "其余必须是 IDEMPOTENCY_IN_PROGRESS, 不能 fall-through 创建"
        batch_ids = {r.body["batchId"] for r in ok}
        assert len(batch_ids) == 1, f"仅一个 batchId, got {batch_ids}"
    finally:
        await delete_pipeline(task_id)
