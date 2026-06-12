"""
Idempotency-Key 中间件 — 与 idempotency.ts 1:1, 含 M5 严格并发去重.

  - 路由白名单 (server.py 注入). 命中且带 idempotency-key header 才介入.
  - 单事务内拿 pg_advisory_xact_lock((tenant_id|key|scope)) 串行同 key 并发请求.
  - 状态机:
      first        → INSERT pending, 继续 handler, onSend 升级 completed
      replay       → 直接回放原响应
      in_progress  → 409 IDEMPOTENCY_IN_PROGRESS
      hash_mismatch→ 409 IDEMPOTENCY_HASH_MISMATCH
  - TTL: pending 5 min, completed 24 h.
  - DB scheme: idempotency_keys(tenant_id, key, scope, request_hash, status, status_code, response_body, expires_at).
"""
from __future__ import annotations
import hashlib
import json
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from .auth import DEFAULT_TENANT_ID
from .db import as_system

IDEMPOTENCY_HEADER = "idempotency-key"
PENDING_TTL_SEC = 5 * 60
COMPLETED_TTL_SEC = 24 * 3600


def _body_hash(raw: bytes) -> str:
    return hashlib.sha256(raw if raw else b"").hexdigest()


def _lock_key(tenant_id: str, key: str, scope: str) -> int:
    digest = hashlib.sha256(f"{tenant_id}|{key}|{scope}".encode()).digest()
    return int.from_bytes(digest[:8], "big", signed=True)


def _err(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


class IdempotencyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, routes: list[dict[str, str]]) -> None:
        super().__init__(app)
        self._routes: set[tuple[str, str]] = {
            (r["method"].upper(), r["path"]) for r in routes
        }

    def _matches(self, method: str, path: str) -> bool:
        return (method.upper(), path) in self._routes

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not self._matches(request.method, request.url.path):
            return await call_next(request)

        idem_key = request.headers.get(IDEMPOTENCY_HEADER)
        if not idem_key:
            return await call_next(request)
        if not (8 <= len(idem_key) <= 200):
            return _err("BAD_IDEMPOTENCY_KEY",
                        "Idempotency-Key 长度必须在 8-200 之间", 400)

        caller = getattr(request.state, "caller", None)
        tenant_id = caller.tenant_id if caller else DEFAULT_TENANT_ID
        scope = request.url.path
        body_bytes = await request.body()
        hash_ = _body_hash(body_bytes)
        lock_id = _lock_key(tenant_id, idem_key, scope)

        # 让下游 handler 重新读 body (Starlette 默认 body 只能消费一次)
        async def _receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        request._receive = _receive  # type: ignore[attr-defined]

        decision_kind: str = ""
        replay_status: int = 200
        replay_body: Any = None

        async def _decide(conn) -> None:
            nonlocal decision_kind, replay_status, replay_body
            await conn.execute("SELECT pg_advisory_xact_lock($1)", lock_id)
            existing = await conn.fetchrow(
                """SELECT request_hash, status, status_code, response_body
                     FROM idempotency_keys
                    WHERE tenant_id = $1::uuid AND key = $2 AND scope = $3
                      AND expires_at > NOW()""",
                tenant_id, idem_key, scope,
            )
            if existing is None:
                await conn.execute(
                    """INSERT INTO idempotency_keys
                         (tenant_id, key, scope, request_hash, status, expires_at)
                       VALUES ($1::uuid, $2, $3, $4, 'pending',
                               NOW() + ($5 || ' seconds')::interval)
                       ON CONFLICT (tenant_id, key, scope) DO UPDATE SET
                         request_hash = EXCLUDED.request_hash,
                         status        = 'pending',
                         status_code   = NULL,
                         response_body = NULL,
                         expires_at    = EXCLUDED.expires_at,
                         created_at    = NOW()""",
                    tenant_id, idem_key, scope, hash_, str(PENDING_TTL_SEC),
                )
                decision_kind = "first"
                return
            if existing["request_hash"] != hash_:
                decision_kind = "hash_mismatch"
                return
            if existing["status"] == "completed":
                decision_kind = "replay"
                replay_status = existing["status_code"] or 200
                replay_body = existing["response_body"]
                return
            decision_kind = "in_progress"

        await as_system(_decide)

        if decision_kind == "replay":
            return JSONResponse(content=replay_body, status_code=replay_status)
        if decision_kind == "in_progress":
            return _err("IDEMPOTENCY_IN_PROGRESS",
                        "同 Idempotency-Key 的请求正在处理, 请稍后重试", 409)
        if decision_kind == "hash_mismatch":
            return _err("IDEMPOTENCY_HASH_MISMATCH",
                        "相同 Idempotency-Key 已用于不同请求体", 409)

        # first → 跑 handler + 收尾
        response = await call_next(request)
        captured = b""
        async for chunk in response.body_iterator:
            captured += chunk if isinstance(chunk, bytes) else chunk.encode()

        try:
            parsed_body: Any = json.loads(captured) if captured else None
        except Exception:
            parsed_body = captured.decode(errors="replace") if captured else None

        async def _complete(conn) -> None:
            await conn.execute(
                """UPDATE idempotency_keys SET
                       status        = 'completed',
                       status_code   = $4,
                       response_body = $5,
                       request_hash  = $6,
                       expires_at    = NOW() + ($7 || ' seconds')::interval
                     WHERE tenant_id = $1::uuid AND key = $2 AND scope = $3""",
                tenant_id, idem_key, scope,
                response.status_code, parsed_body, hash_, str(COMPLETED_TTL_SEC),
            )
        try:
            await as_system(_complete)
        except Exception:
            pass

        return Response(
            content=captured,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )
