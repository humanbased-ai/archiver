"""
Driver Registry / resolveBindings / merge / DB drift / llm_translate
— 与 backend/test/drivers.test.ts 1:1.

未翻译部分:
  - W1-W3: Node 'vm' 模块直测; Python 走 tsx 子进程, 等价 sandbox 行为在 e2e
    主路径里反复覆盖, 这里不重复.
"""
from __future__ import annotations
from typing import Any

import pytest

from scheduler.drivers.registry import (
    Driver, DriverJob,
    register_driver, pick_driver, auto_node_keys,
    to_failed_result, to_result_body,
)


def _fake_job(**overrides: Any) -> DriverJob:
    defaults: dict[str, Any] = {
        "run_id": "run-1",
        "item_id": "item-1",
        "task_id": "task-1",
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "step_key": "ingest",
        "node_key": "ingest",
        "node_version": None,
        "params": {},
        "inputs": {},
        "envelope": {"payload": {}, "outputs": {}, "tags": {}},
        "ctx": {"runId": "run-1", "attempt": 1, "deadline": None},
    }
    defaults.update(overrides)
    return DriverJob(**defaults)


# ─────────────────────────────────────────────────────────────────────────────
# V. Registry
# ─────────────────────────────────────────────────────────────────────────────

async def _ok_handle(_j: DriverJob):
    return {"status": "success", "output": {"ok": True}}


def test_v1_pick_driver_exact_node_key():
    register_driver(Driver(name="test:exact", node_key="translate", handle=_ok_handle))
    picked = pick_driver(_fake_job(node_key="translate"))
    assert picked is not None and picked.name == "test:exact"


def test_v2_wildcard_fallback_after_exact():
    register_driver(Driver(
        name="test:wildcard", node_key="*",
        enable=lambda j: j.params.get("useWildcard") is True,
        handle=_ok_handle,
    ))
    picked = pick_driver(_fake_job(node_key="unknown-node", params={"useWildcard": True}))
    assert picked is not None and picked.name == "test:wildcard"
    miss = pick_driver(_fake_job(node_key="unknown-node", params={"useWildcard": False}))
    assert miss is None


def test_v3_multi_drivers_dispatched_via_enable():
    register_driver(Driver(
        name="test:source-a", node_key="test-multi",
        enable=lambda j: j.params.get("source") == "a",
        handle=_ok_handle,
    ))
    register_driver(Driver(
        name="test:source-b", node_key="test-multi",
        enable=lambda j: j.params.get("source") == "b",
        handle=_ok_handle,
    ))
    assert pick_driver(_fake_job(node_key="test-multi", params={"source": "a"})).name == "test:source-a"
    assert pick_driver(_fake_job(node_key="test-multi", params={"source": "b"})).name == "test:source-b"
    assert pick_driver(_fake_job(node_key="test-multi", params={"source": "c"})) is None


def test_v4_auto_node_keys_excludes_wildcard():
    keys = auto_node_keys()
    assert "*" not in keys


def test_v5_to_failed_result_and_to_result_body():
    failed = to_failed_result(Exception("boom"), "TEST_ERR")
    body = to_result_body("run-x", failed)
    assert body["runId"] == "run-x"
    assert body["status"] == "failed"
    assert body["error"]["code"] == "TEST_ERR"
    assert "boom" in body["error"]["message"]


# ─────────────────────────────────────────────────────────────────────────────
# X. llm_translate driver — 三层配置 (Python 已实现的部分)
# ─────────────────────────────────────────────────────────────────────────────

def test_x10_merge_step_params_defaults_from_presets():
    from scheduler.node_config import merge_effective_params, NodePresets
    eff = merge_effective_params(
        {"targetLang": "zh"},
        NodePresets(defaults={"model": "default-model", "timeoutMs": 60000}, pin=[]),
    )
    assert eff["model"] == "default-model"
    assert eff["targetLang"] == "zh"
    assert eff["timeoutMs"] == 60000


def test_x11_pin_overrides_step_params():
    from scheduler.node_config import merge_effective_params, NodePresets
    eff = merge_effective_params(
        {"targetLang": "zh", "systemPrompt": "EVIL OVERRIDE", "maxTokens": 999999},
        NodePresets(
            constants={"systemPrompt": "SAFE PROMPT {{targetLang}}", "maxTokens": 2048},
            pin=["systemPrompt", "maxTokens"],
        ),
    )
    assert eff["systemPrompt"] == "SAFE PROMPT {{targetLang}}", "pin 字段必须来自 constants"
    assert eff["maxTokens"] == 2048
    assert eff["targetLang"] == "zh", "非 pin 字段不受影响"


