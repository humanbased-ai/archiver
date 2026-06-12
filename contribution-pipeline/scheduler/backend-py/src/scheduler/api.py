"""调度核心路由 — 与 api.ts 1:1 对应 (P1)"""
from __future__ import annotations
import hashlib
import json
import re
from typing import Any
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, HTTPException, Request, Response

from .auth import CallerInfo, DEFAULT_TENANT_ID
from .audit import audit
from .db import with_caller_tx, as_system
from .drivers.registry import DriverJob, auto_node_keys, pick_driver
from .node_config import merge_effective_params, resolve_bindings
from .output_validator import validate_node_output
from .result_core import ResultError, apply_result
from .types import NodePresets

router = APIRouter()
DEFAULT_NODE_VERSION = "1.0"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _caller(request: Request) -> CallerInfo:
    c = getattr(request.state, "caller", None)
    if not c:
        raise HTTPException(401, detail={"error": {"code": "UNAUTHORIZED"}})
    return c


def _j(v: Any) -> str | None:
    return json.dumps(v) if v is not None else None


def _rows(rows: list[asyncpg.Record]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


def _404(code: str = "NOT_FOUND") -> HTTPException:
    return HTTPException(404, detail={"error": {"code": code}})


def _409(code: str, message: str = "") -> HTTPException:
    e: dict[str, Any] = {"code": code}
    if message:
        e["message"] = message
    return HTTPException(409, detail={"error": e})


def extract_forms(steps: list[dict]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for s in steps:
        params = s.get("params") or {}
        schema = params.get("schema")
        ui_schema = params.get("uiSchema")
        if schema is not None or ui_schema is not None:
            out[s["key"]] = {"schema": schema, "uiSchema": ui_schema}
    return out


def forms_etag(forms: dict) -> str:
    return hashlib.sha256(json.dumps(forms, sort_keys=True).encode()).hexdigest()


async def check_archived_node_refs(
    conn: asyncpg.Connection, steps: list[dict]
) -> dict[str, Any] | None:
    uniq: dict[str, dict] = {}
    for s in steps:
        v = s.get("nodeVersion") or DEFAULT_NODE_VERSION
        uniq[f"{s['nodeKey']}|{v}"] = {"nodeKey": s["nodeKey"], "nodeVersion": v}
    if not uniq:
        return None
    pairs = list(uniq.values())
    keys = [p["nodeKey"] for p in pairs]
    versions = [p["nodeVersion"] for p in pairs]
    rows = await conn.fetch(
        """SELECT nd.key, nd.version, nd.status FROM node_definitions nd
           JOIN unnest($1::text[], $2::text[]) AS t(k, v)
             ON nd.key = t.k AND nd.version = t.v""",
        keys, versions,
    )
    archived = [{"nodeKey": r["key"], "nodeVersion": r["version"]}
                for r in rows if r["status"] == "archived"]
    if not archived:
        return None
    return {
        "code": "ARCHIVED_NODE_REF",
        "message": f"pipeline 引用了 {len(archived)} 个 archived 节点, 请改用 active 版本或先 activate",
        "archived": archived,
    }


def _expand_disallowed_steps(step: dict | None) -> list[str]:
    if not step:
        return []
    p = step.get("params") or {}
    out: set[str] = set()
    if isinstance(p.get("disallowedFromSteps"), list):
        for s in p["disallowedFromSteps"]:
            if isinstance(s, str):
                out.add(s)
    if p.get("disallowSelfReview") is True and isinstance(p.get("reviewedStepKey"), str):
        out.add(p["reviewedStepKey"])
    return list(out)


# ── /api/v1/me ────────────────────────────────────────────────────────────────

@router.get("/api/v1/me")
async def get_me(request: Request) -> dict:
    c = _caller(request)
    return {
        "id": c.id,
        "name": c.name,
        "scope": c.scope,
        "tenantId": c.tenant_id,
        "isSystemActor": c.is_system_actor,
        "permissions": list(c.permissions),
    }


# ── /api/v1/dev/tenants ───────────────────────────────────────────────────────

@router.get("/api/v1/dev/tenants")
async def dev_tenants() -> dict:
    import os
    enabled = (
        os.environ.get("AUTH_REQUIRED") == "false"
        or os.environ.get("DEV_TENANT_PICKER") == "true"
    )
    if not enabled:
        raise _404()
    demos = [
        {"slug": "default", "name": "Default Tenant", "devKey": None},
        {"slug": "acme",    "name": "Acme Corp",      "devKey": "dev-acme-admin-2026"},
        {"slug": "globex",  "name": "Globex Inc",     "devKey": "dev-globex-admin-2026"},
    ]

    async def handler(conn: asyncpg.Connection) -> dict:
        slugs = [d["slug"] for d in demos]
        rows = await conn.fetch(
            "SELECT slug, id FROM tenants WHERE slug = ANY($1::text[])", slugs
        )
        present = {r["slug"]: str(r["id"]) for r in rows}
        return {
            "tenants": [
                {
                    "slug": d["slug"], "name": d["name"],
                    "tenantId": present[d["slug"]], "devKey": d["devKey"],
                }
                for d in demos if d["slug"] in present
            ]
        }

    return await as_system(handler)


# ── /api/v1/nodes ─────────────────────────────────────────────────────────────

@router.get("/api/v1/nodes")
async def list_nodes(request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "SELECT DISTINCT ON (key) * FROM node_definitions ORDER BY key, version DESC"
        )
        return {"nodes": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── Pipelines ─────────────────────────────────────────────────────────────────

@router.get("/api/v1/pipelines")
async def list_pipelines(request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        if c.is_system_actor:
            rows = await conn.fetch(
                "SELECT task_id, name, jsonb_array_length(steps) AS step_count, status, updated_at "
                "FROM pipelines ORDER BY updated_at DESC"
            )
        else:
            rows = await conn.fetch(
                "SELECT task_id, name, jsonb_array_length(steps) AS step_count, status, updated_at "
                "FROM pipelines WHERE tenant_id = $1::uuid ORDER BY updated_at DESC",
                c.tenant_id,
            )
        return {"pipelines": _rows(rows)}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/pipelines/create")
async def create_pipeline(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    name: str = body.get("name") or ""
    if not name:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR", "message": "name required"}})
    steps: list[dict] = body.get("steps") or []
    layout: dict | None = body.get("layout")

    async def handler(conn: asyncpg.Connection) -> dict:
        arch_err = await check_archived_node_refs(conn, steps)
        if arch_err:
            raise HTTPException(409, detail={"error": arch_err})

        forms = extract_forms(steps)
        etag = forms_etag(forms)

        pipe = await conn.fetchrow(
            "INSERT INTO pipelines (tenant_id, name, steps, layout) "
            "VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb) RETURNING task_id",
            c.tenant_id, name, json.dumps(steps), _j(layout),
        )
        task_id = str(pipe["task_id"])
        pv = await conn.fetchrow(
            "INSERT INTO pipeline_versions "
            "(task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by) "
            "VALUES ($1::uuid, $2::uuid, 1, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7) RETURNING id",
            task_id, c.tenant_id, json.dumps(steps), _j(layout),
            json.dumps(forms), etag, c.id,
        )
        final = await conn.fetchrow(
            "UPDATE pipelines SET current_version_id = $1::uuid, updated_at = NOW() "
            "WHERE task_id = $2::uuid RETURNING *",
            str(pv["id"]), task_id,
        )
        audit(request, "pipeline.create",
            {"kind": "pipeline", "id": task_id},
            None, {"name": name, "version": 1},
        )
        return dict(final)

    return await with_caller_tx(c, handler)


@router.get("/api/v1/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch("SELECT * FROM pipelines WHERE task_id = $1::uuid", pipeline_id)
        if not rows:
            raise _404()
        return dict(rows[0])

    return await with_caller_tx(c, handler)


@router.post("/api/v1/pipelines/{pipeline_id}/save")
async def save_pipeline(pipeline_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    name: str | None = body.get("name")
    steps: list[dict] | None = body.get("steps")
    layout: dict | None = body.get("layout")

    async def handler(conn: asyncpg.Connection) -> dict:
        if steps is not None:
            arch_err = await check_archived_node_refs(conn, steps)
            if arch_err:
                raise HTTPException(409, detail={"error": arch_err})

            inflight = await conn.fetch(
                "SELECT DISTINCT step_key, node_key, item_id FROM outbox "
                "WHERE task_id = $1::uuid AND status IN ('pending','leased')",
                pipeline_id,
            )
            if inflight:
                new_step_map = {s["key"]: s["nodeKey"] for s in steps}
                conflicts = [
                    r for r in inflight
                    if new_step_map.get(r["step_key"]) != r["node_key"]
                ]
                if conflicts:
                    raise HTTPException(409, detail={
                        "error": {
                            "code": "INFLIGHT_STEPS_CONFLICT",
                            "message": f"{len(conflicts)} in-flight run(s) reference steps that would be removed or have their nodeKey changed",
                            "conflicts": [
                                {"itemId": str(r["item_id"]), "stepKey": r["step_key"], "nodeKey": r["node_key"]}
                                for r in conflicts
                            ],
                        }
                    })

        new_version_id: str | None = None
        if steps is not None or layout is not None:
            cur = await conn.fetchrow(
                "SELECT tenant_id, steps, layout FROM pipelines WHERE task_id = $1::uuid",
                pipeline_id,
            )
            if not cur:
                raise _404()

            new_steps = steps if steps is not None else (cur["steps"] or [])
            new_layout = layout if layout is not None else cur["layout"]
            new_forms = extract_forms(new_steps)
            new_etag = forms_etag(new_forms)

            max_ver = await conn.fetchval(
                "SELECT COALESCE(MAX(version), 0) FROM pipeline_versions WHERE task_id = $1::uuid",
                pipeline_id,
            )
            pv = await conn.fetchrow(
                "INSERT INTO pipeline_versions "
                "(task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by) "
                "VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8) RETURNING id",
                pipeline_id, str(cur["tenant_id"]), (max_ver or 0) + 1,
                json.dumps(new_steps), _j(new_layout),
                json.dumps(new_forms), new_etag, c.id,
            )
            new_version_id = str(pv["id"])

        rows = await conn.fetch(
            """UPDATE pipelines SET
                name               = COALESCE($2, name),
                steps              = COALESCE($3::jsonb, steps),
                layout             = COALESCE($4::jsonb, layout),
                current_version_id = COALESCE($5::uuid, current_version_id),
                updated_at         = NOW()
               WHERE task_id = $1::uuid
               RETURNING *""",
            pipeline_id,
            name,
            _j(steps) if steps is not None else None,
            _j(layout) if layout is not None else None,
            new_version_id,
        )
        if not rows:
            raise _404()
        if new_version_id:
            audit(request, "pipeline.publish",
                {"kind": "pipeline", "id": pipeline_id},
                None, {"newVersionId": new_version_id, "fields": list(body.keys())},
            )
        return dict(rows[0])

    return await with_caller_tx(c, handler)


@router.delete("/api/v1/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        r = await conn.fetch(
            "DELETE FROM pipelines WHERE task_id = $1::uuid RETURNING name", pipeline_id
        )
        if r:
            audit(request, "pipeline.delete",
                {"kind": "pipeline", "id": pipeline_id},
                {"name": r[0]["name"]}, None,
            )
        return {"ok": True}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/pipelines/{pipeline_id}/pause")
async def pause_pipeline(pipeline_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "UPDATE pipelines SET status = 'paused', updated_at = NOW() "
            "WHERE task_id = $1::uuid AND status = 'active' RETURNING name, status",
            pipeline_id,
        )
        if not rows:
            raise HTTPException(404, detail={"error": {"code": "NOT_FOUND_OR_NOT_ACTIVE"}})
        audit(request, "pipeline.pause",
            {"kind": "pipeline", "id": pipeline_id},
            {"status": "active"}, {"status": "paused"},
        )
        return {"ok": True, "status": rows[0]["status"]}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/pipelines/{pipeline_id}/resume")
async def resume_pipeline(pipeline_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "UPDATE pipelines SET status = 'active', updated_at = NOW() "
            "WHERE task_id = $1::uuid AND status = 'paused' RETURNING status",
            pipeline_id,
        )
        if not rows:
            raise HTTPException(404, detail={"error": {"code": "NOT_FOUND_OR_NOT_PAUSED"}})
        audit(request, "pipeline.resume",
            {"kind": "pipeline", "id": pipeline_id},
            {"status": "paused"}, {"status": "active"},
        )
        return {"ok": True, "status": rows[0]["status"]}

    return await with_caller_tx(c, handler)


@router.get("/api/v1/pipelines/{pipeline_id}/forms")
async def get_pipeline_forms(pipeline_id: str, request: Request, response: Response) -> Any:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> Any:
        row = await conn.fetchrow(
            """SELECT pv.forms, pv.forms_etag, pv.version
               FROM pipelines p JOIN pipeline_versions pv ON pv.id = p.current_version_id
               WHERE p.task_id = $1::uuid""",
            pipeline_id,
        )
        if not row:
            raise _404()

        etag_val = f'"{row["forms_etag"]}"'
        if request.headers.get("if-none-match") == etag_val:
            return Response(status_code=304, headers={"etag": etag_val})

        response.headers["etag"] = etag_val
        response.headers["cache-control"] = "private, max-age=300"
        return {"version": row["version"], "forms": row["forms"]}

    return await with_caller_tx(c, handler)


# ── Items ─────────────────────────────────────────────────────────────────────

@router.post("/api/v1/items/create")
async def create_item(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    task_id: str = body.get("taskId") or ""
    if not task_id:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR", "message": "taskId required"}})
    env_raw = body.get("envelope") or {}
    envelope = {
        "payload": env_raw.get("payload") or {},
        "outputs": env_raw.get("outputs") or {},
        "tags":    env_raw.get("tags") or {},
    }
    start_step: str | None = body.get("startStep")

    async def handler(conn: asyncpg.Connection) -> dict:
        pipe_row = await conn.fetchrow(
            "SELECT tenant_id, current_version_id FROM pipelines WHERE task_id = $1::uuid",
            task_id,
        )
        if not pipe_row or not pipe_row["current_version_id"]:
            raise HTTPException(404, detail={"error": {"code": "PIPELINE_NOT_FOUND"}})

        pipe_tenant = str(pipe_row["tenant_id"])
        pv_id = str(pipe_row["current_version_id"])
        pv = await conn.fetchrow(
            "SELECT steps FROM pipeline_versions WHERE id = $1::uuid", pv_id
        )
        steps_raw: list[dict] = pv["steps"] or [] if pv else []
        if not steps_raw:
            raise HTTPException(400, detail={"error": {"code": "EMPTY_PIPELINE"}})

        effective_start = start_step or steps_raw[0]["key"]
        start_node = next((s for s in steps_raw if s["key"] == effective_start), None)
        if not start_node:
            raise HTTPException(400, detail={"error": {"code": "INVALID_START_STEP"}})

        it = await conn.fetchrow(
            "INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope) "
            "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb) RETURNING id",
            pipe_tenant, task_id, pv_id, effective_start, json.dumps(envelope),
        )
        item_id = str(it["id"])
        ob = await conn.fetchrow(
            "INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt) "
            "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'pending', 1) RETURNING run_id",
            pipe_tenant, item_id, task_id, effective_start, start_node["nodeKey"],
        )
        return {"itemId": item_id, "runId": str(ob["run_id"])}

    return await with_caller_tx(c, handler)


@router.get("/api/v1/items/{item_id}")
async def get_item(item_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch("SELECT * FROM items WHERE id = $1::uuid", item_id)
        if not rows:
            raise _404()
        item = dict(rows[0])
        inflight = await conn.fetch(
            "SELECT * FROM outbox WHERE item_id = $1::uuid AND status IN ('pending','leased') "
            "ORDER BY created_at DESC",
            item_id,
        )
        history = await conn.fetch(
            "SELECT * FROM attempts WHERE item_id = $1::uuid ORDER BY finished_at ASC LIMIT 100",
            item_id,
        )
        batch_rows = await conn.fetch(
            "SELECT bi.batch_id, b.name AS batch_name "
            "FROM batch_items bi JOIN batches b ON b.id = bi.batch_id "
            "WHERE bi.item_id = $1::uuid LIMIT 1",
            item_id,
        )
        batch = (
            {"id": str(batch_rows[0]["batch_id"]), "name": batch_rows[0]["batch_name"]}
            if batch_rows else None
        )
        return {"item": item, "inflight": _rows(inflight), "history": _rows(history), "batch": batch}

    return await with_caller_tx(c, handler)


@router.get("/api/v1/items/{item_id}/pipeline")
async def get_item_pipeline(item_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            """SELECT p.task_id, p.name, pv.version, pv.steps, pv.layout,
                      pv.published_at AS updated_at
               FROM items i
               JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
               JOIN pipelines p          ON p.task_id = pv.task_id
               WHERE i.id = $1::uuid""",
            item_id,
        )
        if not rows:
            raise _404()
        return dict(rows[0])

    return await with_caller_tx(c, handler)


@router.get("/api/v1/tasks/{task_id}/items")
async def list_task_items(task_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "SELECT * FROM items WHERE task_id = $1::uuid ORDER BY created_at DESC LIMIT 200",
            task_id,
        )
        return {"items": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── Queue ─────────────────────────────────────────────────────────────────────

@router.post("/api/v1/queue/{node_key}/lease")
async def lease_queue(node_key: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    worker_id: str = body.get("workerId") or ""
    if not worker_id:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR", "message": "workerId required"}})
    batch_size = max(1, min(50, int(body.get("batchSize") or 1)))
    lease_seconds = max(5, min(3600, int(body.get("leaseSeconds") or 60)))
    per_task_limit = max(1, min(50, int(body.get("perTaskLimit") or batch_size)))

    async def handler(conn: asyncpg.Connection) -> dict:
        leased = await conn.fetch(
            """WITH eligible AS MATERIALIZED (
              SELECT
                o.run_id,
                ROW_NUMBER() OVER (
                  PARTITION BY o.task_id ORDER BY o.scheduled_at ASC, o.run_id ASC
                ) AS task_rank
              FROM outbox o
              WHERE o.node_key = $1
                AND o.status = 'pending'
                AND o.scheduled_at <= NOW()
                AND EXISTS (
                  SELECT 1 FROM pipelines p
                  WHERE p.task_id = o.task_id AND p.status = 'active'
                )
                AND EXISTS (
                  SELECT 1
                  FROM items i
                  JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
                  JOIN LATERAL jsonb_array_elements(pv.steps) s ON TRUE
                  JOIN node_definitions nd
                    ON nd.key = o.node_key
                   AND nd.version = COALESCE(s->>'nodeVersion', $2)
                   AND nd.status = 'active'
                  WHERE i.id = o.item_id
                    AND s->>'key' = o.step_key
                    AND s->>'nodeKey' = o.node_key
                )
            ),
            picked AS MATERIALIZED (
              SELECT o.run_id
              FROM outbox o
              JOIN eligible e ON e.run_id = o.run_id
              WHERE e.task_rank <= $3
              ORDER BY e.task_rank ASC, o.scheduled_at ASC, o.run_id ASC
              LIMIT $4
              FOR UPDATE OF o SKIP LOCKED
            ),
            leased AS (
              UPDATE outbox SET
                status     = 'leased',
                leased_by  = $5,
                leased_at  = NOW(),
                expected_by = NOW() + ($6::int * INTERVAL '1 second'),
                updated_at = NOW()
              WHERE run_id IN (SELECT run_id FROM picked)
              RETURNING *
            )
            SELECT l.*, i.envelope, pv.steps
            FROM leased l
            JOIN items             i  ON i.id  = l.item_id
            JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id""",
            node_key, DEFAULT_NODE_VERSION, per_task_limit, batch_size, worker_id, lease_seconds,
        )

        if not leased:
            return {"jobs": []}

        # Build (nodeKey, nodeVersion) metadata per row
        row_metas: list[dict] = []
        for r in leased:
            steps_raw: list[dict] = r["steps"] or []
            step_cfg = next((s for s in steps_raw if s.get("key") == r["step_key"]), None)
            row_metas.append({
                "nodeKey":     r["node_key"],
                "nodeVersion": (step_cfg or {}).get("nodeVersion") or DEFAULT_NODE_VERSION,
                "stepParams":  (step_cfg or {}).get("params") or {},
                "stepInputs":  (step_cfg or {}).get("inputs") or {},
            })

        # Batch-fetch node_definitions (one round-trip per unique pair)
        unique_pairs = {f"{m['nodeKey']}|{m['nodeVersion']}" for m in row_metas}
        nd_map: dict[str, dict] = {}
        for pair in unique_pairs:
            k, v = pair.split("|", 1)
            nd_row = await conn.fetchrow(
                "SELECT presets, inputs_schema FROM node_definitions WHERE key = $1 AND version = $2",
                k, v,
            )
            nd_map[pair] = {
                "presets":       nd_row["presets"] if nd_row else None,
                "inputs_schema": nd_row["inputs_schema"] if nd_row else None,
            }

        jobs: list[dict] = []
        for r, meta in zip(leased, row_metas):
            nd = nd_map.get(f"{meta['nodeKey']}|{meta['nodeVersion']}", {})
            presets_data = nd.get("presets")
            inputs_schema_data = nd.get("inputs_schema")

            presets = NodePresets(**presets_data) if presets_data else None
            schema_props: dict = (inputs_schema_data or {}).get("properties") or {}

            effective_params = merge_effective_params(meta["stepParams"], presets)
            env: dict = r["envelope"] or {}
            ctx = {
                "payload": env.get("payload") or {},
                "outputs": env.get("outputs") or {},
                "tags":    env.get("tags") or {},
            }
            resolved_inputs = resolve_bindings(meta["stepInputs"], schema_props, ctx)

            exp_by = r["expected_by"]
            jobs.append({
                "runId":       str(r["run_id"]),
                "itemId":      str(r["item_id"]),
                "taskId":      str(r["task_id"]),
                "tenantId":    str(r["tenant_id"]),
                "stepKey":     r["step_key"],
                "nodeKey":     r["node_key"],
                "nodeVersion": meta["nodeVersion"],
                "params":      effective_params,
                "inputs":      resolved_inputs,
                "envelope":    ctx,
                "ctx": {
                    "runId":   str(r["run_id"]),
                    "attempt": r["attempt"],
                    "deadline": exp_by.isoformat() if hasattr(exp_by, "isoformat") else exp_by,
                },
            })
        return {"jobs": jobs}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/queue/lease/{run_id}/release")
async def release_lease(run_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    worker_id: str = body.get("workerId") or ""
    park_seconds = max(0, min(3600, int(body.get("parkSeconds") or 0)))

    async def handler(conn: asyncpg.Connection) -> dict:
        if park_seconds > 0:
            rows = await conn.fetch(
                """UPDATE outbox SET
                    status      = 'pending',
                    leased_by   = NULL, leased_at = NULL, expected_by = NULL,
                    scheduled_at = NOW() + ($3::int * INTERVAL '1 second'),
                    updated_at  = NOW()
                   WHERE run_id = $1::uuid AND status = 'leased' AND leased_by = $2
                   RETURNING run_id""",
                run_id, worker_id, park_seconds,
            )
        else:
            rows = await conn.fetch(
                """UPDATE outbox SET
                    status      = 'pending',
                    leased_by   = NULL, leased_at = NULL, expected_by = NULL,
                    updated_at  = NOW()
                   WHERE run_id = $1::uuid AND status = 'leased' AND leased_by = $2
                   RETURNING run_id""",
                run_id, worker_id,
            )
        if not rows:
            raise _409("LEASE_LOST")
        return {"ok": True}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/queue/lease/{run_id}/heartbeat")
async def heartbeat_lease(run_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    worker_id: str = body.get("workerId") or ""
    extend_seconds = int(body.get("extendSeconds") or 0)
    if not worker_id or extend_seconds < 5:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            """UPDATE outbox SET
                expected_by = NOW() + ($3::int * INTERVAL '1 second'),
                updated_at  = NOW()
               WHERE run_id = $1::uuid AND status = 'leased' AND leased_by = $2
               RETURNING expected_by""",
            run_id, worker_id, extend_seconds,
        )
        if not rows:
            raise _409("LEASE_LOST")
        exp = rows[0]["expected_by"]
        return {"newExpectedBy": exp.isoformat() if hasattr(exp, "isoformat") else str(exp)}

    return await with_caller_tx(c, handler)


# ── Result ────────────────────────────────────────────────────────────────────

@router.post("/api/v1/result")
async def post_result(request: Request) -> Any:
    c = _caller(request)
    body = await request.json()
    run_id: str = body.get("runId") or ""
    status = body.get("status")
    if not run_id or status not in ("success", "failed"):
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})
    result_body = {
        "runId":    run_id,
        "status":   status,
        "output":   body.get("output"),
        "error":    body.get("error"),
        "nextHint": body.get("nextHint"),
    }
    try:
        return await with_caller_tx(c, lambda conn: apply_result(result_body, conn))
    except ResultError as e:
        raise HTTPException(e.http_status, detail={"error": {"code": e.code, "message": str(e)}})


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/api/v1/admin/stuck")
async def get_stuck_items(request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        base = """
            SELECT i.*,
              (SELECT to_jsonb(a.*) FROM attempts a
               WHERE a.item_id = i.id ORDER BY finished_at DESC LIMIT 1) AS last_attempt,
              (SELECT to_jsonb(rr.*) FROM replay_requests rr
               WHERE rr.item_id = i.id AND rr.status = 'pending' LIMIT 1) AS replay_request
            FROM items i WHERE i.current_step = 'stuck'
        """
        if c.is_system_actor:
            rows = await conn.fetch(base + " ORDER BY i.updated_at DESC LIMIT 200")
        else:
            rows = await conn.fetch(
                base + " AND i.tenant_id = $1::uuid ORDER BY i.updated_at DESC LIMIT 200",
                c.tenant_id,
            )
        return {"items": _rows(rows)}

    return await with_caller_tx(c, handler)


@router.get("/api/v1/admin/nodes")
async def list_admin_nodes(request: Request) -> dict:
    c = _caller(request)
    q_status   = request.query_params.get("status")
    q_category = request.query_params.get("category")
    q_run_mode = request.query_params.get("runMode")
    q_search   = request.query_params.get("search")

    async def handler(conn: asyncpg.Connection) -> dict:
        args: list[Any] = []
        n = 1

        if c.is_system_actor:
            tenant_join = ""
        else:
            tenant_join = f"AND p.tenant_id = ${n}::uuid"
            args.append(c.tenant_id)
            n += 1

        conditions: list[str] = []
        if q_status:
            conditions.append(f"AND nd.status = ${n}")
            args.append(q_status)
            n += 1
        if q_category:
            conditions.append(f"AND nd.category = ${n}")
            args.append(q_category)
            n += 1
        if q_run_mode:
            conditions.append(f"AND nd.run_mode = ${n}")
            args.append(q_run_mode)
            n += 1
        if q_search:
            pat = f"%{q_search}%"
            conditions.append(f"AND (nd.key ILIKE ${n} OR nd.display_name ILIKE ${n})")
            args.append(pat)
            n += 1

        query = f"""
            SELECT
              nd.key, nd.version, nd.display_name, nd.status,
              nd.category, nd.run_mode, nd.description,
              nd.idempotent, nd.manual, nd.updated_at,
              nd.supports_dry_run,
              (nd.examples IS NOT NULL AND jsonb_array_length(nd.examples) > 0) AS has_examples,
              COUNT(DISTINCT pv.task_id) FILTER (WHERE pv.task_id IS NOT NULL)::int AS usage_count,
              COUNT(DISTINCT o_p.run_id)::int AS pending_count,
              COUNT(DISTINCT o_l.run_id)::int AS inflight_count
            FROM node_definitions nd
            LEFT JOIN outbox o_p ON o_p.node_key = nd.key AND o_p.status = 'pending'
            LEFT JOIN outbox o_l ON o_l.node_key = nd.key AND o_l.status = 'leased'
            LEFT JOIN pipeline_versions pv ON EXISTS (
              SELECT 1 FROM jsonb_array_elements(pv.steps) s
              WHERE s->>'nodeKey' = nd.key
                AND COALESCE(s->>'nodeVersion', '1.0') = nd.version
            )
            LEFT JOIN pipelines p
              ON p.task_id = pv.task_id AND p.current_version_id = pv.id {tenant_join}
            WHERE 1=1 {" ".join(conditions)}
            GROUP BY nd.key, nd.version, nd.display_name, nd.status, nd.category,
                     nd.run_mode, nd.description, nd.idempotent, nd.manual, nd.updated_at,
                     nd.supports_dry_run, nd.examples
            ORDER BY nd.key ASC, nd.version DESC
        """
        rows = await conn.fetch(query, *args)
        return {"nodes": _rows(rows)}

    return await as_system(handler)


@router.post("/api/v1/admin/nodes")
async def create_admin_node(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    key: str = body.get("key") or ""
    version: str = body.get("version") or ""
    display_name: str = body.get("displayName") or ""
    if not key or not version or not display_name:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})
    if not re.match(r'^[a-zA-Z0-9_.:-]+$', key):
        raise HTTPException(422, detail={"error": {"code": "INVALID_KEY", "message": "key must be alphanumeric/._:-"}})

    params_schema = body.get("paramsSchema") or {}
    ui_schema     = body.get("uiSchema")
    presets       = body.get("presets")
    inputs_schema = body.get("inputsSchema")
    outputs_schema = body.get("outputsSchema")
    status         = body.get("status") or "active"
    category       = body.get("category")
    run_mode       = body.get("runMode")
    description    = body.get("description")
    idempotent     = bool(body.get("idempotent", True))
    default_timeout_ms   = max(1000, int(body.get("defaultTimeoutMs") or 30000))
    default_max_attempts = max(1, min(20, int(body.get("defaultMaxAttempts") or 3)))
    manual_field   = body.get("manual")
    is_manual      = manual_field if manual_field is not None else (run_mode == "manual")

    async def handler(conn: asyncpg.Connection) -> dict:
        try:
            node = await conn.fetchrow(
                """INSERT INTO node_definitions (
                    key, version, display_name, params_schema, ui_schema, presets,
                    inputs_schema, outputs_schema, status, category, run_mode, description,
                    idempotent, default_timeout_ms, default_max_attempts, manual
                ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,
                          $9,$10,$11,$12,$13,$14,$15,$16)
                RETURNING *""",
                key, version, display_name,
                json.dumps(params_schema),
                _j(ui_schema), _j(presets), _j(inputs_schema), _j(outputs_schema),
                status, category, run_mode, description,
                idempotent, default_timeout_ms, default_max_attempts, is_manual,
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, detail={"error": {
                "code": "NODE_ALREADY_EXISTS",
                "message": f"{key}@{version} already exists",
            }})
        audit(request, "node.create",
            {"kind": "node", "id": f"{key}@{version}"},
            None, {"status": status, "runMode": run_mode},
        )
        return {"node": dict(node)}

    return await as_system(handler)


@router.patch("/api/v1/admin/nodes/{key}/{version}")
async def update_admin_node(key: str, version: str, request: Request) -> dict:
    c = _caller(request)
    body: dict = await request.json() or {}

    async def handler(conn: asyncpg.Connection) -> dict:
        bk = set(body.keys())
        # Build dynamic SET clause
        set_parts: list[str] = []
        args: list[Any] = [key, version]  # $1=key, $2=version
        n = 3

        if "displayName" in bk:
            set_parts.append(f"display_name = ${n}")
            args.append(body["displayName"])
            n += 1
        if "paramsSchema" in bk:
            set_parts.append(f"params_schema = ${n}::jsonb")
            args.append(json.dumps(body["paramsSchema"]))
            n += 1
        for field_camel, col_snake, is_json in [
            ("uiSchema",     "ui_schema",     True),
            ("presets",      "presets",       True),
            ("inputsSchema", "inputs_schema", True),
            ("outputsSchema","outputs_schema",True),
            ("category",     "category",      False),
            ("runMode",      "run_mode",      False),
            ("description",  "description",   False),
        ]:
            if field_camel in bk:
                v = body[field_camel]
                set_parts.append(
                    f"{col_snake} = ${n}{'::jsonb' if is_json else ''}"
                )
                args.append(json.dumps(v) if is_json else v)
                n += 1
        for field_camel, col_snake in [
            ("idempotent",         "idempotent"),
            ("defaultTimeoutMs",   "default_timeout_ms"),
            ("defaultMaxAttempts", "default_max_attempts"),
            ("manual",             "manual"),
        ]:
            if field_camel in bk and body[field_camel] is not None:
                set_parts.append(f"{col_snake} = ${n}")
                args.append(body[field_camel])
                n += 1

        if not set_parts:
            rows = await conn.fetch(
                "SELECT * FROM node_definitions WHERE key = $1 AND version = $2", key, version
            )
            if not rows:
                raise _404()
            return {"node": dict(rows[0])}

        set_parts.append("updated_at = NOW()")
        query = (
            f"UPDATE node_definitions SET {', '.join(set_parts)} "
            f"WHERE key = $1 AND version = $2 RETURNING *"
        )
        rows = await conn.fetch(query, *args)
        if not rows:
            raise _404()
        audit(request, "node.update",
            {"kind": "node", "id": f"{key}@{version}"},
            None, body,
        )
        return {"node": dict(rows[0])}

    return await as_system(handler)


@router.get("/api/v1/admin/nodes/{key}/{version}")
async def get_admin_node(key: str, version: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "SELECT * FROM node_definitions WHERE key = $1 AND version = $2", key, version
        )
        if not rows:
            raise _404()
        return {"node": dict(rows[0])}

    return await as_system(handler)


@router.get("/api/v1/admin/nodes/{key}/{version}/usages")
async def get_node_usages(key: str, version: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        if c.is_system_actor:
            pipelines = await conn.fetch(
                """SELECT DISTINCT p.task_id, p.name, p.tenant_id
                   FROM pipelines p
                   JOIN pipeline_versions pv ON pv.id = p.current_version_id
                   WHERE EXISTS (
                     SELECT 1 FROM jsonb_array_elements(pv.steps) s
                     WHERE s->>'nodeKey' = $1
                       AND COALESCE(s->>'nodeVersion', '1.0') = $2
                   )
                   ORDER BY p.name""",
                key, version,
            )
            inflight = await conn.fetchrow(
                "SELECT COUNT(*)::int AS c FROM outbox o "
                "WHERE o.node_key = $1 AND o.status IN ('pending','leased')",
                key,
            )
        else:
            pipelines = await conn.fetch(
                """SELECT DISTINCT p.task_id, p.name, p.tenant_id
                   FROM pipelines p
                   JOIN pipeline_versions pv ON pv.id = p.current_version_id
                   WHERE EXISTS (
                     SELECT 1 FROM jsonb_array_elements(pv.steps) s
                     WHERE s->>'nodeKey' = $1
                       AND COALESCE(s->>'nodeVersion', '1.0') = $2
                   ) AND p.tenant_id = $3::uuid
                   ORDER BY p.name""",
                key, version, c.tenant_id,
            )
            inflight = await conn.fetchrow(
                "SELECT COUNT(*)::int AS c FROM outbox o "
                "WHERE o.node_key = $1 AND o.status IN ('pending','leased') AND o.tenant_id = $2::uuid",
                key, c.tenant_id,
            )

        return {
            "pipelines": _rows(pipelines),
            "inflightCount": inflight["c"] if inflight else 0,
        }

    return await as_system(handler)


@router.post("/api/v1/admin/nodes/{key}/{version}/archive")
async def archive_node(key: str, version: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "UPDATE node_definitions SET status = 'archived' "
            "WHERE key = $1 AND version = $2 RETURNING status",
            key, version,
        )
        if not rows:
            raise _404()
        audit(request, "node.archive",
            {"kind": "node", "id": f"{key}@{version}"},
            {"status": "active"}, {"status": "archived"},
        )
        return {"ok": True, "status": rows[0]["status"]}

    return await as_system(handler)


@router.post("/api/v1/admin/nodes/{key}/{version}/activate")
async def activate_node(key: str, version: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "UPDATE node_definitions SET status = 'active' "
            "WHERE key = $1 AND version = $2 RETURNING status",
            key, version,
        )
        if not rows:
            raise _404()
        audit(request, "node.activate",
            {"kind": "node", "id": f"{key}@{version}"},
            {"status": "archived"}, {"status": "active"},
        )
        return {"ok": True, "status": rows[0]["status"]}

    return await as_system(handler)


@router.get("/api/v1/admin/nodes/{key}/{version}/runtime")
async def get_node_runtime(key: str, version: str, request: Request) -> dict:
    async def handler(conn: asyncpg.Connection) -> dict:
        counts = await conn.fetchrow(
            """SELECT
                COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE status = 'leased')::int  AS inflight
               FROM outbox WHERE node_key = $1""",
            key,
        )
        return {
            "pending":          counts["pending"]  if counts else 0,
            "inflight":         counts["inflight"] if counts else 0,
            "driverRegistered": key in auto_node_keys(),
        }

    return await as_system(handler)


@router.post("/api/v1/admin/nodes/{key}/{version}/pause")
async def pause_node(key: str, version: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        cur = await conn.fetchrow(
            "SELECT status FROM node_definitions WHERE key = $1 AND version = $2", key, version
        )
        if not cur:
            raise _404()
        if cur["status"] == "archived":
            raise HTTPException(409, detail={"error": {
                "code": "ARCHIVED_NODE_CANNOT_PAUSE",
                "message": "archived 节点不能 pause, 请先 activate",
            }})
        rows = await conn.fetch(
            "UPDATE node_definitions SET status = 'paused' "
            "WHERE key = $1 AND version = $2 RETURNING status",
            key, version,
        )
        audit(request, "node.pause",
            {"kind": "node", "id": f"{key}@{version}"},
            {"status": cur["status"]}, {"status": "paused"},
        )
        return {"ok": True, "status": rows[0]["status"]}

    return await as_system(handler)


@router.post("/api/v1/admin/nodes/{key}/{version}/resume")
async def resume_node(key: str, version: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "UPDATE node_definitions SET status = 'active' "
            "WHERE key = $1 AND version = $2 AND status = 'paused' RETURNING status",
            key, version,
        )
        if not rows:
            cur = await conn.fetchrow(
                "SELECT status FROM node_definitions WHERE key = $1 AND version = $2", key, version
            )
            if not cur:
                raise _404()
            raise HTTPException(409, detail={"error": {
                "code": "NODE_NOT_PAUSED",
                "message": f"节点当前状态为 {cur['status']}, 只有 paused 节点才能 resume",
            }})
        audit(request, "node.resume",
            {"kind": "node", "id": f"{key}@{version}"},
            {"status": "paused"}, {"status": "active"},
        )
        return {"ok": True, "status": rows[0]["status"]}

    return await as_system(handler)


@router.post("/api/v1/admin/nodes/{key}/{version}/debug/run")
async def debug_run_node(key: str, version: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json() or {}

    async def handler(conn: asyncpg.Connection) -> dict:
        nd = await conn.fetchrow(
            "SELECT * FROM node_definitions WHERE key = $1 AND version = $2", key, version
        )
        if not nd:
            raise _404()
        nd_dict = dict(nd)
        if not nd_dict.get("supports_dry_run"):
            raise HTTPException(400, detail={"error": {
                "code": "NODE_NOT_DEBUGGABLE",
                "message": "节点未声明 supportsDryRun, dry-run 不适用",
            }})

        env_raw = body.get("envelope") or {}
        envelope = {
            "payload": env_raw.get("payload") or {},
            "outputs": env_raw.get("outputs") or {},
            "tags":    env_raw.get("tags") or {},
        }
        presets_data = nd_dict.get("presets")
        presets = NodePresets(**presets_data) if presets_data else None
        effective_params = merge_effective_params(body.get("params") or {}, presets)

        inputs_schema_data = nd_dict.get("inputs_schema")
        schema_props: dict = (inputs_schema_data or {}).get("properties") or {}
        resolved_inputs = resolve_bindings(
            body.get("inputs"),
            schema_props,
            envelope,
        )

        run_id = str(uuid4())
        job = DriverJob(
            run_id=run_id,
            item_id=str(uuid4()),
            task_id=str(uuid4()),
            tenant_id=c.tenant_id or DEFAULT_TENANT_ID,
            step_key="dry-run-step",
            node_key=key,
            node_version=version,
            params=effective_params,
            inputs=resolved_inputs,
            envelope=envelope,
            ctx={"runId": run_id, "attempt": 1, "deadline": None, "dryRun": True},
        )

        driver = pick_driver(job)
        if not driver:
            raise HTTPException(404, detail={"error": {
                "code": "NO_DRIVER",
                "message": f"没有匹配 {key}@{version} 的 driver (本进程未注册或版本不对)",
            }})

        import asyncio, time
        DRY_RUN_TIMEOUT = 5.0
        started = time.monotonic()
        try:
            result = await asyncio.wait_for(driver.handle(job), timeout=DRY_RUN_TIMEOUT)
        except asyncio.TimeoutError:
            result = {"status": "failed", "error": {"code": "DRY_RUN_TIMEOUT", "message": "timeout", "retryable": False}}
        except Exception as e:
            result = {"status": "failed", "error": {"code": "DRY_RUN_ERROR", "message": str(e), "retryable": False}}
        duration_ms = int((time.monotonic() - started) * 1000)

        output_validation = None
        if result.get("status") == "success" and nd_dict.get("outputs_schema"):
            vr = validate_node_output(
                node_key=key,
                node_version=version,
                outputs_schema=nd_dict["outputs_schema"],
                outputs_validation=nd_dict.get("outputs_validation") or "strict",
                output=result.get("output") or {},
            )
            if vr:
                mode = nd_dict.get("outputs_validation") or "strict"
                output_validation = {
                    "mode": mode,
                    "violations": [
                        {"path": v.path, "message": v.message, "keyword": v.keyword}
                        for v in vr.errors
                    ],
                }
                if mode == "strict":
                    sample = "; ".join(f"{v.path}: {v.message}" for v in vr.errors[:3])
                    if len(vr.errors) > 3:
                        sample += " ..."
                    result = {"status": "failed", "error": {
                        "code": "OUTPUT_SCHEMA_VIOLATION",
                        "message": f"输出不符 outputsSchema: {sample}",
                        "retryable": False,
                    }}

        audit(request, "node.debug_run",
            {"kind": "node", "id": f"{key}@{version}"},
            None, {"driverName": driver.name, "durationMs": duration_ms, "status": result.get("status")},
        )
        return {
            "effectiveParams":  effective_params,
            "resolvedInputs":   resolved_inputs,
            "driver":           {"name": driver.name, "nodeKey": driver.node_key},
            "result":           result,
            "durationMs":       duration_ms,
            "outputValidation": output_validation,
        }

    return await as_system(handler)


# ── Admin items: replay & recall ───────────────────────────────────────────────

@router.post("/api/v1/admin/items/{item_id}/replay")
async def replay_item(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    step_key: str = body.get("stepKey") or ""
    if not step_key:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        its = await conn.fetch("SELECT * FROM items WHERE id = $1::uuid", item_id)
        if not its:
            raise _404()
        it = dict(its[0])

        pv = await conn.fetchrow(
            "SELECT steps FROM pipeline_versions WHERE id = $1::uuid",
            it["pipeline_version_id"],
        )
        steps_raw: list[dict] = pv["steps"] if pv else []
        step = next((s for s in steps_raw if s["key"] == step_key), None)
        if not step:
            raise HTTPException(400, detail={"error": {"code": "INVALID_STEP"}})

        await conn.execute(
            "UPDATE items SET current_step = $1, updated_at = NOW() WHERE id = $2::uuid",
            step_key, item_id,
        )
        await conn.execute(
            "INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt) "
            "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'pending', 1)",
            str(it["tenant_id"]), item_id, str(it["task_id"]), step_key, step["nodeKey"],
        )
        await conn.execute(
            """UPDATE replay_requests
               SET status = 'resolved', resolved_at = NOW(), resolved_by = $2, updated_at = NOW()
               WHERE item_id = $1::uuid AND status = 'pending'""",
            item_id, c.name,
        )
        audit(request, "item.replay",
            {"kind": "item", "id": item_id},
            {"previousStep": it["current_step"]}, {"newStep": step_key},
        )
        return {"ok": True}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/admin/items/{item_id}/recall")
async def recall_item(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    reason: str = (body.get("reason") or "").strip()
    target_step: str = body.get("targetStep") or ""
    operator_id: str | None = body.get("operatorId")
    if not reason or not target_step:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        its = await conn.fetch("SELECT * FROM items WHERE id = $1::uuid", item_id)
        if not its:
            raise _404()
        it = dict(its[0])
        if it["current_step"] != "done":
            raise HTTPException(409, detail={"error": {
                "code": "ITEM_NOT_RECALLABLE",
                "message": "仅已完成 (done) 的 item 可召回",
            }})

        pv = await conn.fetchrow(
            "SELECT steps FROM pipeline_versions WHERE id = $1::uuid",
            it["pipeline_version_id"],
        )
        steps_raw: list[dict] = pv["steps"] if pv else []
        step = next((s for s in steps_raw if s["key"] == target_step), None)
        if not step:
            raise HTTPException(400, detail={"error": {"code": "INVALID_STEP"}})

        recalled = await conn.fetch(
            """UPDATE dataset_records
               SET status = 'recalled', recalled_at = NOW(),
                   recalled_reason = $2, recalled_by = $3, updated_at = NOW()
               WHERE item_id = $1::uuid AND status = 'active'
               RETURNING id""",
            item_id, reason, operator_id or c.name,
        )
        await conn.execute(
            "UPDATE items SET current_step = $1, updated_at = NOW() WHERE id = $2::uuid",
            target_step, item_id,
        )
        await conn.execute(
            "INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt) "
            "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'pending', 1)",
            str(it["tenant_id"]), item_id, str(it["task_id"]), target_step, step["nodeKey"],
        )
        audit(request, "item.recall",
            {"kind": "item", "id": item_id},
            {"previousStep": it["current_step"]},
            {
                "newStep": target_step,
                "reason": reason,
                "operatorId": operator_id or c.name,
                "recalledRecords": len(recalled),
            },
        )
        return {"ok": True, "recalledRecords": len(recalled), "newStep": target_step}

    return await with_caller_tx(c, handler)


# ── Admin audit ───────────────────────────────────────────────────────────────

@router.get("/api/v1/admin/audit")
async def get_audit_log(request: Request) -> dict:
    c = _caller(request)
    q = request.query_params
    limit = max(1, min(500, int(q.get("limit") or 100)))
    actor  = q.get("actor")
    action = q.get("action")
    kind   = q.get("kind")
    res_id = q.get("id")
    since_str = q.get("since")

    import datetime
    if since_str:
        try:
            since = datetime.datetime.fromisoformat(since_str.rstrip("Z")).replace(
                tzinfo=datetime.timezone.utc
            )
        except ValueError:
            raise HTTPException(400, detail={"error": {"code": "INVALID_SINCE"}})
    else:
        since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)

    async def handler(conn: asyncpg.Connection) -> dict:
        args: list[Any] = [since, limit]
        n = 3
        conditions: list[str] = []
        if actor:
            conditions.append(f"AND actor = ${n}")
            args.append(actor)
            n += 1
        if action:
            conditions.append(f"AND action = ${n}")
            args.append(action)
            n += 1
        if kind:
            conditions.append(f"AND resource->>'kind' = ${n}")
            args.append(kind)
            n += 1
        if res_id:
            conditions.append(f"AND resource->>'id' = ${n}")
            args.append(res_id)
            n += 1

        query = f"""
            SELECT id, tenant_id, actor, action, resource, before, after,
                   trace_id, request_id, created_at
            FROM audit_log
            WHERE created_at >= $1
            {" ".join(conditions)}
            ORDER BY created_at DESC, id DESC
            LIMIT $2
        """
        rows = await conn.fetch(query, *args)
        return {"entries": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── Dedup ─────────────────────────────────────────────────────────────────────

@router.post("/api/v1/dedup/check")
async def dedup_check(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    task_id: str = body.get("taskId") or ""
    item_id: str = body.get("itemId") or ""
    step_key: str = body.get("stepKey") or ""
    hash_val: str = body.get("hash") or ""
    fields: dict | None = body.get("fields")
    if not task_id or not item_id or not step_key or not hash_val:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        its = await conn.fetch(
            "SELECT tenant_id FROM items WHERE id = $1::uuid", item_id
        )
        if not its:
            return {"kept": False, "hash": hash_val, "error": "ITEM_NOT_FOUND"}
        tid = str(its[0]["tenant_id"])

        await conn.execute(
            "DELETE FROM dedup_keys WHERE task_id = $1::uuid AND item_id = $2::uuid AND step_key = $3",
            task_id, item_id, step_key,
        )
        inserted = await conn.fetch(
            """INSERT INTO dedup_keys (tenant_id, task_id, dedup_hash, item_id, step_key, fields)
               VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6::jsonb)
               ON CONFLICT (task_id, dedup_hash) DO NOTHING
               RETURNING item_id""",
            tid, task_id, hash_val, item_id, step_key, _j(fields),
        )
        if inserted:
            return {"kept": True, "hash": hash_val}
        existing = await conn.fetchrow(
            "SELECT item_id FROM dedup_keys WHERE task_id = $1::uuid AND dedup_hash = $2 LIMIT 1",
            task_id, hash_val,
        )
        return {
            "kept": False,
            "hash": hash_val,
            "firstItemId": str(existing["item_id"]) if existing else None,
        }

    return await with_caller_tx(c, handler)


# ── Dataset records ───────────────────────────────────────────────────────────

@router.post("/api/v1/dataset/records/save")
async def save_dataset_record(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    task_id: str = body.get("taskId") or ""
    item_id: str = body.get("itemId") or ""
    payload: dict = body.get("payload") or {}
    metadata: dict | None = body.get("metadata")
    if not task_id or not item_id:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        its = await conn.fetch("SELECT tenant_id FROM items WHERE id = $1::uuid", item_id)
        if not its:
            raise HTTPException(404, detail={"error": {"code": "ITEM_NOT_FOUND"}})
        tid = str(its[0]["tenant_id"])

        rows = await conn.fetch(
            """INSERT INTO dataset_records (tenant_id, task_id, item_id, payload, metadata)
               VALUES ($1::uuid, $2::uuid, $3::uuid, $4::jsonb, $5::jsonb)
               ON CONFLICT (item_id) WHERE status = 'active' DO UPDATE SET
                 payload = EXCLUDED.payload,
                 metadata = EXCLUDED.metadata,
                 updated_at = NOW()
               RETURNING id""",
            tid, task_id, item_id, json.dumps(payload), _j(metadata),
        )
        return {"id": str(rows[0]["id"])}

    return await with_caller_tx(c, handler)


@router.get("/api/v1/tasks/{task_id}/records")
async def get_task_records(task_id: str, request: Request) -> dict:
    c = _caller(request)
    include_recalled = request.query_params.get("status") == "all"

    async def handler(conn: asyncpg.Connection) -> dict:
        if include_recalled:
            rows = await conn.fetch(
                """SELECT id, item_id, payload, metadata, status, recalled_at, recalled_reason,
                          created_at, updated_at
                   FROM dataset_records WHERE task_id = $1::uuid
                   ORDER BY created_at DESC LIMIT 200""",
                task_id,
            )
        else:
            rows = await conn.fetch(
                """SELECT id, item_id, payload, metadata, status, recalled_at, recalled_reason,
                          created_at, updated_at
                   FROM dataset_records WHERE task_id = $1::uuid AND status = 'active'
                   ORDER BY created_at DESC LIMIT 200""",
                task_id,
            )
        return {"records": _rows(rows)}

    return await with_caller_tx(c, handler)


@router.get("/api/v1/admin/queue")
async def get_admin_queue(request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        if c.is_system_actor:
            rows = await conn.fetch(
                """SELECT node_key, status, COUNT(*)::int AS n
                   FROM outbox WHERE status IN ('pending','leased')
                   GROUP BY node_key, status ORDER BY node_key, status"""
            )
        else:
            rows = await conn.fetch(
                """SELECT node_key, status, COUNT(*)::int AS n
                   FROM outbox WHERE status IN ('pending','leased') AND tenant_id = $1::uuid
                   GROUP BY node_key, status ORDER BY node_key, status""",
                c.tenant_id,
            )
        return {"queue": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── Kanban ────────────────────────────────────────────────────────────────────

@router.get("/api/v1/tasks/{task_id}/kanban")
async def get_task_kanban(task_id: str, request: Request) -> dict:
    c = _caller(request)
    batch_id = request.query_params.get("batchId")

    _UUID_RE = re.compile(r'^[0-9a-f-]{36}$', re.IGNORECASE)
    if not _UUID_RE.match(task_id):
        raise HTTPException(400, detail={"error": {"code": "INVALID_TASK_ID"}})
    if batch_id and not _UUID_RE.match(batch_id):
        raise HTTPException(400, detail={"error": {"code": "INVALID_BATCH_ID"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        pipe = await conn.fetchrow(
            "SELECT steps FROM pipelines WHERE task_id = $1::uuid", task_id
        )
        if not pipe:
            raise _404()
        steps_raw: list[dict] = pipe["steps"] or []

        if batch_id:
            items = await conn.fetch(
                """SELECT i.* FROM items i
                   JOIN batch_items bi ON bi.item_id = i.id
                   WHERE i.task_id = $1::uuid AND bi.batch_id = $2::uuid
                   ORDER BY i.created_at ASC LIMIT 500""",
                task_id, batch_id,
            )
        else:
            items = await conn.fetch(
                "SELECT * FROM items WHERE task_id = $1::uuid ORDER BY created_at ASC LIMIT 500",
                task_id,
            )

        inflight_items = [i for i in items if i["current_step"] not in ("done", "stuck")]
        stuck_items    = [i for i in items if i["current_step"] == "stuck"]

        runs_by_item: dict[str, dict] = {}
        if inflight_items:
            ids = [str(i["id"]) for i in inflight_items]
            runs = await conn.fetch(
                """SELECT run_id, item_id, step_key, node_key, status, attempt,
                          leased_by, leased_at, expected_by
                   FROM outbox
                   WHERE item_id = ANY($1::uuid[]) AND status IN ('pending','leased')""",
                ids,
            )
            for r in runs:
                runs_by_item[str(r["item_id"])] = dict(r)

        by_step: dict[str, list] = {s["key"]: [] for s in steps_raw}
        for it in inflight_items:
            sk = it["current_step"]
            if sk in by_step:
                by_step[sk].append({
                    "item": dict(it),
                    "run": runs_by_item.get(str(it["id"])),
                })

        return {
            "steps": [
                {
                    "stepKey": s["key"],
                    "nodeKey": s["nodeKey"],
                    "label":   s.get("label"),
                    "items":   by_step.get(s["key"]) or [],
                }
                for s in steps_raw
            ],
            "stuck": [
                {
                    "id":          str(i["id"]),
                    "envelope":    i["envelope"],
                    "loop_counts": i["loop_counts"],
                    "updated_at":  i["updated_at"],
                }
                for i in stuck_items
            ],
        }

    return await with_caller_tx(c, handler)


@router.post("/api/v1/queue/run/{run_id}/claim")
async def claim_run(run_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    worker_id: str = body.get("workerId") or ""
    lease_seconds = max(5, min(3600, int(body.get("leaseSeconds") or 60)))
    if not worker_id:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        paused = await conn.fetchrow(
            """SELECT p.status FROM outbox o
               JOIN pipelines p ON p.task_id = o.task_id
               WHERE o.run_id = $1::uuid""",
            run_id,
        )
        if paused and paused["status"] != "active":
            raise HTTPException(409, detail={"error": {
                "code": "PIPELINE_PAUSED",
                "message": "项目已暂停, 不能领取新任务",
            }})

        rows = await conn.fetch(
            """UPDATE outbox SET
                status      = 'leased',
                leased_by   = $2,
                leased_at   = NOW(),
                expected_by = NOW() + ($3::int * INTERVAL '1 second'),
                updated_at  = NOW()
               WHERE run_id = $1::uuid AND status = 'pending'
               RETURNING *""",
            run_id, worker_id, lease_seconds,
        )
        if not rows:
            raise HTTPException(409, detail={"error": {
                "code": "ALREADY_CLAIMED",
                "message": "任务已被他人领取或已完成",
            }})

        item = await conn.fetchrow(
            "SELECT * FROM items WHERE id = $1::uuid", str(rows[0]["item_id"])
        )
        return {
            "job": {
                "runId":    str(rows[0]["run_id"]),
                "itemId":   str(rows[0]["item_id"]),
                "stepKey":  rows[0]["step_key"],
                "nodeKey":  rows[0]["node_key"],
                "envelope": item["envelope"] if item else None,
            }
        }

    return await with_caller_tx(c, handler)


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/api/v1/templates")
async def list_templates(request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        if c.is_system_actor:
            rows = await conn.fetch(
                """SELECT id, name, description, jsonb_array_length(steps) AS step_count, updated_at
                   FROM pipeline_templates ORDER BY updated_at DESC"""
            )
        else:
            rows = await conn.fetch(
                """SELECT id, name, description, jsonb_array_length(steps) AS step_count, updated_at
                   FROM pipeline_templates WHERE tenant_id = $1::uuid ORDER BY updated_at DESC""",
                c.tenant_id,
            )
        return {"templates": _rows(rows)}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/templates/create")
async def create_template(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    name: str = body.get("name") or ""
    if not name:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})
    description: str | None = body.get("description")
    steps: list[dict] = body.get("steps") or []
    layout: dict | None = body.get("layout")

    async def handler(conn: asyncpg.Connection) -> dict:
        arch_err = await check_archived_node_refs(conn, steps)
        if arch_err:
            raise HTTPException(409, detail={"error": arch_err})
        try:
            row = await conn.fetchrow(
                """INSERT INTO pipeline_templates (tenant_id, name, description, steps, layout)
                   VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb)
                   RETURNING *""",
                c.tenant_id, name, description, json.dumps(steps), _j(layout),
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, detail={"error": {
                "code": "TEMPLATE_NAME_TAKEN",
                "message": "同租户下模板名已存在",
            }})
        audit(request, "template.create",
            {"kind": "template", "id": str(row["id"])},
            None, {"name": name},
        )
        return dict(row)

    return await with_caller_tx(c, handler)


@router.get("/api/v1/templates/{template_id}")
async def get_template(template_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            "SELECT * FROM pipeline_templates WHERE id = $1::uuid", template_id
        )
        if not rows:
            raise _404()
        return dict(rows[0])

    return await with_caller_tx(c, handler)


@router.post("/api/v1/templates/{template_id}/save")
async def save_template(template_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    name: str | None = body.get("name")
    description: str | None = body.get("description")
    steps: list[dict] | None = body.get("steps")
    layout: dict | None = body.get("layout")

    async def handler(conn: asyncpg.Connection) -> dict:
        if steps is not None:
            arch_err = await check_archived_node_refs(conn, steps)
            if arch_err:
                raise HTTPException(409, detail={"error": arch_err})

        rows = await conn.fetch(
            """UPDATE pipeline_templates SET
                name        = COALESCE($2, name),
                description = COALESCE($3, description),
                steps       = COALESCE($4::jsonb, steps),
                layout      = COALESCE($5::jsonb, layout),
                updated_at  = NOW()
               WHERE id = $1::uuid
               RETURNING *""",
            template_id,
            name,
            description,
            _j(steps) if steps is not None else None,
            _j(layout) if layout is not None else None,
        )
        if not rows:
            raise _404()
        audit(request, "template.save",
            {"kind": "template", "id": template_id},
            None, {"fields": list(body.keys())},
        )
        return dict(rows[0])

    return await with_caller_tx(c, handler)


@router.delete("/api/v1/templates/{template_id}")
async def delete_template(template_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        r = await conn.fetch(
            "DELETE FROM pipeline_templates WHERE id = $1::uuid RETURNING name", template_id
        )
        if r:
            audit(request, "template.delete",
                {"kind": "template", "id": template_id},
                {"name": r[0]["name"]}, None,
            )
        return {"ok": True}

    return await with_caller_tx(c, handler)


@router.post("/api/v1/templates/{template_id}/instantiate")
async def instantiate_template(template_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    name: str = body.get("name") or ""
    if not name:
        raise HTTPException(422, detail={"error": {"code": "VALIDATION_ERROR"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        tmpl = await conn.fetchrow(
            "SELECT steps, layout FROM pipeline_templates WHERE id = $1::uuid", template_id
        )
        if not tmpl:
            raise HTTPException(404, detail={"error": {"code": "TEMPLATE_NOT_FOUND"}})

        steps_raw: list[dict] = tmpl["steps"] or []
        layout_raw = tmpl["layout"]
        forms = extract_forms(steps_raw)
        etag = forms_etag(forms)

        pipe = await conn.fetchrow(
            "INSERT INTO pipelines (tenant_id, name, steps, layout, template_id) "
            "VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, $5::uuid) RETURNING task_id",
            c.tenant_id, name, json.dumps(steps_raw), _j(layout_raw), template_id,
        )
        task_id = str(pipe["task_id"])
        pv = await conn.fetchrow(
            "INSERT INTO pipeline_versions "
            "(task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by) "
            "VALUES ($1::uuid, $2::uuid, 1, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7) RETURNING id",
            task_id, c.tenant_id, json.dumps(steps_raw), _j(layout_raw),
            json.dumps(forms), etag, c.id,
        )
        await conn.execute(
            "UPDATE pipelines SET current_version_id = $1::uuid WHERE task_id = $2::uuid",
            str(pv["id"]), task_id,
        )
        audit(request, "pipeline.create",
            {"kind": "pipeline", "id": task_id},
            None, {"name": name, "fromTemplate": template_id},
        )
        return {"taskId": task_id, "name": name}

    return await with_caller_tx(c, handler)


# ── Projects ──────────────────────────────────────────────────────────────────

@router.get("/api/v1/projects")
async def list_projects(request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        if c.is_system_actor:
            rows = await conn.fetch(
                """SELECT
                    p.task_id, p.name, p.template_id,
                    t.name AS template_name,
                    jsonb_array_length(p.steps) AS step_count,
                    p.created_at, p.updated_at,
                    (SELECT COUNT(*)::int FROM batches b WHERE b.task_id = p.task_id) AS batch_count,
                    (SELECT COUNT(*)::int FROM items   i WHERE i.task_id = p.task_id) AS item_count
                   FROM pipelines p
                   LEFT JOIN pipeline_templates t ON t.id = p.template_id
                   ORDER BY p.updated_at DESC"""
            )
        else:
            rows = await conn.fetch(
                """SELECT
                    p.task_id, p.name, p.template_id,
                    t.name AS template_name,
                    jsonb_array_length(p.steps) AS step_count,
                    p.created_at, p.updated_at,
                    (SELECT COUNT(*)::int FROM batches b WHERE b.task_id = p.task_id) AS batch_count,
                    (SELECT COUNT(*)::int FROM items   i WHERE i.task_id = p.task_id) AS item_count
                   FROM pipelines p
                   LEFT JOIN pipeline_templates t ON t.id = p.template_id
                   WHERE p.tenant_id = $1::uuid
                   ORDER BY p.updated_at DESC""",
                c.tenant_id,
            )
        return {"projects": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── Review tasks ──────────────────────────────────────────────────────────────

@router.get("/api/v1/review/tasks")
async def get_review_tasks(request: Request) -> dict:
    c = _caller(request)
    batch_id = request.query_params.get("batchId")
    user_id  = request.query_params.get("userId") or ""
    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "MISSING_PARAMS"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        if batch_id:
            rows = await conn.fetch(
                """SELECT i.id AS item_id, i.task_id, i.envelope,
                          o.run_id, o.step_key, o.node_key, o.status,
                          o.leased_by, o.expected_by,
                          bi.batch_id, b.name AS batch_name, p.name AS pipeline_name
                   FROM outbox o
                   JOIN items i        ON i.id  = o.item_id
                   JOIN batch_items bi ON bi.item_id = i.id AND bi.batch_id = $2::uuid
                   JOIN batches b      ON b.id  = bi.batch_id
                   JOIN pipelines p    ON p.task_id = i.task_id
                   WHERE o.node_key = 'review'
                     AND (o.status = 'pending' OR (o.status = 'leased' AND o.leased_by = $1))
                     AND p.status = 'active'
                     AND b.status = 'active'
                   ORDER BY i.created_at ASC LIMIT 200""",
                user_id, batch_id,
            )
        else:
            rows = await conn.fetch(
                """SELECT i.id AS item_id, i.task_id, i.envelope,
                          o.run_id, o.step_key, o.node_key, o.status,
                          o.leased_by, o.expected_by,
                          bi.batch_id, b.name AS batch_name, p.name AS pipeline_name
                   FROM outbox o
                   JOIN items i        ON i.id = o.item_id
                   JOIN batch_items bi ON bi.item_id = i.id
                   JOIN batches b      ON b.id = bi.batch_id
                   JOIN pipelines p    ON p.task_id = i.task_id
                   WHERE o.node_key = 'review'
                     AND (o.status = 'pending' OR (o.status = 'leased' AND o.leased_by = $1))
                     AND p.status = 'active'
                     AND b.status = 'active'
                   ORDER BY i.created_at ASC LIMIT 200""",
                user_id,
            )

        if not rows:
            return {"items": []}

        item_ids = [str(r["item_id"]) for r in rows]
        pv_rows = await conn.fetch(
            """SELECT i.id AS item_id, pv.steps
               FROM items i JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
               WHERE i.id = ANY($1::uuid[])""",
            item_ids,
        )
        item_steps: dict[str, list[dict]] = {
            str(r["item_id"]): (r["steps"] or []) for r in pv_rows
        }

        my_ops_rows = await conn.fetch(
            """SELECT DISTINCT item_id, step_key FROM submissions
               WHERE item_id = ANY($1::uuid[]) AND user_id = $2 AND status = 'submitted'""",
            item_ids, user_id,
        )
        my_ops: dict[str, set[str]] = {}
        for r in my_ops_rows:
            key_str = str(r["item_id"])
            my_ops.setdefault(key_str, set()).add(r["step_key"])

        filtered = []
        for r in rows:
            item_id_str = str(r["item_id"])
            steps = item_steps.get(item_id_str) or []
            review_step = next((s for s in steps if s.get("key") == r["step_key"]), None)
            disallowed = _expand_disallowed_steps(review_step)
            if disallowed:
                mine = my_ops.get(item_id_str)
                if mine and any(sk in mine for sk in disallowed):
                    continue
            filtered.append(dict(r))

        return {"items": filtered}

    return await with_caller_tx(c, handler)
