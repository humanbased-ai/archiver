"""
服务对服务 API key 鉴权 + 多租户身份派生 + RBAC

与 auth.ts 1:1 对应:
  - x-api-key header → sha256 → api_keys 表校验
  - INTERNAL_KEY: 进程启动时随机生成, 测试/进程内直通
  - CallerInfo 挂到 request.state.caller
  - ROUTE_PERMISSIONS 集中式路由权限表
  - AUTH_REQUIRED=false → dev 模式跳过校验
"""
from __future__ import annotations
import hashlib
import os
import uuid
from dataclasses import dataclass, field

import asyncpg
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from .db import get_pool

API_KEY_HEADER = "x-api-key"
TENANT_ID_HEADER = "x-tenant-id"
DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"
PUBLIC_PREFIXES = ("/health", "/docs", "/api/v1/dev")

INTERNAL_KEY: str = str(uuid.uuid4())


def get_internal_key() -> str:
    return INTERNAL_KEY


def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


def is_auth_required() -> bool:
    return (os.environ.get("AUTH_REQUIRED", "true")).lower() != "false"


@dataclass
class CallerInfo:
    id: str
    name: str
    scope: str
    tenant_id: str
    is_system_actor: bool
    permissions: set[str] = field(default_factory=set)


def _is_public_path(url_path: str) -> bool:
    return any(
        url_path == p or url_path.startswith(p + "/") or url_path.startswith(p + "?")
        for p in PUBLIC_PREFIXES
    )


async def _resolve_caller(request: Request) -> CallerInfo | None:
    presented = request.headers.get(API_KEY_HEADER)
    if not presented:
        return None

    if presented == INTERNAL_KEY:
        header_tenant = request.headers.get(TENANT_ID_HEADER) or None
        return CallerInfo(
            id="internal",
            name="internal:in-process",
            scope="admin",
            tenant_id=header_tenant or DEFAULT_TENANT_ID,
            is_system_actor=not bool(header_tenant),
            permissions={"*"},
        )

    key_hash = hash_key(presented)
    pool = get_pool()
    row = await pool.fetchrow(
        """SELECT id, name, scope, tenant_id, expires_at FROM api_keys
           WHERE key_hash = $1 AND revoked_at IS NULL""",
        key_hash,
    )
    if not row:
        return None

    import datetime
    if row["expires_at"] and row["expires_at"] < datetime.datetime.now(datetime.timezone.utc):
        return None

    # 1% 抽样更新 last_used_at
    import random
    if random.random() < 0.01:
        import asyncio
        asyncio.create_task(
            pool.execute("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", row["id"])
        )

    header_tenant = request.headers.get(TENANT_ID_HEADER) or None
    is_system_scope = row["scope"] == "system"
    # asyncpg 把 uuid 列解码成 UUID 对象, 下游 with_tenant 把它喂 set_config($1::text) 会爆
    # "expected str, got UUID". 这里在出口就压成 str.
    row_tenant = row["tenant_id"]
    row_tenant_str = str(row_tenant) if row_tenant is not None else None
    effective_tenant = (
        header_tenant if (is_system_scope and header_tenant) else (row_tenant_str or DEFAULT_TENANT_ID)
    )

    perm_rows = await pool.fetch(
        """SELECT DISTINCT p.name
           FROM api_key_roles akr
           JOIN role_permissions rp ON rp.role_id = akr.role_id
           JOIN permissions p       ON p.id       = rp.permission_id
           WHERE akr.api_key_id = $1""",
        row["id"],
    )
    permissions = {r["name"] for r in perm_rows}

    return CallerInfo(
        id=str(row["id"]),
        name=row["name"],
        scope=row["scope"],
        tenant_id=effective_tenant,
        is_system_actor=is_system_scope and not header_tenant,
        permissions=permissions,
    )


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if _is_public_path(request.url.path):
            return await call_next(request)

        if not is_auth_required():
            presented = request.headers.get(API_KEY_HEADER)
            if presented:
                resolved = None
                try:
                    resolved = await _resolve_caller(request)
                except Exception:
                    pass
                if resolved:
                    request.state.caller = CallerInfo(
                        **{**resolved.__dict__, "permissions": {"*"}}
                    )
                    return await call_next(request)
            header_tenant = request.headers.get(TENANT_ID_HEADER) or None
            request.state.caller = CallerInfo(
                id="auth-disabled",
                name="auth-disabled",
                scope="admin",
                tenant_id=header_tenant or DEFAULT_TENANT_ID,
                is_system_actor=not bool(header_tenant),
                permissions={"*"},
            )
            return await call_next(request)

        caller = await _resolve_caller(request)
        if not caller:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"error": {"code": "UNAUTHORIZED", "message": "missing or invalid api key"}},
            )
        request.state.caller = caller
        return await call_next(request)


