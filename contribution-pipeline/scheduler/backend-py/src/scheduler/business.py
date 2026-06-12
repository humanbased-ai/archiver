"""业务层路由 — 与 business.ts 1:1 对应 (P3).

职责:
  - 批次管理 (batches / batch_items)
  - 用户认领记录 (submissions)
  - 容量 & 配额校验
  - 拒绝/去重 loopback 后重置认领资格

调度核心调用通过 _sched_post():
  - 同进程: SCHEDULER_BASE_URL 未设 → http://localhost:{PORT} + INTERNAL_KEY
  - 拆服务: SCHEDULER_BASE_URL 设置 → 走真 HTTP + SCHEDULER_API_KEY
"""
from __future__ import annotations
import json
import logging
import os
from typing import Any

import asyncpg
from fastapi import APIRouter, HTTPException, Request

from .auth import API_KEY_HEADER, TENANT_ID_HEADER, DEFAULT_TENANT_ID, CallerInfo, get_internal_key
from .audit import audit
from .db import with_caller_tx
from .events import emit
from .step_rules import expand_disallowed_steps

router = APIRouter()
logger = logging.getLogger(__name__)

_REMOTE_SCHED = (os.environ.get("SCHEDULER_BASE_URL") or "").rstrip("/")
_REMOTE_KEY = os.environ.get("SCHEDULER_API_KEY") or ""


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


async def _sched_post(path: str, body: dict, tenant_id: str) -> dict:
    """业务层 → 调度核心 HTTP 调用.  失败抛 HTTPException-compatible exception."""
    import httpx

    if _REMOTE_SCHED:
        base = _REMOTE_SCHED
        key = _REMOTE_KEY
    else:
        port = int(os.environ.get("PORT", 4000))
        base = f"http://localhost:{port}"
        key = get_internal_key()

    headers = {
        "content-type": "application/json",
        API_KEY_HEADER: key,
        TENANT_ID_HEADER: tenant_id,
    }
    url = f"{base}/api/v1{path}"
    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
        r = await client.post(url, json=body, headers=headers)

    data: Any = None
    try:
        data = r.json()
    except Exception:
        data = None

    if r.status_code >= 400:
        err = (data or {}).get("error") or {}
        msg = err.get("message") or f"SCHED_ERROR({r.status_code})"
        code = err.get("code") or "SCHED_ERROR"
        exc = Exception(msg)
        exc.code = code  # type: ignore[attr-defined]
        raise exc

    return data or {}


async def _batch_progress(conn: asyncpg.Connection, batch_id: str) -> dict | None:
    row = await conn.fetchrow(
        "SELECT target, task_id FROM batches WHERE id = $1::uuid", batch_id
    )
    if not row:
        return None
    counts = await conn.fetch(
        """SELECT i.current_step AS step, COUNT(*)::int AS n
             FROM batch_items bi
             JOIN items i ON i.id = bi.item_id
            WHERE bi.batch_id = $1::uuid
            GROUP BY i.current_step""",
        batch_id,
    )
    approved = 0
    stuck = 0
    step_counts: list[dict] = []
    for c in counts:
        if c["step"] == "done":
            approved = c["n"]
        elif c["step"] == "stuck":
            stuck = c["n"]
        else:
            step_counts.append({"step": c["step"], "n": c["n"]})
    return {"target": row["target"], "approved": approved, "stuck": stuck, "stepCounts": step_counts}


async def _mark_latest_submission_result(
    conn: asyncpg.Connection,
    item_id: str,
    step_key: str,
    result: str,
    reason: str | None = None,
) -> None:
    await conn.execute(
        """UPDATE submissions
              SET result        = $3,
                  result_reason = $4,
                  result_at     = NOW(),
                  updated_at    = NOW()
            WHERE id = (
              SELECT id FROM submissions
               WHERE item_id  = $1::uuid
                 AND step_key = $2
                 AND status   = 'submitted'
                 AND result IS NULL
               ORDER BY updated_at DESC
               LIMIT 1
            )""",
        item_id, step_key, result, reason,
    )


def _audit(request: Request, action: str, resource: dict, before: dict | None = None, after: dict | None = None) -> None:
    audit(request, action, resource, before, after)


def _emit(request: Request, kind: str, resource_kind: str | None = None,
          resource_id: str | None = None, payload: dict | None = None) -> None:
    c = getattr(request.state, "caller", None)
    tenant_id = c.tenant_id if c else DEFAULT_TENANT_ID
    emit(tenant_id, kind, resource_kind, resource_id, payload)


# ── 创建批次 ──────────────────────────────────────────────────────────────────

