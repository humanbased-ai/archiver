"""
Z. 跨租户 RLS 隔离 — 与 backend/test/multitenant.test.ts 1:1.

纯 DB 层测试, 不打 HTTP. 验证 PG RLS policy 真实拦截 + WITH CHECK 拒跨租户写入.
"""
from __future__ import annotations
import re
from typing import AsyncIterator

import asyncpg
import pytest
import pytest_asyncio

from scheduler.db import as_system, fetch, with_tenant

A_ID = "aaaaaaaa-1111-1111-1111-111111111111"
B_ID = "bbbbbbbb-2222-2222-2222-222222222222"


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def fixtures(db_pool) -> AsyncIterator[dict[str, str]]:
    ids: dict[str, str] = {}

    async def _setup(conn):
        await conn.execute(
            """INSERT INTO tenants (id, slug, name, plan)
               VALUES ($1::uuid, 'test-mt-a', 'MT Test A', 'standard'),
                      ($2::uuid, 'test-mt-b', 'MT Test B', 'standard')
               ON CONFLICT (slug) DO NOTHING""",
            A_ID, B_ID,
        )
        pa = await conn.fetchrow(
            """INSERT INTO pipelines (tenant_id, name, steps)
               VALUES ($1::uuid, 'mt-test-A', '[]'::jsonb) RETURNING task_id""",
            A_ID,
        )
        ids["pipe_a"] = str(pa["task_id"])
        await conn.execute(
            """INSERT INTO pipeline_versions (task_id, tenant_id, version, steps, forms, forms_etag)
               VALUES ($1, $2::uuid, 1, '[]'::jsonb, '{}'::jsonb, 'mt-a')""",
            pa["task_id"], A_ID,
        )
        pb = await conn.fetchrow(
            """INSERT INTO pipelines (tenant_id, name, steps)
               VALUES ($1::uuid, 'mt-test-B', '[]'::jsonb) RETURNING task_id""",
            B_ID,
        )
        ids["pipe_b"] = str(pb["task_id"])
        await conn.execute(
            """INSERT INTO pipeline_versions (task_id, tenant_id, version, steps, forms, forms_etag)
               VALUES ($1, $2::uuid, 1, '[]'::jsonb, '{}'::jsonb, 'mt-b')""",
            pb["task_id"], B_ID,
        )

    await as_system(_setup)
    yield ids

    async def _cleanup(conn):
        await conn.execute(
            "DELETE FROM pipelines WHERE task_id = ANY($1::uuid[])",
            [ids["pipe_a"], ids["pipe_b"]],
        )
        await conn.execute(
            "DELETE FROM tenants WHERE id = ANY($1::uuid[])",
            [A_ID, B_ID],
        )

    await as_system(_cleanup)


@pytest.mark.asyncio(loop_scope="session")
async def test_z1_tenant_a_sees_only_own_pipelines(fixtures):
    async def _q(conn):
        return await conn.fetch("SELECT task_id FROM pipelines")
    rows = await with_tenant(A_ID, _q)
    ids = {str(r["task_id"]) for r in rows}
    assert fixtures["pipe_a"] in ids, "A 应能看到自己的 pipeline"
    assert fixtures["pipe_b"] not in ids, "A 不应看到 B 的 pipeline"


@pytest.mark.asyncio(loop_scope="session")
async def test_z2_tenant_b_sees_only_own_pipelines(fixtures):
    async def _q(conn):
        return await conn.fetch("SELECT task_id FROM pipelines")
    rows = await with_tenant(B_ID, _q)
    ids = {str(r["task_id"]) for r in rows}
    assert fixtures["pipe_b"] in ids
    assert fixtures["pipe_a"] not in ids


@pytest.mark.asyncio(loop_scope="session")
async def test_z3_as_system_sees_all(fixtures):
    async def _q(conn):
        return await conn.fetch(
            "SELECT task_id FROM pipelines WHERE task_id = ANY($1::uuid[])",
            [fixtures["pipe_a"], fixtures["pipe_b"]],
        )
    rows = await as_system(_q)
    assert len(rows) == 2


@pytest.mark.asyncio(loop_scope="session")
async def test_z4_no_guc_returns_zero_rows(fixtures):
    rows = await fetch(
        "SELECT task_id FROM pipelines WHERE task_id = ANY($1::uuid[])",
        [fixtures["pipe_a"], fixtures["pipe_b"]],
    )
    assert len(rows) == 0, "无 GUC 时 RLS 应让查询返回零行"


@pytest.mark.asyncio(loop_scope="session")
async def test_z5_with_check_rejects_cross_tenant_insert(fixtures):
    err: Exception | None = None
    try:
        async def _w(conn):
            await conn.execute(
                """INSERT INTO pipelines (tenant_id, name, steps)
                   VALUES ($1::uuid, 'cross-tenant-attack', '[]'::jsonb)""",
                B_ID,
            )
        await with_tenant(A_ID, _w)
    except Exception as e:
        err = e
    assert err is not None, "WITH CHECK 应拒绝跨租户写入"
    assert re.search(r"row-level security|row violates|RLS", str(err), re.IGNORECASE)


@pytest.mark.asyncio(loop_scope="session")
async def test_z6_items_isolation(fixtures):
    async def _read_pv(conn):
        return await conn.fetchrow(
            "SELECT id FROM pipeline_versions WHERE task_id = $1::uuid LIMIT 1",
            fixtures["pipe_a"],
        )
    pv = await as_system(_read_pv)

    async def _ins(conn):
        return await conn.fetchrow(
            """INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope)
               VALUES ($1::uuid, $2::uuid, $3, 'ingest', '{"payload":{}}'::jsonb)
               RETURNING id""",
            A_ID, fixtures["pipe_a"], pv["id"],
        )
    a_item = await with_tenant(A_ID, _ins)

    async def _sel_b(conn):
        return await conn.fetch("SELECT id FROM items WHERE id = $1::uuid", a_item["id"])
    seen_b = await with_tenant(B_ID, _sel_b)
    assert len(seen_b) == 0, "B 不应看到 A 的 item"

    async def _sel_a(conn):
        return await conn.fetch("SELECT id FROM items WHERE id = $1::uuid", a_item["id"])
    seen_a = await with_tenant(A_ID, _sel_a)
    assert len(seen_a) == 1
