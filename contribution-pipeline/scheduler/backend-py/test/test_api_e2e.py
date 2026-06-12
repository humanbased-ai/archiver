"""
E2E API 测试 — 与 backend/test/api.e2e.test.ts 1:1 (A-N 第一波).

打 http://127.0.0.1:4001 真服务. 验证调度核心所有公开端点的行为契约.

本文件覆盖: A.Smoke / B.Pipeline CRUD / C.Items / D.lease / E.lease 管理 /
F.result success / G.result fail / H.routes / I.dedup / J.dataset /
K.admin / L.save 冲突 / M.kanban / N.happy / O.同 pipeline 多 item /
P.多 pipeline / Q.retry 退避. R/T/U/X/Y/S/Z/N(节点管理) 留二期.
"""
from __future__ import annotations
import asyncio
import re
import uuid
from typing import Any

import pytest

from .helpers import (
    PREFIX,
    build_sample_pipeline,
    claim_item,
    create_pipeline,
    delete_pipeline,
    get,
    get_item,
    ingest,
    lease_one,
    post,
    post_result,
    req,
    sleep,
    unique_id,
)


# ═══════════════════════════════════════════════════════════
# A. Smoke / 元数据
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_a1_health(db_pool):
    r = await get("/health")
    assert r.status == 200
    assert r.body["ok"] is True


@pytest.mark.asyncio(loop_scope="session")
async def test_a2_nodes_contains_builtins(db_pool):
    r = await get(f"{PREFIX}/nodes")
    assert r.status == 200
    keys = [n["key"] for n in r.body["nodes"]]
    for k in ("ingest", "translate", "review", "export", "dedup"):
        assert k in keys, f"node_definitions 缺少 {k}"
    ingest_node = next(n for n in r.body["nodes"] if n["key"] == "ingest")
    assert isinstance(ingest_node["params_schema"], dict)
    assert isinstance(ingest_node["idempotent"], bool)
    assert isinstance(ingest_node["default_timeout_ms"], int)


