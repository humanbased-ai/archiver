"""http driver — 异构外部 worker 转发. 与 http.ts 1:1 对应."""
from __future__ import annotations
import os
from typing import Any

import httpx

from .registry import Driver, register_driver, DriverJob, DriverResult

RESPONSE_CAP_BYTES = 1024 * 1024


def _parse_allowlist() -> list[str]:
    raw = os.environ.get("SANDBOX_URL_ALLOWLIST", "")
    return [s.strip() for s in raw.split(",") if s.strip()]


def _is_url_allowed(url: str, allowlist: list[str]) -> bool:
    return any(url.startswith(prefix) for prefix in allowlist) if allowlist else False


def _clamp(v: Any, lo: int, hi: int, default: int) -> int:
    n = v if isinstance(v, (int, float)) and isinstance(v, (int, float)) else default
    return max(lo, min(hi, int(n)))


async def _http_handle(job: DriverJob) -> DriverResult:
    url = str(job.params.get("url") or "")
    if not url:
        return {"status": "failed", "error": {"code": "NO_URL", "message": "params.url 缺失", "retryable": False}}

    allowlist = _parse_allowlist()
    if not _is_url_allowed(url, allowlist):
        return {"status": "failed", "error": {"code": "URL_NOT_ALLOWED", "message": f"{url} 不在 SANDBOX_URL_ALLOWLIST 中", "retryable": False}}

    timeout_ms = _clamp(job.params.get("timeoutMs"), 1000, 120000, 30000)

    payload = {
        "runId": job.run_id, "itemId": job.item_id, "taskId": job.task_id,
        "tenantId": job.tenant_id, "stepKey": job.step_key, "nodeKey": job.node_key,
        "params": job.params, "envelope": job.envelope, "ctx": job.ctx,
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url, json=payload,
                headers={"content-type": "application/json", "user-agent": "scheduler-http-driver/1.0"},
                timeout=timeout_ms / 1000,
            )
        if len(resp.content) > RESPONSE_CAP_BYTES:
            return {"status": "failed", "error": {"code": "RESPONSE_TOO_LARGE", "message": "响应超 1 MiB 上限", "retryable": False}}
        data = resp.json()
        if resp.status_code >= 400:
            msg = (data or {}).get("error", {}).get("message") or f"HTTP {resp.status_code}"
            return {"status": "failed", "error": {"code": "HTTP_ERROR", "message": msg, "retryable": resp.status_code >= 500}}
        if data.get("status") not in ("success", "failed"):
            return {"status": "failed", "error": {"code": "INVALID_RESPONSE", "message": "外部 worker 响应格式错误", "retryable": False}}
        return data
    except httpx.TimeoutException:
        return {"status": "failed", "error": {"code": "TIMEOUT", "message": f"外部 worker 超时 ({timeout_ms}ms)", "retryable": True}}
    except Exception as e:
        return {"status": "failed", "error": {"code": "HTTP_EXCEPTION", "message": str(e), "retryable": True}}


_http_driver = Driver(
    name="builtin:http",
    node_key="*",
    enable=lambda job: job.params.get("driver") == "http",
    handle=_http_handle,
)


def register_http_driver() -> None:
    register_driver(_http_driver)
