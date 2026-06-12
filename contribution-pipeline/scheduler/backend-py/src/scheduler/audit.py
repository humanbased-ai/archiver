"""
审计日志 helper (P0-E) — 与 audit.ts 1:1

用法 (mutating handler 完成后调一次, fire-and-forget):
    audit(request, "pipeline.publish", {"kind": "pipeline", "id": pipe_id},
          {"steps": old_steps}, {"steps": new_steps})

行为:
  - 异步写 audit_log, 不阻塞响应
  - 走 as_system 跨 RLS, audit_log 跨租户共写, RLS 仅作读隔离
  - 失败仅 warning, 不影响主流程
  - before/after 字段截断到 4 KiB JSON, 防个别请求把分区撑爆
  - trace_id (OTel traceparent) / request_id (x-request-id) 自动从 ContextVar 取
"""
from __future__ import annotations
import asyncio
import json
import logging
import re
from contextvars import ContextVar
from typing import Any

import asyncpg
from fastapi import Request

from .db import as_system
from .auth import CallerInfo

logger = logging.getLogger(__name__)

FIELD_CAP = 4096
TRACEPARENT_RE = re.compile(r"^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$", re.IGNORECASE)

# Request 上下文 — server.py 中间件填入, audit() 读取
_req_id_var:   ContextVar[str | None] = ContextVar("audit_req_id",   default=None)
_trace_id_var: ContextVar[str | None] = ContextVar("audit_trace_id", default=None)


def set_request_id(req_id: str | None) -> None:
    _req_id_var.set(req_id)


def set_trace_id_from_header(traceparent: str | None) -> None:
    """从 traceparent header 解析 32hex trace_id 写入 ContextVar; 缺失/不合法 reset 为 None."""
    if traceparent:
        m = TRACEPARENT_RE.match(traceparent)
        if m:
            _trace_id_var.set(m.group(1))
            return
    _trace_id_var.set(None)


def _truncate(v: Any) -> Any:
    if v is None:
        return None
    s = json.dumps(v, default=str, ensure_ascii=False)
    if len(s) <= FIELD_CAP:
        return v
    return {"_truncated": True, "_length": len(s), "_head": s[:FIELD_CAP]}


def _caller_to_actor(caller: CallerInfo | None) -> str:
    if caller is None:
        return "anonymous"
    if caller.id == "internal":
        return "system:in-process"
    if caller.id == "auth-disabled":
        return "dev:auth-disabled"
    if caller.scope == "system":
        return f"system:{caller.name}"
    return f"user:{caller.id}"


async def _write(
    tenant_id: str,
    actor: str,
    action: str,
    resource: dict[str, Any],
    before: Any,
    after: Any,
    trace_id: str | None,
    request_id: str | None,
) -> None:
    """跨 RLS 写一行 audit_log."""
    async def _do(conn: asyncpg.Connection) -> None:
        await conn.execute(
            """INSERT INTO audit_log
                 (tenant_id, actor, action, resource, before, after, trace_id, request_id)
               VALUES
                 ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)""",
            tenant_id, actor, action,
            json.dumps(resource, ensure_ascii=False),
            None if before is None else json.dumps(_truncate(before), ensure_ascii=False, default=str),
            None if after  is None else json.dumps(_truncate(after),  ensure_ascii=False, default=str),
            trace_id, request_id,
        )
    await as_system(_do)


def audit(
    request: Request,
    action: str,
    resource: dict[str, Any],
    before: Any = None,
    after: Any = None,
) -> None:
    """fire-and-forget. caller 从 request.state 取, trace_id / request_id 从 ContextVar 取."""
    caller: CallerInfo | None = getattr(request.state, "caller", None)
    if caller is None or not caller.tenant_id:
        logger.warning(f"[audit] skipped (no tenant): action={action} resource={resource}")
        return
    tenant_id = caller.tenant_id
    actor = _caller_to_actor(caller)
    trace_id = _trace_id_var.get()
    request_id = _req_id_var.get()

    async def _run() -> None:
        try:
            await _write(tenant_id, actor, action, resource, before, after, trace_id, request_id)
        except Exception as e:
            logger.warning(f"[audit] write failed action={action}: {e}")

    asyncio.create_task(_run())


def audit_system(
    tenant_id: str,
    actor: str,
    action: str,
    resource: dict[str, Any],
    before: Any = None,
    after: Any = None,
) -> None:
    """系统级 actor (reconciler / autoworker) — 无 request 上下文."""
    async def _run() -> None:
        try:
            await _write(tenant_id, actor, action, resource, before, after, None, None)
        except Exception as e:
            logger.warning(f"[audit:{actor}] write failed action={action}: {e}")

    asyncio.create_task(_run())