# ─────────────────────────────────────────────────────────────────────────────
# X14a. drift: 注册 + auto-upsert 后, DB node_definitions 行必须与 driver 一致
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_x14a_db_drift_matches_collected_definitions(db_pool):
    """生产 autoworker 启动跑的就是这条路径; 检查 driver 自描述 → DB 无漂."""
    from scheduler.db import as_system
    from scheduler.drivers._upsert import upsert_collected_node_definitions
    from scheduler.drivers.dedup import register_dedup_driver
    from scheduler.drivers.export import register_export_driver
    from scheduler.drivers.sandbox_js import register_sandbox_js_driver
    from scheduler.drivers.compute import register_compute_driver

    register_dedup_driver()
    register_export_driver()
    register_sandbox_js_driver()
    register_compute_driver()
    await upsert_collected_node_definitions()

    from scheduler.drivers import dedup, export, sandbox_js, compute
    cases = [
        ("dedup",   dedup.NODE_DEFINITION),
        ("export",  export.NODE_DEFINITION),
        ("script",  sandbox_js.NODE_DEFINITION),
        ("compute", compute.NODE_DEFINITION),
    ]
    for nd_key, nd in cases:
        async def _q(conn):
            return await conn.fetch(
                """SELECT display_name, params_schema, ui_schema, presets, inputs_schema,
                          idempotent, default_timeout_ms, default_max_attempts, manual
                     FROM node_definitions WHERE key = $1 AND version = $2""",
                nd["key"], nd["version"],
            )
        rows = await as_system(_q)
        assert len(rows) == 1, f"{nd['key']}@{nd['version']} 行必须存在"
        r = rows[0]
        assert r["display_name"] == nd["displayName"], f"{nd_key}: display_name 漂"
        assert r["params_schema"] == nd.get("paramsSchema"), f"{nd_key}: params_schema 漂"
        assert r["ui_schema"] == nd.get("uiSchema"), f"{nd_key}: ui_schema 漂"
        assert r["presets"] == nd.get("presets"), f"{nd_key}: presets 漂"
        assert r["inputs_schema"] == nd.get("inputsSchema"), f"{nd_key}: inputs_schema 漂"
        assert r["idempotent"] == nd.get("idempotent", False), f"{nd_key}: idempotent 漂"
        assert r["default_timeout_ms"] == nd.get("defaultTimeoutMs", 30000), f"{nd_key}: default_timeout_ms 漂"
        assert r["default_max_attempts"] == nd.get("defaultMaxAttempts", 3), f"{nd_key}: default_max_attempts 漂"
        assert r["manual"] == nd.get("manual", False), f"{nd_key}: manual 漂"


def test_x15_pick_driver_three_round_dispatch():
    """精确 (nodeKey, nodeVersion) → nodeKey only → 通配."""
    register_driver(Driver(
        name="test:multi-v1", node_key="test_multi_ver",
        node_definition={"key": "test_multi_ver", "version": "1.0", "displayName": "v1", "paramsSchema": {}},
        handle=_ok_handle,
    ))
    register_driver(Driver(
        name="test:multi-v2", node_key="test_multi_ver",
        node_definition={"key": "test_multi_ver", "version": "2.0", "displayName": "v2", "paramsSchema": {}},
        handle=_ok_handle,
    ))
    job1 = _fake_job(node_key="test_multi_ver", node_version="1.0")
    job2 = _fake_job(node_key="test_multi_ver", node_version="2.0")
    job_x = _fake_job(node_key="test_multi_ver", node_version="3.0")
    job_n = _fake_job(node_key="test_multi_ver")
    assert pick_driver(job1).name == "test:multi-v1"
    assert pick_driver(job2).name == "test:multi-v2"
    assert pick_driver(job_x).name == "test:multi-v1", "version 不匹配应 fallback nodeKey-only"
    assert pick_driver(job_n).name == "test:multi-v1", "未提供 nodeVersion 应 fallback nodeKey-only"


# ─────────────────────────────────────────────────────────────────────────────
# R. resolveBindings (Phase 3) — {{path}} 表达式求值
# ─────────────────────────────────────────────────────────────────────────────

_CTX = {
    "payload": {"text": "hello", "num": 42, "nested": {"a": "A", "b": {"c": 7}}},
    "outputs": {"collect": {"result": "from_upstream", "arr": [1, 2, 3]}},
    "tags":    {"batch": "b-001"},
}


def test_r1_literal_string_passthrough():
    from scheduler.node_config import resolve_bindings
    r = resolve_bindings({"a": "literal", "b": "", "c": 123}, {}, _CTX)
    assert r["a"] == "literal"
    assert r["b"] == ""
    assert r["c"] == 123


