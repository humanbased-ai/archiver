"""llm_translate driver — 调用 Anthropic API 翻译. 与 llm-translate.ts 1:1 对应.

错误码与 Node 端对齐:
  NO_API_KEY / NO_TEXT / NO_TARGET_LANG  (非重试, driver 端缺前提)
  LLM_RATE_LIMIT  (429, 重试)
  LLM_<status>    (4xx 非重试 / 5xx 重试)
  LLM_TIMEOUT     (httpx 超时, 重试)
  LLM_NETWORK     (httpx 连接 / 其它异常, 重试)
  LLM_BAD_RESPONSE (200 但 content 缺 text block, 非重试)

driver 是 dumb consumer of server-merged job.params: 不做二次 defaults / pin 防御.
job.params 期望已含 model / targetLang / maxTokens / systemPrompt / timeoutMs.
"""
from __future__ import annotations
import os
from typing import Any, Awaitable, Callable

import httpx

from .registry import register_driver, DriverJob, DriverResult
from .base import InProcessNode
from ..node_config import resolve_secret, render_template, NodePresets

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

# 测试钩子: monkey-patch 这个 callable 拦 fetch (替代 Node 端的 __setFetchForTests).
# (method, url, json, headers, timeout) -> httpx.Response
FetchImpl = Callable[..., Awaitable[httpx.Response]]
_fetch_impl: FetchImpl | None = None


def set_fetch_for_tests(f: FetchImpl | None) -> None:
    """测试钩子: 注入 mock fetch (等价 Node 端 __setFetchForTests)."""
    global _fetch_impl
    _fetch_impl = f


_PRESETS: dict[str, Any] = {
    "defaults": {
        "model":     "claude-haiku-4-5-20251001",
        "timeoutMs": 60_000,
    },
    "constants": {
        "systemPrompt": "Translate the following text to {{targetLang}}. Output ONLY the translation, no preface, no quotes.",
        "maxTokens":    2048,
    },
    "pin": ["systemPrompt", "maxTokens"],
    "secrets": {"anthropicKey": {"envVar": "ANTHROPIC_API_KEY"}},
}

NODE_DEFINITION: dict[str, Any] = {
    "key": "llm_translate", "version": "1.0", "displayName": "大模型翻译",
    "category": "ai", "runMode": "embedded",
    "description": "调用 Anthropic Messages API 把 inputs.text 翻译到 params.targetLang。",
    "outputsSchema": {
        "type": "object",
        "properties": {
            "translated": {"type": "string"},
            "targetLang": {"type": "string"},
            "model":      {"type": "string"},
        },
    },
    "paramsSchema": {
        "type": "object", "required": ["targetLang"],
        "properties": {
            "model":      {"type": "string"},
            "targetLang": {"type": "string"},
            "driver":     {"type": "string", "enum": ["http"]},
            "url":        {"type": "string"},
            "timeoutMs":  {"type": "number", "minimum": 1000, "maximum": 120000},
        },
    },
    "uiSchema": {
        "groups": [
            {"id": "basic",    "label": "基础", "fields": ["targetLang", "model"]},
            {"id": "advanced", "label": "高级", "fields": ["timeoutMs"]},
        ],
        "fields": {
            "targetLang": {"widget": "select", "options": [["zh", "中文"], ["en", "英文"], ["ja", "日文"], ["ko", "韩文"]]},
            "model":      {"widget": "select", "options": [["claude-haiku-4-5-20251001", "Haiku 4.5"], ["claude-sonnet-4-6", "Sonnet 4.6"]]},
            "timeoutMs":  {"widget": "slider", "min": 1000, "max": 120000, "step": 1000},
        },
    },
    "inputsSchema": {
        "type": "object", "required": ["text"],
        "properties": {"text": {"type": "string", "defaultBinding": "{{payload.text}}"}},
    },
    "presets": _PRESETS,
    "idempotent": True, "defaultTimeoutMs": 60_000, "defaultMaxAttempts": 3,
    "manual": False, "supportsDryRun": True,
    "examples": [
        {
            "title": "英→中翻译",
            "step": {"params": {"targetLang": "zh", "model": "claude-haiku-4-5-20251001"},
                     "inputs": {"text": "{{payload.text}}"}},
            "envelope": {"payload": {"text": "Hello, world!"}, "outputs": {}, "tags": {}},
        },
    ],
}


