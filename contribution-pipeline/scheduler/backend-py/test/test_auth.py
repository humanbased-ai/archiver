"""
S. API key 鉴权 (γ 模式) — 与 backend/test/auth.test.ts 1:1.

测试通过 httpx.ASGITransport 直接 inject 到内存里的 FastAPI app, 不走 4001 端口的常驻 dev server.
RBAC 中间件按 server.py 的实现复制一份, 让测试反映真实路径而不是"被翻新过的版本".
"""
from __future__ import annotations
import os
from typing import AsyncIterator

import pytest
import pytest_asyncio
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from scheduler.auth import (
    API_KEY_HEADER,
    AuthMiddleware,
    DEFAULT_TENANT_ID,
    ROUTE_PERMISSIONS,
    TENANT_ID_HEADER,
    add_rbac_middleware,
    get_internal_key,
    hash_key,
)
from scheduler.db import as_system

TEST_KEY = "test-key-deadbeef-12345678"


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def test_key(db_pool) -> AsyncIterator[str]:
    async def _insert(conn):
        row = await conn.fetchrow(
            """INSERT INTO api_keys (name, key_hash, scope, tenant_id)
               VALUES ('e2e-test-key', $1, 'admin', $2) RETURNING id""",
            hash_key(TEST_KEY), DEFAULT_TENANT_ID,
        )
        return row["id"]
    key_id = await as_system(_insert)
    yield key_id
    async def _cleanup(conn):
        await conn.execute("DELETE FROM api_keys WHERE id = $1", key_id)
    await as_system(_cleanup)


def build_app(auth_required: bool, rbac: bool = False) -> FastAPI:
    """模拟 server.create_app 的最小子集: AuthMiddleware (+ 可选 RBAC) + 测试路由.

    add 顺序 = 反向执行顺序: RBAC 先 add (内层), Auth 后 add (外层, 最先跑).
    """
    os.environ["AUTH_REQUIRED"] = "true" if auth_required else "false"
    app = FastAPI()

    if rbac:
        add_rbac_middleware(app)
    app.add_middleware(AuthMiddleware)

    @app.get("/health")
    async def health():
        return {"ok": True}

    @app.get("/api/v1/protected")
    async def protected(request: Request):
        caller = getattr(request.state, "caller", None)
        if not caller:
            return {"ok": True, "caller": None}
        return {
            "ok": True,
            "caller": {
                "id": caller.id,
                "name": caller.name,
                "scope": caller.scope,
                "tenantId": caller.tenant_id,
                "isSystemActor": caller.is_system_actor,
                "permissions": list(caller.permissions),
            },
        }

    @app.get("/api/v1/admin/queue")
    async def admin_queue():
        return {"queue": []}

    return app


async def _get(app: FastAPI, path: str, headers: dict | None = None) -> tuple[int, dict]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get(path, headers=headers or {})
        try:
            body = r.json()
        except Exception:
            body = {"_raw": r.text}
        return r.status_code, body


# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_s1_auth_disabled_missing_key_passes(db_pool, test_key):
    status, _ = await _get(build_app(auth_required=False), "/api/v1/protected")
    assert status == 200


