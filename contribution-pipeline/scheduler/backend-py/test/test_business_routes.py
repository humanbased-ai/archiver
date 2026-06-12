"""
BR. business 主流程薄弱点回归 — 与 backend/test/business-routes.test.ts 1:1.

release / redo / collect/state / review/tasks / my-submissions (含读侧自愈) / ALREADY_CLAIMING 优先于配额.
"""
from __future__ import annotations
import re
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


async def _setup_claimed_item(label: str) -> tuple[str, str, str, str]:
    user_id = unique_id(f"{label}-u")
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id(label))
    b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
    batch_id = b_res.body["batchId"]
    listing = await req("GET", f"/api/work/collect-tasks?userId={user_id}&batchId={batch_id}")
    item_id = listing.body["items"][0]["id"]
    c = await post(f"/api/collect/{item_id}/claim", {"userId": user_id, "batchId": batch_id})
    if c.status != 200:
        raise AssertionError(f"setup claim: {c.body}")
    return task_id, batch_id, item_id, user_id


# ── release ────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_br_1_release_allows_others_to_claim(db_pool):
    task_id, batch_id, item_id, user_id = await _setup_claimed_item("br-1")
    try:
        r = await post(f"/api/collect/{item_id}/release", {"userId": user_id})
        assert r.status == 200, r.body
        other = unique_id("br-1-other")
        c2 = await post(f"/api/collect/{item_id}/claim", {"userId": other, "batchId": batch_id})
        assert c2.status == 200, f"release 后他人应能 claim, got {c2.body}"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_br_2_release_without_claim_returns_404(db_pool):
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("br-2"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        listing = await req(
            "GET",
            f"/api/work/collect-tasks?userId={unique_id('br-2-c')}&batchId={b_res.body['batchId']}",
        )
        item_id = listing.body["items"][0]["id"]
        r = await post(f"/api/collect/{item_id}/release", {"userId": unique_id("br-2-other")})
        assert r.status == 404
    finally:
        await delete_pipeline(task_id)


# ── redo ───────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_br_3_redo_deletes_rejected_submission(db_pool):
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("br-3"))
    user_id = unique_id("br-3-u")
    reviewer = unique_id("br-3-r")
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId={user_id}&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": user_id, "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit",
                   {"userId": user_id, "payload": {"content": "x"}})
        detail = await get_item(item_id)
        rr = next(r for r in detail.body["inflight"]
                  if r["step_key"] == "review" and r["status"] == "pending")
        await post(f"{PREFIX}/queue/run/{rr['run_id']}/claim", {"workerId": reviewer})
        await post(f"/api/review/{item_id}/decide",
                   {"userId": reviewer, "batchId": batch_id, "decision": "rejected", "reason": "测试退回"})
        redo = await post(f"/api/collect/{item_id}/redo", {"userId": user_id})
        assert redo.status == 200, redo.body
        assert redo.body["removed"] == 1
        redo2 = await post(f"/api/collect/{item_id}/redo", {"userId": user_id})
        assert redo2.status == 404
        assert redo2.body["error"]["code"] == "NO_FAILED_SUBMISSION"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_br_4_redo_does_not_touch_claimed(db_pool):
    task_id, _, item_id, user_id = await _setup_claimed_item("br-4")
    try:
        redo = await post(f"/api/collect/{item_id}/redo", {"userId": user_id})
        assert redo.status == 404
        s = await post(f"/api/collect/{item_id}/submit",
                       {"userId": user_id, "payload": {"content": "still claimed"}})
        assert s.status == 200, f"redo 不该影响 claimed, got {s.body}"
    finally:
        await delete_pipeline(task_id)


