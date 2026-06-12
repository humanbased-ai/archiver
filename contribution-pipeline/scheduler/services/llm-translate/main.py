"""
llm_translate HTTP driver service (Path B 参考实现).

调度核心通过 `drivers/http.ts` 转发 DriverJob 到本服务的 POST /run; 本服务直接调
Anthropic Messages API, 把翻译结果包成 DriverResult 协议返回. 不暴露 lease/result 等
worker 接口 —— 那是调度核心代行的.

协议:
  POST /run  body = DriverJob
                  { runId, itemId, taskId, tenantId, stepKey, nodeKey, params, envelope, ctx }
            resp = DriverResult
                  { status:"success", output:{...}, nextHint?:"..." }
                  | { status:"failed",  error:{ code, message, retryable? } }

部署:
  - URL 必须加入调度核心的 SANDBOX_URL_ALLOWLIST env, 否则 driver 直接拒
  - 响应体硬上限 1 MiB (调度核心 RESPONSE_CAP_BYTES)
  - 单次响应必须在 step.params.timeoutMs 内完成 (默认 30s, 上限 120s)

错误码翻译策略:
  NO_TEXT          envelope.payload.text 缺失/空 (非重试)
  NO_TARGET_LANG   params.targetLang 缺失 (非重试)
  LLM_RATE_LIMIT   Anthropic 429 (重试)
  LLM_5xx          Anthropic 5xx (重试)
  LLM_4xx          Anthropic 其它 4xx (非重试)
  LLM_TIMEOUT      上游超时 (重试)
  LLM_NETWORK      网络错误 (重试)
  LLM_BAD_RESPONSE 响应不含 text block (非重试)
"""
from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import FastAPI, Request

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_MODEL = "claude-haiku-4-5-20251001"
DEFAULT_MAX_TOKENS = 2048
UPSTREAM_TIMEOUT_S = 60.0

app = FastAPI()
_http = httpx.AsyncClient(timeout=UPSTREAM_TIMEOUT_S)


def _fail(code: str, message: str, retryable: bool) -> dict[str, Any]:
    return {"status": "failed", "error": {"code": code, "message": message, "retryable": retryable}}


def _classify(status: int) -> tuple[str, bool]:
    if status == 429:
        return "LLM_RATE_LIMIT", True
    if 500 <= status < 600:
        return f"LLM_{status}", True
    if 400 <= status < 500:
        return f"LLM_{status}", False
    return f"LLM_{status}", False


@app.post("/run")
async def run(req: Request) -> dict[str, Any]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fail("NO_API_KEY", "ANTHROPIC_API_KEY 未设置", retryable=False)

    job = await req.json()
    payload = (job.get("envelope") or {}).get("payload") or {}
    text = str(payload.get("text") or "").strip()
    if not text:
        return _fail("NO_TEXT", "payload.text 缺失或为空", retryable=False)

    params = job.get("params") or {}
    target = str(params.get("targetLang") or "").strip()
    if not target:
        return _fail("NO_TARGET_LANG", "params.targetLang 必填", retryable=False)
    model = str(params.get("model") or DEFAULT_MODEL)

    body = {
        "model": model,
        "max_tokens": DEFAULT_MAX_TOKENS,
        "messages": [{
            "role": "user",
            "content": f"Translate the following text to {target}. Output ONLY the translation, no preface, no quotes.\n\n{text}",
        }],
    }
    try:
        resp = await _http.post(
            ANTHROPIC_URL,
            json=body,
            headers={
                "x-api-key": api_key,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
        )
    except httpx.TimeoutException as e:
        return _fail("LLM_TIMEOUT", str(e), retryable=True)
    except httpx.HTTPError as e:
        return _fail("LLM_NETWORK", str(e), retryable=True)

    if resp.status_code != 200:
        code, retryable = _classify(resp.status_code)
        return _fail(code, resp.text[:500], retryable=retryable)

    try:
        data = resp.json()
    except ValueError as e:
        return _fail("LLM_BAD_RESPONSE", f"JSON parse: {e}", retryable=False)

    translated = "".join(
        str(b.get("text") or "")
        for b in (data.get("content") or [])
        if b.get("type") == "text"
    ).strip()
    if not translated:
        return _fail("LLM_BAD_RESPONSE", "无 text block 或为空", retryable=False)

    return {
        "status": "success",
        "output": {"translated": translated, "targetLang": target, "model": model},
    }


@app.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}