def test_r2_full_template_preserves_type():
    from scheduler.node_config import resolve_bindings
    r = resolve_bindings({
        "text": "{{payload.text}}",
        "num":  "{{payload.num}}",
        "arr":  "{{outputs.collect.arr}}",
        "obj":  "{{payload.nested}}",
    }, {}, _CTX)
    assert r["text"] == "hello"
    assert r["num"] == 42
    assert r["arr"] == [1, 2, 3]
    assert r["obj"] == {"a": "A", "b": {"c": 7}}


def test_r3_partial_template_returns_string():
    from scheduler.node_config import resolve_bindings
    r = resolve_bindings({
        "g": "Hello {{payload.text}}!",
        "nested": "[{{payload.nested.b.c}}]",
    }, {}, _CTX)
    assert r["g"] == "Hello hello!"
    assert r["nested"] == "[7]"


def test_r4_missing_path():
    from scheduler.node_config import resolve_bindings
    r = resolve_bindings({
        "gone":    "{{payload.notfound}}",
        "partial": "x={{payload.notfound}};y",
    }, {}, _CTX)
    assert r["gone"] is None
    assert r["partial"] == "x=;y"


def test_r5_schema_default_binding_fallback():
    from scheduler.node_config import resolve_bindings
    r = resolve_bindings(
        {"other": "{{payload.text}}"},
        {"text": {"defaultBinding": "{{payload.text}}"}},
        _CTX,
    )
    assert r["text"] == "hello", "schema 默认绑定应触发"
    assert r["other"] == "hello"


def test_r6_explicit_empty_string_is_literal_not_default():
    from scheduler.node_config import resolve_bindings
    r = resolve_bindings(
        {"text": ""},
        {"text": {"defaultBinding": "{{payload.text}}"}},
        _CTX,
    )
    assert r["text"] == "", "显式空 = 字面量 '', 不应回退到 defaultBinding"


def test_r7_forbidden_keys_blocked():
    from scheduler.node_config import resolve_bindings, get_path
    # Node 测试三个 forbidden key 都是路径内, Python resolve_bindings 还会过滤外层 key 名,
    # 'prototype' 作为 out 的 key 会被早过滤 (Node 用 obj.prototype access 不抛, Python KeyError).
    # 用 .get(...) 兼容两种语义.
    r = resolve_bindings({
        "proto":     "{{payload.__proto__}}",
        "ctor":      "{{payload.constructor}}",
        "prototype": "{{payload.nested.prototype}}",
    }, {}, _CTX)
    assert r.get("proto") is None
    assert r.get("ctor") is None
    assert r.get("prototype") is None
    assert get_path({"a": 1}, "__proto__") is None


def test_r8_outputs_and_tags_namespaces():
    from scheduler.node_config import resolve_bindings
    r = resolve_bindings({
        "fromUpstream": "{{outputs.collect.result}}",
        "fromTag":      "{{tags.batch}}",
    }, {}, _CTX)
    assert r["fromUpstream"] == "from_upstream"
    assert r["fromTag"] == "b-001"


# ─────────────────────────────────────────────────────────────────────────────
# X. llm_translate driver — 与 drivers.test.ts X1-X9, X12-X14 1:1
# 用 __set_fetch_for_tests hook 拦 httpx 调用, 不打真 Anthropic API.
# ─────────────────────────────────────────────────────────────────────────────

import httpx


def _llm_job(**overrides: Any) -> DriverJob:
    """模拟 lease 服务端 merge 完的 effective params + resolver 解析后的 inputs."""
    base: dict[str, Any] = {
        "node_key": "llm_translate", "node_version": "1.0", "step_key": "translate",
        "params": {
            "targetLang":   "zh",
            "model":        "claude-haiku-4-5-20251001",
            "maxTokens":    2048,
            "systemPrompt": "Translate the following text to {{targetLang}}. Output ONLY the translation, no preface, no quotes.",
            "timeoutMs":    60_000,
        },
        "inputs": {"text": "Hello world"},
        "envelope": {"payload": {"text": "Hello world"}, "outputs": {}, "tags": {}},
    }
    base.update(overrides)
    return _fake_job(**base)


def _resp(status: int, json_body: Any = None, text: str = "") -> httpx.Response:
    if json_body is not None:
        import json
        return httpx.Response(status, content=json.dumps(json_body).encode(),
                              headers={"content-type": "application/json"})
    return httpx.Response(status, content=text.encode())


@pytest.fixture
def llm_env(monkeypatch):
    """注入 ANTHROPIC_API_KEY 并在结束时还原 fetch hook."""
    from scheduler.drivers import llm_translate as mod
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    def set_fetch(impl):
        mod.set_fetch_for_tests(impl)

    yield type("LlmEnv", (), {"set_fetch": staticmethod(set_fetch)})()
    mod.set_fetch_for_tests(None)


@pytest.fixture
def llm_no_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    yield


