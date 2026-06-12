"""
R/T/U/X/Y/Z/Z2 — 与 api.e2e.test.ts 同名 section 1:1.
"""
from __future__ import annotations
import asyncio
import re
import time
from typing import Any

import httpx
import pytest
import pytest_asyncio

from scheduler.db import as_system

from .helpers import (
    BASE,
    PREFIX,
    build_sample_pipeline,
    claim_item,
    create_pipeline,
    delete,
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
# R. Idempotency-Key on /items/create + /result
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_r1_no_key_creates_two(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        a = await post(f"{PREFIX}/items/create",
                       {"taskId": task_id, "envelope": {"payload": {"v": 1}}})
        b = await post(f"{PREFIX}/items/create",
                       {"taskId": task_id, "envelope": {"payload": {"v": 1}}})
        assert a.status == 200
        assert b.status == 200
        assert a.body["itemId"] != b.body["itemId"]
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_r2_same_key_same_body_replays(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    key = f"idem-{unique_id('k')}-aaaaaaaa"
    try:
        a = await post(f"{PREFIX}/items/create",
                       {"taskId": task_id, "envelope": {"payload": {"v": 1}}},
                       {"Idempotency-Key": key})
        b = await post(f"{PREFIX}/items/create",
                       {"taskId": task_id, "envelope": {"payload": {"v": 1}}},
                       {"Idempotency-Key": key})
        assert a.status == 200
        assert b.status == 200
        assert a.body["itemId"] == b.body["itemId"]
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_r3_same_key_different_body_returns_hash_mismatch(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    key = f"idem-{unique_id('k')}-bbbbbbbb"
    try:
        a = await post(f"{PREFIX}/items/create",
                       {"taskId": task_id, "envelope": {"payload": {"v": 1}}},
                       {"Idempotency-Key": key})
        assert a.status == 200
        b = await post(f"{PREFIX}/items/create",
                       {"taskId": task_id, "envelope": {"payload": {"v": 999}}},
                       {"Idempotency-Key": key})
        assert b.status == 409
        assert b.body["error"]["code"] == "IDEMPOTENCY_HASH_MISMATCH"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_r4_result_with_idempotency_key_replays(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    key = f"idem-result-{unique_id('k')}-cccccccc"
    try:
        ing = await ingest(task_id, {"v": 1})
        job = await claim_item(ing["itemId"], "w-idem", lease_seconds=60)
        body = {"runId": job["runId"], "status": "success", "output": {"ok": 1}}
        a = await post(f"{PREFIX}/result", body, {"Idempotency-Key": key})
        b = await post(f"{PREFIX}/result", body, {"Idempotency-Key": key})
        assert a.status == 200
        assert b.status == 200
        assert b.body["applied"] == a.body["applied"]
        if a.body.get("nextStep"):
            assert b.body["nextStep"] == a.body["nextStep"]
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_r5_short_key_returns_400(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        r = await post(f"{PREFIX}/items/create",
                       {"taskId": task_id, "envelope": {"payload": {}}},
                       {"Idempotency-Key": "x"})
        assert r.status == 400
        assert r.body["error"]["code"] == "BAD_IDEMPOTENCY_KEY"
    finally:
        await delete_pipeline(task_id)


# ═══════════════════════════════════════════════════════════
# T. Pipeline 版本化 + 表单接口
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_t1_forms_returns_version_and_etag(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        r = await get(f"{PREFIX}/pipelines/{task_id}/forms")
        assert r.status == 200
        assert isinstance(r.body["version"], int)
        assert isinstance(r.body["forms"], dict)
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_t2_forms_etag_returns_304(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        url = f"{BASE}{PREFIX}/pipelines/{task_id}/forms"
        async with httpx.AsyncClient(timeout=30.0, trust_env=False) as ac:
            r1 = await ac.get(url)
        etag = r1.headers.get("etag")
        assert etag, "首次请求应带 ETag"
        async with httpx.AsyncClient(timeout=30.0, trust_env=False) as ac:
            r2 = await ac.get(url, headers={"if-none-match": etag})
        assert r2.status_code == 304
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_t3_save_creates_version_inflight_uses_old(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        ing = await ingest(task_id, {"v": 1})
        r = await post(f"{PREFIX}/pipelines/{task_id}/save",
                       {"layout": {"positions": {"ingest": {"x": 1, "y": 2}}}})
        assert r.status == 200
        # 用 claim_item 精确抓自己的 run, 不被并行 ingest 队列干扰
        job = await claim_item(ing["itemId"], "w-pv")
        res = await post_result({"runId": job["runId"], "status": "success"})
        assert res.body["applied"] is True
    finally:
        await delete_pipeline(task_id)


# ═══════════════════════════════════════════════════════════
# U. audit_log
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_u1_pipeline_create_writes_audit(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        await sleep(200)
        async def _q(conn):
            return await conn.fetch(
                """SELECT action, resource->>'id' AS rid FROM audit_log
                   WHERE action = 'pipeline.create' AND resource->>'id' = $1""",
                task_id,
            )
        rows = await as_system(_q)
        assert len(rows) >= 1, "audit_log 应有 pipeline.create 行"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_u2_audit_log_append_only(db_pool):
    err: Exception | None = None
    try:
        async def _u(conn):
            await conn.execute(
                "UPDATE audit_log SET action = 'tampered' "
                "WHERE id = (SELECT id FROM audit_log LIMIT 1)"
            )
        await as_system(_u)
    except Exception as e:
        err = e
    assert err is not None, "UPDATE audit_log 应被 trigger 拒绝"
    assert re.search(r"append-only|forbidden", str(err), re.IGNORECASE)


@pytest.mark.asyncio(loop_scope="session")
async def test_u3_audit_log_carries_trace_id_and_request_id(db_pool):
    # 32 hex trace_id + 16 hex span_id + 2 hex flags
    trace_id = "abcd1234abcd1234abcd1234abcd1234"
    traceparent = f"00-{trace_id}-1234567890abcdef-01"
    req_id = unique_id("req")
    name = unique_id("pipeline-trace")
    r = await post(
        f"{PREFIX}/pipelines/create",
        {"name": name, "steps": build_sample_pipeline()["steps"]},
        headers={"traceparent": traceparent, "x-request-id": req_id},
    )
    assert r.status == 200, r.body
    task_id = r.body["task_id"]
    try:
        await sleep(300)
        async def _q(conn):
            return await conn.fetch(
                """SELECT trace_id, request_id FROM audit_log
                   WHERE action='pipeline.create' AND resource->>'id'=$1""",
                task_id,
            )
        rows = await as_system(_q)
        assert rows, "audit_log 应有 pipeline.create 行"
        assert rows[0]["trace_id"] == trace_id, f"trace_id 未写入: {rows[0]['trace_id']}"
        assert rows[0]["request_id"] == req_id, f"request_id 未写入: {rows[0]['request_id']}"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_u4_audit_log_truncates_large_before_after(db_pool):
    # node.update 把 body 整个塞进 audit.after; 找个非 archived 节点更新一个超 4 KiB 的字段
    big = "x" * 5500
    # 走 review 节点 (人工节点, params 自由) 的 PATCH
    body = {"description": big}
    r = await req("PATCH", f"{PREFIX}/admin/nodes/review/1.0", body=body)
    assert r.status in (200, 404), r.body
    if r.status == 404:
        pytest.skip("review@1.0 节点未 seed, 跳过截断 e2e")
    await sleep(300)
    async def _q(conn):
        return await conn.fetch(
            """SELECT after FROM audit_log
               WHERE action='node.update' AND resource->>'id'='review@1.0'
               ORDER BY id DESC LIMIT 1"""
        )
    rows = await as_system(_q)
    assert rows, "audit_log 应有 node.update 行"
    after_raw = rows[0]["after"]
    import json as _json
    after_json = _json.loads(after_raw) if isinstance(after_raw, str) else after_raw
    assert isinstance(after_json, dict) and after_json.get("_truncated") is True, \
        f"超大 after 应被截断, got {type(after_json)}: {str(after_json)[:200]}"
    assert after_json["_length"] > 4096
    assert isinstance(after_json["_head"], str) and len(after_json["_head"]) <= 4096


# ═══════════════════════════════════════════════════════════
# X. Driver Registry e2e — sandbox-js (依赖 tsx 在 PATH)
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_x1_sandbox_js_via_autoworker(db_pool):
    from scheduler.drivers.sandbox_js import _resolve_tsx
    if _resolve_tsx() is None:
        pytest.skip("tsx 未找到 (装 backend/node_modules 或全局 tsx)")

    async def _q(conn):
        return await conn.fetchrow(
            "SELECT task_id FROM pipelines WHERE name = '示例: 脚本预处理' LIMIT 1"
        )
    pipe = await as_system(_q)
    if not pipe:
        pytest.skip("seed 未注入 '示例: 脚本预处理'")
    task_id = str(pipe["task_id"])
    ing = await ingest(task_id, {"text": "Hello Sandbox World"})

    ingest_out: dict[str, Any] | None = None
    deadline = time.time() + 15.0
    while time.time() < deadline:
        item = await get_item(ing["itemId"])
        ingest_out = item.body["item"]["envelope"]["outputs"].get("ingest")
        if ingest_out:
            break
        await sleep(500)
    assert ingest_out, "sandbox driver 未在 15s 内回写"
    assert ingest_out["normalized"] == "hello sandbox world"
    assert ingest_out["wordCount"] == 3
    assert ingest_out["charCount"] == 19
    assert isinstance(ingest_out["hash"], str) and len(ingest_out["hash"]) > 0
    item = await get_item(ing["itemId"])
    assert item.body["item"]["current_step"] == "review"


# ═══════════════════════════════════════════════════════════
# Y. 节点输出隔离不变量
# ═══════════════════════════════════════════════════════════

@pytest.mark.asyncio(loop_scope="session")
async def test_y1_output_payload_key_does_not_pollute_envelope(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        ing = await ingest(task_id, {"original": "ground-truth"})
        before_item = await get_item(ing["itemId"])
        job = await claim_item(ing["itemId"], "w-iso")
        await post_result({
            "runId": job["runId"], "status": "success",
            "output": {
                "payload": {"hijacked": True},
                "tags": {"evil": "tag"},
                "translate": {"otherStep": "stolen"},
                "ok": 1,
            },
        })
        after_item = await get_item(ing["itemId"])
        assert after_item.body["item"]["envelope"]["payload"] == \
            before_item.body["item"]["envelope"]["payload"]
        assert after_item.body["item"]["envelope"]["tags"] == \
            before_item.body["item"]["envelope"]["tags"]
        translate_out = after_item.body["item"]["envelope"]["outputs"].get("translate")
        assert translate_out is None
        assert after_item.body["item"]["envelope"]["outputs"]["ingest"]["ok"] == 1
        assert after_item.body["item"]["envelope"]["outputs"]["ingest"]["payload"]["hijacked"] is True
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_y2_output_not_object_returns_400(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        ing = await ingest(task_id, {})
        job = await claim_item(ing["itemId"], "w-iso2")
        r = await post_result({
            "runId": job["runId"], "status": "success",
            "output": ["not", "an", "object"],
        })
        assert r.status == 400, r.body
        assert r.body["error"]["code"] in ("BAD_REQUEST", "BAD_OUTPUT")
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_y3_output_too_large_returns_400(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        ing = await ingest(task_id, {})
        job = await claim_item(ing["itemId"], "w-iso3")
        huge = "x" * (64 * 1024 + 100)
        r = await post_result({
            "runId": job["runId"], "status": "success",
            "output": {"blob": huge},
        })
        assert r.status == 400
        assert r.body["error"]["code"] == "OUTPUT_TOO_LARGE"
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_y4_envelope_payload_immutable_trigger(db_pool):
    task_id = await create_pipeline(build_sample_pipeline()["steps"])
    try:
        ing = await ingest(task_id, {"protected": "原始数据"})
        err: Exception | None = None
        try:
            async def _u(conn):
                await conn.execute(
                    """UPDATE items
                          SET envelope = jsonb_set(envelope, '{payload}', '{"tampered":true}'::jsonb)
                        WHERE id = $1::uuid""",
                    ing["itemId"],
                )
            await as_system(_u)
        except Exception as e:
            err = e
        assert err is not None, "DB trigger 应拒绝 payload 修改"
        assert re.search(r"payload is immutable", str(err), re.IGNORECASE)
    finally:
        await delete_pipeline(task_id)


# ═══════════════════════════════════════════════════════════
# Z. Phase 2: 服务端 merge — defaults + step.params + pin
# ═══════════════════════════════════════════════════════════

Z_KEY = "z_test_merge"


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def _z_setup(db_pool):
    async def _ins(conn):
        await conn.execute(
            """INSERT INTO node_definitions
                 (key, version, display_name, params_schema, presets,
                  idempotent, default_timeout_ms, default_max_attempts, manual)
               VALUES ($1, '1.0', 'Z Test Merge', '{"type":"object"}'::jsonb,
                       $2::jsonb, true, 30000, 3, false)
               ON CONFLICT (key, version) DO UPDATE SET presets = EXCLUDED.presets""",
            Z_KEY,
            '{"defaults":{"foo":"default_foo","bar":"default_bar"},'
            '"constants":{"sentinel":"constants_locked","maxThing":42},'
            '"pin":["sentinel","maxThing"]}',
        )
    await as_system(_ins)
    task_id = await create_pipeline([{
        "key": "merge_step", "nodeKey": Z_KEY,
        "params": {"bar": "step_override", "sentinel": "EVIL_FROM_STEP_PARAMS"},
    }])
    await ingest(task_id, {"text": "hi"})
    yield task_id
    await delete_pipeline(task_id)

    async def _cleanup(conn):
        await conn.execute("DELETE FROM node_definitions WHERE key = $1", Z_KEY)
    await as_system(_cleanup)


@pytest.mark.asyncio(loop_scope="session")
async def test_z1_lease_returns_merged_params(_z_setup):
    job = await lease_one(Z_KEY, "z1-worker", lease_seconds=60)
    assert job is not None
    assert job["params"]["foo"] == "default_foo"
    assert job["params"]["bar"] == "step_override"
    assert job["params"]["sentinel"] == "constants_locked"
    assert job["params"]["maxThing"] == 42
    assert job["nodeVersion"] == "1.0"


# ═══════════════════════════════════════════════════════════
# Z2. Phase 3: inputs 绑定 resolver
# ═══════════════════════════════════════════════════════════

Z2_KEY = "z2_test_inputs"


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def _z2_setup(db_pool):
    async def _ins(conn):
        await conn.execute(
            """INSERT INTO node_definitions
                 (key, version, display_name, params_schema, inputs_schema,
                  idempotent, default_timeout_ms, default_max_attempts, manual)
               VALUES ($1, '1.0', 'Z2 Test Inputs', '{"type":"object"}'::jsonb,
                       $2::jsonb, true, 30000, 3, false)
               ON CONFLICT (key, version) DO UPDATE SET inputs_schema = EXCLUDED.inputs_schema""",
            Z2_KEY,
            '{"type":"object","properties":'
            '{"text":{"type":"string","defaultBinding":"{{payload.text}}"},'
            '"explicit":{"type":"string"},'
            '"missing_def":{"type":"string","defaultBinding":"{{payload.notfound}}"}}}',
        )
    await as_system(_ins)
    task_id = await create_pipeline([{
        "key": "merge_step", "nodeKey": Z2_KEY,
        "params": {},
        "inputs": {
            "text": "{{payload.alt_text}}",
            "explicit": "literal_value",
            "greeting": "Hi {{payload.name}}!",
            "deep": "{{payload.nested}}",
            "blank": "",
        },
    }])
    await ingest(task_id, {
        "alt_text": "from_alt",
        "name": "world",
        "nested": {"k": "v", "n": 9},
        "text": "should_not_be_used_because_explicit_override",
    })
    yield task_id
    await delete_pipeline(task_id)

    async def _cleanup(conn):
        await conn.execute("DELETE FROM node_definitions WHERE key = $1", Z2_KEY)
    await as_system(_cleanup)


@pytest.mark.asyncio(loop_scope="session")
async def test_z2_1_lease_returns_resolved_inputs(_z2_setup):
    job = await lease_one(Z2_KEY, "z2-worker", lease_seconds=60)
    assert job is not None
    assert job["inputs"]["text"] == "from_alt"
    assert job["inputs"]["explicit"] == "literal_value"
    assert job["inputs"]["greeting"] == "Hi world!"
    assert job["inputs"]["deep"] == {"k": "v", "n": 9}
    assert job["inputs"]["blank"] == ""
    assert job["inputs"].get("missing_def") is None


@pytest.mark.asyncio(loop_scope="session")
async def test_z2_2_legacy_pipeline_uses_default_binding(db_pool):
    """老 pipeline (无 step.inputs) 走 inputs_schema.text.defaultBinding = {{payload.text}}."""
    bc_task = await create_pipeline([
        {"key": "translate_step", "nodeKey": "llm_translate", "params": {"targetLang": "zh"}},
    ])
    try:
        await ingest(bc_task, {"text": "hello world"})
        job = await lease_one("llm_translate", "z2-2-worker", lease_seconds=60)
        assert job is not None
        assert job["inputs"]["text"] == "hello world"
    finally:
        await delete_pipeline(bc_task)
