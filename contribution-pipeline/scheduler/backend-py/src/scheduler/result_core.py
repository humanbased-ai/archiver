"""
applyResult 核心逻辑 — 与 result-core.ts 1:1

applyResult(body, conn=None):
  conn 缺省时自己开连接 + 事务; 有 conn 时复用 (业务层"业务写入+推进"原子用)
"""
from __future__ import annotations
import json
import math
from typing import Any

import asyncpg

from .db import get_pool
from .output_validator import validate_node_output
from .router import compute_next_step
from .types import StepConfig

STEP_OUTPUT_CAP_BYTES = 64 * 1024


class ResultError(Exception):
    def __init__(self, http_status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.http_status = http_status
        self.code = code


def _sanitize_step_output(output: Any) -> dict[str, Any]:
    if output is None or not isinstance(output, dict):
        raise ResultError(400, "BAD_OUTPUT", "step output must be a plain object")
    serialized = json.dumps(output)
    if len(serialized.encode()) > STEP_OUTPUT_CAP_BYTES:
        raise ResultError(400, "OUTPUT_TOO_LARGE", f"step output > {STEP_OUTPUT_CAP_BYTES} bytes ({len(serialized)} actual)")
    return output


def _build_isolated_envelope(
    prev: dict[str, Any],
    step_key: str,
    output: dict[str, Any],
) -> dict[str, Any]:
    prev_outputs = prev.get("outputs") or {}
    new_outputs: dict[str, Any] = {k: v for k, v in prev_outputs.items() if k != step_key}
    new_outputs[step_key] = output
    return {"payload": prev.get("payload", {}), "outputs": new_outputs, "tags": prev.get("tags", {})}


async def apply_result(body: dict[str, Any], conn: asyncpg.Connection | None = None) -> dict[str, Any]:
    if conn is not None:
        return await _apply_result_in(body, conn)
    pool = get_pool()
    async with pool.acquire() as c:
        async with c.transaction():
            return await _apply_result_in(body, c)


async def _apply_result_in(body: dict[str, Any], conn: asyncpg.Connection) -> dict[str, Any]:
    run_id = body["runId"]
    ob = await conn.fetchrow("SELECT * FROM outbox WHERE run_id = $1", run_id)
    if not ob:
        raise ResultError(404, "UNKNOWN_RUN", "run not found")

    ob = dict(ob)
    if ob["status"] in ("done", "failed"):
        return {"ok": True, "applied": False}

    import datetime
    if ob["status"] == "leased" and ob.get("expected_by"):
        exp = ob["expected_by"]
        if isinstance(exp, str):
            exp = datetime.datetime.fromisoformat(exp)
        if exp.replace(tzinfo=datetime.timezone.utc) < datetime.datetime.now(datetime.timezone.utc):
            raise ResultError(409, "LEASE_EXPIRED", "租约已过期，请重新领取任务")

    effective_body = dict(body)

    if body.get("status") == "success" and body.get("output") is not None:
        lookup = await conn.fetchrow(
            """SELECT COALESCE(s->>'nodeVersion','1.0') AS node_version,
                      nd.outputs_schema, nd.outputs_validation
               FROM items i
               JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
               JOIN LATERAL jsonb_array_elements(pv.steps) s ON TRUE
               LEFT JOIN node_definitions nd
                 ON nd.key = $1 AND nd.version = COALESCE(s->>'nodeVersion','1.0')
               WHERE i.id = $2 AND s->>'key' = $3
               LIMIT 1""",
            ob["node_key"], ob["item_id"], ob["step_key"],
        )
        if lookup and lookup["outputs_schema"]:
            schema = json.loads(lookup["outputs_schema"]) if isinstance(lookup["outputs_schema"], str) else lookup["outputs_schema"]
            validation_mode = lookup["outputs_validation"] or "strict"
            v = validate_node_output(
                node_key=ob["node_key"],
                node_version=lookup["node_version"],
                outputs_schema=schema,
                outputs_validation=validation_mode,
                output=body["output"],
            )
            if v:
                sample = "; ".join(f"{e.path}: {e.message}" for e in v.errors[:3])
                msg = f"节点 {ob['node_key']}@{lookup['node_version']} 输出不符 outputsSchema: {sample}"
                if validation_mode == "strict":
                    effective_body = {**body, "status": "failed", "output": None, "error": {"code": "OUTPUT_SCHEMA_VIOLATION", "message": msg, "retryable": False}}
                else:
                    import logging
                    logging.getLogger(__name__).warning(f"[output-validator:warn] run={run_id} {msg}")

    outcome = "success" if effective_body.get("status") == "success" else "failed"
    output_json = json.dumps(effective_body["output"]) if effective_body.get("output") else None
    error_json = json.dumps(effective_body["error"]) if effective_body.get("error") else None

    await conn.execute(
        """INSERT INTO attempts
           (tenant_id, run_id, item_id, task_id, step_key, node_key, attempt, outcome,
            output, error, worker_id, started_at, finished_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())""",
        ob["tenant_id"], ob["run_id"], ob["item_id"], ob["task_id"],
        ob["step_key"], ob["node_key"], ob["attempt"], outcome,
        output_json, error_json, ob.get("leased_by"), ob.get("leased_at"),
    )

    if effective_body.get("status") == "success":
        return await _apply_success(effective_body, conn, ob)
    return await _apply_failed(effective_body, conn, ob)


async def _apply_success(body: dict[str, Any], conn: asyncpg.Connection, ob: dict[str, Any]) -> dict[str, Any]:
    it = dict(await conn.fetchrow("SELECT * FROM items WHERE id = $1", ob["item_id"]))
    pipe_row = await conn.fetchrow("SELECT steps FROM pipeline_versions WHERE id = $1", it["pipeline_version_id"])
    steps_raw = json.loads(pipe_row["steps"]) if isinstance(pipe_row["steps"], str) else pipe_row["steps"]
    pipeline = [StepConfig(**s) for s in steps_raw]
    loop_counts: dict[str, int] = json.loads(it["loop_counts"]) if isinstance(it.get("loop_counts"), str) else (it.get("loop_counts") or {})

    route = compute_next_step(pipeline, ob["step_key"], body.get("output") or {}, body.get("nextHint"), loop_counts)
    safe_output = _sanitize_step_output(body.get("output") or {})
    envelope_raw = json.loads(it["envelope"]) if isinstance(it["envelope"], str) else it["envelope"]
    new_envelope = _build_isolated_envelope(envelope_raw, ob["step_key"], safe_output)
    new_loop_counts = dict(loop_counts)
    if route.loop_increment:
        k = route.loop_increment["stepKey"]
        new_loop_counts[k] = new_loop_counts.get(k, 0) + route.loop_increment["value"]

    await conn.execute(
        "UPDATE items SET envelope=$1, current_step=$2, loop_counts=$3, updated_at=NOW() WHERE id=$4",
        json.dumps(new_envelope), route.next_step_key, json.dumps(new_loop_counts), ob["item_id"],
    )
    await conn.execute("UPDATE outbox SET status='done', updated_at=NOW() WHERE run_id=$1", ob["run_id"])

    if route.next_step_key not in ("done", "stuck"):
        next_step = next((s for s in pipeline if s.key == route.next_step_key), None)
        if next_step:
            await conn.execute(
                "INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt) VALUES ($1,$2,$3,$4,$5,'pending',1)",
                ob["tenant_id"], ob["item_id"], ob["task_id"], route.next_step_key, next_step.node_key,
            )

    return {"ok": True, "applied": True, "nextStep": route.next_step_key}


async def _apply_failed(body: dict[str, Any], conn: asyncpg.Connection, ob: dict[str, Any]) -> dict[str, Any]:
    retryable = (body.get("error") or {}).get("retryable", True)
    node = await conn.fetchrow("SELECT * FROM node_definitions WHERE key=$1 ORDER BY version DESC LIMIT 1", ob["node_key"])
    pipe_row = await conn.fetchrow(
        "SELECT pv.steps FROM items i JOIN pipeline_versions pv ON pv.id=i.pipeline_version_id WHERE i.id=$1", ob["item_id"]
    )
    steps_raw = json.loads(pipe_row["steps"]) if isinstance(pipe_row["steps"], str) else pipe_row["steps"]
    step_policy = next((s.get("policy") for s in steps_raw if s.get("key") == ob["step_key"]), None)
    max_attempts = (step_policy or {}).get("maxAttempts") or (node["default_max_attempts"] if node else 3) or 3
    base_backoff = (step_policy or {}).get("baseBackoffMs") or 1000

    await conn.execute("UPDATE outbox SET status='failed', updated_at=NOW() WHERE run_id=$1", ob["run_id"])

    if retryable and ob["attempt"] < max_attempts:
        import datetime
        delay_ms = round(base_backoff * math.pow(2, ob["attempt"] - 1))
        scheduled_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(milliseconds=delay_ms)
        await conn.execute(
            "INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt, scheduled_at) VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)",
            ob["tenant_id"], ob["item_id"], ob["task_id"], ob["step_key"], ob["node_key"], ob["attempt"] + 1, scheduled_at,
        )
        return {"ok": True, "applied": True, "retryAt": scheduled_at.isoformat()}

    await conn.execute("UPDATE items SET current_step='stuck', updated_at=NOW() WHERE id=$1", ob["item_id"])
    return {"ok": True, "applied": True, "dlq": True}