async def test_x1_success_200_text_block(llm_env):
    async def fake(method, url, json, headers, timeout):
        return _resp(200, {"content": [{"type": "text", "text": "你好世界"}]})
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["status"] == "success"
    assert r["output"]["translated"] == "你好世界"
    assert r["output"]["targetLang"] == "zh"
    assert r["output"]["model"] == "claude-haiku-4-5-20251001"


async def test_x2_no_text(llm_env):
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job(inputs={}))
    assert r["status"] == "failed"
    assert r["error"]["code"] == "NO_TEXT"
    assert r["error"]["retryable"] is False


async def test_x3_no_api_key(llm_no_key):
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["status"] == "failed"
    assert r["error"]["code"] == "NO_API_KEY"
    assert r["error"]["retryable"] is False


async def test_x4_429_rate_limit(llm_env):
    async def fake(**_kw): return _resp(429, text="rate limited")
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["error"]["code"] == "LLM_RATE_LIMIT"
    assert r["error"]["retryable"] is True


async def test_x5_500_retryable(llm_env):
    async def fake(**_kw): return _resp(500, text="boom")
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["error"]["code"] == "LLM_500"
    assert r["error"]["retryable"] is True


async def test_x6_400_non_retryable(llm_env):
    async def fake(**_kw): return _resp(400, text="bad request")
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["error"]["code"] == "LLM_400"
    assert r["error"]["retryable"] is False


async def test_x7_network_error_retryable(llm_env):
    async def fake(**_kw): raise httpx.ConnectError("ECONNREFUSED")
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["error"]["code"] == "LLM_NETWORK"
    assert r["error"]["retryable"] is True


async def test_x7b_timeout_retryable(llm_env):
    async def fake(**_kw): raise httpx.ReadTimeout("read timeout")
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["error"]["code"] == "LLM_TIMEOUT"
    assert r["error"]["retryable"] is True


async def test_x8_200_no_text_block_bad_response(llm_env):
    async def fake(**_kw): return _resp(200, {"content": [{"type": "tool_use"}]})
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    r = await llm_translate_driver.handle(_llm_job())
    assert r["error"]["code"] == "LLM_BAD_RESPONSE"
    assert r["error"]["retryable"] is False


def test_x9_enable_driver_http_offload():
    from scheduler.drivers.llm_translate import llm_translate_driver
    assert llm_translate_driver.enable is not None
    assert llm_translate_driver.enable(
        _llm_job(params={"targetLang": "zh", "driver": "http"})
    ) is False
    assert llm_translate_driver.enable(_llm_job()) is True


async def test_x12_handle_consumes_server_merged_params(llm_env):
    """driver dumb consumer: 直接用 job.params, 不做二次 fallback / merge."""
    captured: dict[str, Any] = {}

    async def fake(method, url, json, headers, timeout):
        captured.update(json)
        return _resp(200, {"content": [{"type": "text", "text": "ok"}]})
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    await llm_translate_driver.handle(_llm_job(params={
        "targetLang":   "zh",
        "model":        "custom-server-merged-model",
        "maxTokens":    9999,
        "systemPrompt": "Translate to {{targetLang}} please.",
        "timeoutMs":    60_000,
    }))
    assert captured["model"] == "custom-server-merged-model", \
        "driver 必须用 job.params.model, 不能 fallback 到自己的 defaults"
    assert captured["max_tokens"] == 9999, "driver 必须用 job.params.maxTokens"
    assert "Translate to zh please." in captured["messages"][0]["content"], \
        "driver 必须用 job.params.systemPrompt + 仅做 {{var}} 替换"


async def test_x13_responsibility_boundary_no_pin_defense(llm_env):
    """driver 不做 pin 防御 — 配对正向 pin 验证在 api e2e 层."""
    captured: dict[str, Any] = {}

    async def fake(method, url, json, headers, timeout):
        captured.update(json)
        return _resp(200, {"content": [{"type": "text", "text": "ok"}]})
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    await llm_translate_driver.handle(_llm_job(params={
        "targetLang": "zh", "systemPrompt": "EVIL",
        "model": "m", "maxTokens": 100, "timeoutMs": 60_000,
    }))
    assert "EVIL" in captured["messages"][0]["content"], \
        "driver 必须 dumb 消费 job.params; pin 防御是 lease 端职责"


async def test_x14_secret_resolved_into_x_api_key_header(llm_env, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sentinel-key-xyz")
    captured: dict[str, Any] = {}

    async def fake(method, url, json, headers, timeout):
        captured["headers"] = headers
        return _resp(200, {"content": [{"type": "text", "text": "ok"}]})
    llm_env.set_fetch(fake)
    from scheduler.drivers.llm_translate import llm_translate_driver
    await llm_translate_driver.handle(_llm_job())
    assert captured["headers"]["x-api-key"] == "sentinel-key-xyz"
    assert captured["headers"]["anthropic-version"] == "2023-06-01"
