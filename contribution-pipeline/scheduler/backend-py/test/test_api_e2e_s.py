"""
S. 业务层端到端 spine — 与 api.e2e.test.ts S 系列 1:1 (17 tests).

把 admin / worker 当成两个外部系统跑通: collect → review → my_last_reason 回传 /
permanent fail → admin replay / audit / dev /me tenant 切换 / disallowedFromSteps /
pipeline 暂停 / batch 暂停 / 重复 ALREADY_CLAIMING / RLS 兜底.
"""
from __future__ import annotations
from typing import Any

import pytest
import pytest_asyncio

from scheduler.auth import hash_key
from scheduler.db import as_system

from .helpers import (
    PREFIX,
    claim_item,
    create_pipeline,
    delete_pipeline,
    get_item,
    post,
    post_result,
    req,
    sleep,
    unique_id,
)


_policy = {"timeoutMs": 30_000, "maxAttempts": 1, "baseBackoffMs": 1}


def _biz_steps() -> list[dict[str, Any]]:
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


def _self_review_block(mode: str = "explicit") -> list[dict[str, Any]]:
    review_params: dict[str, Any] = (
        {"rubric": "default", "reviewedStepKey": "ingest", "disallowSelfReview": True}
        if mode == "legacy"
        else {"rubric": "default", "reviewedStepKey": "ingest", "disallowedFromSteps": ["ingest"]}
    )
    return [
        {"key": "ingest", "nodeKey": "ingest", "label": "采集",
         "params": {"source": "form"}, "policy": _policy},
        {"key": "review", "nodeKey": "review", "label": "审核",
         "params": review_params,
         "routes": {"on": "decision",
                    "cases": {"rejected": {"goto": "ingest", "maxLoops": 1}, "approved": "next"}},
         "policy": _policy},
        {"key": "store", "nodeKey": "export", "label": "入库",
         "params": {"format": "json"}, "policy": _policy},
    ]


def _symmetric_lock_steps() -> list[dict[str, Any]]:
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