@router.post("/api/batches")
async def create_batch(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    pipeline_id: str = body.get("pipelineId", "")
    name: str = body.get("name", "")
    target: int = int(body.get("target", 5))

    if not pipeline_id or not name:
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "pipelineId and name required"}})
    if not (1 <= target <= 100):
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "target must be 1–100"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        pipe = await conn.fetchrow(
            "SELECT tenant_id, current_version_id FROM pipelines WHERE task_id = $1::uuid",
            pipeline_id,
        )
        if not pipe or not pipe["current_version_id"]:
            raise HTTPException(404, detail={"error": {"code": "PIPELINE_NOT_FOUND"}})

        pipe_tenant = pipe["tenant_id"]
        pv_id = pipe["current_version_id"]
        pv = await conn.fetchrow(
            "SELECT steps FROM pipeline_versions WHERE id = $1::uuid", pv_id
        )
        steps = (pv["steps"] if pv else None) or []
        if not steps:
            raise HTTPException(400, detail={"error": {"code": "EMPTY_PIPELINE"}})
        first_step = steps[0]

        batch_row = await conn.fetchrow(
            """INSERT INTO batches (tenant_id, task_id, pipeline_version_id, name, target)
               VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
               RETURNING id""",
            pipe_tenant, pipeline_id, pv_id, name, target,
        )
        batch_id = str(batch_row["id"])

        for _ in range(target):
            item_row = await conn.fetchrow(
                """INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope)
                   VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb)
                   RETURNING id""",
                pipe_tenant, pipeline_id, pv_id,
                first_step["key"],
                _j({"payload": {}, "outputs": {}, "tags": {}}),
            )
            item_id = str(item_row["id"])
            await conn.execute(
                """INSERT INTO batch_items (tenant_id, batch_id, item_id)
                   VALUES ($1::uuid, $2::uuid, $3::uuid)""",
                pipe_tenant, batch_id, item_id,
            )
            await conn.execute(
                """INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
                   VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'pending', 1)""",
                pipe_tenant, item_id, pipeline_id,
                first_step["key"], first_step.get("nodeKey", first_step["key"]),
            )

        _audit(request, "batch.create", {"kind": "batch", "id": batch_id},
               None, {"name": name, "target": target, "pipelineId": pipeline_id})
        _emit(request, "batch.created", "batch", batch_id,
              {"name": name, "target": target, "pipelineId": pipeline_id})
        return {"batchId": batch_id, "target": target, "firstStep": first_step["key"]}

    return await with_caller_tx(c, handler)


# ── 批次列表 ───────────────────────────────────────────────────────────────────