# ═══════════════════════════════════════════════════════════
# B. Pipeline CRUD (顺序依赖 — 用同一个 created_id)
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def b_state():
    return {"id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_b1_create(db_pool, b_state):
    tpl = build_sample_pipeline()
    r = await post(f"{PREFIX}/pipelines/create", tpl)
    assert r.status == 200, r.body
    assert re.match(r"^[0-9a-f-]{36}$", r.body["task_id"])
    assert r.body["name"] == tpl["name"]
    assert len(r.body["steps"]) == 4
    b_state["id"] = r.body["task_id"]


@pytest.mark.asyncio(loop_scope="session")
async def test_b2_create_missing_node_key_rejected(db_pool):
    r = await post(f"{PREFIX}/pipelines/create",
                   {"name": unique_id("bad"), "steps": [{"key": "x"}]})
    assert r.status >= 400, f"非法 body 应返回错误状态, 实际 {r.status}"


@pytest.mark.asyncio(loop_scope="session")
async def test_b3_list_contains_created(db_pool, b_state):
    r = await get(f"{PREFIX}/pipelines")
    assert r.status == 200
    ids = [p["task_id"] for p in r.body["pipelines"]]
    assert b_state["id"] in ids


@pytest.mark.asyncio(loop_scope="session")
async def test_b4_get_returns_full_steps(db_pool, b_state):
    r = await get(f"{PREFIX}/pipelines/{b_state['id']}")
    assert r.status == 200
    assert len(r.body["steps"]) == 4
    assert r.body["steps"][0]["key"] == "ingest"


@pytest.mark.asyncio(loop_scope="session")
async def test_b5_get_unknown_returns_404(db_pool):
    r = await get(f"{PREFIX}/pipelines/00000000-0000-0000-0000-000000000000")
    assert r.status == 404
    assert r.body["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio(loop_scope="session")
async def test_b6_save_rename(db_pool, b_state):
    new_name = unique_id("renamed")
    r = await post(f"{PREFIX}/pipelines/{b_state['id']}/save", {"name": new_name})
    assert r.status == 200
    assert r.body["name"] == new_name
    fresh = await get(f"{PREFIX}/pipelines/{b_state['id']}")
    assert fresh.body["name"] == new_name


@pytest.mark.asyncio(loop_scope="session")
async def test_b7_save_unknown_returns_404(db_pool):
    r = await post(f"{PREFIX}/pipelines/00000000-0000-0000-0000-000000000000/save",
                   {"name": "ghost"})
    assert r.status == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_b8_delete_cascade(db_pool, b_state):
    d = await req("DELETE", f"{PREFIX}/pipelines/{b_state['id']}")
    assert d.status == 200
    assert d.body["ok"] is True
    g = await get(f"{PREFIX}/pipelines/{b_state['id']}")
    assert g.status == 404


# ═══════════════════════════════════════════════════════════
# C. Items 投递与查询
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def c_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_c0_setup(db_pool, c_state):
    c_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_c1_create_item_returns_ids(db_pool, c_state):
    r = await post(f"{PREFIX}/items/create",
                   {"taskId": c_state["task_id"], "envelope": {"payload": {"text": "hello"}}})
    assert r.status == 200
    assert re.match(r"^[0-9a-f-]{36}$", r.body["itemId"])
    assert re.match(r"^[0-9a-f-]{36}$", r.body["runId"])


@pytest.mark.asyncio(loop_scope="session")
async def test_c2_create_item_unknown_task_returns_404(db_pool):
    r = await post(f"{PREFIX}/items/create",
                   {"taskId": "00000000-0000-0000-0000-000000000000",
                    "envelope": {"payload": {}}})
    assert r.status == 404
    assert r.body["error"]["code"] == "PIPELINE_NOT_FOUND"


@pytest.mark.asyncio(loop_scope="session")
async def test_c3_invalid_start_step_returns_400(db_pool, c_state):
    r = await post(f"{PREFIX}/items/create",
                   {"taskId": c_state["task_id"], "envelope": {"payload": {}},
                    "startStep": "no-such-step"})
    assert r.status == 400
    assert r.body["error"]["code"] == "INVALID_START_STEP"


@pytest.mark.asyncio(loop_scope="session")
async def test_c4_empty_pipeline_rejects_item(db_pool):
    empty_id = await create_pipeline([], name=unique_id("empty"))
    try:
        r = await post(f"{PREFIX}/items/create",
                       {"taskId": empty_id, "envelope": {"payload": {}}})
        assert r.status == 400
        assert r.body["error"]["code"] == "EMPTY_PIPELINE"
    finally:
        await delete_pipeline(empty_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_c5_get_item_has_three_sections(db_pool, c_state):
    res = await ingest(c_state["task_id"], {"text": "查询测试"})
    r = await get_item(res["itemId"])
    assert r.status == 200
    assert r.body["item"]["id"] == res["itemId"]
    assert r.body["item"]["current_step"] == "ingest"
    assert isinstance(r.body["inflight"], list)
    assert len(r.body["inflight"]) >= 1
    assert isinstance(r.body["history"], list)


@pytest.mark.asyncio(loop_scope="session")
async def test_c6_unknown_item_returns_404(db_pool):
    r = await get(f"{PREFIX}/items/00000000-0000-0000-0000-000000000000")
    assert r.status == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_c7_task_items_list(db_pool, c_state):
    r = await get(f"{PREFIX}/tasks/{c_state['task_id']}/items")
    assert r.status == 200
    assert isinstance(r.body["items"], list)
    assert len(r.body["items"]) >= 1


@pytest.mark.asyncio(loop_scope="session")
async def test_c99_teardown(db_pool, c_state):
    await delete_pipeline(c_state["task_id"])


# ═══════════════════════════════════════════════════════════
# D. 队列 lease
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def d_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_d0_setup(db_pool, d_state):
    d_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_d1_lease_unknown_node_returns_empty(db_pool):
    r = await post(f"{PREFIX}/queue/no-such-node/lease",
                   {"workerId": "w1", "batchSize": 5})
    assert r.status == 200
    assert r.body["jobs"] == []


@pytest.mark.asyncio(loop_scope="session")
async def test_d2_lease_returns_full_job_shape(db_pool, d_state):
    res = await ingest(d_state["task_id"], {"text": "lease-target"})
    claimed = await claim_item(res["itemId"], "w-D2")
    assert claimed["itemId"] == res["itemId"]
    assert claimed["stepKey"] == "ingest"
    assert claimed["nodeKey"] == "ingest"
    assert isinstance(claimed["runId"], str)
    assert claimed["envelope"]["payload"] == {"text": "lease-target"}
    lease = await post(f"{PREFIX}/queue/ingest/lease",
                       {"workerId": "w-D2-lease", "batchSize": 1})
    assert lease.status == 200
    assert isinstance(lease.body["jobs"], list)
    await post_result({"runId": claimed["runId"], "status": "success"})
    for j in lease.body["jobs"]:
        await post(f"{PREFIX}/queue/lease/{j['runId']}/release", {"workerId": "w-D2-lease"})


@pytest.mark.asyncio(loop_scope="session")
async def test_d3_batch_size_is_upper_bound(db_pool, d_state):
    await asyncio.gather(*(ingest(d_state["task_id"]) for _ in range(3)))
    small = await post(f"{PREFIX}/queue/ingest/lease",
                       {"workerId": "w-D3a", "batchSize": 2})
    assert small.status == 200
    assert len(small.body["jobs"]) <= 2
    for j in small.body["jobs"]:
        await post(f"{PREFIX}/queue/lease/{j['runId']}/release", {"workerId": "w-D3a"})
    big = await post(f"{PREFIX}/queue/ingest/lease",
                     {"workerId": "w-D3b", "batchSize": 50})
    assert len(big.body["jobs"]) <= 50
    assert len(big.body["jobs"]) >= len(small.body["jobs"])
    for j in big.body["jobs"]:
        await post(f"{PREFIX}/queue/lease/{j['runId']}/release", {"workerId": "w-D3b"})


@pytest.mark.asyncio(loop_scope="session")
async def test_d4_concurrent_lease_no_double_dispatch(db_pool, d_state):
    await asyncio.gather(ingest(d_state["task_id"]), ingest(d_state["task_id"]))
    r1, r2 = await asyncio.gather(
        post(f"{PREFIX}/queue/ingest/lease", {"workerId": "wA", "batchSize": 5}),
        post(f"{PREFIX}/queue/ingest/lease", {"workerId": "wB", "batchSize": 5}),
    )
    ids = set()
    all_jobs = r1.body["jobs"] + r2.body["jobs"]
    for j in all_jobs:
        assert j["runId"] not in ids, f"runId {j['runId']} 双发"
        ids.add(j["runId"])
    r1_ids = {j["runId"] for j in r1.body["jobs"]}
    for j in all_jobs:
        worker = "wA" if j["runId"] in r1_ids else "wB"
        try:
            await post(f"{PREFIX}/queue/lease/{j['runId']}/release", {"workerId": worker})
        except Exception:
            pass


@pytest.mark.asyncio(loop_scope="session")
async def test_d99_teardown(db_pool, d_state):
    await delete_pipeline(d_state["task_id"])


# ═══════════════════════════════════════════════════════════
# E. lease 管理: claim / release / heartbeat
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def e_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_e0_setup(db_pool, e_state):
    e_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_e1_claim_returns_job(db_pool, e_state):
    ing = await ingest(e_state["task_id"])
    detail = await get_item(ing["itemId"])
    run_id = detail.body["inflight"][0]["run_id"]
    r = await post(f"{PREFIX}/queue/run/{run_id}/claim", {"workerId": "w-E1"})
    assert r.status == 200
    assert r.body["job"]["runId"] == run_id


@pytest.mark.asyncio(loop_scope="session")
async def test_e2_claim_already_claimed_returns_409(db_pool, e_state):
    ing = await ingest(e_state["task_id"])
    detail = await get_item(ing["itemId"])
    run_id = detail.body["inflight"][0]["run_id"]
    r1 = await post(f"{PREFIX}/queue/run/{run_id}/claim", {"workerId": "wX"})
    assert r1.status == 200
    r2 = await post(f"{PREFIX}/queue/run/{run_id}/claim", {"workerId": "wY"})
    assert r2.status == 409
    assert r2.body["error"]["code"] == "ALREADY_CLAIMED"


@pytest.mark.asyncio(loop_scope="session")
async def test_e3_release_returns_pending(db_pool, e_state):
    ing = await ingest(e_state["task_id"])
    job = await claim_item(ing["itemId"], "w-E3")
    r = await post(f"{PREFIX}/queue/lease/{job['runId']}/release", {"workerId": "w-E3"})
    assert r.status == 200
    detail = await get_item(ing["itemId"])
    inflight = next(x for x in detail.body["inflight"] if x["run_id"] == job["runId"])
    assert inflight["status"] == "pending"


@pytest.mark.asyncio(loop_scope="session")
async def test_e4_release_wrong_worker_returns_lease_lost(db_pool, e_state):
    ing = await ingest(e_state["task_id"])
    job = await claim_item(ing["itemId"], "w-E4-real")
    r = await post(f"{PREFIX}/queue/lease/{job['runId']}/release", {"workerId": "w-E4-fake"})
    assert r.status == 409
    assert r.body["error"]["code"] == "LEASE_LOST"
    await post_result({"runId": job["runId"], "status": "success"})


@pytest.mark.asyncio(loop_scope="session")
async def test_e5_heartbeat_extends_lease(db_pool, e_state):
    from datetime import datetime
    ing = await ingest(e_state["task_id"])
    job = await claim_item(ing["itemId"], "w-E5", lease_seconds=30)
    detail = await get_item(ing["itemId"])
    ours = next(x for x in detail.body["inflight"] if x["run_id"] == job["runId"])
    before = datetime.fromisoformat(ours["expected_by"].replace("Z", "+00:00")).timestamp()
    await sleep(50)
    r = await post(f"{PREFIX}/queue/lease/{job['runId']}/heartbeat",
                   {"workerId": "w-E5", "extendSeconds": 120})
    assert r.status == 200
    after = datetime.fromisoformat(r.body["newExpectedBy"].replace("Z", "+00:00")).timestamp()
    assert after > before
    await post_result({"runId": job["runId"], "status": "success"})


@pytest.mark.asyncio(loop_scope="session")
async def test_e6_heartbeat_wrong_worker_returns_lease_lost(db_pool, e_state):
    ing = await ingest(e_state["task_id"])
    job = await claim_item(ing["itemId"], "w-E6-real")
    r = await post(f"{PREFIX}/queue/lease/{job['runId']}/heartbeat",
                   {"workerId": "wrong", "extendSeconds": 60})
    assert r.status == 409
    assert r.body["error"]["code"] == "LEASE_LOST"
    await post_result({"runId": job["runId"], "status": "success"})


@pytest.mark.asyncio(loop_scope="session")
async def test_e99_teardown(db_pool, e_state):
    await delete_pipeline(e_state["task_id"])


# ═══════════════════════════════════════════════════════════
# F. /result 成功路径
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def f_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_f0_setup(db_pool, f_state):
    f_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_f1_success_advances_to_next_step(db_pool, f_state):
    ing = await ingest(f_state["task_id"])
    job = await claim_item(ing["itemId"], "w-F1")
    r = await post_result({"runId": job["runId"], "status": "success", "output": {"ok": True}})
    assert r.status == 200
    assert r.body["applied"] is True
    assert r.body["nextStep"] == "translate"
    detail = await get_item(ing["itemId"])
    assert detail.body["item"]["current_step"] == "translate"
    assert detail.body["item"]["envelope"]["outputs"]["ingest"] == {"ok": True}


@pytest.mark.asyncio(loop_scope="session")
async def test_f2_next_hint_done(db_pool, f_state):
    ing = await ingest(f_state["task_id"])
    job = await claim_item(ing["itemId"], "w-F2")
    r = await post_result({"runId": job["runId"], "status": "success", "nextHint": "done"})
    assert r.body["nextStep"] == "done"
    detail = await get_item(ing["itemId"])
    assert detail.body["item"]["current_step"] == "done"


@pytest.mark.asyncio(loop_scope="session")
async def test_f3_duplicate_result_applied_false(db_pool, f_state):
    ing = await ingest(f_state["task_id"])
    job = await claim_item(ing["itemId"], "w-F3")
    r1 = await post_result({"runId": job["runId"], "status": "success"})
    assert r1.body["applied"] is True
    r2 = await post_result({"runId": job["runId"], "status": "success"})
    assert r2.status == 200
    assert r2.body["applied"] is False


@pytest.mark.asyncio(loop_scope="session")
async def test_f4_unknown_run_returns_404(db_pool):
    r = await post_result({"runId": "00000000-0000-0000-0000-000000000000", "status": "success"})
    assert r.status == 404
    assert r.body["error"]["code"] == "UNKNOWN_RUN"


@pytest.mark.asyncio(loop_scope="session")
async def test_f5_expired_lease_returns_409(db_pool, f_state):
    ing = await ingest(f_state["task_id"])
    job = await claim_item(ing["itemId"], "w-F5", lease_seconds=5)
    await sleep(5500)
    r = await post_result({"runId": job["runId"], "status": "success"})
    assert r.status == 409
    assert r.body["error"]["code"] == "LEASE_EXPIRED"


@pytest.mark.asyncio(loop_scope="session")
async def test_f99_teardown(db_pool, f_state):
    await delete_pipeline(f_state["task_id"])


# ═══════════════════════════════════════════════════════════
# G. /result 失败 / 重试 / DLQ
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def g_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_g0_setup(db_pool, g_state):
    g_state["task_id"] = await create_pipeline(build_sample_pipeline(max_attempts=2)["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_g1_retryable_writes_attempt_2(db_pool, g_state):
    ing = await ingest(g_state["task_id"])
    job = await claim_item(ing["itemId"], "w-G1")
    r = await post_result({
        "runId": job["runId"], "status": "failed",
        "error": {"code": "X", "message": "transient", "retryable": True},
    })
    assert r.status == 200
    assert r.body.get("retryAt")
    detail = await get_item(ing["itemId"])
    assert any(x["attempt"] == 2 for x in detail.body["inflight"])


@pytest.mark.asyncio(loop_scope="session")
async def test_g2_exhausted_retries_marks_stuck(db_pool, g_state):
    ing = await ingest(g_state["task_id"])
    job = await claim_item(ing["itemId"], "w-G2")
    await post_result({
        "runId": job["runId"], "status": "failed",
        "error": {"code": "X", "message": "1", "retryable": True},
    })
    await sleep(20)
    job = await claim_item(ing["itemId"], "w-G2")
    r = await post_result({
        "runId": job["runId"], "status": "failed",
        "error": {"code": "X", "message": "2", "retryable": True},
    })
    assert r.body["dlq"] is True
    detail = await get_item(ing["itemId"])
    assert detail.body["item"]["current_step"] == "stuck"


@pytest.mark.asyncio(loop_scope="session")
async def test_g3_non_retryable_immediately_stuck(db_pool, g_state):
    ing = await ingest(g_state["task_id"])
    job = await claim_item(ing["itemId"], "w-G3")
    r = await post_result({
        "runId": job["runId"], "status": "failed",
        "error": {"code": "X", "message": "fatal", "retryable": False},
    })
    assert r.body["dlq"] is True
    detail = await get_item(ing["itemId"])
    assert detail.body["item"]["current_step"] == "stuck"


@pytest.mark.asyncio(loop_scope="session")
async def test_g99_teardown(db_pool, g_state):
    await delete_pipeline(g_state["task_id"])


# ═══════════════════════════════════════════════════════════
# H. 路由 / loopback
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def h_state():
    return {"task_id": ""}


async def _push_to(item_id: str, target: str) -> None:
    job = await claim_item(item_id, "pusher")
    r = await post_result({"runId": job["runId"], "status": "success", "nextHint": target})
    assert r.body["nextStep"] == target
    d = await get_item(item_id)
    assert d.body["item"]["current_step"] == target


@pytest.mark.asyncio(loop_scope="session")
async def test_h0_setup(db_pool, h_state):
    h_state["task_id"] = await create_pipeline(build_sample_pipeline(review_max_loops=2)["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_h1_routes_approved_to_export(db_pool, h_state):
    ing = await ingest(h_state["task_id"])
    await _push_to(ing["itemId"], "review")
    job = await claim_item(ing["itemId"], "w-H1")
    r = await post_result({"runId": job["runId"], "status": "success",
                           "output": {"decision": "approved"}})
    assert r.body["nextStep"] == "export"


@pytest.mark.asyncio(loop_scope="session")
async def test_h2_routes_rejected_goto_translate(db_pool, h_state):
    ing = await ingest(h_state["task_id"])
    await _push_to(ing["itemId"], "review")
    job = await claim_item(ing["itemId"], "w-H2")
    r = await post_result({"runId": job["runId"], "status": "success",
                           "output": {"decision": "rejected"}})
    assert r.body["nextStep"] == "translate"
    d = await get_item(ing["itemId"])
    assert d.body["item"]["loop_counts"]["review"] == 1


@pytest.mark.asyncio(loop_scope="session")
async def test_h3_max_loops_exceeded_stuck(db_pool, h_state):
    ing = await ingest(h_state["task_id"])
    await _push_to(ing["itemId"], "review")
    # reject 1
    job = await claim_item(ing["itemId"], "w-H3")
    await post_result({"runId": job["runId"], "status": "success", "output": {"decision": "rejected"}})
    job = await claim_item(ing["itemId"], "w-H3")
    await post_result({"runId": job["runId"], "status": "success"})
    # reject 2
    job = await claim_item(ing["itemId"], "w-H3")
    await post_result({"runId": job["runId"], "status": "success", "output": {"decision": "rejected"}})
    job = await claim_item(ing["itemId"], "w-H3")
    await post_result({"runId": job["runId"], "status": "success"})
    # reject 3 → 超 max_loops=2, stuck
    job = await claim_item(ing["itemId"], "w-H3")
    r = await post_result({"runId": job["runId"], "status": "success",
                           "output": {"decision": "rejected"}})
    assert r.body["nextStep"] == "stuck"
    d = await get_item(ing["itemId"])
    assert d.body["item"]["current_step"] == "stuck"


@pytest.mark.asyncio(loop_scope="session")
async def test_h99_teardown(db_pool, h_state):
    await delete_pipeline(h_state["task_id"])


# ═══════════════════════════════════════════════════════════
# I. Dedup
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def i_state():
    return {"task_id": "", "item_a": "", "item_b": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_i0_setup(db_pool, i_state):
    i_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])
    i_state["item_a"] = (await ingest(i_state["task_id"], {"url": "a"}))["itemId"]
    i_state["item_b"] = (await ingest(i_state["task_id"], {"url": "b"}))["itemId"]


@pytest.mark.asyncio(loop_scope="session")
async def test_i1_first_hash_keeps(db_pool, i_state):
    hash_ = unique_id("hash")
    r = await post(f"{PREFIX}/dedup/check",
                   {"taskId": i_state["task_id"], "itemId": i_state["item_a"],
                    "stepKey": "ingest", "hash": hash_, "fields": {"url": "a"}})
    assert r.status == 200
    assert r.body["kept"] is True
    assert r.body["hash"] == hash_


@pytest.mark.asyncio(loop_scope="session")
async def test_i2_collision_returns_first_item(db_pool, i_state):
    hash_ = unique_id("hash-collide")
    r1 = await post(f"{PREFIX}/dedup/check",
                    {"taskId": i_state["task_id"], "itemId": i_state["item_a"],
                     "stepKey": "ingest", "hash": hash_})
    assert r1.body["kept"] is True
    r2 = await post(f"{PREFIX}/dedup/check",
                    {"taskId": i_state["task_id"], "itemId": i_state["item_b"],
                     "stepKey": "ingest", "hash": hash_})
    assert r2.body["kept"] is False
    assert r2.body["firstItemId"] == i_state["item_a"]


@pytest.mark.asyncio(loop_scope="session")
async def test_i3_same_item_new_hash_releases_old(db_pool, i_state):
    old_hash = unique_id("old")
    new_hash = unique_id("new")
    await post(f"{PREFIX}/dedup/check",
               {"taskId": i_state["task_id"], "itemId": i_state["item_a"],
                "stepKey": "ingest", "hash": old_hash})
    r = await post(f"{PREFIX}/dedup/check",
                   {"taskId": i_state["task_id"], "itemId": i_state["item_a"],
                    "stepKey": "ingest", "hash": new_hash})
    assert r.body["kept"] is True


@pytest.mark.asyncio(loop_scope="session")
async def test_i4_invalid_uuid_rejected(db_pool, i_state):
    r = await post(f"{PREFIX}/dedup/check",
                   {"taskId": "not-a-uuid", "itemId": i_state["item_a"],
                    "stepKey": "ingest", "hash": "x"})
    assert r.status >= 400
    assert r.body.get("kept") is not True


@pytest.mark.asyncio(loop_scope="session")
async def test_i99_teardown(db_pool, i_state):
    await delete_pipeline(i_state["task_id"])


# ═══════════════════════════════════════════════════════════
# J. Dataset records (UPSERT)
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def j_state():
    return {"task_id": "", "item_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_j0_setup(db_pool, j_state):
    j_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])
    j_state["item_id"] = (await ingest(j_state["task_id"], {"title": "x"}))["itemId"]


@pytest.mark.asyncio(loop_scope="session")
async def test_j1_save_returns_id(db_pool, j_state):
    r = await post(f"{PREFIX}/dataset/records/save",
                   {"taskId": j_state["task_id"], "itemId": j_state["item_id"],
                    "payload": {"title": "x", "v": 1},
                    "metadata": {"source": "test"}})
    assert r.status == 200
    assert re.match(r"^[0-9a-f-]{36}$", r.body["id"])


@pytest.mark.asyncio(loop_scope="session")
async def test_j2_upsert_keeps_one_row(db_pool, j_state):
    await post(f"{PREFIX}/dataset/records/save",
               {"taskId": j_state["task_id"], "itemId": j_state["item_id"],
                "payload": {"title": "x", "v": 2}})
    r = await get(f"{PREFIX}/tasks/{j_state['task_id']}/records")
    assert r.status == 200
    mine = [rec for rec in r.body["records"] if rec["item_id"] == j_state["item_id"]]
    assert len(mine) == 1
    assert mine[0]["payload"]["v"] == 2


@pytest.mark.asyncio(loop_scope="session")
async def test_j99_teardown(db_pool, j_state):
    await delete_pipeline(j_state["task_id"])


# ═══════════════════════════════════════════════════════════
# K. Admin
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def k_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_k0_setup(db_pool, k_state):
    k_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_k1_admin_queue_returns_array(db_pool, k_state):
    await ingest(k_state["task_id"])
    r = await get(f"{PREFIX}/admin/queue")
    assert r.status == 200
    assert isinstance(r.body["queue"], list)
    if r.body["queue"]:
        row = r.body["queue"][0]
        assert isinstance(row["node_key"], str)
        assert isinstance(row["status"], str)
        assert isinstance(row["n"], int)


@pytest.mark.asyncio(loop_scope="session")
async def test_k2_admin_stuck_filters_only_stuck(db_pool):
    r = await get(f"{PREFIX}/admin/stuck")
    assert r.status == 200
    for it in r.body["items"]:
        assert it["current_step"] == "stuck"


@pytest.mark.asyncio(loop_scope="session")
async def test_k3_replay_returns_to_step(db_pool, k_state):
    ing = await ingest(k_state["task_id"])
    job = await claim_item(ing["itemId"], "w-K3")
    await post_result({"runId": job["runId"], "status": "success", "nextHint": "done"})
    detail = await get_item(ing["itemId"])
    assert detail.body["item"]["current_step"] == "done"
    r = await post(f"{PREFIX}/admin/items/{ing['itemId']}/replay", {"stepKey": "translate"})
    assert r.status == 200
    detail = await get_item(ing["itemId"])
    assert detail.body["item"]["current_step"] == "translate"
    assert any(x["step_key"] == "translate" for x in detail.body["inflight"])


@pytest.mark.asyncio(loop_scope="session")
async def test_k4_replay_invalid_step_400(db_pool, k_state):
    ing = await ingest(k_state["task_id"])
    r = await post(f"{PREFIX}/admin/items/{ing['itemId']}/replay", {"stepKey": "no-such"})
    assert r.status == 400
    assert r.body["error"]["code"] == "INVALID_STEP"


@pytest.mark.asyncio(loop_scope="session")
async def test_k99_teardown(db_pool, k_state):
    await delete_pipeline(k_state["task_id"])


# ═══════════════════════════════════════════════════════════
# L. save 与 in-flight 冲突
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def l_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_l0_setup(db_pool, l_state):
    l_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_l1_save_removing_inflight_step_409(db_pool, l_state):
    await ingest(l_state["task_id"])
    r = await post(f"{PREFIX}/pipelines/{l_state['task_id']}/save",
                   {"steps": [{"key": "export", "nodeKey": "export", "params": {"format": "json"}}]})
    assert r.status == 409
    assert r.body["error"]["code"] == "INFLIGHT_STEPS_CONFLICT"
    assert isinstance(r.body["error"]["conflicts"], list)


@pytest.mark.asyncio(loop_scope="session")
async def test_l2_save_same_keys_succeeds(db_pool, l_state):
    r = await post(f"{PREFIX}/pipelines/{l_state['task_id']}/save",
                   {"steps": build_sample_pipeline()["steps"]})
    assert r.status == 200


@pytest.mark.asyncio(loop_scope="session")
async def test_l99_teardown(db_pool, l_state):
    await delete_pipeline(l_state["task_id"])


# ═══════════════════════════════════════════════════════════
# M. 看板聚合
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def m_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_m0_setup(db_pool, m_state):
    m_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_m1_kanban_returns_four_columns(db_pool, m_state):
    r = await get(f"{PREFIX}/tasks/{m_state['task_id']}/kanban")
    assert r.status == 200
    keys = [s["stepKey"] for s in r.body["steps"]]
    assert keys == ["ingest", "translate", "review", "export"]


@pytest.mark.asyncio(loop_scope="session")
async def test_m2_kanban_includes_just_ingested(db_pool, m_state):
    ing = await ingest(m_state["task_id"], {"from": "kanban"})
    r = await get(f"{PREFIX}/tasks/{m_state['task_id']}/kanban")
    ingest_col = next(s for s in r.body["steps"] if s["stepKey"] == "ingest")
    found = next((x for x in ingest_col["items"] if x["item"]["id"] == ing["itemId"]), None)
    assert found is not None


@pytest.mark.asyncio(loop_scope="session")
async def test_m99_teardown(db_pool, m_state):
    await delete_pipeline(m_state["task_id"])


# ═══════════════════════════════════════════════════════════
# O. 同 pipeline 多 item 并行
# ═══════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def o_state():
    return {"task_id": ""}


@pytest.mark.asyncio(loop_scope="session")
async def test_o0_setup(db_pool, o_state):
    o_state["task_id"] = await create_pipeline(build_sample_pipeline()["steps"])


@pytest.mark.asyncio(loop_scope="session")
async def test_o1_5_items_independent_envelopes(db_pool, o_state):
    items = await asyncio.gather(*(
        ingest(o_state["task_id"], {"idx": i, "tag": f"O1-{i}"}) for i in range(1, 6)
    ))
    lease = await post(f"{PREFIX}/queue/ingest/lease",
                       {"workerId": "w-O1", "batchSize": 50})
    my_jobs = [j for j in lease.body["jobs"] if j["taskId"] == o_state["task_id"]]
    others = [j for j in lease.body["jobs"] if j["taskId"] != o_state["task_id"]]
    assert len(my_jobs) == 5
    seen = set()
    for job in my_jobs:
        assert job["itemId"] not in seen
        seen.add(job["itemId"])
        assert isinstance(job["envelope"]["payload"]["idx"], int)
        assert re.match(r"^O1-\d+$", str(job["envelope"]["payload"]["tag"]))
    await asyncio.gather(*(
        post_result({"runId": j["runId"], "status": "success",
                     "output": {"itemTag": j["envelope"]["payload"]["tag"]}})
        for j in my_jobs
    ))
    for j in others:
        await post(f"{PREFIX}/queue/lease/{j['runId']}/release", {"workerId": "w-O1"})
    for it in items:
        d = await get_item(it["itemId"])
        assert d.body["item"]["envelope"]["outputs"]["ingest"]["itemTag"] == \
            f"O1-{d.body['item']['envelope']['payload']['idx']}"
        assert d.body["item"]["current_step"] == "translate"


@pytest.mark.asyncio(loop_scope="session")
async def test_o2_three_workers_no_overlap(db_pool, o_state):
    items = await asyncio.gather(*(
        ingest(o_state["task_id"], {"batch": "O2", "n": i}) for i in range(1, 6)
    ))
    r1, r2, r3 = await asyncio.gather(
        post(f"{PREFIX}/queue/ingest/lease", {"workerId": "wA", "batchSize": 50}),
        post(f"{PREFIX}/queue/ingest/lease", {"workerId": "wB", "batchSize": 50}),
        post(f"{PREFIX}/queue/ingest/lease", {"workerId": "wC", "batchSize": 50}),
    )
    all_jobs = (
        [(j, "wA") for j in r1.body["jobs"]] +
        [(j, "wB") for j in r2.body["jobs"]] +
        [(j, "wC") for j in r3.body["jobs"]]
    )
    ids = set()
    for j, _ in all_jobs:
        assert j["runId"] not in ids
        ids.add(j["runId"])
    my_items = {x["itemId"] for x in items}
    my_jobs = [(j, w) for j, w in all_jobs if j["itemId"] in my_items]
    assert len(my_jobs) == 5
    for j, w in all_jobs:
        if j["itemId"] in my_items:
            await post_result({"runId": j["runId"], "status": "success"})
        else:
            await post(f"{PREFIX}/queue/lease/{j['runId']}/release", {"workerId": w})


@pytest.mark.asyncio(loop_scope="session")
async def test_o99_teardown(db_pool, o_state):
    await delete_pipeline(o_state["task_id"])


# ═══════════════════════════════════════════════════════════
# P. 多 pipeline 并行
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_p1_three_pipelines_independent(db_pool):
    pipelines = await asyncio.gather(*(
        create_pipeline(build_sample_pipeline()["steps"], name=unique_id(f"P1-{c}"))
        for c in "abc"
    ))
    try:
        ingested = await asyncio.gather(*(
            ingest(tid, {"from": f"P1-{i}"}) for i, tid in enumerate(pipelines)
        ))
        for step_key in ("ingest", "translate", "review", "export"):
            lease = await post(f"{PREFIX}/queue/{step_key}/lease",
                               {"workerId": f"w-P1-{step_key}", "batchSize": 50})
            target_ids = {x["itemId"] for x in ingested}
            mine = [j for j in lease.body["jobs"] if j["itemId"] in target_ids]
            assert len(mine) == 3, f"{step_key} 三条 pipeline 应各贡献一条 job"
            others = [j for j in lease.body["jobs"] if j["itemId"] not in target_ids]
            for o in others:
                await post(f"{PREFIX}/queue/lease/{o['runId']}/release",
                           {"workerId": f"w-P1-{step_key}"})
            await asyncio.gather(*(
                post_result({"runId": j["runId"], "status": "success",
                             "output": {"decision": "approved"} if step_key == "review"
                                       else {"ok": True}})
                for j in mine
            ))
        for it in ingested:
            d = await get_item(it["itemId"])
            assert d.body["item"]["current_step"] == "done"
    finally:
        await asyncio.gather(*(delete_pipeline(t) for t in pipelines))


# ═══════════════════════════════════════════════════════════
# Q. retry 退避按节点配置生效
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_q1_base_backoff_ms_respected(db_pool):
    import time
    task_id = await create_pipeline(
        build_sample_pipeline(base_backoff_ms=200, max_attempts=3)["steps"]
    )
    try:
        ing = await ingest(task_id, {"backoff": 200})
        job = await claim_item(ing["itemId"], "w-Q1")
        t0 = time.time() * 1000
        r = await post_result({
            "runId": job["runId"], "status": "failed",
            "error": {"code": "X", "message": "transient", "retryable": True},
        })
        from datetime import datetime
        expected = datetime.fromisoformat(r.body["retryAt"].replace("Z", "+00:00")).timestamp() * 1000
        assert expected - t0 >= 180, f"retryAt 应至少在 200ms 后, 实际 {expected - t0}ms"
    finally:
        await delete_pipeline(task_id)


# ═══════════════════════════════════════════════════════════
# N. 端到端 happy path
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_n1_happy_path_ingest_translate_review_export(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        res = await ingest(task_id, {"text": "happy"})
        item_id = res["itemId"]

        job = await claim_item(item_id, "w-N1")
        await post_result({"runId": job["runId"], "status": "success",
                           "output": {"ingested": True}})
        job = await claim_item(item_id, "w-N1")
        await post_result({"runId": job["runId"], "status": "success",
                           "output": {"translated": "你好"}})
        job = await claim_item(item_id, "w-N1")
        await post_result({"runId": job["runId"], "status": "success",
                           "output": {"decision": "approved"}})
        job = await claim_item(item_id, "w-N1")
        await post_result({"runId": job["runId"], "status": "success",
                           "output": {"exported": True}})

        detail = await get_item(item_id)
        assert detail.body["item"]["current_step"] == "done"
        assert len(detail.body["history"]) == 4
        assert [h["step_key"] for h in detail.body["history"]] == \
            ["ingest", "translate", "review", "export"]
        assert len(detail.body["item"]["envelope"]["outputs"]) == 4
    finally:
        await delete_pipeline(task_id)
