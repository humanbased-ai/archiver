"""事件流 — 与 events.ts 1:1 对应 (M9).

emit(): 异步写 events 表, fire-and-forget.
GET /api/v1/events: since/kind/resource_kind/resource_id/limit 过滤, 返回 lastId.
"""
from __future__ import annotations
import asyncio
import json
import logging
from typing import Any

import asyncpg
from fastapi import APIRouter, Request

from .auth import DEFAULT_TENANT_ID
from .db import get_pool, as_system, with_caller_tx

router = APIRouter()
logger = logging.getLogger(__name__)


def emit(
    tenant_id: str,
    kind: str,
    resource_kind: str | None = None,
    resource_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """异步写一行 events. 失败仅 warn, 不阻塞响应."""
    async def _run() -> None:
        try:
            async def _insert(conn: asyncpg.Connection) -> None:
                await conn.execute(
                    """INSERT INTO events (tenant_id, kind, resource_kind, resource_id, payload)
                       VALUES ($1::uuid, $2, $3, $4, $5::jsonb)""",
                    tenant_id, kind, resource_kind, resource_id,
                    json.dumps(payload or {}),
                )
            await as_system(_insert)
        except Exception as e:
            logger.warning(f"[emit] event write failed kind={kind}: {e}")

    asyncio.create_task(_run())


def emit_from_request(
    request: Request,
    kind: str,
    resource_kind: str | None = None,
    resource_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """从 Request 派生 tenant_id 后调用 emit."""
    caller = getattr(request.state, "caller", None)
    tenant_id = caller.tenant_id if caller else DEFAULT_TENANT_ID
    emit(tenant_id, kind, resource_kind, resource_id, payload)


@router.get("/api/v1/events")
async def get_events(request: Request) -> dict:
    from .auth import CallerInfo
    c: CallerInfo | None = getattr(request.state, "caller", None)
    if not c:
        from fastapi import HTTPException
        raise HTTPException(401, detail={"error": {"code": "UNAUTHORIZED"}})

    qs = dict(request.query_params)
    since_raw = qs.get("since", "0")
    since_str = since_raw if since_raw.isdigit() else "0"
    kind_filter = qs.get("kind")
    resource_kind_filter = qs.get("resource_kind")
    resource_id_filter = qs.get("resource_id")
    try:
        limit = min(500, max(1, int(qs.get("limit", "200"))))
    except (ValueError, TypeError):
        limit = 200

    async def handler(conn: asyncpg.Connection) -> dict:
        # Build query with optional filters
        conditions = [f"id > {int(since_str)}::bigint"]
        args: list[Any] = []
        n = 1

        if kind_filter:
            args.append(kind_filter)
            conditions.append(f"kind = ${n}")
            n += 1
        if resource_kind_filter:
            args.append(resource_kind_filter)
            conditions.append(f"resource_kind = ${n}")
            n += 1
        if resource_id_filter:
            args.append(resource_id_filter)
            conditions.append(f"resource_id = ${n}")
            n += 1

        args.append(limit)
        where = " AND ".join(conditions)
        rows = await conn.fetch(
            f"""SELECT id::text AS id, tenant_id, kind, resource_kind,
                       resource_id, payload, created_at
                FROM events
                WHERE {where}
                ORDER BY id ASC
                LIMIT ${n}""",
            *args,
        )
        last_id = rows[-1]["id"] if rows else since_str
        return {"events": [dict(r) for r in rows], "lastId": last_id}

    return await with_caller_tx(c, handler)
