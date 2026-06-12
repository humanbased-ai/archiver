"""
M10. review 配额泛化 — 与 backend/test/quota-review.test.ts 1:1.
"""
from __future__ import annotations
from typing import Any

import pytest

from scheduler.db import as_system

from .helpers import (
    PREFIX,
    create_pipeline,
    delete_pipeline,
    get_item,
    post,
    req,
    unique_id,
)


_policy = {"timeoutMs": 30_000, "maxAttempts": 1, "baseBackoffMs": 1}


def _pipeline_with_review_quota(max_per_user: int) -> list[dict[str, Any]]:
    return [
        {"key": "ingest", "nodeKey": "ingest", "label": "采集",
         "params": {"source": "form"}, "policy": _policy},
        {"key": "review", "nodeKey": "review", "label": "审核",
         "params": {"rubric": "default", "max_total_per_user": max_per_user},
         "routes": {"on": "decision",
                    "cases": {"rejected": {"goto": "ingest", "maxLoops": 1}, "approved": "next"}},
         "policy": _policy},
        {"key": "store", "nodeKey": "export", "label": "入库",
         "params": {"format": "json"}, "policy": _policy},
    ]


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_m10_1_review_max_total_per_user_enforced(db_pool):
    task_id = await create_pipeline(_pipeline_with_review_quota(1), name=unique_id("m10-1"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 2})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_ids = [i["id"] for i in listing.body["items"]]

        for item_id in item_ids:
            await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
            await post(f"/api/collect/{item_id}/submit",
                       {"userId": "alice", "payload": {"content": "x"}})

        # bob 审第一条 → ok
        d1 = await get_item(item_ids[0])
        r1 = next(r for r in d1.body["inflight"]
                  if r["step_key"] == "review" and r["status"] == "pending")
        await post(f"{PREFIX}/queue/run/{r1['run_id']}/claim", {"workerId": "bob"})
        dec1 = await post(f"/api/review/{item_ids[0]}/decide",
                          {"userId": "bob", "batchId": batch_id, "decision": "approved"})
        assert dec1.status == 200, dec1.body

        # bob 审第二条 → 409 USER_QUOTA_FULL
        d2 = await get_item(item_ids[1])
        r2 = next(r for r in d2.body["inflight"]
                  if r["step_key"] == "review" and r["status"] == "pending")
        await post(f"{PREFIX}/queue/run/{r2['run_id']}/claim", {"workerId": "bob"})
        dec2 = await post(f"/api/review/{item_ids[1]}/decide",
                          {"userId": "bob", "batchId": batch_id, "decision": "approved"})
        assert dec2.status == 409, dec2.body
        assert dec2.body["error"]["code"] == "USER_QUOTA_FULL"

        # 模拟接管 lease: 直接改 outbox.leased_by (测试焦点是配额 per-user 独立)
        async def _takeover(conn):
            await conn.execute(
                "UPDATE outbox SET leased_by = 'charlie' WHERE run_id = $1::uuid",
                r2["run_id"],
            )
        await as_system(_takeover)

        dec3 = await post(f"/api/review/{item_ids[1]}/decide",
                          {"userId": "charlie", "batchId": batch_id, "decision": "approved"})
        assert dec3.status == 200, f"charlie 配额独立, got {dec3.body}"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m10_2_no_max_total_is_unlimited(db_pool):
    task_id = await create_pipeline(_pipeline_with_review_quota(0), name=unique_id("m10-2"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 2})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_ids = [i["id"] for i in listing.body["items"]]
        for item_id in item_ids:
            await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
            await post(f"/api/collect/{item_id}/submit",
                       {"userId": "alice", "payload": {"content": "x"}})
        for item_id in item_ids:
            d = await get_item(item_id)
            rr = next(r for r in d.body["inflight"]
                      if r["step_key"] == "review" and r["status"] == "pending")
            await post(f"{PREFIX}/queue/run/{rr['run_id']}/claim", {"workerId": "bob"})
            dec = await post(f"/api/review/{item_id}/decide",
                             {"userId": "bob", "batchId": batch_id, "decision": "approved"})
            assert dec.status == 200, f"{item_id}: {dec.body}"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m10_3_review_decide_requires_lease_ownership(db_pool):
    task_id = await create_pipeline(_pipeline_with_review_quota(0), name=unique_id("m10-3"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit",
                   {"userId": "alice", "payload": {"content": "x"}})

        d = await get_item(item_id)
        r = next(x for x in d.body["inflight"]
                 if x["step_key"] == "review" and x["status"] == "pending")
        await post(f"{PREFIX}/queue/run/{r['run_id']}/claim", {"workerId": "bob"})

        # dave 没认领, decide → 403 NOT_LEASE_OWNER
        dec = await post(f"/api/review/{item_id}/decide",
                         {"userId": "dave", "batchId": batch_id, "decision": "approved"})
        assert dec.status == 403, f"期望 403, 实际 {dec.status}: {dec.body}"
        assert dec.body["error"]["code"] == "NOT_LEASE_OWNER"

        # bob (lease 持有者) decide → 200
        dec_bob = await post(f"/api/review/{item_id}/decide",
                             {"userId": "bob", "batchId": batch_id, "decision": "approved"})
        assert dec_bob.status == 200, dec_bob.body
    finally:
        await delete_pipeline(task_id)
