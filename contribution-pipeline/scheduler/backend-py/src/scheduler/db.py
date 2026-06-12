from __future__ import annotations
import json
import os
from typing import Any, Callable, Awaitable, TypeVar
import asyncpg


def _json_encoder(v: Any) -> str:
    """允许传 dict/list (自动序列化) 或已序列化的 str (直接透传), 两路都正确."""
    if isinstance(v, str):
        return v
    return json.dumps(v)


async def _conn_init(conn: asyncpg.Connection) -> None:
    """注册 JSON/JSONB 编解码器, 让 JSONB 列直接返回 Python dict/list."""
    await conn.set_type_codec("jsonb", encoder=_json_encoder, decoder=json.loads, schema="pg_catalog")
    await conn.set_type_codec("json",  encoder=_json_encoder, decoder=json.loads, schema="pg_catalog")

_pool: asyncpg.Pool | None = None

T = TypeVar("T")


async def init_pool() -> None:
    global _pool
    url = os.environ.get("DATABASE_URL", "postgres://scheduler:scheduler@localhost:5433/scheduler")
    _pool = await asyncpg.create_pool(
        url,
        min_size=2,
        max_size=50,
        command_timeout=30,
        max_inactive_connection_lifetime=30,
        init=_conn_init,
    )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialised")
    return _pool


async def with_tenant(tenant_id: str, fn: Callable[[asyncpg.Connection], Awaitable[T]]) -> T:
    """开事务 + SET LOCAL app.tenant_id → RLS 行级过滤生效."""
    async with get_pool().acquire() as conn:
        async with conn.transaction():
            # set_config 的值必须 text. caller.tenant_id 来源里可能是 UUID 对象, 这里兜底.
            await conn.execute("SELECT set_config('app.tenant_id', $1, true)", str(tenant_id))
            return await fn(conn)


async def as_system(fn: Callable[[asyncpg.Connection], Awaitable[T]]) -> T:
    """SET LOCAL app.role='system' → 跳 RLS. 仅供 reconciler/autoworker 跨租户操作."""
    async with get_pool().acquire() as conn:
        async with conn.transaction():
            await conn.execute("SELECT set_config('app.role', 'system', true)")
            return await fn(conn)


async def with_caller_tx(
    caller: Any,  # CallerInfo — 避免循环导入
    fn: Callable[[asyncpg.Connection], Awaitable[T]],
) -> T:
    if caller.is_system_actor:
        return await as_system(fn)
    return await with_tenant(caller.tenant_id, fn)


async def fetch(query: str, *args: Any) -> list[asyncpg.Record]:
    async with get_pool().acquire() as conn:
        return await conn.fetch(query, *args)


async def fetchrow(query: str, *args: Any) -> asyncpg.Record | None:
    async with get_pool().acquire() as conn:
        return await conn.fetchrow(query, *args)


async def execute(query: str, *args: Any) -> str:
    async with get_pool().acquire() as conn:
        return await conn.execute(query, *args)
