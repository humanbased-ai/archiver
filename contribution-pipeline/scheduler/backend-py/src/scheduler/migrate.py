"""
迁移脚本 — 按时间戳顺序执行 ../backend/migrations/*.sql
用法: python -m scheduler.migrate [up|status]
"""
from __future__ import annotations
import asyncio
import os
import sys
from pathlib import Path

import asyncpg

MIGRATIONS_DIR = Path(__file__).parent.parent.parent.parent / "backend" / "migrations"


async def run_migrations(action: str = "up") -> None:
    url = os.environ.get("DATABASE_URL", "postgres://scheduler:scheduler@localhost:5433/scheduler")
    conn = await asyncpg.connect(url)

    await conn.execute(
        """CREATE TABLE IF NOT EXISTS schema_migrations (
               filename TEXT PRIMARY KEY,
               applied_at TIMESTAMPTZ DEFAULT NOW()
           )"""
    )

    sql_files = sorted(f for f in MIGRATIONS_DIR.glob("*.sql") if f.is_file())

    if action == "status":
        applied = {r["filename"] for r in await conn.fetch("SELECT filename FROM schema_migrations")}
        for f in sql_files:
            status = "✓ applied" if f.name in applied else "  pending"
            print(f"{status}  {f.name}")
        await conn.close()
        return

    for f in sql_files:
        applied = await conn.fetchval("SELECT 1 FROM schema_migrations WHERE filename = $1", f.name)
        if applied:
            continue
        print(f"[migrate] applying {f.name}…")
        try:
            await conn.execute(f.read_text())
            await conn.execute("INSERT INTO schema_migrations (filename) VALUES ($1)", f.name)
            print(f"[migrate] ✓ {f.name}")
        except Exception as e:
            print(f"[migrate] ✗ {f.name}: {e}")
            raise

    await conn.close()
    print("[migrate] done")


def main() -> None:
    from dotenv import load_dotenv
    load_dotenv()
    action = sys.argv[1] if len(sys.argv) > 1 else "up"
    asyncio.run(run_migrations(action))


if __name__ == "__main__":
    main()
