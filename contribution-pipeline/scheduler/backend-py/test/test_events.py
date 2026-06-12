"""
M9: events 表 + GET /api/v1/events 轮询 — 与 backend/test/events.test.ts 1:1.
"""
from __future__ import annotations
import asyncio
import time
from typing import Any

import pytest

from .helpers import (
    PREFIX,
    create_pipeline,
    delete_pipeline,
    get,
    get_item,
    post,
    req,
    sleep,
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


async def _wait_for_events(query: str, min_count: int = 1, timeout_ms: int = 2000) -> list[dict[str, Any]]:
    start = time.time()
    while (time.time() - start) * 1000 < timeout_ms:
        r = await get(f"{PREFIX}/events?{query}")
        events = (r.body or {}).get("events") or []
        if len(events) >= min_count:
            return events
        await asyncio.sleep(0.05)
    return []


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_m9_1_batch_created_emits_event(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("ev1"))
    try:
        r = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = r.body["batchId"]
        events = await _wait_for_events(
            f"resource_kind=batch&resource_id={batch_id}&kind=batch.created"
        )
        assert len(events) == 1, events
        assert events[0]["kind"] == "batch.created"
        assert events[0]["resource_id"] == batch_id
        assert events[0]["payload"]["target"] == 1
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m9_2_pause_resume_close_emit_events(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("ev2"))
    try:
        r = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = r.body["batchId"]
        await post(f"/api/batches/{batch_id}/pause", {})
        await post(f"/api/batches/{batch_id}/resume", {})
        await post(f"/api/batches/{batch_id}/close", {"reason": "test-close"})
        events = await _wait_for_events(f"resource_kind=batch&resource_id={batch_id}", min_count=4)
        kinds = [e["kind"] for e in events]
        assert "batch.created" in kinds
        assert "batch.paused" in kinds
        assert "batch.resumed" in kinds
        assert "batch.closed" in kinds
        close_ev = next(e for e in events if e["kind"] == "batch.closed")
        assert close_ev["payload"]["reason"] == "test-close"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m9_3_item_reviewed_event_contains_decision_user(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("ev3"))
    try:
        r = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = r.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit",
                   {"userId": "alice", "payload": {"content": "x"}})

        detail = await get_item(item_id)
        review_run = next(x for x in detail.body["inflight"] if x["step_key"] == "review")
        await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim", {"workerId": "bob"})
        await post(f"/api/review/{item_id}/decide",
                   {"userId": "bob", "batchId": batch_id, "decision": "approved"})

        events = await _wait_for_events(
            f"resource_kind=item&resource_id={item_id}&kind=item.reviewed"
        )
        assert len(events) == 1
        assert events[0]["payload"]["decision"] == "approved"
        assert events[0]["payload"]["userId"] == "bob"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m9_4_since_returns_incremental_events_with_monotonic_lastid(db_pool):
    task_id = await create_pipeline(_build_pipeline_steps(), name=unique_id("ev4"))
    try:
        r = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = r.body["batchId"]
        evs1 = await _wait_for_events(f"resource_kind=batch&resource_id={batch_id}", min_count=1)
        assert len(evs1) >= 1
        after1 = evs1[-1]["id"]

        await post(f"/api/batches/{batch_id}/pause", {})
        await sleep(150)
        r2 = await get(
            f"{PREFIX}/events?resource_kind=batch&resource_id={batch_id}&since={after1}"
        )
        evs2 = r2.body["events"]
        assert len(evs2) >= 1
        assert all(int(e["id"]) > int(after1) for e in evs2), f"所有 id 必须 > since={after1}"
        assert r2.body["lastId"] == evs2[-1]["id"]
    finally:
        await delete_pipeline(task_id)