# ─────────────────────────────────────────────────────────────────────────────
# 模块级 fixture: 注入 acme tenant + admin key (供 S5/S6/S7)
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="module", loop_scope="session", autouse=True)
async def _acme_tenant(db_pool):
    async def _setup(conn):
        tenant = await conn.fetchrow(
            """INSERT INTO tenants (slug, name, plan)
               VALUES ('acme', 'Acme Corp', 'standard')
               ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
               RETURNING id""",
        )
        role = await conn.fetchrow(
            "SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'"
        )
        key_row = await conn.fetchrow(
            """INSERT INTO api_keys (name, key_hash, scope, tenant_id)
               VALUES ('acme-admin-test', $1, 'admin', $2)
               ON CONFLICT (key_hash) DO UPDATE SET name = EXCLUDED.name, revoked_at = NULL
               RETURNING id""",
            hash_key("dev-acme-admin-2026"), tenant["id"],
        )
        if role:
            await conn.execute(
                """INSERT INTO api_key_roles (api_key_id, role_id) VALUES ($1, $2)
                   ON CONFLICT DO NOTHING""",
                key_row["id"], role["id"],
            )
    await as_system(_setup)
    yield


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_s1_collect_reject_returns_last_reason(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("biz-pipe"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("biz-batch"), "target": 1})
        assert b_res.status == 200, b_res.body
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        assert len(listing.body["items"]) == 1
        item_id = listing.body["items"][0]["id"]

        cr = await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        assert cr.status == 200, cr.body
        sr = await post(f"/api/collect/{item_id}/submit",
                        {"userId": "alice", "payload": {"content": "测试内容"}})
        assert sr.status == 200, sr.body
        assert sr.body["nextStep"] == "review"

        detail = await get_item(item_id)
        review_run = next(r for r in detail.body["inflight"] if r["step_key"] == "review")
        cv = await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim",
                        {"workerId": "bob", "leaseSeconds": 60})
        assert cv.status == 200

        REASON = "缺字段 X — 测试理由"
        dr = await post(f"/api/review/{item_id}/decide",
                        {"userId": "bob", "batchId": batch_id, "decision": "rejected", "reason": REASON})
        assert dr.status == 200, dr.body

        state = await req("GET", f"/api/collect/{item_id}/state?userId=alice")
        assert state.status == 200
        assert state.body["my_last_result"] == "rejected"
        assert state.body["my_last_reason"] == REASON
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s2_stuck_then_admin_replay_lets_business_reclaim(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("biz-pipe-stuck"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("biz-batch-stuck"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]

        direct = await claim_item(item_id, "w-stuck")
        await post_result({
            "runId": direct["runId"], "status": "failed",
            "error": {"code": "BAD_INPUT", "message": "测试 stuck", "retryable": False},
        })
        after = await get_item(item_id)
        assert after.body["item"]["current_step"] == "stuck"

        replay = await post(f"{PREFIX}/admin/items/{item_id}/replay", {"stepKey": "ingest"})
        assert replay.status == 200, replay.body
        after = await get_item(item_id)
        assert after.body["item"]["current_step"] == "ingest"

        again = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        assert again.status == 200
        assert any(it["id"] == item_id for it in again.body["items"]), \
            "replay 后 item 应再次在可领列表里"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s3_admin_replay_writes_audit_row(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("biz-pipe-audit"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("biz-batch-audit"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]

        direct = await claim_item(item_id, "w-audit")
        await post_result({
            "runId": direct["runId"], "status": "failed",
            "error": {"code": "BAD", "message": "stuck for audit", "retryable": False},
        })
        await post(f"{PREFIX}/admin/items/{item_id}/replay", {"stepKey": "ingest"})
        await sleep(50)

        audit = await req("GET",
                          f"{PREFIX}/admin/audit?action=item.replay&kind=item&id={item_id}&limit=10")
        assert audit.status == 200
        assert len(audit.body["entries"]) >= 1
        e = audit.body["entries"][0]
        assert e["action"] == "item.replay"
        assert e["resource"]["kind"] == "item"
        assert e["resource"]["id"] == item_id
        assert e["before"]["previousStep"] == "stuck"
        assert e["after"]["newStep"] == "ingest"

        empty = await req("GET", f"{PREFIX}/admin/audit?action=no-such-action&id={item_id}")
        assert len(empty.body["entries"]) == 0
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s4_admin_audit_invalid_since_returns_400(db_pool):
    r = await req("GET", f"{PREFIX}/admin/audit?since=not-a-date")
    assert r.status == 400
    assert r.body["error"]["code"] == "INVALID_SINCE"


@pytest.mark.asyncio(loop_scope="session")
async def test_s5_me_without_key_is_default_system_actor(db_pool):
    r = await req("GET", f"{PREFIX}/me")
    assert r.status == 200
    assert r.body["tenantId"] == "00000000-0000-0000-0000-000000000001"
    assert r.body["isSystemActor"] is True


@pytest.mark.asyncio(loop_scope="session")
async def test_s6_me_with_acme_key_switches_tenant(db_pool):
    r = await req("GET", f"{PREFIX}/me", headers={"x-api-key": "dev-acme-admin-2026"})
    assert r.status == 200
    assert r.body["isSystemActor"] is False
    assert r.body["name"] == "acme-admin-test"
    assert r.body["tenantId"] != "00000000-0000-0000-0000-000000000001"


@pytest.mark.asyncio(loop_scope="session")
async def test_s8_disallowed_from_steps_blocks_self_decide(db_pool):
    task_id = await create_pipeline(_self_review_block(), name=unique_id("biz-no-self"))
    try:
        b_res = await post("/api/batches",
                           {"pipelineId": task_id, "name": unique_id("biz-batch-no-self"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        sr = await post(f"/api/collect/{item_id}/submit",
                        {"userId": "alice", "payload": {"content": "x"}})
        assert sr.status == 200

        detail = await get_item(item_id)
        review_run = next(r for r in detail.body["inflight"] if r["step_key"] == "review")
        cv = await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim",
                        {"workerId": "alice", "leaseSeconds": 60})
        assert cv.status == 200
        dr = await post(f"/api/review/{item_id}/decide",
                        {"userId": "alice", "batchId": batch_id, "decision": "approved"})
        assert dr.status == 403
        assert dr.body["error"]["code"] == "STEP_OPERATOR_CONFLICT"

        # bob 接管 lease (模拟 release+claim, 这里直接改 leased_by)
        async def _takeover(conn):
            await conn.execute(
                "UPDATE outbox SET leased_by = 'bob' WHERE run_id = $1::uuid",
                review_run["run_id"],
            )
        await as_system(_takeover)
        dr_bob = await post(f"/api/review/{item_id}/decide",
                            {"userId": "bob", "batchId": batch_id, "decision": "approved"})
        assert dr_bob.status == 200
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s9_review_tasks_filters_out_own_submissions(db_pool):
    task_id = await create_pipeline(_self_review_block(), name=unique_id("biz-no-self-list"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit", {"userId": "alice", "payload": {"content": "x"}})

        alice_list = await req("GET", f"{PREFIX}/review/tasks?userId=alice&batchId={batch_id}")
        assert alice_list.status == 200
        assert not any(it["item_id"] == item_id for it in alice_list.body["items"])

        bob_list = await req("GET", f"{PREFIX}/review/tasks?userId=bob&batchId={batch_id}")
        assert any(it["item_id"] == item_id for it in bob_list.body["items"])
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s15_symmetric_lock_blocks_reviewer_from_reingest(db_pool):
    task_id = await create_pipeline(_symmetric_lock_steps(), name=unique_id("sym"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]

        await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit", {"userId": "alice", "payload": {"content": "x"}})

        detail = await get_item(item_id)
        review_run = next(r for r in detail.body["inflight"] if r["step_key"] == "review")
        await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim", {"workerId": "bob"})
        decide = await post(f"/api/review/{item_id}/decide",
                            {"userId": "bob", "batchId": batch_id,
                             "decision": "rejected", "reason": "测试反向"})
        assert decide.status == 200

        bob_claim = await post(f"/api/collect/{item_id}/claim", {"userId": "bob", "batchId": batch_id})
        assert bob_claim.status == 403
        assert bob_claim.body["error"]["code"] == "STEP_OPERATOR_CONFLICT"

        charlie = await post(f"/api/collect/{item_id}/claim",
                             {"userId": "charlie", "batchId": batch_id})
        assert charlie.status == 200
        await post(f"/api/collect/{item_id}/release", {"userId": "charlie"})

        bob_list = await req("GET", f"/api/work/collect-tasks?userId=bob&batchId={batch_id}")
        assert not any(i["id"] == item_id for i in bob_list.body["items"])
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s16_legacy_disallow_self_review_still_works(db_pool):
    task_id = await create_pipeline(_self_review_block("legacy"), name=unique_id("legacy"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        await post(f"/api/collect/{item_id}/submit", {"userId": "alice", "payload": {"content": "x"}})
        detail = await get_item(item_id)
        review_run = next(r for r in detail.body["inflight"] if r["step_key"] == "review")
        await post(f"{PREFIX}/queue/run/{review_run['run_id']}/claim", {"workerId": "alice"})
        decide = await post(f"/api/review/{item_id}/decide",
                            {"userId": "alice", "batchId": batch_id, "decision": "approved"})
        assert decide.status == 403
        assert decide.body["error"]["code"] == "STEP_OPERATOR_CONFLICT"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s10_pipeline_pause_blocks_claim(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("pause-pipe"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]
        run_id = listing.body["items"][0]["run_id"]

        pause = await post(f"{PREFIX}/pipelines/{task_id}/pause")
        assert pause.status == 200

        claim = await post(f"{PREFIX}/queue/run/{run_id}/claim", {"workerId": "alice"})
        assert claim.status == 409
        assert claim.body["error"]["code"] == "PIPELINE_PAUSED"

        list_paused = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        assert not any(i["id"] == item_id for i in list_paused.body["items"])

        resume = await post(f"{PREFIX}/pipelines/{task_id}/resume")
        assert resume.status == 200
        list_resumed = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        assert any(i["id"] == item_id for i in list_resumed.body["items"])
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s11_pipeline_pause_allows_leased_to_drain(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("pause-drain"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]

        await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        await post(f"{PREFIX}/pipelines/{task_id}/pause")
        submit = await post(f"/api/collect/{item_id}/submit",
                            {"userId": "alice", "payload": {"content": "drain"}})
        assert submit.status == 200, f"应允许已 claim 的 run 提交完: {submit.body}"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s12_batch_pause_clears_only_that_batch(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("batch-pause"))
    try:
        b1 = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b1"), "target": 1})
        b2 = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b2"), "target": 1})
        pause = await post(f"/api/batches/{b1.body['batchId']}/pause")
        assert pause.status == 200
        l1 = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={b1.body['batchId']}")
        assert len(l1.body["items"]) == 0
        l2 = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={b2.body['batchId']}")
        assert len(l2.body["items"]) == 1

        all_items = await req("GET", "/api/work/collect-tasks?userId=alice")
        b1_item = next((i for i in all_items.body["items"]
                        if i["batch_id"] == b1.body["batchId"]), None)
        assert b1_item is None, "_all_ 视图也不应返暂停批次"

        resume = await post(f"/api/batches/{b1.body['batchId']}/resume")
        assert resume.status == 200
        l1b = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={b1.body['batchId']}")
        assert len(l1b.body["items"]) == 1
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s13_pause_twice_returns_404(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("pause-twice"))
    try:
        r1 = await post(f"{PREFIX}/pipelines/{task_id}/pause")
        assert r1.status == 200
        r2 = await post(f"{PREFIX}/pipelines/{task_id}/pause")
        assert r2.status == 404
        assert r2.body["error"]["code"] == "NOT_FOUND_OR_NOT_ACTIVE"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s14_reclaim_returns_already_claiming(db_pool):
    task_id = await create_pipeline(_biz_steps(), name=unique_id("biz-reclaim"))
    try:
        b_res = await post("/api/batches", {"pipelineId": task_id, "name": unique_id("b"), "target": 1})
        batch_id = b_res.body["batchId"]
        listing = await req("GET", f"/api/work/collect-tasks?userId=alice&batchId={batch_id}")
        item_id = listing.body["items"][0]["id"]

        first = await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        assert first.status == 200
        second = await post(f"/api/collect/{item_id}/claim", {"userId": "alice", "batchId": batch_id})
        assert second.status == 409, f"应返 409: {second.body}"
        assert second.body["error"]["code"] == "ALREADY_CLAIMING"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_s7_acme_key_cannot_see_default_pipelines(db_pool):
    acme = await req("GET", f"{PREFIX}/pipelines",
                     headers={"x-api-key": "dev-acme-admin-2026"})
    assert acme.status == 200
    for p in acme.body["pipelines"]:
        assert p["task_id"]
    default = await req("GET", f"{PREFIX}/pipelines")
    if default.body["pipelines"]:
        acme_ids = {a["task_id"] for a in acme.body["pipelines"]}
        someone_else = next((p for p in default.body["pipelines"]
                             if p["task_id"] not in acme_ids), None)
        if someone_else:
            probe = await req("GET", f"{PREFIX}/pipelines/{someone_else['task_id']}",
                              headers={"x-api-key": "dev-acme-admin-2026"})
            assert probe.status == 404, "跨租户 GET 应 404 (RLS 拦截)"
