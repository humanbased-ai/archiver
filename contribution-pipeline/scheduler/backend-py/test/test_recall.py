"""
M6. dataset 召回 (admin recall) — 与 backend/test/recall.test.ts 1:1.
"""
from __future__ import annotations
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


def _pipeline_steps() -> list[dict[str, Any]]:
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


async def _setup_done_item(label: str) -> tuple[str, str, str]:
    collector = unique_id(f"{label}-c")
    reviewer = unique_id(f"{label}-r")
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id(label))
    b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
    batch_id = b_res.body["batchId"]
    listing = await req("GET", f"/api/work/collect-tasks?userId={collector}&batchId={batch_id}")
    item_id = listing.body["items"][0]["id"]
    claim_r = await post(f"/api/collect/{item_id}/claim", {"userId": collector, "batchId": batch_id})
    if claim_r.status != 200:
        raise AssertionError(f"setup_done_item claim: {claim_r.body}")
    submit_r = await post(f"/api/collect/{item_id}/submit",
                          {"userId": collector, "payload": {"content": "x"}})
    if submit_r.status != 200:
        raise AssertionError(f"setup_done_item submit: {submit_r.body}")

    detail = await get_item(item_id)
    review_run = next((r for r in detail.body["inflight"] if r["step_key"] == "review"), None)
    if not review_run:
        raise AssertionError(f"setup_done_item no review run: {detail.body['inflight']}")
    await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim", {"workerId": reviewer})
    decide_r = await post(f"/api/review/{item_id}/decide",
                          {"userId": reviewer, "batchId": batch_id, "decision": "approved"})
    if decide_r.status != 200:
        raise AssertionError(f"setup_done_item decide: {decide_r.body}")

    # 等 autoworker 跑完 store → done
    for _ in range(30):
        d = await get_item(item_id)
        if d.body["item"]["current_step"] == "done":
            return task_id, item_id, batch_id
        await sleep(500)
    raise AssertionError(f"item {item_id} 未在 15s 内进 done 态")


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_m6_1_done_item_recall_returns_to_target_step(db_pool):
    task_id, item_id, _ = await _setup_done_item("m6-1")
    try:
        ds1 = await get(f"{PREFIX}/tasks/{task_id}/records")
        assert len(ds1.body["records"]) == 1

        r = await post(f"{PREFIX}/admin/items/{item_id}/recall",
                       {"reason": "字段错位需要重做", "targetStep": "ingest", "operatorId": "ops-001"})
        assert r.status == 200, r.body
        assert r.body["recalledRecords"] == 1
        assert r.body["newStep"] == "ingest"

        detail = await get_item(item_id)
        assert detail.body["item"]["current_step"] == "ingest"
        pending = [x for x in detail.body["inflight"]
                   if x["status"] == "pending" and x["step_key"] == "ingest"]
        assert len(pending) >= 1, "应有新 pending ingest run"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m6_2_redo_after_recall_adds_active_keeps_recalled(db_pool):
    task_id, item_id, batch_id = await _setup_done_item("m6-2")
    redoer = unique_id("m6-2-redo")
    reviewer = unique_id("m6-2-rv2")
    try:
        await post(f"{PREFIX}/admin/items/{item_id}/recall",
                   {"reason": "重做", "targetStep": "ingest"})
        c = await post(f"/api/collect/{item_id}/claim", {"userId": redoer, "batchId": batch_id})
        assert c.status == 200, c.body
        await post(f"/api/collect/{item_id}/submit",
                   {"userId": redoer, "payload": {"content": "redo"}})

        d = await get_item(item_id)
        review_run = next((r for r in d.body["inflight"]
                           if r["step_key"] == "review" and r["status"] == "pending"), None)
        assert review_run, "review 重新就绪"
        await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim", {"workerId": reviewer})
        await post(f"/api/review/{item_id}/decide",
                   {"userId": reviewer, "batchId": batch_id, "decision": "approved"})

        for _ in range(30):
            dd = await get_item(item_id)
            if dd.body["item"]["current_step"] == "done":
                break
            await sleep(500)

        ds = await get(f"{PREFIX}/tasks/{task_id}/records?status=all")
        active = [r for r in ds.body["records"] if r.get("status") == "active"]
        recalled = [r for r in ds.body["records"] if r.get("status") == "recalled"]
        assert len(active) == 1, f"应仅 1 条 active, got {ds.body['records']}"
        assert len(recalled) == 1

        ds_default = await get(f"{PREFIX}/tasks/{task_id}/records")
        assert len(ds_default.body["records"]) == 1, "默认只返 active"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m6_3_non_done_item_returns_not_recallable(db_pool):
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("m6-3"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        listing = await req(
            "GET",
            f"/api/work/collect-tasks?userId={unique_id('m6-3-c')}&batchId={b_res.body['batchId']}",
        )
        item_id = listing.body["items"][0]["id"]
        r = await post(f"{PREFIX}/admin/items/{item_id}/recall",
                       {"reason": "test", "targetStep": "ingest"})
        assert r.status == 409
        assert r.body["error"]["code"] == "ITEM_NOT_RECALLABLE"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m6_4_missing_reason_returns_400(db_pool):
    task_id, item_id, _ = await _setup_done_item("m6-4")
    try:
        r = await post(f"{PREFIX}/admin/items/{item_id}/recall",
                       {"targetStep": "ingest"})
        assert r.status == 400
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m6_5_invalid_target_step_returns_400(db_pool):
    task_id, item_id, _ = await _setup_done_item("m6-5")
    try:
        r = await post(f"{PREFIX}/admin/items/{item_id}/recall",
                       {"reason": "test", "targetStep": "no-such-step"})
        assert r.status == 400
        assert r.body["error"]["code"] == "INVALID_STEP"
    finally:
        await delete_pipeline(task_id)
