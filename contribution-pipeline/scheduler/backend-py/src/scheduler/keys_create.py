"""
一次性 CLI: 生成一把新的 API key

用法:
    python -m scheduler.keys_create --name=worker-translate --tenant=acme --roles=worker
    python -m scheduler.keys_create --name=integration --tenant=acme --roles=tenant_admin --expires-days=30
    python -m scheduler.keys_create --name=multi-role --tenant=acme --roles=pipeline_editor,batch_operator

行为:
    - 必须指定 --tenant=<slug>; 单租户起步用 --tenant=default
    - --roles 接逗号分隔的 role 名列表; 内建 role: tenant_admin / pipeline_editor / batch_operator / worker
    - 缺 --roles 时不绑任何角色, 调用任何受保护接口都会 403 (生产防误);
      dev 测试可加 --roles=tenant_admin 拿全权
    - 用 secrets.token_urlsafe(24) 生成 key (32 字符, URL-safe), 不可被服务端反推
    - 只在 stdout 打印一次明文; DB 只存 sha256
"""
from __future__ import annotations
import asyncio
import re
import secrets
import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

from .auth import hash_key
from .db import init_pool, close_pool, as_system


def parse_args() -> dict:
    args: dict[str, str] = {}
    for a in sys.argv[1:]:
        m = re.match(r"^--([^=]+)=(.*)$", a)
        if m:
            args[m.group(1)] = m.group(2)
    if not args.get("name") or not args.get("tenant"):
        print(
            "用法: python -m scheduler.keys_create --name=<service> --tenant=<slug> "
            "--roles=<r1,r2> [--expires-days=N] [--scope=admin]",
            file=sys.stderr,
        )
        sys.exit(1)
    return {
        "name": args["name"],
        "tenant": args["tenant"],
        "scope": args.get("scope", "admin"),
        "expires_days": int(args["expires-days"]) if args.get("expires-days") else None,
        "roles": [s.strip() for s in args["roles"].split(",") if s.strip()] if args.get("roles") else [],
    }


async def _amain() -> None:
    parsed = parse_args()
    name        = parsed["name"]
    tenant_slug = parsed["tenant"]
    scope       = parsed["scope"]
    expires_days = parsed["expires_days"]
    roles       = parsed["roles"]

    await init_pool()
    try:
        async def _resolve(conn):
            tenant = await conn.fetchrow("SELECT id FROM tenants WHERE slug = $1", tenant_slug)
            if not tenant:
                return None, None
            role_ids: list[str] = []
            for r in roles:
                row = await conn.fetchrow(
                    """SELECT id FROM roles
                       WHERE name = $1 AND (tenant_id IS NULL OR tenant_id = $2)
                       ORDER BY tenant_id NULLS LAST
                       LIMIT 1""",
                    r, tenant["id"],
                )
                if not row:
                    return tenant, ("missing_role", r)
                role_ids.append(row["id"])
            return tenant, role_ids

        tenant, role_or_err = await as_system(_resolve)
        if tenant is None:
            print(f"✗ 租户 slug 不存在: {tenant_slug}", file=sys.stderr)
            print("先建租户: python -m scheduler.tenants_create --slug=<slug> --name=<name>", file=sys.stderr)
            sys.exit(1)
        if isinstance(role_or_err, tuple) and role_or_err[0] == "missing_role":
            print(f"✗ role 不存在: {role_or_err[1]}", file=sys.stderr)
            sys.exit(1)

        tenant_id = tenant["id"]
        role_ids: list[str] = role_or_err  # type: ignore[assignment]

        key = secrets.token_urlsafe(24)
        h = hash_key(key)
        expires_at = (
            datetime.now(tz=timezone.utc) + timedelta(days=expires_days)
            if expires_days is not None
            else None
        )

        async def _insert(conn):
            row = await conn.fetchrow(
                """INSERT INTO api_keys (name, key_hash, scope, expires_at, tenant_id)
                   VALUES ($1, $2, $3, $4, $5) RETURNING id""",
                name, h, scope, expires_at, tenant_id,
            )
            for rid in role_ids:
                await conn.execute(
                    "INSERT INTO api_key_roles (api_key_id, role_id) VALUES ($1, $2)",
                    row["id"], rid,
                )
            return row["id"]

        api_key_id = await as_system(_insert)

        print("✓ API key 已创建")
        print(f"  id:         {api_key_id}")
        print(f"  name:       {name}")
        print(f"  tenant:     {tenant_slug} ({tenant_id})")
        print(f"  scope:      {scope}")
        print(f"  roles:      {', '.join(roles) if roles else '(none — 所有受保护接口将 403)'}")
        print(f"  expires_at: {expires_at.isoformat() if expires_at else 'never'}")
        print()
        print("⚠ 以下 key 只在此处显示一次, 请立即记录:")
        print()
        print(f"  {key}")
        print()
        print(f"用法 (header):  x-api-key: {key}")
    finally:
        await close_pool()


def main() -> None:
    load_dotenv()
    asyncio.run(_amain())


if __name__ == "__main__":
    main()