@router.get("/api/batches")
async def list_batches(request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        if c.is_system_actor:
            rows = await conn.fetch(
                """SELECT b.id, b.name, b.target, b.task_id, b.status,
                          p.name AS pipeline_name, p.status AS pipeline_status,
                          b.created_at
                     FROM batches b
                     JOIN pipelines p ON p.task_id = b.task_id
                    ORDER BY b.created_at DESC LIMIT 50"""
            )
        else:
            rows = await conn.fetch(
                """SELECT b.id, b.name, b.target, b.task_id, b.status,
                          p.name AS pipeline_name, p.status AS pipeline_status,
                          b.created_at
                     FROM batches b
                     JOIN pipelines p ON p.task_id = b.task_id
                    WHERE b.tenant_id = $1::uuid
                    ORDER BY b.created_at DESC LIMIT 50""",
                c.tenant_id,
            )
        return {"batches": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── 批次暂停 ───────────────────────────────────────────────────────────────────

@router.post("/api/batches/{batch_id}/pause")
async def pause_batch(batch_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            """UPDATE batches SET status = 'paused', updated_at = NOW()
                WHERE id = $1::uuid AND status = 'active'
               RETURNING status""",
            batch_id,
        )
        if not rows:
            raise HTTPException(404, detail={"error": {"code": "NOT_FOUND_OR_NOT_ACTIVE"}})
        _audit(request, "batch.pause", {"kind": "batch", "id": batch_id},
               {"status": "active"}, {"status": "paused"})
        _emit(request, "batch.paused", "batch", batch_id)
        return {"ok": True, "status": rows[0]["status"]}

    return await with_caller_tx(c, handler)


# ── 批次恢复 ───────────────────────────────────────────────────────────────────

@router.post("/api/batches/{batch_id}/resume")
async def resume_batch(batch_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            """UPDATE batches SET status = 'active', updated_at = NOW()
                WHERE id = $1::uuid AND status = 'paused'
               RETURNING status""",
            batch_id,
        )
        if not rows:
            raise HTTPException(404, detail={"error": {"code": "NOT_FOUND_OR_NOT_PAUSED"}})
        _audit(request, "batch.resume", {"kind": "batch", "id": batch_id},
               {"status": "paused"}, {"status": "active"})
        _emit(request, "batch.resumed", "batch", batch_id)
        return {"ok": True, "status": rows[0]["status"]}

    return await with_caller_tx(c, handler)


# ── 批次提前关闭 (不可逆) ────────────────────────────────────────────────────────

@router.post("/api/batches/{batch_id}/close")
async def close_batch(batch_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    reason: str = (body.get("reason") or "").strip()
    operator_id: str | None = body.get("operatorId")

    if not reason:
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "reason required"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        cur = await conn.fetchrow(
            "SELECT status FROM batches WHERE id = $1::uuid", batch_id
        )
        if not cur:
            raise HTTPException(404, detail={"error": {"code": "NOT_FOUND"}})
        if cur["status"] == "archived":
            raise HTTPException(409, detail={"error": {"code": "BATCH_ALREADY_CLOSED", "message": "批次已关闭"}})

        await conn.execute(
            "UPDATE batches SET status = 'archived', updated_at = NOW() WHERE id = $1::uuid",
            batch_id,
        )
        cancelled_items = await conn.fetch(
            """UPDATE items SET current_step = 'cancelled', updated_at = NOW()
                WHERE id IN (SELECT item_id FROM batch_items WHERE batch_id = $1::uuid)
                  AND current_step NOT IN ('done', 'stuck', 'cancelled')
               RETURNING id""",
            batch_id,
        )
        cancelled_outbox = await conn.fetch(
            """UPDATE outbox SET status = 'failed', updated_at = NOW()
                WHERE item_id IN (SELECT item_id FROM batch_items WHERE batch_id = $1::uuid)
                  AND status IN ('pending', 'leased')
               RETURNING run_id""",
            batch_id,
        )
        released_subs = await conn.fetch(
            """UPDATE submissions SET status = 'returned', updated_at = NOW()
                WHERE batch_id = $1::uuid AND status = 'claimed'
               RETURNING id""",
            batch_id,
        )

        n_items = len(cancelled_items)
        n_outbox = len(cancelled_outbox)
        n_subs = len(released_subs)
        op = operator_id or (c.name if c else "unknown")

        _audit(request, "batch.close", {"kind": "batch", "id": batch_id},
               {"status": cur["status"]},
               {"status": "archived", "reason": reason, "operatorId": op,
                "cancelledItems": n_items, "cancelledOutbox": n_outbox,
                "releasedSubmissions": n_subs})
        _emit(request, "batch.closed", "batch", batch_id,
              {"reason": reason, "cancelledItems": n_items,
               "cancelledOutbox": n_outbox, "releasedSubmissions": n_subs})
        return {
            "ok": True,
            "status": "archived",
            "cancelledItems": n_items,
            "cancelledOutbox": n_outbox,
            "releasedSubmissions": n_subs,
        }

    return await with_caller_tx(c, handler)


# ── 用户侧请求重放 stuck item ────────────────────────────────────────────────────

@router.post("/api/items/{item_id}/replay-request")
async def replay_request(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    user_id: str = body.get("userId", "")
    reason: str | None = (body.get("reason") or "").strip() or None

    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "userId required"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        item = await conn.fetchrow(
            "SELECT current_step, tenant_id FROM items WHERE id = $1::uuid", item_id
        )
        if not item:
            raise HTTPException(404, detail={"error": {"code": "ITEM_NOT_FOUND"}})
        if item["current_step"] != "stuck":
            raise HTTPException(409, detail={"error": {"code": "ITEM_NOT_STUCK", "message": "仅 stuck 状态可申请重放"}})

        existing = await conn.fetchrow(
            "SELECT id FROM replay_requests WHERE item_id = $1::uuid AND status = 'pending' LIMIT 1",
            item_id,
        )
        if existing:
            return {"ok": True, "requestId": str(existing["id"]), "replayed": True}

        created = await conn.fetchrow(
            """INSERT INTO replay_requests (tenant_id, item_id, requester, reason)
               VALUES ($1::uuid, $2::uuid, $3, $4)
               RETURNING id""",
            item["tenant_id"], item_id, user_id, reason,
        )
        _audit(request, "item.replay-request.create", {"kind": "item", "id": item_id},
               None, {"requester": user_id, "reason": reason})
        return {"ok": True, "requestId": str(created["id"]), "replayed": False}

    return await with_caller_tx(c, handler)


# ── 批次详情 + 进度 ────────────────────────────────────────────────────────────

@router.get("/api/batches/{batch_id}")
async def get_batch(batch_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        batch = await conn.fetchrow(
            """SELECT b.*, p.name AS pipeline_name,
                      COALESCE(pv.steps, p.steps) AS pipeline_steps,
                      p.status AS pipeline_status
                 FROM batches b
                 JOIN pipelines p ON p.task_id = b.task_id
                 LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
                WHERE b.id = $1::uuid""",
            batch_id,
        )
        if not batch:
            raise HTTPException(404, detail={"error": {"code": "NOT_FOUND"}})
        progress = await _batch_progress(conn, batch_id)
        return {**dict(batch), **(progress or {})}

    return await with_caller_tx(c, handler)


# ── 可领取任务列表 ─────────────────────────────────────────────────────────────

@router.get("/api/collect/tasks")
async def collect_tasks(request: Request) -> dict:
    c = _caller(request)
    qs = dict(request.query_params)
    batch_id = qs.get("batchId")
    user_id = qs.get("userId")

    if not batch_id or not user_id:
        raise HTTPException(400, detail={"error": {"code": "MISSING_PARAMS"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        progress = await _batch_progress(conn, batch_id)
        if progress is None:
            raise HTTPException(404, detail={"error": {"code": "BATCH_NOT_FOUND"}})

        batch = await conn.fetchrow(
            """SELECT b.task_id, COALESCE(pv.steps, p.steps) AS steps
                 FROM batches b
                 JOIN pipelines p ON p.task_id = b.task_id
                 LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
                WHERE b.id = $1::uuid""",
            batch_id,
        )
        steps = (batch["steps"] if batch else None) or []
        first_step_key = steps[0]["key"] if steps else "ingest"
        ingest_params = (steps[0].get("params") or {}) if steps else {}

        active_row = await conn.fetchrow(
            """SELECT COUNT(*)::int AS active FROM submissions
                WHERE batch_id = $1::uuid AND user_id = $2 AND status = 'claimed'""",
            batch_id, user_id,
        )
        active = active_row["active"]
        max_concurrent = int(ingest_params.get("max_concurrent_per_user") or 99)
        max_total = int(ingest_params.get("max_total_per_user") or 99)

        submitted_row = await conn.fetchrow(
            """SELECT COUNT(*)::int AS total_submitted FROM submissions
                WHERE batch_id = $1::uuid AND user_id = $2 AND status = 'submitted'""",
            batch_id, user_id,
        )
        total_submitted = submitted_row["total_submitted"]

        can_claim = (
            progress["approved"] < progress["target"]
            and active < max_concurrent
            and total_submitted < max_total
        )

        items = await conn.fetch(
            """SELECT i.*, o.run_id
                 FROM batch_items bi
                 JOIN items i ON i.id = bi.item_id
                 JOIN outbox o ON o.item_id = i.id AND o.status = 'pending' AND o.step_key = $2
                WHERE bi.batch_id = $1::uuid
                  AND NOT EXISTS (
                    SELECT 1 FROM submissions s
                     WHERE s.item_id = i.id AND s.step_key = $2
                       AND s.user_id = $3 AND s.status = 'claimed'
                  )
                ORDER BY i.created_at ASC""",
            batch_id, first_step_key, user_id,
        )

        return {
            "items": _rows(items),
            "canClaim": can_claim,
            "quota": {"approved": progress["approved"], "target": progress["target"]},
            "userCapacity": {
                "active": active, "maxConcurrent": max_concurrent,
                "total_submitted": total_submitted, "maxTotal": max_total,
            },
        }

    return await with_caller_tx(c, handler)


# ── 认领采集任务 ────────────────────────────────────────────────────────────────

@router.post("/api/collect/{item_id}/claim")
async def collect_claim(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    user_id: str = body.get("userId", "")
    batch_id: str = body.get("batchId", "")

    if not user_id or not batch_id:
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "userId and batchId required"}})

    tenant_id = c.tenant_id

    # Phase 1: pre-check tx
    class _PreResult:
        error: dict | None = None
        ok: dict | None = None

    pre = _PreResult()

    async def pre_check(conn: asyncpg.Connection) -> None:
        item = await conn.fetchrow(
            "SELECT current_step FROM items WHERE id = $1::uuid", item_id
        )
        if not item:
            pre.error = {"http": 404, "code": "ITEM_NOT_FOUND"}
            return
        if item["current_step"] in ("stuck", "done"):
            msg = ("该任务已卡住, 无法继续 (请管理员介入或选其它任务)"
                   if item["current_step"] == "stuck" else "该任务已结束, 无法再领取")
            pre.error = {"http": 409, "code": "ITEM_INACTIVE", "message": msg}
            return

        batch = await conn.fetchrow(
            """SELECT b.target, b.task_id, COALESCE(pv.steps, p.steps) AS steps,
                      b.status AS b_status, p.status AS p_status
                 FROM batches b
                 JOIN pipelines p ON p.task_id = b.task_id
                 LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
                WHERE b.id = $1::uuid""",
            batch_id,
        )
        if not batch:
            pre.error = {"http": 404, "code": "BATCH_NOT_FOUND"}
            return
        if batch["p_status"] != "active":
            pre.error = {"http": 409, "code": "PIPELINE_PAUSED", "message": "项目已暂停, 不能领取新任务"}
            return
        if batch["b_status"] == "archived":
            pre.error = {"http": 409, "code": "BATCH_CLOSED", "message": "批次已关闭, 不能再领取"}
            return
        if batch["b_status"] != "active":
            pre.error = {"http": 409, "code": "BATCH_PAUSED", "message": "批次已暂停, 不能领取新任务"}
            return

        steps = batch["steps"] or []
        first_step = steps[0] if steps else {}
        ingest_params = first_step.get("params") or {}
        max_concurrent = int(ingest_params.get("max_concurrent_per_user") or 99)
        max_total = int(ingest_params.get("max_total_per_user") or 99)

        mine = await conn.fetchrow(
            """SELECT run_id FROM submissions
                WHERE item_id = $1::uuid AND step_key = $2
                  AND user_id = $3 AND status = 'claimed'
               LIMIT 1""",
            item_id, first_step.get("key", ""), user_id,
        )
        if mine:
            pre.error = {"http": 409, "code": "ALREADY_CLAIMING", "message": "你正在做这个任务, 请先提交或放弃"}
            return

        progress = await _batch_progress(conn, batch_id)
        if not progress:
            pre.error = {"http": 404, "code": "BATCH_NOT_FOUND"}
            return
        if progress["approved"] >= progress["target"]:
            pre.error = {"http": 409, "code": "QUOTA_FULL", "message": "批次已达到目标数量"}
            return

        active_row = await conn.fetchrow(
            """SELECT COUNT(*)::int AS active FROM submissions
                WHERE batch_id = $1::uuid AND user_id = $2 AND status = 'claimed'""",
            batch_id, user_id,
        )
        if active_row["active"] >= max_concurrent:
            pre.error = {"http": 409, "code": "TOO_MANY_ACTIVE",
                         "message": f"同时最多认领 {max_concurrent} 个任务"}
            return

        submitted_row = await conn.fetchrow(
            """SELECT COUNT(*)::int AS total_submitted FROM submissions
                WHERE batch_id = $1::uuid AND user_id = $2 AND status = 'submitted'""",
            batch_id, user_id,
        )
        if submitted_row["total_submitted"] >= max_total:
            pre.error = {"http": 409, "code": "USER_QUOTA_FULL",
                         "message": f"本批次最多提交 {max_total} 个任务"}
            return

        # disallowed steps check
        disallowed = expand_disallowed_steps(first_step)
        if disallowed:
            hit = await conn.fetchrow(
                f"""SELECT step_key FROM submissions
                      WHERE item_id = $1::uuid AND user_id = $2
                        AND step_key = ANY($3::text[]) AND status = 'submitted'
                     LIMIT 1""",
                item_id, user_id, disallowed,
            )
            if hit:
                pre.error = {"http": 403, "code": "STEP_OPERATOR_CONFLICT",
                             "message": f'本项目规则要求分人, 你已在步骤"{hit["step_key"]}"上操作过该 item'}
                return

        run = await conn.fetchrow(
            """SELECT * FROM outbox
                WHERE item_id = $1::uuid AND step_key = $2 AND status = 'pending'""",
            item_id, first_step.get("key", ""),
        )
        if not run:
            pre.error = {"http": 409, "code": "NO_PENDING_RUN", "message": "任务不在待领取状态"}
            return

        pre.ok = {
            "first_step": first_step,
            "run": dict(run),
            "tenant": run["tenant_id"],
        }

    await with_caller_tx(c, pre_check)

    if pre.error:
        _audit(request, "quota.denied", {"kind": "item", "id": item_id},
               None, {"reason": pre.error["code"], "batchId": batch_id, "userId": user_id})
        raise HTTPException(pre.error["http"],
                            detail={"error": {k: v for k, v in pre.error.items() if k != "http"}})

    first_step = pre.ok["first_step"]
    run = pre.ok["run"]

    # schedPost claim
    try:
        await _sched_post(
            f"/queue/run/{run['run_id']}/claim",
            {"workerId": user_id, "leaseSeconds": 3600},
            tenant_id,
        )
    except Exception as e:
        code = getattr(e, "code", "ALREADY_CLAIMED")
        _audit(request, "submission.claim.denied", {"kind": "item", "id": item_id},
               None, {"reason": "already_claimed_by_other", "batchId": batch_id, "userId": user_id})
        raise HTTPException(409, detail={"error": {"code": code, "message": "任务已被他人领取"}})

    # Phase 2: write submission
    conflict = False

    async def write_sub(conn: asyncpg.Connection) -> None:
        nonlocal conflict
        try:
            await conn.execute(
                """INSERT INTO submissions (tenant_id, batch_id, item_id, step_key, user_id, run_id, status)
                   VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid, 'claimed')""",
                pre.ok["tenant"], batch_id, item_id,
                first_step.get("key", ""), user_id, run["run_id"],
            )
        except asyncpg.UniqueViolationError:
            conflict = True

    await with_caller_tx(c, write_sub)

    if conflict:
        try:
            await _sched_post(
                f"/queue/lease/{run['run_id']}/release",
                {"workerId": user_id},
                tenant_id,
            )
        except Exception:
            pass
        raise HTTPException(409, detail={"error": {
            "code": "ALREADY_CLAIMING", "message": "你正在做这个任务,请先提交或放弃",
        }})

    _audit(request, "submission.claim", {"kind": "item", "id": item_id},
           None, {"batchId": batch_id, "userId": user_id, "runId": run["run_id"]})
    return {"ok": True, "runId": run["run_id"], "stepKey": first_step.get("key")}


# ── 提交采集任务 ────────────────────────────────────────────────────────────────

@router.post("/api/collect/{item_id}/submit")
async def collect_submit(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    user_id: str = body.get("userId", "")
    payload: dict = body.get("payload") or {}

    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "userId required"}})

    tenant_id = c.tenant_id

    async def find_sub(conn: asyncpg.Connection) -> dict | None:
        row = await conn.fetchrow(
            """SELECT id, run_id, batch_id, step_key FROM submissions
                WHERE item_id = $1::uuid AND user_id = $2 AND status = 'claimed'
               LIMIT 1""",
            item_id, user_id,
        )
        return dict(row) if row else None

    lookup = await with_caller_tx(c, find_sub)
    if not lookup:
        raise HTTPException(409, detail={"error": {"code": "NOT_CLAIMED", "message": "你没有认领此任务"}})

    try:
        sched_resp = await _sched_post("/result", {
            "runId": lookup["run_id"],
            "status": "success",
            "output": payload,
        }, tenant_id)
    except Exception as e:
        code = getattr(e, "code", "SCHED_ERROR")
        raise HTTPException(409, detail={"error": {"code": code, "message": str(e)}})

    async def mark_submitted(conn: asyncpg.Connection) -> None:
        await conn.execute(
            "UPDATE submissions SET status='submitted', updated_at=NOW() WHERE id=$1::uuid",
            lookup["id"],
        )

    await with_caller_tx(c, mark_submitted)

    _audit(request, "submission.submit", {"kind": "item", "id": item_id},
           None, {"userId": user_id, "runId": lookup["run_id"],
                  "nextStep": sched_resp.get("nextStep")})
    return {
        "ok": True,
        "nextStep": sched_resp.get("nextStep"),
        "recovered": sched_resp.get("applied") is False,
    }


# ── 放弃认领 ──────────────────────────────────────────────────────────────────

@router.post("/api/collect/{item_id}/release")
async def collect_release(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    user_id: str = body.get("userId", "")

    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "userId required"}})

    tenant_id = c.tenant_id

    async def find_sub(conn: asyncpg.Connection) -> dict | None:
        row = await conn.fetchrow(
            """SELECT id, run_id FROM submissions
                WHERE item_id = $1::uuid AND user_id = $2 AND status = 'claimed'
               LIMIT 1""",
            item_id, user_id,
        )
        return dict(row) if row else None

    lookup = await with_caller_tx(c, find_sub)
    if not lookup:
        raise HTTPException(404, detail={"error": {"code": "NOT_FOUND"}})

    try:
        await _sched_post(f"/queue/lease/{lookup['run_id']}/release",
                          {"workerId": user_id}, tenant_id)
    except Exception:
        pass  # lease 可能已过期, 忽略

    async def mark_returned(conn: asyncpg.Connection) -> None:
        await conn.execute(
            "UPDATE submissions SET status='returned', updated_at=NOW() WHERE id=$1::uuid",
            lookup["id"],
        )

    await with_caller_tx(c, mark_returned)

    _audit(request, "submission.release", {"kind": "item", "id": item_id},
           None, {"userId": user_id, "runId": lookup["run_id"]})
    return {"ok": True}


# ── 当前用户在该 item 上的最近提交结果 ────────────────────────────────────────────

@router.get("/api/collect/{item_id}/state")
async def collect_state(item_id: str, request: Request) -> dict:
    c = _caller(request)
    user_id = request.query_params.get("userId")
    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "MISSING_USER"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        row = await conn.fetchrow(
            """SELECT result, result_reason, result_at
                 FROM submissions
                WHERE item_id = $1::uuid
                  AND user_id = $2
                  AND status  = 'submitted'
                  AND result IS NOT NULL
                ORDER BY result_at DESC NULLS LAST
                LIMIT 1""",
            item_id, user_id,
        )
        return {
            "my_last_result": row["result"] if row else None,
            "my_last_reason": row["result_reason"] if row else None,
            "my_last_result_at": row["result_at"] if row else None,
        }

    return await with_caller_tx(c, handler)


# ── 重做: 抹掉当前用户被退回/撞重的历史 submission ────────────────────────────────

@router.post("/api/collect/{item_id}/redo")
async def collect_redo(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    user_id: str = body.get("userId", "")

    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST", "message": "userId required"}})

    async def handler(conn: asyncpg.Connection) -> list[dict]:
        rows = await conn.fetch(
            """DELETE FROM submissions
                WHERE item_id = $1::uuid
                  AND user_id = $2
                  AND status  = 'submitted'
                  AND result IN ('duplicate', 'rejected')
               RETURNING id, result""",
            item_id, user_id,
        )
        return _rows(rows)

    deleted = await with_caller_tx(c, handler)
    if not deleted:
        raise HTTPException(404, detail={"error": {"code": "NO_FAILED_SUBMISSION",
                                                    "message": "没有可重做的失败记录"}})
    _audit(request, "submission.redo", {"kind": "item", "id": item_id},
           None, {"userId": user_id,
                  "removedIds": [d["id"] for d in deleted],
                  "removedResults": [d["result"] for d in deleted]})
    return {"ok": True, "removed": len(deleted)}


# ── 审核决定 ──────────────────────────────────────────────────────────────────

@router.post("/api/review/{item_id}/decide")
async def review_decide(item_id: str, request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    user_id: str = body.get("userId", "")
    batch_id_body: str | None = body.get("batchId")
    decision: str = body.get("decision", "")
    reason: str | None = (body.get("reason") or "").strip() or None

    if not user_id or decision not in ("approved", "rejected"):
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST",
                                                    "message": "userId and decision (approved|rejected) required"}})

    tenant_id = c.tenant_id

    # Find leased review run
    async def find_run(conn: asyncpg.Connection) -> dict | None:
        row = await conn.fetchrow(
            """SELECT * FROM outbox
                WHERE item_id = $1::uuid AND node_key = 'review' AND status = 'leased'
               LIMIT 1""",
            item_id,
        )
        return dict(row) if row else None

    run = await with_caller_tx(c, find_run)
    if not run:
        raise HTTPException(409, detail={"error": {"code": "NO_LEASED_RUN",
                                                    "message": "任务未被认领或已完成"}})

    if run.get("leased_by") and run["leased_by"] != user_id:
        raise HTTPException(403, detail={"error": {"code": "NOT_LEASE_OWNER",
                                                    "message": "该任务由其他用户认领, 你不能提交决策"}})

    # disallowed steps check
    async def check_conflict(conn: asyncpg.Connection) -> str | None:
        item = await conn.fetchrow(
            "SELECT pipeline_version_id FROM items WHERE id = $1::uuid", item_id
        )
        if not item:
            return None
        pv = await conn.fetchrow(
            "SELECT steps FROM pipeline_versions WHERE id = $1::uuid",
            item["pipeline_version_id"],
        )
        steps = (pv["steps"] if pv else None) or []
        review_step = next((s for s in steps if s.get("key") == run.get("step_key")), None)
        disallowed = expand_disallowed_steps(review_step)
        if not disallowed:
            return None
        hit = await conn.fetchrow(
            """SELECT step_key FROM submissions
                WHERE item_id = $1::uuid AND user_id = $2
                  AND step_key = ANY($3::text[]) AND status = 'submitted'
               LIMIT 1""",
            item_id, user_id, disallowed,
        )
        return hit["step_key"] if hit else None

    conflict_step = await with_caller_tx(c, check_conflict)
    if conflict_step:
        raise HTTPException(403, detail={"error": {
            "code": "STEP_OPERATOR_CONFLICT",
            "message": f'本项目规则要求分人, 你已在步骤"{conflict_step}"上操作过该 item, 不能再做 review',
            "conflictStep": conflict_step,
        }})

    # capacity check
    async def check_capacity(conn: asyncpg.Connection) -> dict | None:
        bid = batch_id_body
        if not bid:
            bi = await conn.fetchrow(
                "SELECT batch_id FROM batch_items WHERE item_id = $1::uuid LIMIT 1", item_id
            )
            bid = str(bi["batch_id"]) if bi else None
        if not bid:
            return None
        item = await conn.fetchrow(
            "SELECT pipeline_version_id FROM items WHERE id = $1::uuid", item_id
        )
        if not item:
            return None
        pv = await conn.fetchrow(
            "SELECT steps FROM pipeline_versions WHERE id = $1::uuid",
            item["pipeline_version_id"],
        )
        steps = (pv["steps"] if pv else None) or []
        review_step = next((s for s in steps if s.get("key") == run.get("step_key")), None)
        max_total = ((review_step or {}).get("params") or {}).get("max_total_per_user")
        if not max_total or int(max_total) <= 0:
            return None
        max_total = int(max_total)
        done_row = await conn.fetchrow(
            """SELECT COUNT(*)::int AS done FROM submissions
                WHERE batch_id = $1::uuid AND user_id = $2
                  AND step_key = $3 AND status = 'submitted'""",
            bid, user_id, run.get("step_key"),
        )
        done = done_row["done"]
        return {"max": max_total, "done": done} if done >= max_total else None

    cap = await with_caller_tx(c, check_capacity)
    if cap:
        _audit(request, "quota.denied", {"kind": "item", "id": item_id},
               None, {"reason": "USER_QUOTA_FULL", "step": run.get("step_key"),
                      "userId": user_id, "max": cap["max"], "done": cap["done"]})
        raise HTTPException(409, detail={"error": {
            "code": "USER_QUOTA_FULL",
            "message": f'本批次审核步骤最多审 {cap["max"]} 条 (已审 {cap["done"]})',
        }})

    # schedPost result
    output: dict = {"decision": decision}
    if decision == "rejected" and reason:
        output["reason"] = reason
    try:
        sched_resp = await _sched_post("/result", {
            "runId": run["run_id"],
            "status": "success",
            "output": output,
        }, tenant_id)
    except Exception as e:
        code = getattr(e, "code", "SCHED_ERROR")
        raise HTTPException(409, detail={"error": {"code": code, "message": str(e)}})

    # post-decide writes
    async def post_write(conn: asyncpg.Connection) -> None:
        bid = batch_id_body
        if not bid:
            bi = await conn.fetchrow(
                "SELECT batch_id FROM batch_items WHERE item_id = $1::uuid LIMIT 1", item_id
            )
            bid = str(bi["batch_id"]) if bi else None
        if not bid:
            return
        pipe = await conn.fetchrow(
            """SELECT COALESCE(pv.steps, p.steps) AS steps, b.tenant_id
                 FROM batches b
                 JOIN pipelines p ON p.task_id = b.task_id
                 LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
                WHERE b.id = $1::uuid""",
            bid,
        )
        steps = (pipe["steps"] if pipe else None) or []
        first_step_key = steps[0]["key"] if steps else "ingest"
        result_val = "approved" if decision == "approved" else "rejected"
        await _mark_latest_submission_result(
            conn, item_id, first_step_key, result_val,
            reason if decision == "rejected" else None,
        )
        bt = pipe["tenant_id"] if pipe else tenant_id
        result_reason_val = reason if decision == "rejected" else None
        await conn.execute(
            """INSERT INTO submissions
                 (tenant_id, batch_id, item_id, step_key, user_id, run_id,
                  status, result, result_reason, result_at)
               VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid,
                       'submitted', $7, $8, NOW())""",
            bt, bid, item_id, run.get("step_key"), user_id, run["run_id"],
            decision, result_reason_val,
        )

    await with_caller_tx(c, post_write)

    _audit(request, f"review.{decision}", {"kind": "item", "id": item_id},
           None, {"userId": user_id, "reason": reason, "nextStep": sched_resp.get("nextStep")})
    _emit(request, "item.reviewed", "item", item_id, {
        "decision": decision, "reason": reason,
        "userId": user_id, "nextStep": sched_resp.get("nextStep"),
    })
    return {
        "ok": True,
        "nextStep": sched_resp.get("nextStep"),
        "recovered": sched_resp.get("applied") is False,
    }


# ── 批次内用户统计 ─────────────────────────────────────────────────────────────

@router.get("/api/batches/{batch_id}/user-stats")
async def batch_user_stats(batch_id: str, request: Request) -> dict:
    c = _caller(request)

    async def handler(conn: asyncpg.Connection) -> dict:
        rows = await conn.fetch(
            """SELECT user_id, status, COUNT(*)::int AS n
                 FROM submissions
                WHERE batch_id = $1::uuid
                GROUP BY user_id, status
                ORDER BY user_id, status""",
            batch_id,
        )
        return {"stats": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── 内部回写: 调度核心把"item 判定结果"通知业务层 ──────────────────────────────────

@router.post("/api/internal/submission-result")
async def internal_submission_result(request: Request) -> dict:
    c = _caller(request)
    body = await request.json()
    item_id: str = body.get("itemId", "")
    step_key: str = body.get("stepKey", "")
    result: str = body.get("result", "")
    reason: str | None = body.get("reason")

    if not item_id or not step_key or result not in ("approved", "rejected", "duplicate"):
        raise HTTPException(400, detail={"error": {"code": "BAD_REQUEST"}})

    async def handler(conn: asyncpg.Connection) -> None:
        await _mark_latest_submission_result(conn, item_id, step_key, result, reason)

    await with_caller_tx(c, handler)
    return {"ok": True}


# ── 跨批次"待采集"列表 ─────────────────────────────────────────────────────────

@router.get("/api/work/collect-tasks")
async def work_collect_tasks(request: Request) -> dict:
    c = _caller(request)
    user_id = request.query_params.get("userId")
    batch_id_filter = request.query_params.get("batchId")

    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "MISSING_USER"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        if batch_id_filter:
            rows = await conn.fetch(
                """WITH first_steps AS (
                     SELECT b.id AS batch_id, b.name AS batch_name, b.task_id,
                            p.name AS pipeline_name,
                            (COALESCE(pv.steps, p.steps)->0->>'key') AS first_step_key
                       FROM batches b
                       JOIN pipelines p ON p.task_id = b.task_id
                       LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
                      WHERE b.id = $1::uuid
                        AND b.status = 'active'
                        AND p.status = 'active'
                   )
                   SELECT i.id, i.task_id, i.envelope, i.current_step,
                          o.run_id, fs.batch_id, fs.batch_name, fs.pipeline_name,
                          (
                            SELECT s.result FROM submissions s
                             WHERE s.item_id = i.id AND s.step_key = fs.first_step_key
                               AND s.user_id = $2 AND s.status = 'submitted'
                               AND s.result IS NOT NULL
                             ORDER BY s.result_at DESC NULLS LAST LIMIT 1
                          ) AS my_last_result
                     FROM first_steps fs
                     JOIN batch_items bi ON bi.batch_id = fs.batch_id
                     JOIN items i  ON i.id  = bi.item_id AND i.current_step = fs.first_step_key
                     JOIN outbox o ON o.item_id = i.id AND o.status = 'pending'
                                  AND o.step_key = fs.first_step_key
                    WHERE NOT EXISTS (
                      SELECT 1 FROM submissions s
                       WHERE s.item_id = i.id AND s.step_key = fs.first_step_key
                         AND s.user_id = $2 AND s.status = 'claimed'
                    )
                    ORDER BY i.created_at ASC
                    LIMIT 200""",
                batch_id_filter, user_id,
            )
        else:
            rows = await conn.fetch(
                """WITH first_steps AS (
                     SELECT b.id AS batch_id, b.name AS batch_name, b.task_id,
                            p.name AS pipeline_name,
                            (COALESCE(pv.steps, p.steps)->0->>'key') AS first_step_key
                       FROM batches b
                       JOIN pipelines p ON p.task_id = b.task_id
                       LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
                      WHERE b.status = 'active'
                        AND p.status = 'active'
                   )
                   SELECT i.id, i.task_id, i.envelope, i.current_step,
                          o.run_id, fs.batch_id, fs.batch_name, fs.pipeline_name,
                          (
                            SELECT s.result FROM submissions s
                             WHERE s.item_id = i.id AND s.step_key = fs.first_step_key
                               AND s.user_id = $1 AND s.status = 'submitted'
                               AND s.result IS NOT NULL
                             ORDER BY s.result_at DESC NULLS LAST LIMIT 1
                          ) AS my_last_result
                     FROM first_steps fs
                     JOIN batch_items bi ON bi.batch_id = fs.batch_id
                     JOIN items i  ON i.id  = bi.item_id AND i.current_step = fs.first_step_key
                     JOIN outbox o ON o.item_id = i.id AND o.status = 'pending'
                                  AND o.step_key = fs.first_step_key
                    WHERE NOT EXISTS (
                      SELECT 1 FROM submissions s
                       WHERE s.item_id = i.id AND s.step_key = fs.first_step_key
                         AND s.user_id = $1 AND s.status = 'claimed'
                    )
                    ORDER BY i.created_at ASC
                    LIMIT 200""",
                user_id,
            )

        if not rows:
            return {"items": []}

        item_ids = [str(r["id"]) for r in rows]

        # disallowed steps post-filter
        pv_rows = await conn.fetch(
            """SELECT i.id AS item_id, pv.steps
                 FROM items i
                 JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
                WHERE i.id = ANY($1::uuid[])""",
            item_ids,
        )
        item_steps: dict[str, list] = {str(r["item_id"]): (r["steps"] or []) for r in pv_rows}

        my_ops_rows = await conn.fetch(
            """SELECT DISTINCT item_id, step_key FROM submissions
                WHERE item_id = ANY($1::uuid[])
                  AND user_id = $2 AND status = 'submitted'""",
            item_ids, user_id,
        )
        ops_by_item: dict[str, set] = {}
        for r in my_ops_rows:
            key = str(r["item_id"])
            ops_by_item.setdefault(key, set()).add(r["step_key"])

        filtered = []
        for r in rows:
            rid = str(r["id"])
            steps = item_steps.get(rid, [])
            cur_step = next((s for s in steps if s.get("key") == r["current_step"]), None)
            disallowed = expand_disallowed_steps(cur_step)
            if disallowed:
                mine = ops_by_item.get(rid, set())
                if any(sk in mine for sk in disallowed):
                    continue
            filtered.append(dict(r))

        return {"items": filtered}

    return await with_caller_tx(c, handler)


# ── 跨批次"我的标注记录" ──────────────────────────────────────────────────────────

@router.get("/api/work/my-submissions")
async def work_my_submissions(request: Request) -> dict:
    c = _caller(request)
    user_id = request.query_params.get("userId")

    if not user_id:
        raise HTTPException(400, detail={"error": {"code": "MISSING_USER"}})

    async def handler(conn: asyncpg.Connection) -> dict:
        # self-heal: claimed but item already stuck/done
        await conn.execute(
            """UPDATE submissions s
                  SET status        = 'returned',
                      result_reason = COALESCE(s.result_reason, '系统超时未在租约内提交'),
                      updated_at    = NOW()
                WHERE s.user_id = $1
                  AND s.status  = 'claimed'
                  AND EXISTS (
                    SELECT 1 FROM items i
                     WHERE i.id = s.item_id
                       AND i.current_step IN ('stuck', 'done')
                  )""",
            user_id,
        )
        rows = await conn.fetch(
            """SELECT
                 s.id, s.batch_id, s.item_id, s.step_key, s.user_id,
                 s.status, s.result, s.result_reason,
                 s.created_at, s.updated_at, s.result_at,
                 i.current_step, i.task_id,
                 p.name AS pipeline_name,
                 b.name AS batch_name,
                 (SELECT created_at FROM dataset_records dr WHERE dr.item_id = s.item_id LIMIT 1)
                   AS dataset_at
               FROM submissions s
               JOIN items i     ON i.id = s.item_id
               JOIN batches b   ON b.id = s.batch_id
               JOIN pipelines p ON p.task_id = b.task_id
              WHERE s.user_id = $1
              ORDER BY s.updated_at DESC
              LIMIT 200""",
            user_id,
        )
        return {"submissions": _rows(rows)}

    return await with_caller_tx(c, handler)


# ── 成绩单: 用户在某批次内所有提交事件 + 结果 ──────────────────────────────────────

@router.get("/api/batches/{batch_id}/submissions")
async def batch_submissions(batch_id: str, request: Request) -> dict:
    c = _caller(request)
    user_id = request.query_params.get("userId")

    async def handler(conn: asyncpg.Connection) -> dict:
        if user_id:
            rows = await conn.fetch(
                """SELECT s.*, i.current_step
                     FROM submissions s JOIN items i ON i.id = s.item_id
                    WHERE s.batch_id = $1::uuid AND s.user_id = $2
                    ORDER BY s.created_at DESC""",
                batch_id, user_id,
            )
        else:
            rows = await conn.fetch(
                """SELECT s.*, i.current_step
                     FROM submissions s JOIN items i ON i.id = s.item_id
                    WHERE s.batch_id = $1::uuid
                    ORDER BY s.created_at DESC""",
                batch_id,
            )
        return {"submissions": _rows(rows)}

    return await with_caller_tx(c, handler)