# ── 集中式路由权限表 (与 auth.ts ROUTE_PERMISSIONS 1:1) ──────────────────────
ROUTE_PERMISSIONS: dict[str, str] = {
    "GET /api/v1/nodes":                                    "pipeline.read",
    "GET /api/v1/pipelines":                                "pipeline.read",
    "GET /api/v1/pipelines/{id}":                           "pipeline.read",
    "GET /api/v1/pipelines/{id}/forms":                     "pipeline.read",
    "GET /api/v1/projects":                                 "pipeline.read",
    "POST /api/v1/pipelines/create":                        "pipeline.write",
    "POST /api/v1/pipelines/{id}/save":                     "pipeline.write",
    "POST /api/v1/pipelines/{id}/pause":                    "pipeline.write",
    "POST /api/v1/pipelines/{id}/resume":                   "pipeline.write",
    "DELETE /api/v1/pipelines/{id}":                        "pipeline.write",
    "GET /api/v1/templates":                                "template.read",
    "GET /api/v1/templates/{id}":                           "template.read",
    "POST /api/v1/templates/create":                        "template.write",
    "POST /api/v1/templates/{id}/save":                     "template.write",
    "DELETE /api/v1/templates/{id}":                        "template.write",
    "POST /api/v1/templates/{id}/instantiate":              "pipeline.write",
    "GET /api/v1/review/tasks":                             "review.write",
    "POST /api/v1/items/create":                            "batch.create",
    "GET /api/v1/items/{id}":                               "item.read",
    "GET /api/v1/items/{id}/pipeline":                      "item.read",
    "GET /api/v1/tasks/{taskId}/items":                     "item.read",
    "GET /api/v1/tasks/{taskId}/kanban":                    "item.read",
    "GET /api/v1/tasks/{taskId}/records":                   "item.read",
    "POST /api/v1/queue/{nodeKey}/lease":                   "queue.lease",
    "POST /api/v1/queue/run/{runId}/claim":                 "queue.lease",
    "POST /api/v1/queue/lease/{runId}/release":             "queue.lease",
    "POST /api/v1/queue/lease/{runId}/heartbeat":           "queue.lease",
    "POST /api/v1/result":                                  "queue.result",
    "POST /api/v1/dedup/check":                             "dedup.check",
    "POST /api/v1/dataset/records/save":                    "dataset.write",
    "GET /api/v1/admin/queue":                              "admin.queue",
    "GET /api/v1/admin/stuck":                              "admin.stuck",
    "GET /api/v1/admin/audit":                              "audit.read",
    "GET /api/v1/admin/nodes":                              "node.read",
    "GET /api/v1/admin/nodes/{key}/{version}":              "node.read",
    "GET /api/v1/admin/nodes/{key}/{version}/usages":       "node.read",
    "POST /api/v1/admin/nodes/{key}/{version}/archive":     "node.admin",
    "POST /api/v1/admin/nodes/{key}/{version}/activate":    "node.admin",
    "POST /api/v1/admin/nodes/{key}/{version}/debug/run":   "node.admin",
    "GET /api/v1/admin/nodes/{key}/{version}/runtime":      "node.read",
    "POST /api/v1/admin/nodes/{key}/{version}/pause":       "node.admin",
    "POST /api/v1/admin/nodes/{key}/{version}/resume":      "node.admin",
    "GET /api/v1/events":                                   "audit.read",
    "POST /api/v1/admin/items/{id}/replay":                 "item.replay",
    "POST /api/v1/admin/items/{id}/recall":                 "item.replay",
    "POST /api/batches":                                    "batch.create",
    "POST /api/batches/{batchId}/pause":                    "batch.create",
    "POST /api/batches/{batchId}/resume":                   "batch.create",
    "POST /api/batches/{batchId}/close":                    "batch.create",
    "POST /api/items/{itemId}/replay-request":              "collect.write",
    "GET /api/batches":                                     "batch.read",
    "GET /api/batches/{batchId}":                           "batch.read",
    "GET /api/batches/{batchId}/user-stats":                "batch.read",
    "GET /api/batches/{batchId}/submissions":               "batch.read",
    "GET /api/collect/tasks":                               "collect.write",
    "POST /api/collect/{itemId}/claim":                     "collect.write",
    "POST /api/collect/{itemId}/submit":                    "collect.write",
    "POST /api/collect/{itemId}/release":                   "collect.write",
    "GET /api/collect/{itemId}/state":                      "collect.write",
    "POST /api/collect/{itemId}/redo":                      "collect.write",
    "POST /api/review/{itemId}/decide":                     "review.write",
    "GET /api/work/collect-tasks":                          "collect.write",
    "GET /api/work/my-submissions":                         "collect.write",
}


