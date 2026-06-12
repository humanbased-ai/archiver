"""
CLI: 创建租户

用法:
    python -m scheduler.tenants_create --slug=acme --name="Acme Corp"
    python -m scheduler.tenants_create --slug=acme --name="Acme Corp" --plan=enterprise

slug 只能含小写字母 / 数字 / 连字符, 长度 2~32 (路由 / 日志 / 子域名复用此值)。
创建后输出 tenant id, 后续 keys_create 时用 --tenant=<slug>。
"""
from __future__ import annotations
import asyncio
import re
import sys

from dotenv import load_dotenv

from .db import init_pool, close_pool, as_system

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$")


def parse_args() -> tuple[str, str, str]:
    args: dict[str, str] = {}
    for a in sys.argv[1:]:
        m = re.match(r"^--([^=]+)=(.*)$", a)
        if m:
            args[m.group(1)] = m.group(2)
    if not args.get("slug") or not args.get("name"):
        print("用法: python -m scheduler.tenants_create --slug=<slug> --name=<name> [--plan=standard]", file=sys.stderr)
        sys.exit(1)
    if not SLUG_RE.match(args["slug"]):
        print(f"slug 不合法: {args['slug']}", file=sys.stderr)
        print("规则: 小写字母 / 数字 / 连字符, 长度 2~32, 不能以连字符开头或结尾", file=sys.stderr)
        sys.exit(1)
    return args["slug"], args["name"], args.get("plan", "standard")


async def _amain() -> None:
    slug, name, plan = parse_args()
    await init_pool()
    try:
        async def _do(conn):
            return await conn.fetchrow(
                "INSERT INTO tenants (slug, name, plan) VALUES ($1, $2, $3) RETURNING id",
                slug, name, plan,
            )
        row = await as_system(_do)
        print("✓ 租户已创建")
        print(f"  id:    {row['id']}")
        print(f"  slug:  {slug}")
        print(f"  name:  {name}")
        print(f"  plan:  {plan}")
        print()
        print(f"下一步: python -m scheduler.keys_create --name=<service> --tenant={slug}")
    except Exception as e:
        msg = str(e)
        if "duplicate key" in msg:
            print("✗ slug 已存在,换一个", file=sys.stderr)
        else:
            print(e, file=sys.stderr)
        sys.exit(1)
    finally:
        await close_pool()


def main() -> None:
    load_dotenv()
    asyncio.run(_amain())


if __name__ == "__main__":
    main()
