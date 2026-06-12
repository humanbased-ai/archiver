"""
V1. 端到端主线 (M4) — 与 backend/test/e2e-mixed.test.ts 1:1.
target=5 → alice 提交 5 → bob 审 (3 approved + 2 rejected) → loopback → charlie 重做 → dataset=5.
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
         "params": {"source": "form", "disallowedFromSteps": ["review"]},
         "policy": _policy},
        {"key": "review", "nodeKey": "review", "label": "审核",
         "params": {"rubric": "default", "reviewedStepKey": "ingest",
                    "disallowedFromSteps": ["ingest"]},
         "routes": {"on": "decision",
                    "cases": {"rejected": {"goto": "ingest", "maxLoops": 2}, "approved": "next"}},
         "policy": _policy},
        {"key": "store", "nodeKey": "export", "label": "入库",
         "params": {"format": "json"}, "policy": _policy},
    ]


async def _reviewer_decide(item_id: str, reviewer: str, batch_id: str,
                           decision: str, reason: str | None = None):
    detail = await get_item(item_id)
    review_run = next((r for r in detail.body["inflight"]
                       if r["step_key"] == "review" and r["status"] == "pending"), None)
    assert review_run, f"no pending review run for {item_id}: {detail.body['inflight']}"
    claim = await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim",
                       {"workerId": reviewer, "leaseSeconds": 60})
    assert claim.status == 200, claim.body
    body = {"userId": reviewer, "batchId": batch_id, "decision": decision}
    if reason is not None:
        body["reason"] = reason
    return await post(f"/api/review/{item_id}/decide", body)


@pytest.mark.asyncio(loop_scope="session")
async def test_v1_end_to_end_5_items_with_loopback(db_pool):
    target = 5
    alice = unique_id("alice")
    bob = unique_id("bob")
    charlie = unique_id("charlie")

    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("v1-pipe"))
    try:
        b_res = await post("/api/batches",
                           {"pipelineId": task_id, "name": unique_id("v1-batch"), "target": target})
        assert b_res.status == 200, b_res.body
        batch_id = b_res.body["batchId"]
        assert b_res.body["target"] == target

        list1 = await req("GET", f"/api/work/collect-tasks?userId={alice}&batchId={batch_id}")
        assert len(list1.body["items"]) == target
        item_ids = [i["id"] for i in list1.body["items"]]

        async def _claim_with_retry(item_id: str):
            transient = {"NO_PENDING_RUN", "ALREADY_CLAIMED"}
            for _ in range(12):
                r = await post(f"/api/collect/{item_id}/claim", {"userId": alice, "batchId": batch_id})
                if r.status == 200:
                    return r
                if r.status == 409 and (r.body or {}).get("error", {}).get("code") in transient:
                    await sleep(150); continue
                return r
            return await post(f"/api/collect/{item_id}/claim", {"userId": alice, "batchId": batch_id})

        for item_id in item_ids:
            c = await _claim_with_retry(item_id)
            assert c.status == 200, f"alice claim {item_id}: {c.body}"
            s = await post(f"/api/collect/{item_id}/submit",
                           {"userId": alice, "payload": {"content": f"alice-content-{item_id[:8]}"}})
            assert s.status == 200, f"alice submit {item_id}: {s.body}"
            assert s.body["nextStep"] == "review"

        approved_items = item_ids[:3]
        rejected_items = item_ids[3:]
        for item_id in approved_items:
            r = await _reviewer_decide(item_id, bob, batch_id, "approved")
            assert r.status == 200, f"bob approve {item_id}: {r.body}"
        for item_id in rejected_items:
            r = await _reviewer_decide(item_id, bob, batch_id, "rejected", "退回-需要补充")
            assert r.status == 200, f"bob reject {item_id}: {r.body}"

        for item_id in rejected_items:
            d = await get_item(item_id)
            assert d.body["item"]["current_step"] == "ingest", \
                f"{item_id} 应回 ingest, got {d.body['item']['current_step']}"

        list_charlie = await req("GET", f"/api/work/collect-tasks?userId={charlie}&batchId={batch_id}")
        charlie_ids = {i["id"] for i in list_charlie.body["items"]}
        for item_id in rejected_items:
            assert item_id in charlie_ids, f"charlie 应见到 rejected {item_id}"

        list_bob = await req("GET", f"/api/work/collect-tasks?userId={bob}&batchId={batch_id}")
        bob_ids = {i["id"] for i in list_bob.body["items"]}
        for item_id in rejected_items:
            assert item_id not in bob_ids, \
                f"bob 在 review 做过, disallowedFromSteps 应过滤掉 {item_id}"

        bob_claim = await post(f"/api/collect/{rejected_items[0]}/claim",
                               {"userId": bob, "batchId": batch_id})
        assert bob_claim.status == 403
        assert bob_claim.body["error"]["code"] == "STEP_OPERATOR_CONFLICT"

        for item_id in rejected_items:
            c = await post(f"/api/collect/{item_id}/claim", {"userId": charlie, "batchId": batch_id})
            assert c.status == 200, f"charlie claim: {c.body}"
            s = await post(f"/api/collect/{item_id}/submit",
                           {"userId": charlie, "payload": {"content": f"charlie-redo-{item_id[:8]}"}})
            assert s.status == 200, f"charlie submit: {s.body}"

        for item_id in rejected_items:
            r = await _reviewer_decide(item_id, bob, batch_id, "approved")
            assert r.status == 200, f"bob 二审 {item_id}: {r.body}"

        approved = 0
        for _ in range(30):
            d = await get(f"/api/batches/{batch_id}")
            approved = d.body.get("approved", 0)
            if approved >= target:
                break
            await sleep(500)
        assert approved == target, f"batch.approved 应={target}, got {approved}"

        ds = await get(f"{PREFIX}/tasks/{task_id}/records")
        assert len(ds.body["records"]) == target

        audit = await get(f"{PREFIX}/admin/audit?entityKind=batch&entityId={batch_id}")
        audit_list = audit.body.get("rows") or audit.body.get("entries") or []
        actions = {a["action"] for a in audit_list}
        assert "batch.create" in actions, f"audit 应含 batch.create, got {actions}"
    finally:
        await delete_pipeline(task_id)