@pytest.mark.asyncio(loop_scope="session")
async def test_s2_auth_required_missing_key_returns_401(db_pool, test_key):
    status, body = await _get(build_app(auth_required=True), "/api/v1/protected")
    assert status == 401
    assert body["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio(loop_scope="session")
async def test_s3_wrong_key_returns_401(db_pool, test_key):
    status, _ = await _get(
        build_app(auth_required=True), "/api/v1/protected",
        headers={API_KEY_HEADER: "bogus-key-not-in-db"},
    )
    assert status == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_s4_valid_key_returns_200_with_caller(db_pool, test_key):
    status, body = await _get(
        build_app(auth_required=True), "/api/v1/protected",
        headers={API_KEY_HEADER: TEST_KEY},
    )
    assert status == 200
    assert body["caller"]["name"] == "e2e-test-key"
    assert body["caller"]["scope"] == "admin"


@pytest.mark.asyncio(loop_scope="session")
async def test_s5_internal_key_returns_200(db_pool, test_key):
    status, body = await _get(
        build_app(auth_required=True), "/api/v1/protected",
        headers={API_KEY_HEADER: get_internal_key()},
    )
    assert status == 200
    assert body["caller"]["id"] == "internal"


@pytest.mark.asyncio(loop_scope="session")
async def test_s6_revoked_key_returns_401(db_pool, test_key):
    async def _revoke(conn):
        await conn.execute("UPDATE api_keys SET revoked_at = NOW() WHERE id = $1", test_key)
    async def _unrevoke(conn):
        await conn.execute("UPDATE api_keys SET revoked_at = NULL WHERE id = $1", test_key)
    await as_system(_revoke)
    try:
        status, _ = await _get(
            build_app(auth_required=True), "/api/v1/protected",
            headers={API_KEY_HEADER: TEST_KEY},
        )
        assert status == 401
    finally:
        await as_system(_unrevoke)


@pytest.mark.asyncio(loop_scope="session")
async def test_s7_health_is_public(db_pool, test_key):
    status, _ = await _get(build_app(auth_required=True), "/health")
    assert status == 200


@pytest.mark.asyncio(loop_scope="session")
async def test_s8_admin_key_uses_api_keys_tenant_and_is_not_system(db_pool, test_key):
    status, body = await _get(
        build_app(auth_required=True), "/api/v1/protected",
        headers={API_KEY_HEADER: TEST_KEY},
    )
    assert status == 200
    assert body["caller"]["tenantId"] == DEFAULT_TENANT_ID
    assert body["caller"]["isSystemActor"] is False


@pytest.mark.asyncio(loop_scope="session")
async def test_s9_non_system_scope_ignores_tenant_header(db_pool, test_key):
    other_tenant = "11111111-2222-3333-4444-555555555555"
    status, body = await _get(
        build_app(auth_required=True), "/api/v1/protected",
        headers={API_KEY_HEADER: TEST_KEY, TENANT_ID_HEADER: other_tenant},
    )
    assert status == 200
    assert body["caller"]["tenantId"] == DEFAULT_TENANT_ID
    assert body["caller"]["isSystemActor"] is False


@pytest.mark.asyncio(loop_scope="session")
async def test_s10_internal_key_without_tenant_header_is_system(db_pool, test_key):
    status, body = await _get(
        build_app(auth_required=True), "/api/v1/protected",
        headers={API_KEY_HEADER: get_internal_key()},
    )
    assert status == 200
    assert body["caller"]["tenantId"] == DEFAULT_TENANT_ID
    assert body["caller"]["isSystemActor"] is True


@pytest.mark.asyncio(loop_scope="session")
async def test_s11_internal_key_with_tenant_header_is_proxy(db_pool, test_key):
    override = "11111111-2222-3333-4444-555555555555"
    status, body = await _get(
        build_app(auth_required=True), "/api/v1/protected",
        headers={API_KEY_HEADER: get_internal_key(), TENANT_ID_HEADER: override},
    )
    assert status == 200
    assert body["caller"]["tenantId"] == override
    assert body["caller"]["isSystemActor"] is False


@pytest.mark.asyncio(loop_scope="session")
async def test_s12_system_scope_with_tenant_header_follows_header(db_pool, test_key):
    other_tenant = "22222222-3333-4444-5555-666666666666"
    async def _to_system(conn):
        await conn.execute("UPDATE api_keys SET scope = 'system' WHERE id = $1", test_key)
    async def _back_to_admin(conn):
        await conn.execute("UPDATE api_keys SET scope = 'admin' WHERE id = $1", test_key)
    await as_system(_to_system)
    try:
        status, body = await _get(
            build_app(auth_required=True), "/api/v1/protected",
            headers={API_KEY_HEADER: TEST_KEY, TENANT_ID_HEADER: other_tenant},
        )
        assert status == 200
        assert body["caller"]["tenantId"] == other_tenant
        assert body["caller"]["isSystemActor"] is False  # 带 header → 代行模式
    finally:
        await as_system(_back_to_admin)


@pytest.mark.asyncio(loop_scope="session")
async def test_s13_system_scope_no_header_is_system_actor(db_pool, test_key):
    async def _to_system(conn):
        await conn.execute("UPDATE api_keys SET scope = 'system' WHERE id = $1", test_key)
    async def _back_to_admin(conn):
        await conn.execute("UPDATE api_keys SET scope = 'admin' WHERE id = $1", test_key)
    await as_system(_to_system)
    try:
        status, body = await _get(
            build_app(auth_required=True), "/api/v1/protected",
            headers={API_KEY_HEADER: TEST_KEY},
        )
        assert status == 200
        assert body["caller"]["isSystemActor"] is True
    finally:
        await as_system(_back_to_admin)


@pytest.mark.asyncio(loop_scope="session")
async def test_s14_rbac_no_role_returns_403(db_pool, test_key):
    status, body = await _get(
        build_app(auth_required=True, rbac=True), "/api/v1/admin/queue",
        headers={API_KEY_HEADER: TEST_KEY},
    )
    assert status == 403
    assert body["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio(loop_scope="session")
async def test_s15_rbac_with_tenant_admin_role_passes(db_pool, test_key):
    async def _grant(conn):
        admin_role = await conn.fetchrow(
            "SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'"
        )
        await conn.execute(
            "INSERT INTO api_key_roles (api_key_id, role_id) VALUES ($1, $2)",
            test_key, admin_role["id"],
        )
    async def _revoke(conn):
        await conn.execute("DELETE FROM api_key_roles WHERE api_key_id = $1", test_key)
    await as_system(_grant)
    try:
        status, _ = await _get(
            build_app(auth_required=True, rbac=True), "/api/v1/admin/queue",
            headers={API_KEY_HEADER: TEST_KEY},
        )
        assert status == 200
    finally:
        await as_system(_revoke)


@pytest.mark.asyncio(loop_scope="session")
async def test_s16_rbac_internal_key_bypasses(db_pool, test_key):
    status, _ = await _get(
        build_app(auth_required=True, rbac=True), "/api/v1/admin/queue",
        headers={API_KEY_HEADER: get_internal_key()},
    )
    assert status == 200


def test_s17_route_permissions_completeness_smoke():
    assert ROUTE_PERMISSIONS["GET /api/v1/admin/queue"] == "admin.queue"
    assert ROUTE_PERMISSIONS["POST /api/v1/queue/{nodeKey}/lease"] == "queue.lease"
    assert ROUTE_PERMISSIONS["POST /api/v1/result"] == "queue.result"
    assert ROUTE_PERMISSIONS["POST /api/batches"] == "batch.create"
    assert ROUTE_PERMISSIONS["POST /api/collect/{itemId}/submit"] == "collect.write"