def check_permission(caller: CallerInfo, perm: str) -> bool:
    return "*" in caller.permissions or perm in caller.permissions


def add_rbac_middleware(app) -> None:  # type: ignore[no-untyped-def]
    """
    集中式 RBAC: 按当前请求的 (method, path) 匹配 app.router.routes, 用 route.path 模板
    查 ROUTE_PERMISSIONS, 缺权限即 403.

    实现要点: BaseHTTPMiddleware 阶段 request.scope["route"] 还没填, 必须手动遍历
    app.router.routes 调用 route.matches(scope) 才能拿到 route.path 模板.
    """
    from starlette.routing import Match
    from fastapi.responses import JSONResponse

    @app.middleware("http")
    async def _rbac(request: Request, call_next):  # type: ignore[no-untyped-def]
        if _is_public_path(request.url.path):
            return await call_next(request)
        caller = getattr(request.state, "caller", None)
        if not caller:
            return await call_next(request)

        matched_path: str | None = None
        for r in request.app.router.routes:
            try:
                m, _ = r.matches(request.scope)
            except Exception:
                continue
            if m == Match.FULL:
                matched_path = getattr(r, "path", None)
                break
        if matched_path:
            key = f"{request.method.upper()} {matched_path}"
            perm = ROUTE_PERMISSIONS.get(key)
            if perm and not check_permission(caller, perm):
                return JSONResponse(
                    status_code=403,
                    content={"error": {"code": "FORBIDDEN", "message": f'caller "{caller.name}" 缺少权限: {perm}'}},
                )
        return await call_next(request)


def require_permission(request: Request, perm: str) -> None:
    caller: CallerInfo | None = getattr(request.state, "caller", None)
    if not caller or not check_permission(caller, perm):
        name = caller.name if caller else "anonymous"
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": f'caller "{name}" 缺少权限: {perm}'},
        )


async def bootstrap_api_key() -> None:
    k = os.environ.get("BOOTSTRAP_API_KEY")
    if not k:
        return
    if len(k) < 16:
        print("[auth] BOOTSTRAP_API_KEY 长度过短 (<16), 已忽略")
        return

    slug = (os.environ.get("BOOTSTRAP_TENANT_SLUG") or "").strip()
    tenant_id = DEFAULT_TENANT_ID
    pool = get_pool()

    if slug:
        row = await pool.fetchrow("SELECT id FROM tenants WHERE slug = $1", slug)
        if not row:
            print(f'[auth] BOOTSTRAP_TENANT_SLUG="{slug}" 未找到对应租户, 回落到 default')
        else:
            tenant_id = row["id"]

    key_hash = hash_key(k)
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """INSERT INTO api_keys (name, key_hash, scope, tenant_id)
                   VALUES ('bootstrap', $1, 'admin', $2)
                   ON CONFLICT (key_hash) DO UPDATE SET
                     name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id
                   RETURNING id""",
                key_hash, tenant_id,
            )
            api_key_id = row["id"]
            admin_role = await conn.fetchrow(
                "SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'"
            )
            if admin_role:
                await conn.execute(
                    """INSERT INTO api_key_roles (api_key_id, role_id)
                       VALUES ($1, $2) ON CONFLICT DO NOTHING""",
                    api_key_id, admin_role["id"],
                )
    print(f"[auth] bootstrap api key upserted (tenant={slug or 'default'}, role=tenant_admin)")
