"""
Driver 公共 HTTP 客户端 — 与 drivers/_client.ts 1:1 对应

透明适配:
  - 同进程: httpx AsyncClient 直接调本地地址 (对应 app.inject)
  - 拆服务: SCHEDULER_BASE_URL / BUSINESS_BASE_URL → 真 HTTP
"""
from __future__ import annotations
import os
from typing import Any, TypeVar

import httpx

from ..auth import API_KEY_HEADER, TENANT_ID_HEADER, get_internal_key

T = TypeVar("T")

_REMOTE_SCHED = (os.environ.get("SCHEDULER_BASE_URL") or "").rstrip("/")
_REMOTE_BIZ   = (os.environ.get("BUSINESS_BASE_URL") or "").rstrip("/")
_REMOTE_SCHED_KEY = os.environ.get("SCHEDULER_API_KEY", "")
_REMOTE_BIZ_KEY   = os.environ.get("BUSINESS_API_KEY", "")

_LOCAL_BASE = f"http://127.0.0.1:{os.environ.get('PORT', '4000')}"


def _sched_base() -> str:
    return _REMOTE_SCHED or _LOCAL_BASE


def _biz_base() -> str:
    return _REMOTE_BIZ or _LOCAL_BASE


async def sched_post(
    path: str,
    body: Any,
    tenant_id: str | None,
) -> Any:
    """POST /api/v1{path}. tenant_id=None → isSystemActor (跨租户)."""
    headers: dict[str, str] = {
        "content-type": "application/json",
        API_KEY_HEADER: _REMOTE_SCHED_KEY if _REMOTE_SCHED else get_internal_key(),
    }
    if tenant_id:
        headers[TENANT_ID_HEADER] = tenant_id

    async with httpx.AsyncClient(trust_env=False) as client:
        r = await client.post(
            f"{_sched_base()}/api/v1{path}",
            json=body, headers=headers, timeout=10.0,
        )
    data = r.json() if r.content else None
    if r.status_code >= 400:
        msg = (data or {}).get("error", {}).get("message") or f"SCHED_ERROR({r.status_code})"
        raise RuntimeError(msg)
    return data


async def notify_business_result(
    tenant_id: str,
    item_id: str,
    step_key: str,
    result: str,
    reason: str | None = None,
) -> None:
    payload = {"itemId": item_id, "stepKey": step_key, "result": result, "reason": reason}
    headers: dict[str, str] = {
        "content-type": "application/json",
        API_KEY_HEADER: _REMOTE_BIZ_KEY if _REMOTE_BIZ else get_internal_key(),
        TENANT_ID_HEADER: tenant_id,
    }
    try:
        async with httpx.AsyncClient(trust_env=False) as client:
            await client.post(
                f"{_biz_base()}/api/internal/submission-result",
                json=payload, headers=headers, timeout=5.0,
            )
    except Exception:
        pass
