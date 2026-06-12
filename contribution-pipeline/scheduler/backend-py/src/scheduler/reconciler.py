"""reconciler — 过期 lease 回收. 与 reconciler.ts 1:1."""
from __future__ import annotations
import asyncio
import json
import math
import time
import logging

from .db import as_system
from .audit import audit_system
from .partition import ensure_audit_partitions

logger = logging.getLogger(__name__)

RECONCILER_LOCK = 9527
PARTITION_CHECK_INTERVAL_S = 6 * 3600
_last_partition_check = 0.0
_stopped = False


def stop_reconciler() -> None:
    global _stopped
    _stopped = True


async def reconciler_loop() -> None:
    global _stopped
    _stopped = False
    logger.info("[reconciler] started, every 30s")
    while not _stopped:
        try:
            await reconcile_tick()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[reconciler] tick error: {e}")
        await asyncio.sleep(30)


async def reconcile_tick() -> None:
    global _last_partition_check
    now = time.time()
    if now - _last_partition_check > PARTITION_CHECK_INTERVAL_S:
        _last_partition_check = now
        try:
            await ensure_audit_partitions()
        except Exception as e:
            logger.warning(f"[reconciler] partition ensure failed: {e}")

    async def _run(conn):  # type: ignore[no-untyped-def]
        got = await conn.fetchrow("SELECT pg_try_advisory_xact_lock($1) AS ok", RECONCILER_LOCK)
        if not got["ok"]:
            return

        expired = await conn.fetch(
            "SELECT * FROM outbox WHERE status='leased' AND expected_by < NOW() ORDER BY expected_by ASC LIMIT 100"
        )
        if not expired:
            return
        logger.info(f"[reconciler] found {len(expired)} expired leases")

        node_keys = list({r["node_key"] for r in expired})
        item_ids  = list({r["item_id"] for r in expired})

        nodes = await conn.fetch(
            "SELECT DISTINCT ON (key) * FROM node_definitions WHERE key = ANY($1::text[]) ORDER BY key, version DESC",
            node_keys,
        )
        node_by_key = {r["key"]: dict(r) for r in nodes}

        steps_by_item: dict[str, list] = {}
        if item_ids:
            rows = await conn.fetch(
                "SELECT i.id AS item_id, pv.steps FROM items i JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id WHERE i.id = ANY($1::uuid[])",
                item_ids,
            )
            for r in rows:
                steps = json.loads(r["steps"]) if isinstance(r["steps"], str) else r["steps"]
                steps_by_item[str(r["item_id"])] = steps

        for ob in expired:
            ob = dict(ob)
            node = node_by_key.get(ob["node_key"])
            steps = steps_by_item.get(str(ob["item_id"])) or []
            step_policy = next((s.get("policy") for s in steps if s.get("key") == ob["step_key"]), None)
            await _reconcile_one(conn, ob, node, step_policy)

    await as_system(_run)


async def _reconcile_one(conn, ob: dict, node: dict | None, step_policy: dict | None) -> None:  # type: ignore[no-untyped-def]
    max_attempts = (step_policy or {}).get("maxAttempts") or (node or {}).get("default_max_attempts") or 3
    base_backoff = (step_policy or {}).get("baseBackoffMs") or 1000
    can_retry = bool((node or {}).get("idempotent")) and ob["attempt"] < max_attempts

    await conn.execute(
        """INSERT INTO attempts
           (tenant_id, run_id, item_id, task_id, step_key, node_key, attempt, outcome,
            worker_id, started_at, finished_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'timeout',$8,$9,NOW())""",
        ob["tenant_id"], ob["run_id"], ob["item_id"], ob["task_id"],
        ob["step_key"], ob["node_key"], ob["attempt"],
        ob.get("leased_by"), ob.get("leased_at"),
    )
    await conn.execute("UPDATE outbox SET status='failed', updated_at=NOW() WHERE run_id=$1", ob["run_id"])

    if can_retry:
        import datetime
        delay_ms = round(base_backoff * math.pow(2, ob["attempt"] - 1))
        scheduled_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(milliseconds=delay_ms)
        await conn.execute(
            "INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt, scheduled_at) VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)",
            ob["tenant_id"], ob["item_id"], ob["task_id"], ob["step_key"], ob["node_key"], ob["attempt"] + 1, scheduled_at,
        )
    else:
        await conn.execute("UPDATE items SET current_step='stuck', updated_at=NOW() WHERE id=$1", ob["item_id"])
        await conn.execute(
            """INSERT INTO attempts
               (tenant_id, run_id, item_id, task_id, step_key, node_key, attempt, outcome, error, finished_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,'dlq',$8,NOW())""",
            ob["tenant_id"], ob["run_id"], ob["item_id"], ob["task_id"],
            ob["step_key"], ob["node_key"], ob["attempt"],
            json.dumps({"reason": "timeout, retries exhausted or non-idempotent"}),
        )
        audit_system(ob["tenant_id"], "system:reconciler", "item.dlq",
                     {"kind": "item", "id": ob["item_id"]},
                     {"stepKey": ob["step_key"], "attempt": ob["attempt"]},
                     {"reason": "timeout, retries exhausted or non-idempotent"})