def _classify(status: int) -> tuple[str, bool]:
    if status == 429:
        return "LLM_RATE_LIMIT", True
    if 500 <= status < 600:
        return f"LLM_{status}", True
    return f"LLM_{status}", False


class LlmTranslateNode(InProcessNode):
    node_definition = NODE_DEFINITION

    @property
    def name(self) -> str:
        return "builtin:llm_translate"

    # driver=http 让出给 HTTP driver (Path B)
    def enable(self, job: DriverJob) -> bool:
        return job.params.get("driver") != "http"

    async def handle(self, job: DriverJob) -> DriverResult:
        presets_data = self.node_definition.get("presets")
        presets = NodePresets(**presets_data) if presets_data else None
        api_key = resolve_secret(presets, "anthropicKey") or ""
        if not api_key:
            return {"status": "failed", "error": {
                "code": "NO_API_KEY",
                "message": "anthropicKey secret 未解析 (检查 ANTHROPIC_API_KEY 环境变量)",
                "retryable": False,
            }}

        text = str(job.inputs.get("text") or "").strip()
        if not text:
            return {"status": "failed", "error": {
                "code": "NO_TEXT", "message": "inputs.text 缺失或为空", "retryable": False,
            }}

        target = str(job.params.get("targetLang") or "").strip()
        if not target:
            return {"status": "failed", "error": {
                "code": "NO_TARGET_LANG", "message": "params.targetLang 必填", "retryable": False,
            }}

        model = str(job.params.get("model") or "")
        max_tokens = int(job.params.get("maxTokens") or 0)
        system_tmpl = str(job.params.get("systemPrompt") or "")
        system_prompt = render_template(system_tmpl, {"targetLang": target})
        # 兜底 timeoutMs (服务端 merge 通常已注入 presets.defaults.timeoutMs)
        try:
            timeout_ms = int(float(job.params.get("timeoutMs") or 30_000))
        except (TypeError, ValueError):
            timeout_ms = 30_000

        if job.ctx.get("dryRun"):
            return {"status": "success", "output": {
                "translated": f"[mock {target}] {text}",
                "targetLang": target, "model": model, "dryRun": True,
            }}

        body = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": f"{system_prompt}\n\n{text}"}],
        }
        headers = {
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_VERSION,
        }

        try:
            if _fetch_impl is not None:
                resp = await _fetch_impl(
                    method="POST", url=ANTHROPIC_URL, json=body, headers=headers,
                    timeout=timeout_ms / 1000,
                )
            else:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        ANTHROPIC_URL, json=body, headers=headers,
                        timeout=timeout_ms / 1000,
                    )
        except httpx.TimeoutException as e:
            return {"status": "failed", "error": {
                "code": "LLM_TIMEOUT", "message": str(e) or f"Anthropic API 超时 ({timeout_ms}ms)",
                "retryable": True,
            }}
        except Exception as e:
            return {"status": "failed", "error": {
                "code": "LLM_NETWORK", "message": str(e), "retryable": True,
            }}

        if resp.status_code != 200:
            code, retryable = _classify(resp.status_code)
            msg = (resp.text or "")[:500]
            return {"status": "failed", "error": {"code": code, "message": msg, "retryable": retryable}}

        try:
            parsed = resp.json()
        except Exception as e:
            return {"status": "failed", "error": {
                "code": "LLM_BAD_RESPONSE", "message": f"JSON parse: {e}", "retryable": False,
            }}

        blocks = parsed.get("content") or []
        translated = "".join(
            str(b.get("text") or "") for b in blocks if isinstance(b, dict) and b.get("type") == "text"
        ).strip()
        if not translated:
            return {"status": "failed", "error": {
                "code": "LLM_BAD_RESPONSE", "message": "无 text block 或为空", "retryable": False,
            }}
        return {"status": "success", "output": {
            "translated": translated, "targetLang": target, "model": model,
        }}


# 暴露字面量 driver 实例, 方便单测 import 后直接 .handle() — 等价 Node 的 llmTranslateDriver
llm_translate_driver = LlmTranslateNode().as_driver()


def register_llm_translate_driver() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("[llm_translate] ANTHROPIC_API_KEY 未设置, driver 跳过注册")
        return
    register_driver(llm_translate_driver)