# ── collect/state ──────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_br_5_collect_state_returns_null_then_rejected(db_pool):
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("br-5"))
    user_id = unique_id("br-5-u")
    reviewer = unique_id("br-5-r")
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId={user_id}&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]

        s0 = await get(f"/api/collect/{item_id}/state?userId={user_id}")
        assert s0.body["my_last_result"] is None
        assert s0.body["my_last_reason"] is None

        await post(f"/api/collect/{item_id}/claim", {"userId": user_id, "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit",
                   {"userId": user_id, "payload": {"content": "x"}})
        detail = await get_item(item_id)
        rr = next(r for r in detail.body["inflight"]
                  if r["step_key"] == "review" and r["status"] == "pending")
        await post(f"{PREFIX}/queue/run/{rr['run_id']}/claim", {"workerId": reviewer})
        await post(f"/api/review/{item_id}/decide",
                   {"userId": reviewer, "batchId": batch_id, "decision": "rejected", "reason": "缺细节"})

        s1 = await get(f"/api/collect/{item_id}/state?userId={user_id}")
        assert s1.body["my_last_result"] == "rejected"
        assert s1.body["my_last_reason"] == "缺细节"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_br_6_collect_state_missing_user_returns_400(db_pool):
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("br-6"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        listing = await req(
            "GET", f"/api/work/collect-tasks?userId={unique_id('u')}&batchId={b_res.body['batchId']}")
        item_id = listing.body["items"][0]["id"]
        r = await get(f"/api/collect/{item_id}/state")
        assert r.status == 400
        assert r.body["error"]["code"] == "MISSING_USER"
    finally:
        await delete_pipeline(task_id)


# ── review/tasks ───────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_br_7_review_tasks_lists_submitted_items(db_pool):
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("br-7"))
    collector = unique_id("br-7-c")
    reviewer = unique_id("br-7-r")
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 2})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId={collector}&batchId={batch_id}")
        await post(f"/api/collect/{listing.body['items'][0]['id']}/claim",
                   {"userId": collector, "batchId": batch_id})
        await post(f"/api/collect/{listing.body['items'][0]['id']}/submit",
                   {"userId": collector, "payload": {"content": "x"}})
        r = await req("GET", f"{PREFIX}/review/tasks?userId={reviewer}&batchId={batch_id}")
        assert r.status == 200
        ids = [x["item_id"] for x in r.body["items"]]
        assert listing.body["items"][0]["id"] in ids
        assert listing.body["items"][1]["id"] not in ids
        assert all(x["node_key"] == "review" for x in r.body["items"])
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_br_8_review_tasks_missing_user_returns_400(db_pool):
    r = await get(f"{PREFIX}/review/tasks?batchId={unique_id('br-8-b')}")
    assert r.status == 400
    assert r.body["error"]["code"] == "MISSING_PARAMS"


# ── my-submissions ─────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_br_9_my_submissions_lists_user_rows(db_pool):
    user_id = unique_id("br-9-u")
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("br-9"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId={user_id}&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": user_id, "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit", {"userId": user_id, "payload": {"content": "x"}})

        r = await get(f"/api/work/my-submissions?userId={user_id}")
        assert r.status == 200
        assert len(r.body["submissions"]) >= 1
        assert all(s["user_id"] == user_id for s in r.body["submissions"])
        assert any(s["item_id"] == item_id and s["status"] == "submitted"
                   for s in r.body["submissions"])
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_br_11_already_claiming_takes_precedence_over_quota(db_pool):
    user_id = unique_id("br-11-u")
    steps = [
        {"key": "ingest", "nodeKey": "ingest", "label": "采集",
         "params": {"source": "form", "max_total_per_user": 1}, "policy": _policy},
        {"key": "review", "nodeKey": "review", "label": "审核",
         "params": {"rubric": "default"},
         "routes": {"on": "decision",
                    "cases": {"rejected": {"goto": "ingest", "maxLoops": 1}, "approved": "next"}},
         "policy": _policy},
        {"key": "store", "nodeKey": "export", "label": "入库",
         "params": {"format": "json"}, "policy": _policy},
    ]
    task_id = await create_pipeline(steps, name=unique_id("br-11"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 2})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId={user_id}&batchId={batch_id}")
        assert len(listing.body["items"]) == 2
        it1, it2 = listing.body["items"][0]["id"], listing.body["items"][1]["id"]

        assert (await post(f"/api/collect/{it1}/claim",
                           {"userId": user_id, "batchId": batch_id})).status == 200
        assert (await post(f"/api/collect/{it2}/claim",
                           {"userId": user_id, "batchId": batch_id})).status == 200
        assert (await post(f"/api/collect/{it1}/submit",
                           {"userId": user_id, "payload": {"content": "x"}})).status == 200

        reclaim = await post(f"/api/collect/{it2}/claim", {"userId": user_id, "batchId": batch_id})
        assert reclaim.status == 409
        assert reclaim.body["error"]["code"] == "ALREADY_CLAIMING", \
            f"已 claim 的 item re-claim 必须返 ALREADY_CLAIMING, got {reclaim.body}"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_br_10_my_submissions_self_heals_stuck_claimed(db_pool):
    user_id = unique_id("br-10-u")
    task_id = await create_pipeline(_pipeline_steps(), name=unique_id("br-10"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId={user_id}&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": user_id, "batchId": batch_id})

        detail = await get_item(item_id)
        ingest_run = next(r for r in detail.body["inflight"] if r["step_key"] == "ingest")
        await post(f"{PREFIX}/queue/lease/{ingest_run['run_id']}/release", {"workerId": user_id})
        reclaim = await claim_item(item_id, "w-br10")
        await post_result({
            "runId": reclaim["runId"], "status": "failed",
            "error": {"code": "BAD", "message": "force stuck", "retryable": False},
        })
        dd = await get_item(item_id)
        assert dd.body["item"]["current_step"] == "stuck", "fixture 应进 stuck"

        before = await get(f"/api/work/my-submissions?userId={user_id}")
        found = next((s for s in before.body["submissions"] if s["item_id"] == item_id), None)
        assert found is not None, "应能看到该 submission"
        assert found["status"] == "returned", "自愈后应转 returned"
        assert re.search(r"系统超时|租约", found.get("result_reason") or "")
    finally:
        await delete_pipeline(task_id)
