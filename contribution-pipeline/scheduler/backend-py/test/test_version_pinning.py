"""
M2. pipeline_version pinned 口径 — 与 backend/test/version-pinning.test.ts 1:1.
"""
from __future__ import annotations
from typing import Any

import pytest

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


def _collect_review_steps(review_params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    rp = {"rubric": "default", **(review_params or {})}
    return [
        {"key": "ingest", "nodeKey": "ingest", "label": "采集",
         "params": {"source": "form"}, "policy": _policy},
        {"key": "review", "nodeKey": "review", "label": "审核",
         "params": rp,
         "routes": {"on": "decision",
                    "cases": {"rejected": {"goto": "ingest", "maxLoops": 1}, "approved": "next"}},
         "policy": _policy},
        {"key": "store", "nodeKey": "export", "label": "入库",
         "params": {"format": "json"}, "policy": _policy},
    ]


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_m2_1_old_batch_uses_pinned_v1(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("pin-v1"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b-v1"), "target": 1})
        assert b_res.status == 200
        batch_id = b_res.body["batchId"]

        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        assert len(listing.body["items"]) == 1
        item_id = listing.body["items"][0]["id"]
        assert (await post(f"/api/collect/{item_id}/claim",
                           {"userId": "alice", "batchId": batch_id})).status == 200
        assert (await post(f"/api/collect/{item_id}/submit",
                           {"userId": "alice", "payload": {"content": "x"}})).status == 200

        # save 加 disallowSelfReview → v2
        save_res = await post(f"{PREFIX}/pipelines/{task_id}/save",
                              {"steps": _collect_review_steps(
                                  {"disallowSelfReview": True, "reviewedStepKey": "ingest"})})
        assert save_res.status == 200, save_res.body

        # alice 自审 batch_v1 → 应通过 (pinned 在 v1, v1 没禁)
        detail = await get_item(item_id)
        review_run = next(r for r in detail.body["inflight"] if r["step_key"] == "review")
        claim_review = await post(
            f"{PREFIX}/queue/run/{review_run['run_id']}/claim",
            {"workerId": "alice", "leaseSeconds": 60},
        )
        assert claim_review.status == 200
        decide = await post(f"/api/review/{item_id}/decide",
                            {"userId": "alice", "batchId": batch_id, "decision": "approved"})
        assert decide.status == 200, f"M2 fix: 老 batch 应按 pinned v1 通过, got {decide.body}"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m2_2_new_batch_uses_pinned_v2_no_disallowed(db_pool):
    task_id = await create_pipeline(
        _collect_review_steps({"disallowSelfReview": True, "reviewedStepKey": "ingest"}),
        name=unique_id("pin2-v1"),
    )
    try:
        save_res = await post(f"{PREFIX}/pipelines/{task_id}/save",
                              {"steps": _collect_review_steps()})
        assert save_res.status == 200

        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b-v2"), "target": 1})
        assert b_res.status == 200
        batch_id = b_res.body["batchId"]

        user_id = unique_id("pin2-user")
        listing = await req("GET", f"/api/work/collect-tasks?userId={user_id}&batchId={batch_id}")
        assert len(listing.body["items"]) == 1, listing.body
        item_id = listing.body["items"][0]["id"]
        claim_r = await post(f"/api/collect/{item_id}/claim", {"userId": user_id, "batchId": batch_id})
        assert claim_r.status == 200, claim_r.body
        submit_r = await post(f"/api/collect/{item_id}/submit",
                              {"userId": user_id, "payload": {"content": "x"}})
        assert submit_r.status == 200, submit_r.body

        detail = await get_item(item_id)
        review_run = next(r for r in detail.body["inflight"] if r["step_key"] == "review")
        await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim",
                   {"workerId": user_id, "leaseSeconds": 60})
        decide = await post(f"/api/review/{item_id}/decide",
                            {"userId": user_id, "batchId": batch_id, "decision": "approved"})
        assert decide.status == 200, decide.body
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_m2_3_batches_pipeline_version_id_pinned_on_create(db_pool):
    task_id = await create_pipeline(_collect_review_steps(), name=unique_id("pin3"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b3"), "target": 1})
        assert b_res.status == 200
        batch_id = b_res.body["batchId"]
        det = await req("GET", f"/api/batches/{batch_id}")
        assert det.status == 200
        assert det.body.get("pipeline_version_id"), \
            f"batch 创建时应钉死 pipeline_version_id, got {det.body}"
    finally:
        await delete_pipeline(task_id)
