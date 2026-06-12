"""audit_log 月度分区滚动 — 与 partition.ts 1:1."""
from __future__ import annotations
from datetime import datetime, timezone, timedelta

from .db import as_system


async def ensure_audit_partitions() -> None:
    now = datetime.now(timezone.utc)
    months = [now, now.replace(day=1) + timedelta(days=32)]

    async def _run(conn):  # type: ignore[no-untyped-def]
        for m in months:
            start = m.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)
            name = f"audit_log_{start.strftime('%Y%m')}"
            await conn.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {name}
                PARTITION OF audit_log
                FOR VALUES FROM ('{start.isoformat()}') TO ('{end.isoformat()}')
                """
            )

    await as_system(_run)
