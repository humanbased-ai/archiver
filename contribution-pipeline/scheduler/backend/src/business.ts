/**
 * 业务层路由 (Business Layer)
 *
 * 职责:
 *   - 批次管理 (batches / batch_items)
 *   - 用户认领记录 (submissions)
 *   - 容量 & 配额校验
 *   - 拒绝/去重 loopback 后重置认领资格
 *
 * 不做的事:
 *   - 调度核心逻辑 (lease / result / reconciler) — 通过内部 HTTP 调用 sched 层
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withCallerTx } from "./db.ts";
import { API_KEY_HEADER, TENANT_ID_HEADER, getInternalKey } from "./auth.ts";
import { audit } from "./audit.ts";
import { emit } from "./events.ts";
import { expandDisallowedSteps } from "./step-rules.ts";
import type { ItemRow, OutboxRow, Pipeline } from "./types.ts";

// 调度核心调用 — 透明适配两种部署:
//   - 同进程 (默认): 用 fastify.inject 跳过 TCP/HTTP, 零网络开销
//                    带本进程 INTERNAL_KEY + X-Tenant-Id 转发用户租户
//   - 拆服务: 设 SCHEDULER_BASE_URL=http://scheduler:4000, 走真 HTTP
//             并要 SCHEDULER_API_KEY (scope=system) 才能用 X-Tenant-Id 切换上下文
let appRef: FastifyInstance | null = null;
const REMOTE_SCHED = process.env.SCHEDULER_BASE_URL?.replace(/\/$/, "");
const REMOTE_KEY = process.env.SCHEDULER_API_KEY ?? "";

/**
 * 业务层 → 调度核心调用. tenantId 必填:
 *   - 转发某用户的写操作时, 必须携带其所属租户;
 *   - 调度核心收到 X-Tenant-Id 后, RLS 行级隔离生效, 防止 runId 跨租户被滥用。
 */
async function schedPost<T = any>(path: string, body: unknown, tenantId: string): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    [API_KEY_HEADER]: REMOTE_SCHED ? REMOTE_KEY : getInternalKey(),
    [TENANT_ID_HEADER]: tenantId,
  };
  if (REMOTE_SCHED) {
    const r = await fetch(`${REMOTE_SCHED}/api/v1${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    let data: any = null;
    try { data = await r.json(); } catch { data = null; }
    if (!r.ok) {
      throw Object.assign(new Error(data?.error?.message ?? `SCHED_ERROR(${r.status})`), {
        code: data?.error?.code,
      });
    }
    return data as T;
  }
  if (!appRef) throw new Error("business layer not registered (appRef missing) and no SCHEDULER_BASE_URL set");
  const r = await appRef.inject({
    method: "POST",
    url: `/api/v1${path}`,
    payload: body,
    headers,
  });
  let data: any = null;
  try { data = r.payload ? JSON.parse(r.payload) : null; } catch { data = r.payload; }
  if (r.statusCode >= 400) {
    throw Object.assign(new Error(data?.error?.message ?? `SCHED_ERROR(${r.statusCode})`), {
      code: data?.error?.code,
    });
  }
  return data as T;
}

// ─────────────────────────────────────────────
// 辅助:统计批次进度 (在调用方 tx 内, 共享租户上下文)
// ─────────────────────────────────────────────
async function batchProgress(tx: any, batchId: string) {
  const [row] = await tx<{ target: number; task_id: string }[]>`
    SELECT target, task_id FROM batches WHERE id = ${batchId}
  `;
  if (!row) return null;

  const counts = await tx<{ step: string; n: number }[]>`
    SELECT i.current_step AS step, COUNT(*)::int AS n
    FROM batch_items bi
    JOIN items i ON i.id = bi.item_id
    WHERE bi.batch_id = ${batchId}
    GROUP BY i.current_step
  `;
  let approved = 0;
  let stuck = 0;
  const stepCounts: { step: string; n: number }[] = [];
  for (const c of counts) {
    if (c.step === "done") approved = c.n;
    else if (c.step === "stuck") stuck = c.n;
    else stepCounts.push(c);
  }
  return { target: row.target, approved, stuck, stepCounts };
}

// ─────────────────────────────────────────────
// 辅助:把"最近一次该 item 在 stepKey 的 submitted submission"标记为某个 result
// ─────────────────────────────────────────────
async function markLatestSubmissionResult(
  tx: any,
  itemId: string,
  stepKey: string,
  result: "approved" | "rejected" | "duplicate",
  reason?: string,
) {
  await tx`
    UPDATE submissions
       SET result        = ${result},
           result_reason = ${reason ?? null},
           result_at     = NOW(),
           updated_at    = NOW()
     WHERE id = (
       SELECT id FROM submissions
        WHERE item_id = ${itemId} AND step_key = ${stepKey}
          AND status = 'submitted' AND result IS NULL
        ORDER BY updated_at DESC
        LIMIT 1
     )
  `;
}

// ─────────────────────────────────────────────
export function registerBusinessRoutes(app: FastifyInstance) {
  appRef = app;

  // ── 创建批次 ──────────────────────────────────
  app.post<{ Body: { pipelineId: string; name: string; target?: number } }>(
    "/api/batches",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({
          pipelineId: z.string().uuid(),
          name: z.string().min(1),
          target: z.number().int().min(1).max(100).default(5),
        }).parse(req.body);

        const pipes = await tx<{
          tenant_id: string;
          current_version_id: string | null;
        }[]>`
          SELECT tenant_id, current_version_id FROM pipelines WHERE task_id = ${body.pipelineId}
        `;
        if (pipes.length === 0 || !pipes[0].current_version_id)
          return reply.code(404).send({ error: { code: "PIPELINE_NOT_FOUND" } });

        const { tenant_id: pipeTenant, current_version_id: pvId } = pipes[0];
        const [pv] = await tx<{ steps: Pipeline }[]>`
          SELECT steps FROM pipeline_versions WHERE id = ${pvId}
        `;
        const firstStep = pv?.steps?.[0];
        if (!firstStep) return reply.code(400).send({ error: { code: "EMPTY_PIPELINE" } });

        const [b] = await tx<{ id: string }[]>`
          INSERT INTO batches (tenant_id, task_id, pipeline_version_id, name, target)
          VALUES (${pipeTenant}, ${body.pipelineId}, ${pvId}, ${body.name}, ${body.target})
          RETURNING id
        `;
        const batchId = b.id;

        for (let i = 0; i < body.target; i++) {
          const [it] = await tx<{ id: string }[]>`
            INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope)
            VALUES (${pipeTenant}, ${body.pipelineId}, ${pvId}, ${firstStep.key},
                    ${tx.json({ payload: {}, outputs: {}, tags: {} })})
            RETURNING id
          `;
          await tx`
            INSERT INTO batch_items (tenant_id, batch_id, item_id)
            VALUES (${pipeTenant}, ${batchId}, ${it.id})
          `;
          await tx`
            INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
            VALUES (${pipeTenant}, ${it.id}, ${body.pipelineId}, ${firstStep.key},
                    ${firstStep.nodeKey}, 'pending', 1)
          `;
        }

        const result = { batchId, target: body.target, firstStep: firstStep.key };
        audit(req, "batch.create", { kind: "batch", id: batchId },
              null, { name: body.name, target: body.target, pipelineId: body.pipelineId });
        emit(req, "batch.created", {
          resourceKind: "batch", resourceId: batchId,
          payload: { name: body.name, target: body.target, pipelineId: body.pipelineId },
        });
        return result;
      }),
  );

  // ── 批次列表 ──────────────────────────────────
  app.get("/api/batches", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx`
        SELECT b.id, b.name, b.target, b.task_id, b.status,
               p.name AS pipeline_name, p.status AS pipeline_status,
               b.created_at
        FROM batches b
        JOIN pipelines p ON p.task_id = b.task_id
        ${req.caller!.isSystemActor
          ? tx``
          : tx`WHERE b.tenant_id = ${req.caller!.tenantId}`}
        ORDER BY b.created_at DESC LIMIT 50
      `;
      return { batches: rows };
    }),
  );

  // ── 批次暂停 / 恢复 (软停: 仅挡新认领, 在飞 item 继续) ──
  app.post<{ Params: { batchId: string } }>("/api/batches/:batchId/pause", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx<{ status: string }[]>`
        UPDATE batches SET status = 'paused', updated_at = NOW()
        WHERE id = ${req.params.batchId} AND status = 'active'
        RETURNING status
      `;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND_OR_NOT_ACTIVE" } });
      audit(req, "batch.pause", { kind: "batch", id: req.params.batchId },
            { status: "active" }, { status: "paused" });
      emit(req, "batch.paused", { resourceKind: "batch", resourceId: req.params.batchId });
      return { ok: true, status: rows[0].status };
    }),
  );
  app.post<{ Params: { batchId: string } }>("/api/batches/:batchId/resume", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx<{ status: string }[]>`
        UPDATE batches SET status = 'active', updated_at = NOW()
        WHERE id = ${req.params.batchId} AND status = 'paused'
        RETURNING status
      `;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND_OR_NOT_PAUSED" } });
      audit(req, "batch.resume", { kind: "batch", id: req.params.batchId },
            { status: "paused" }, { status: "active" });
      emit(req, "batch.resumed", { resourceKind: "batch", resourceId: req.params.batchId });
      return { ok: true, status: rows[0].status };
    }),
  );

  // ── 批次提前关闭 (M1) ─────────────────────────
  // 不可逆终态. active / paused → archived; 已 archived → 409.
  // 副作用:
  //   1. batches.status='archived'
  //   2. items.current_step='cancelled' (除 done/stuck 已终态)
  //   3. outbox.status='failed' (含 leased — 否则 reconciler 在 lease 过期后会把 cancelled item
  //      推到 stuck 或为 archived batch 生成 retry pending run, 破坏 close 的终态语义.
  //      worker 后续 POST /result 见 status='failed' 会被 result-core 返 applied=false 不推进.)
  //   4. submissions.status='returned' (claimed → 释放占位; 防 user 配额永久卡住)
  app.post<{ Params: { batchId: string }; Body: { reason: string; operatorId?: string } }>(
    "/api/batches/:batchId/close",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({
          reason: z.string().trim().min(1),
          operatorId: z.string().trim().optional(),
        }).parse(req.body);
        const { batchId } = req.params;

        const [cur] = await tx<{ status: string }[]>`
          SELECT status FROM batches WHERE id = ${batchId}
        `;
        if (!cur) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        if (cur.status === "archived") {
          return reply.code(409).send({ error: { code: "BATCH_ALREADY_CLOSED", message: "批次已关闭" } });
        }

        await tx`
          UPDATE batches SET status = 'archived', updated_at = NOW()
          WHERE id = ${batchId}
        `;
        const cancelledItems = await tx<{ id: string }[]>`
          UPDATE items SET current_step = 'cancelled', updated_at = NOW()
          WHERE id IN (SELECT item_id FROM batch_items WHERE batch_id = ${batchId})
            AND current_step NOT IN ('done', 'stuck', 'cancelled')
          RETURNING id
        `;
        // 同时 fail pending 和 leased: leased 行不处理会被 reconciler 在 lease 过期后复活,
        // 把已 cancelled 的 item 改 stuck 或生成新的 retry pending run. 破坏 close 的终态语义.
        const cancelledOutbox = await tx<{ run_id: string }[]>`
          UPDATE outbox SET status = 'failed', updated_at = NOW()
          WHERE item_id IN (SELECT item_id FROM batch_items WHERE batch_id = ${batchId})
            AND status IN ('pending', 'leased')
          RETURNING run_id
        `;
        const releasedSubs = await tx<{ id: string }[]>`
          UPDATE submissions SET status = 'returned', updated_at = NOW()
          WHERE batch_id = ${batchId} AND status = 'claimed'
          RETURNING id
        `;

        audit(req, "batch.close", { kind: "batch", id: batchId },
              { status: cur.status },
              {
                status: "archived",
                reason: body.reason,
                operatorId: body.operatorId ?? req.caller?.name,
                cancelledItems: cancelledItems.length,
                cancelledOutbox: cancelledOutbox.length,
                releasedSubmissions: releasedSubs.length,
              });
        emit(req, "batch.closed", {
          resourceKind: "batch", resourceId: batchId,
          payload: {
            reason: body.reason,
            cancelledItems: cancelledItems.length,
            cancelledOutbox: cancelledOutbox.length,
            releasedSubmissions: releasedSubs.length,
          },
        });
        return {
          ok: true,
          status: "archived" as const,
          cancelledItems: cancelledItems.length,
          cancelledOutbox: cancelledOutbox.length,
          releasedSubmissions: releasedSubs.length,
        };
      }),
  );

  // ── 用户侧请求重放 stuck item (M8) ─────────────
  // 仅 stuck item 接受. 同 item 同时仅一条 pending request (uniq idx 兜底, ON CONFLICT 幂等).
  // admin 走 /api/v1/admin/items/:id/replay 完成时, request 自动 resolved.
  app.post<{ Params: { itemId: string }; Body: { userId: string; reason?: string } }>(
    "/api/items/:itemId/replay-request",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({
          userId: z.string().min(1),
          reason: z.string().trim().optional(),
        }).parse(req.body);
        const { itemId } = req.params;

        const [item] = await tx<{ current_step: string; tenant_id: string }[]>`
          SELECT current_step, tenant_id FROM items WHERE id = ${itemId}
        `;
        if (!item) return reply.code(404).send({ error: { code: "ITEM_NOT_FOUND" } });
        if (item.current_step !== "stuck") {
          return reply.code(409).send({
            error: { code: "ITEM_NOT_STUCK", message: "仅 stuck 状态可申请重放" },
          });
        }

        // 幂等: 同 item 已有 pending 直接返其 id; 否则 INSERT.
        const [existing] = await tx<{ id: string }[]>`
          SELECT id FROM replay_requests
          WHERE item_id = ${itemId} AND status = 'pending'
          LIMIT 1
        `;
        if (existing) {
          return { ok: true, requestId: existing.id, replayed: true };
        }
        const [created] = await tx<{ id: string }[]>`
          INSERT INTO replay_requests (tenant_id, item_id, requester, reason)
          VALUES (${item.tenant_id}, ${itemId}, ${body.userId}, ${body.reason ?? null})
          RETURNING id
        `;
        audit(req, "item.replay-request.create", { kind: "item", id: itemId },
              null, { requester: body.userId, reason: body.reason });
        return { ok: true, requestId: created.id, replayed: false };
      }),
  );

  // ── 批次详情 + 进度 ───────────────────────────
  app.get<{ Params: { batchId: string } }>("/api/batches/:batchId", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      // M2: pipeline_steps 走 pinned (batches.pipeline_version_id), 落老 batch 看到
      // 创建时的 schema 而不是 current — 与 list/claim/decide 对齐.
      const [batch] = await tx`
        SELECT b.*, p.name AS pipeline_name,
               COALESCE(pv.steps, p.steps) AS pipeline_steps,
               p.status AS pipeline_status
        FROM batches b
        JOIN pipelines p ON p.task_id = b.task_id
        LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
        WHERE b.id = ${req.params.batchId}
      `;
      if (!batch) return reply.code(404).send({ error: { code: "NOT_FOUND" } });

      const progress = await batchProgress(tx, req.params.batchId);
      return { ...batch, ...progress };
    }),
  );

  // ── 可领取任务列表 ────────────────────────────
  app.get<{ Querystring: { batchId: string; userId: string } }>(
    "/api/collect/tasks",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const { batchId, userId } = req.query;
        if (!batchId || !userId) return reply.code(400).send({ error: { code: "MISSING_PARAMS" } });

        const progress = await batchProgress(tx, batchId);
        if (!progress) return reply.code(404).send({ error: { code: "BATCH_NOT_FOUND" } });

        // M2: 走 batches.pipeline_version_id pinned, 与 claim/decide 对齐
        const [batch] = await tx<{ task_id: string; steps: Pipeline }[]>`
          SELECT b.task_id, COALESCE(pv.steps, p.steps) AS steps
          FROM batches b
          JOIN pipelines p ON p.task_id = b.task_id
          LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
          WHERE b.id = ${batchId}
        `;
        const firstStepKey = (batch.steps as any)[0]?.key ?? "ingest";
        const ingestParams = ((batch.steps as any)[0]?.params ?? {}) as Record<string, unknown>;

        const [{ active }] = await tx<{ active: number }[]>`
          SELECT COUNT(*)::int AS active FROM submissions
          WHERE batch_id = ${batchId} AND user_id = ${userId} AND status = 'claimed'
        `;
        const maxConcurrent = (ingestParams.max_concurrent_per_user as number) ?? 99;
        const maxTotal = (ingestParams.max_total_per_user as number) ?? 99;

        const [{ total_submitted }] = await tx<{ total_submitted: number }[]>`
          SELECT COUNT(*)::int AS total_submitted FROM submissions
          WHERE batch_id = ${batchId} AND user_id = ${userId} AND status = 'submitted'
        `;

        const canClaim =
          progress.approved < progress.target &&
          active < maxConcurrent &&
          total_submitted < maxTotal;

        const items = await tx<(ItemRow & { run_id: string })[]>`
          SELECT i.*, o.run_id
          FROM batch_items bi
          JOIN items i ON i.id = bi.item_id
          JOIN outbox o ON o.item_id = i.id AND o.status = 'pending' AND o.step_key = ${firstStepKey}
          WHERE bi.batch_id = ${batchId}
            AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.item_id = i.id AND s.step_key = ${firstStepKey}
                AND s.user_id = ${userId} AND s.status = 'claimed'
            )
          ORDER BY i.created_at ASC
        `;

        return {
          items,
          canClaim,
          quota: { approved: progress.approved, target: progress.target },
          userCapacity: { active, maxConcurrent, total_submitted, maxTotal },
        };
      }),
  );

  // ── 认领采集任务 ──────────────────────────────
  app.post<{ Params: { itemId: string }; Body: { userId: string; batchId: string } }>(
    "/api/collect/:itemId/claim",
    async (req, reply) => {
      const body = z.object({ userId: z.string(), batchId: z.string().uuid() }).parse(req.body);
      const { itemId } = req.params;

      // Pre-check (本地事务) + 调度调用 (跨服务 / inject) + INSERT submission (本地事务)
      // 拆为两段是为了避免在 caller tx 里发起 schedPost (内部又开 tx, 同连接嵌套问题)
      const tenantId = req.caller!.tenantId;
      const pre = await withCallerTx(req.caller, async (tx) => {
        // 防御: stuck / done 的 item 不允许再 claim. 不进容量校验, 错文案要清楚:
        // 历史 bug 是 stuck item + stale claimed submission 占用 user 的 active 配额,
        // 用户点"继续"重新 claim 被 TOO_MANY_ACTIVE 拒, 看到的错文案误导.
        const [item] = await tx<{ current_step: string }[]>`
          SELECT current_step FROM items WHERE id = ${itemId}
        `;
        if (!item) return { error: { http: 404, code: "ITEM_NOT_FOUND" } as const };
        if (item.current_step === "stuck" || item.current_step === "done") {
          return { error: { http: 409, code: "ITEM_INACTIVE",
            message: item.current_step === "stuck"
              ? "该任务已卡住, 无法继续 (请管理员介入或选其它任务)"
              : "该任务已结束, 无法再领取" } as const };
        }

        // M2: claim 走 pinned pipeline_version, 与 list/decide 对齐
        const [batch] = await tx<{
          task_id: string; target: number; steps: Pipeline; b_status: string; p_status: string;
        }[]>`
          SELECT b.target, b.task_id, COALESCE(pv.steps, p.steps) AS steps,
                 b.status AS b_status, p.status AS p_status
          FROM batches b
          JOIN pipelines p ON p.task_id = b.task_id
          LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
          WHERE b.id = ${body.batchId}
        `;
        if (!batch) return { error: { http: 404, code: "BATCH_NOT_FOUND" } as const };
        if (batch.p_status !== "active") {
          return { error: { http: 409, code: "PIPELINE_PAUSED", message: "项目已暂停, 不能领取新任务" } as const };
        }
        if (batch.b_status === "archived") {
          return { error: { http: 409, code: "BATCH_CLOSED", message: "批次已关闭, 不能再领取" } as const };
        }
        if (batch.b_status !== "active") {
          return { error: { http: 409, code: "BATCH_PAUSED", message: "批次已暂停, 不能领取新任务" } as const };
        }
        const firstStep = (batch.steps as any)[0];
        const ingestParams = (firstStep?.params ?? {}) as Record<string, unknown>;
        const maxConcurrent = (ingestParams.max_concurrent_per_user as number) ?? 99;
        const maxTotal = (ingestParams.max_total_per_user as number) ?? 99;

        // 自己已经认领过 → 幂等返 ALREADY_CLAIMING (前端会接管让用户进表单).
        // 必须放在所有配额校验之前: 用户在"我的记录"看到"我正在做"点继续,
        // 即便他已达 maxTotal/maxConcurrent, 也应放他进编辑页继续做完;
        // 否则 UX 矛盾 (列表说"正在做" + 进页返"配额满").
        // 不放到 INSERT 冲突段判, 因为 outbox run 当下是 'leased' 而非 'pending',
        // 走不到 INSERT, 会被下面 NO_PENDING_RUN 卡死.
        const [mine] = await tx<{ run_id: string }[]>`
          SELECT run_id FROM submissions
           WHERE item_id = ${itemId} AND step_key = ${firstStep.key}
             AND user_id = ${body.userId} AND status = 'claimed'
           LIMIT 1
        `;
        if (mine) {
          return { error: { http: 409, code: "ALREADY_CLAIMING",
            message: "你正在做这个任务, 请先提交或放弃" } as const };
        }

        const progress = await batchProgress(tx, body.batchId);
        if (!progress) return { error: { http: 404, code: "BATCH_NOT_FOUND" } as const };
        if (progress.approved >= progress.target)
          return { error: { http: 409, code: "QUOTA_FULL", message: "批次已达到目标数量" } as const };

        const [{ active }] = await tx<{ active: number }[]>`
          SELECT COUNT(*)::int AS active FROM submissions
          WHERE batch_id = ${body.batchId} AND user_id = ${body.userId} AND status = 'claimed'
        `;
        if (active >= maxConcurrent)
          return { error: { http: 409, code: "TOO_MANY_ACTIVE", message: `同时最多认领 ${maxConcurrent} 个任务` } as const };

        const [{ total_submitted }] = await tx<{ total_submitted: number }[]>`
          SELECT COUNT(*)::int AS total_submitted FROM submissions
          WHERE batch_id = ${body.batchId} AND user_id = ${body.userId} AND status = 'submitted'
        `;
        if (total_submitted >= maxTotal)
          return { error: { http: 409, code: "USER_QUOTA_FULL", message: `本批次最多提交 ${maxTotal} 个任务` } as const };

        // 步骤间互斥: 若本步骤配了 disallowedFromSteps, 检查 user 在那些 step 上做过没有.
        const disallowedSteps = expandDisallowedSteps(firstStep);
        if (disallowedSteps.length > 0) {
          const [hit] = await tx<{ step_key: string }[]>`
            SELECT step_key FROM submissions
             WHERE item_id  = ${itemId}
               AND user_id  = ${body.userId}
               AND step_key IN ${tx(disallowedSteps)}
               AND status   = 'submitted'
             LIMIT 1
          `;
          if (hit) {
            return { error: { http: 403, code: "STEP_OPERATOR_CONFLICT",
              message: `本项目规则要求分人, 你已在步骤"${hit.step_key}"上操作过该 item`,
            } as const };
          }
        }

        const [run] = await tx<OutboxRow[]>`
          SELECT * FROM outbox
          WHERE item_id = ${itemId} AND step_key = ${firstStep.key} AND status = 'pending'
        `;
        if (!run) return { error: { http: 409, code: "NO_PENDING_RUN", message: "任务不在待领取状态" } as const };

        return { ok: { firstStep, run, tenant: run.tenant_id } as const };
      });
      if (pre.error) {
        // 配额拒绝是合规审计高频项 (谁试图突破限额)
        audit(req, "quota.denied", { kind: "item", id: itemId },
              null, { reason: pre.error.code, batchId: body.batchId, userId: body.userId });
        return reply.code(pre.error.http).send({ error: pre.error });
      }
      const { firstStep, run, tenant } = pre.ok!;

      // sched 精准认领 (X-Tenant-Id 转发用户租户; 调度核心 RLS 校验 runId 归属)
      try {
        await schedPost(`/queue/run/${run.run_id}/claim`, { workerId: body.userId, leaseSeconds: 3600 }, tenantId);
      } catch (e: any) {
        audit(req, "submission.claim.denied", { kind: "item", id: itemId },
              { reason: "already_claimed_by_other", batchId: body.batchId, userId: body.userId });
        return reply.code(409).send({ error: { code: e.code ?? "ALREADY_CLAIMED", message: "任务已被他人领取" } });
      }

      // 第二段事务: 写 submission; 撞唯一索引 → 释放 lease 回滚
      const submitted = await withCallerTx(req.caller, async (tx) => {
        try {
          await tx`
            INSERT INTO submissions (tenant_id, batch_id, item_id, step_key, user_id, run_id, status)
            VALUES (${tenant}, ${body.batchId}, ${itemId}, ${firstStep.key}, ${body.userId}, ${run.run_id}, 'claimed')
          `;
          return { ok: true } as const;
        } catch {
          return { conflict: true } as const;
        }
      });
      if ("conflict" in submitted) {
        await schedPost(`/queue/lease/${run.run_id}/release`, { workerId: body.userId }, tenantId).catch(() => {});
        return reply.code(409).send({
          error: { code: "ALREADY_CLAIMING", message: "你正在做这个任务,请先提交或放弃" },
        });
      }

      audit(req, "submission.claim", { kind: "item", id: itemId },
            null, { batchId: body.batchId, userId: body.userId, runId: run.run_id });
      return { ok: true, runId: run.run_id, stepKey: firstStep.key };
    },
  );

  // ── 提交采集任务 ──────────────────────────────
  app.post<{ Params: { itemId: string }; Body: { userId: string; payload: Record<string, unknown> } }>(
    "/api/collect/:itemId/submit",
    async (req, reply) => {
      const body = z.object({
        userId: z.string(),
        payload: z.record(z.unknown()),
      }).parse(req.body);
      const { itemId } = req.params;
      const tenantId = req.caller!.tenantId;

      const lookup = await withCallerTx(req.caller, async (tx) => {
        const [sub] = await tx<{ id: string; run_id: string; batch_id: string; step_key: string }[]>`
          SELECT id, run_id, batch_id, step_key FROM submissions
          WHERE item_id = ${itemId} AND user_id = ${body.userId} AND status = 'claimed'
          LIMIT 1
        `;
        return sub ?? null;
      });
      if (!lookup) return reply.code(409).send({ error: { code: "NOT_CLAIMED", message: "你没有认领此任务" } });

      let schedResp: any;
      try {
        schedResp = await schedPost("/result", {
          runId: lookup.run_id,
          status: "success",
          output: body.payload,
        }, tenantId);
      } catch (e: any) {
        return reply.code(409).send({ error: { code: e.code ?? "SCHED_ERROR", message: e.message } });
      }

      await withCallerTx(req.caller, async (tx) => {
        await tx`UPDATE submissions SET status='submitted', updated_at=NOW() WHERE id=${lookup.id}`;
      });

      audit(req, "submission.submit", { kind: "item", id: itemId },
            null, { userId: body.userId, runId: lookup.run_id, nextStep: schedResp.nextStep });
      return { ok: true, nextStep: schedResp.nextStep ?? null, recovered: schedResp.applied === false };
    },
  );

  // ── 放弃认领 ─────────────────────────────────
  app.post<{ Params: { itemId: string }; Body: { userId: string } }>(
    "/api/collect/:itemId/release",
    async (req, reply) => {
      const { userId } = z.object({ userId: z.string() }).parse(req.body);
      const { itemId } = req.params;
      const tenantId = req.caller!.tenantId;

      const lookup = await withCallerTx(req.caller, async (tx) => {
        const [sub] = await tx<{ run_id: string; id: string }[]>`
          SELECT id, run_id FROM submissions
          WHERE item_id = ${itemId} AND user_id = ${userId} AND status = 'claimed'
          LIMIT 1
        `;
        return sub ?? null;
      });
      if (!lookup) return reply.code(404).send({ error: { code: "NOT_FOUND" } });

      try {
        await schedPost(`/queue/lease/${lookup.run_id}/release`, { workerId: userId }, tenantId);
      } catch { /* lease 可能已过期, 忽略 */ }

      await withCallerTx(req.caller, async (tx) => {
        await tx`UPDATE submissions SET status='returned', updated_at=NOW() WHERE id=${lookup.id}`;
      });

      audit(req, "submission.release", { kind: "item", id: itemId },
            null, { userId, runId: lookup.run_id });
      return { ok: true };
    },
  );

  // ── 当前用户在该 item 上的最近提交结果 ─────────
  //    用于 CollectPage 进页面后判断要不要展示"上次撞重 / 上次被打回".
  //    detail 页之前直接读 envelope.outputs (item 全局态), 任何用户都能看到别人的撞重提示;
  //    这里和 /api/work/collect-tasks 的子查询保持完全一致, 保证列表/详情对同一份事实判定.
  app.get<{ Params: { itemId: string }; Querystring: { userId: string } }>(
    "/api/collect/:itemId/state",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const userId = req.query.userId;
        if (!userId) return reply.code(400).send({ error: { code: "MISSING_USER" } });
        const { itemId } = req.params;
        const [row] = await tx<{ result: string | null; result_reason: string | null; result_at: string | null }[]>`
          SELECT result, result_reason, result_at
            FROM submissions
           WHERE item_id = ${itemId}
             AND user_id = ${userId}
             AND status  = 'submitted'
             AND result IS NOT NULL
           ORDER BY result_at DESC NULLS LAST
           LIMIT 1
        `;
        return {
          my_last_result:  row?.result        ?? null,
          my_last_reason:  row?.result_reason ?? null,
          my_last_result_at: row?.result_at   ?? null,
        };
      }),
  );

  // ── 重做: 抹掉当前用户在该 item 上"被退回 / 撞重"的历史 submission, 回到干净状态 ─
  //    业务语义 (来自需求): 用户在卡片上看到"撞重"提示, 想再试一次但不希望前一次记录留着.
  //    只删 status='submitted' AND result IN ('duplicate','rejected') 的行;
  //    status='claimed' 的行是这次进页面 auto-claim 出来的当前活动认领, 千万不能动 ——
  //    动了下次 submit 找不到 claimed 行会直接 NOT_CLAIMED.
  //    不做 release / re-claim: 再领的事进页面时已经做了, 这里多做反而是 race 制造机.
  app.post<{ Params: { itemId: string }; Body: { userId: string } }>(
    "/api/collect/:itemId/redo",
    async (req, reply) => {
      const { userId } = z.object({ userId: z.string() }).parse(req.body);
      const { itemId } = req.params;
      const deleted = await withCallerTx(req.caller, async (tx) => {
        const rows = await tx<{ id: string; result: string | null }[]>`
          DELETE FROM submissions
           WHERE item_id = ${itemId}
             AND user_id = ${userId}
             AND status  = 'submitted'
             AND result IN ('duplicate', 'rejected')
          RETURNING id, result
        `;
        return rows;
      });
      if (deleted.length === 0) {
        return reply.code(404).send({ error: { code: "NO_FAILED_SUBMISSION", message: "没有可重做的失败记录" } });
      }
      audit(req, "submission.redo", { kind: "item", id: itemId },
            null, { userId, removedIds: deleted.map((d) => d.id), removedResults: deleted.map((d) => d.result) });
      return { ok: true, removed: deleted.length };
    },
  );

  // ── 审核决定 ─────────────────────────────────
  app.post<{
    Params: { itemId: string };
    Body: { userId: string; batchId?: string; decision: "approved" | "rejected"; reason?: string };
  }>("/api/review/:itemId/decide", async (req, reply) => {
    const body = z.object({
      userId: z.string(),
      batchId: z.string().uuid().optional(),
      decision: z.enum(["approved", "rejected"]),
      reason: z.string().trim().min(1).optional(),
    }).parse(req.body);
    const { itemId } = req.params;
    const tenantId = req.caller!.tenantId;

    const run = await withCallerTx(req.caller, async (tx) => {
      const [r] = await tx<OutboxRow[]>`
        SELECT * FROM outbox
        WHERE item_id = ${itemId} AND node_key = 'review' AND status = 'leased'
        LIMIT 1
      `;
      return r ?? null;
    });
    if (!run) return reply.code(409).send({ error: { code: "NO_LEASED_RUN", message: "任务未被认领或已完成" } });

    // 所有权校验: review run 的 lease 持有者必须是当前 user. 否则任一 user 都能提交别人 lease
    // 的 review 决策 — /result 只看 runId 不校验所有权, 会直接接受. 用 403 区分于"无 lease".
    if (run.leased_by && run.leased_by !== body.userId) {
      return reply.code(403).send({
        error: {
          code: "NOT_LEASE_OWNER",
          message: "该任务由其他用户认领, 你不能提交决策",
        },
      });
    }

    // 业务规则: review step.params.disallowedFromSteps 列出"本步操作人不能 = 哪些 step
    // 的操作人". disallowSelfReview: true 是兼容糖 (展开为 [reviewedStepKey]).
    // 历史口径: 任一 disallowed step 上有当前 user 的 submission → 拒 (含已结果的, 强口径).
    const conflictStep = await withCallerTx(req.caller, async (tx) => {
      const [item] = await tx<{ pipeline_version_id: string }[]>`
        SELECT pipeline_version_id FROM items WHERE id = ${itemId}
      `;
      if (!item) return null;
      const [pv] = await tx<{ steps: Pipeline }[]>`
        SELECT steps FROM pipeline_versions WHERE id = ${item.pipeline_version_id}
      `;
      const reviewStep = pv?.steps?.find((s) => s.key === run.step_key);
      const disallowed = expandDisallowedSteps(reviewStep);
      if (disallowed.length === 0) return null;
      const [hit] = await tx<{ step_key: string }[]>`
        SELECT step_key FROM submissions
         WHERE item_id  = ${itemId}
           AND user_id  = ${body.userId}
           AND step_key IN ${tx(disallowed)}
           AND status   = 'submitted'
         LIMIT 1
      `;
      return hit?.step_key ?? null;
    });
    if (conflictStep) {
      return reply.code(403).send({
        error: {
          code: "STEP_OPERATOR_CONFLICT",
          message: `本项目规则要求分人, 你已在步骤"${conflictStep}"上操作过该 item, 不能再做 review`,
          conflictStep,
        },
      });
    }

    // M10: review step 配 max_total_per_user 时, 限制 reviewer 在该 batch 累计审过的数量.
    // (review 没 claim 阶段, 故不检查 max_concurrent_per_user.)
    // batchId 缺省时从 batch_items 推断.
    const capacityCheck = await withCallerTx(req.caller, async (tx) => {
      let bid = body.batchId;
      if (!bid) {
        const [bi] = await tx<{ batch_id: string }[]>`
          SELECT batch_id FROM batch_items WHERE item_id = ${itemId} LIMIT 1
        `;
        bid = bi?.batch_id;
      }
      if (!bid) return null;
      const [item] = await tx<{ pipeline_version_id: string }[]>`
        SELECT pipeline_version_id FROM items WHERE id = ${itemId}
      `;
      if (!item) return null;
      const [pv] = await tx<{ steps: Pipeline }[]>`
        SELECT steps FROM pipeline_versions WHERE id = ${item.pipeline_version_id}
      `;
      const reviewStep = pv?.steps?.find((s) => s.key === run.step_key);
      const max = (reviewStep?.params as any)?.max_total_per_user as number | undefined;
      if (!max || max <= 0) return null;
      const [{ done }] = await tx<{ done: number }[]>`
        SELECT COUNT(*)::int AS done FROM submissions
         WHERE batch_id = ${bid} AND user_id = ${body.userId}
           AND step_key = ${run.step_key} AND status = 'submitted'
      `;
      return done >= max ? { max, done } : null;
    });
    if (capacityCheck) {
      audit(req, "quota.denied", { kind: "item", id: itemId },
            null, { reason: "USER_QUOTA_FULL", step: run.step_key, userId: body.userId,
                    max: capacityCheck.max, done: capacityCheck.done });
      return reply.code(409).send({
        error: {
          code: "USER_QUOTA_FULL",
          message: `本批次审核步骤最多审 ${capacityCheck.max} 条 (已审 ${capacityCheck.done})`,
        },
      });
    }

    let schedResp: any;
    try {
      schedResp = await schedPost("/result", {
        runId: run.run_id,
        status: "success",
        output: {
          decision: body.decision,
          ...(body.decision === "rejected" && body.reason ? { reason: body.reason } : {}),
        },
      }, tenantId);
    } catch (e: any) {
      return reply.code(409).send({ error: { code: e.code ?? "SCHED_ERROR", message: e.message } });
    }

    await withCallerTx(req.caller, async (tx) => {
      let batchId = body.batchId;
      if (!batchId) {
        const [bi] = await tx<{ batch_id: string }[]>`
          SELECT batch_id FROM batch_items WHERE item_id = ${itemId} LIMIT 1
        `;
        batchId = bi?.batch_id;
      }
      if (batchId) {
        // M2: review.decide 后段走 pinned pipeline_version
        const [pipe] = await tx<{ steps: Pipeline; tenant_id: string }[]>`
          SELECT COALESCE(pv.steps, p.steps) AS steps, b.tenant_id
          FROM batches b
          JOIN pipelines p ON p.task_id = b.task_id
          LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
          WHERE b.id = ${batchId}
        `;
        const firstStepKey = (pipe?.steps as any)?.[0]?.key ?? "ingest";
        await markLatestSubmissionResult(
          tx, itemId, firstStepKey,
          body.decision === "approved" ? "approved" : "rejected",
          body.decision === "rejected" ? body.reason : undefined,
        );
        // 记录 reviewer 操作行 — 让 step-rules 反查能知道"alice 在 review 步骤做过决定",
        // 撑起反向规则 (e.g. collect 步骤 disallowedFromSteps=['review']).
        // 状态直接 'submitted' + result; review 没有 'claimed' 阶段, 故无需关心 uniq_claimed.
        await tx`
          INSERT INTO submissions
            (tenant_id, batch_id, item_id, step_key, user_id, run_id, status, result, result_reason, result_at)
          VALUES (
            ${pipe!.tenant_id}, ${batchId}, ${itemId}, ${run.step_key}, ${body.userId},
            ${run.run_id}, 'submitted', ${body.decision},
            ${body.decision === "rejected" ? body.reason ?? null : null},
            NOW()
          )
        `;
      }
    });

    audit(req, `review.${body.decision}`, { kind: "item", id: itemId },
          null, { userId: body.userId, reason: body.reason, nextStep: schedResp.nextStep });
    emit(req, "item.reviewed", {
      resourceKind: "item", resourceId: itemId,
      payload: {
        decision: body.decision, reason: body.reason ?? null,
        userId: body.userId, nextStep: schedResp.nextStep ?? null,
      },
    });
    return { ok: true, nextStep: schedResp.nextStep ?? null, recovered: schedResp.applied === false };
  });

  // ── 批次内用户统计 (看板用) ───────────────────
  app.get<{ Params: { batchId: string } }>(
    "/api/batches/:batchId/user-stats",
    async (req) =>
      withCallerTx(req.caller, async (tx) => {
        const rows = await tx`
          SELECT user_id, status, COUNT(*)::int AS n
          FROM submissions
          WHERE batch_id = ${req.params.batchId}
          GROUP BY user_id, status
          ORDER BY user_id, status
        `;
        return { stats: rows };
      }),
  );

  // ── 内部回写: 调度核心 / autoworker 把"item 在某步的判定结果"通知业务层 ──
  app.post<{
    Body: { itemId: string; stepKey: string; result: "approved" | "rejected" | "duplicate"; reason?: string };
  }>("/api/internal/submission-result", async (req, reply) => {
    const body = z.object({
      itemId: z.string().uuid(),
      stepKey: z.string().min(1),
      result: z.enum(["approved", "rejected", "duplicate"]),
      reason: z.string().optional(),
    }).parse(req.body);
    await withCallerTx(req.caller, async (tx) => {
      await markLatestSubmissionResult(tx, body.itemId, body.stepKey, body.result, body.reason);
    });
    return reply.send({ ok: true });
  });

  // ── 跨批次的"待采集"列表: 一条 SQL 扫所有 batch 的 first step pending run.
  //    用于 /work 标注台 "采集"tab "全部" 视图, 取代前端 N+1 轮询.
  app.get<{ Querystring: { userId: string; batchId?: string } }>(
    "/api/work/collect-tasks",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const userId = req.query.userId;
        if (!userId) return reply.code(400).send({ error: { code: "MISSING_USER" } });
        const batchId = req.query.batchId;

        // my_last_result: 当前 userId 在这个 item 上"上一次 submitted submission"的最终结果,
        //                 用于在卡片上显示"我上次撞重 / 我上次被打回"; 别的用户撞重的不该提示给我.
        // M2: first_step_key 走 pinned (batches.pipeline_version_id), 与 list/claim/decide 对齐
        const rows = batchId
          ? await tx`
              WITH first_steps AS (
                SELECT b.id AS batch_id, b.name AS batch_name, b.task_id,
                       p.name AS pipeline_name,
                       (COALESCE(pv.steps, p.steps)->0->>'key') AS first_step_key
                  FROM batches b
                  JOIN pipelines p ON p.task_id = b.task_id
                  LEFT JOIN pipeline_versions pv ON pv.id = b.pipeline_version_id
                 WHERE b.id = ${batchId}
                   AND b.status = 'active'
                   AND p.status = 'active'
              )
              SELECT i.id, i.task_id, i.envelope, i.current_step,
                     o.run_id, fs.batch_id, fs.batch_name, fs.pipeline_name,
                     (
                       SELECT s.result FROM submissions s
                        WHERE s.item_id = i.id AND s.step_key = fs.first_step_key
                          AND s.user_id = ${userId} AND s.status = 'submitted'
                          AND s.result IS NOT NULL
                        ORDER BY s.result_at DESC NULLS LAST LIMIT 1
                     ) AS my_last_result
                FROM first_steps fs
                JOIN batch_items bi ON bi.batch_id = fs.batch_id
                JOIN items i  ON i.id  = bi.item_id AND i.current_step = fs.first_step_key
                JOIN outbox o ON o.item_id = i.id AND o.status = 'pending' AND o.step_key = fs.first_step_key
               WHERE NOT EXISTS (
                 SELECT 1 FROM submissions s
                  WHERE s.item_id = i.id AND s.step_key = fs.first_step_key
                    AND s.user_id = ${userId} AND s.status = 'claimed'
               )
               ORDER BY i.created_at ASC
               LIMIT 200
            `
          : await tx`
              WITH first_steps AS (
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
                          AND s.user_id = ${userId} AND s.status = 'submitted'
                          AND s.result IS NOT NULL
                        ORDER BY s.result_at DESC NULLS LAST LIMIT 1
                     ) AS my_last_result
                FROM first_steps fs
                JOIN batch_items bi ON bi.batch_id = fs.batch_id
                JOIN items i  ON i.id  = bi.item_id AND i.current_step = fs.first_step_key
                JOIN outbox o ON o.item_id = i.id AND o.status = 'pending' AND o.step_key = fs.first_step_key
               WHERE NOT EXISTS (
                 SELECT 1 FROM submissions s
                  WHERE s.item_id = i.id AND s.step_key = fs.first_step_key
                    AND s.user_id = ${userId} AND s.status = 'claimed'
               )
               ORDER BY i.created_at ASC
               LIMIT 200
            `;
        // 步骤互斥过滤: 把"我在该 item 上做过 disallowedFromSteps 列举的步骤"的 item 剔掉.
        // 跟 /review/tasks 那边逻辑对称. 数据源是 items.pipeline_version_id 钉死的版本.
        if (rows.length === 0) return { items: rows };
        const itemIds = (rows as any[]).map((r) => r.id);
        const pvRows = await tx<{ item_id: string; steps: any }[]>`
          SELECT i.id AS item_id, pv.steps
            FROM items i JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
           WHERE i.id IN ${tx(itemIds)}
        `;
        const itemSteps = new Map(pvRows.map((r) => [r.item_id, r.steps]));
        const myOps = await tx<{ item_id: string; step_key: string }[]>`
          SELECT DISTINCT item_id, step_key FROM submissions
           WHERE item_id IN ${tx(itemIds)}
             AND user_id = ${userId}
             AND status  = 'submitted'
        `;
        const opsByItem = new Map<string, Set<string>>();
        for (const r of myOps) {
          const s = opsByItem.get(r.item_id) ?? new Set<string>();
          s.add(r.step_key);
          opsByItem.set(r.item_id, s);
        }
        const filtered = (rows as any[]).filter((r) => {
          const steps = (itemSteps.get(r.id) ?? []) as any[];
          // 找到当前步 (current_step), 看它的 disallowedFromSteps
          const curStep = steps.find((s) => s.key === r.current_step);
          const disallowed = expandDisallowedSteps(curStep);
          if (disallowed.length === 0) return true;
          const mine = opsByItem.get(r.id);
          if (!mine) return true;
          return !disallowed.some((sk) => mine.has(sk));
        });
        return { items: filtered };
      }),
  );

  // ── 跨批次的"我的标注记录": 任意 manual step 上的 submitted submission 聚合视图,
  //    给标注页"我的进行中 / 已完成"用. 计算每个 submission 的最终态:
  //      pending: result IS NULL AND item 仍在流程中 (current_step 不是 done/stuck)
  //      approved/rejected/duplicate: result 直接是 result 列
  //      done:    result IS NULL AND item.current_step='done' (走过且未被打回)
  //      stuck:   item.current_step='stuck'
  app.get<{ Querystring: { userId: string; statusFilter?: "in_progress" | "done" | "all" } }>(
    "/api/work/my-submissions",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const userId = req.query.userId;
        if (!userId) return reply.code(400).send({ error: { code: "MISSING_USER" } });

        // 自愈: 把 status='claimed' 但 item 已经 stuck/done 的 submission 收尾.
        // 触发场景: reconciler 把 outbox 推到 DLQ → item.current_step='stuck',
        // 但业务层 submissions 表没人改, 行还停在 'claimed'. 用户视角"我正在做"
        // 列表会显示陈旧数据 + 点继续触发新一轮 claim 被容量校验拒.
        // 严格分层: reconciler 是 core, 不该写业务表; 业务层在自己的读路径上自愈.
        await tx`
          UPDATE submissions s
             SET status        = 'returned',
                 result_reason = COALESCE(s.result_reason, '系统超时未在租约内提交'),
                 updated_at    = NOW()
           WHERE s.user_id = ${userId}
             AND s.status  = 'claimed'
             AND EXISTS (
               SELECT 1 FROM items i
                WHERE i.id = s.item_id
                  AND i.current_step IN ('stuck', 'done')
             )
        `;

        const rows = await tx`
          SELECT
            s.id,
            s.batch_id,
            s.item_id,
            s.step_key,
            s.user_id,
            s.status,
            s.result,
            s.result_reason,
            s.created_at,
            s.updated_at,
            s.result_at,
            i.current_step,
            i.task_id,
            p.name AS pipeline_name,
            b.name AS batch_name,
            (SELECT created_at FROM dataset_records dr WHERE dr.item_id = s.item_id LIMIT 1)
              AS dataset_at
          FROM submissions s
          JOIN items i     ON i.id = s.item_id
          JOIN batches b   ON b.id = s.batch_id
          JOIN pipelines p ON p.task_id = b.task_id
          WHERE s.user_id = ${userId}
          ORDER BY s.updated_at DESC
          LIMIT 200
        `;
        return { submissions: rows };
      }),
  );

  // ── 成绩单接口: 用户在某批次内所有提交事件 + 结果 ──
  app.get<{ Params: { batchId: string }; Querystring: { userId?: string } }>(
    "/api/batches/:batchId/submissions",
    async (req) =>
      withCallerTx(req.caller, async (tx) => {
        const userId = req.query.userId;
        const rows = userId
          ? await tx`
              SELECT s.*, i.current_step
              FROM submissions s JOIN items i ON i.id = s.item_id
              WHERE s.batch_id = ${req.params.batchId} AND s.user_id = ${userId}
              ORDER BY s.created_at DESC
            `
          : await tx`
              SELECT s.*, i.current_step
              FROM submissions s JOIN items i ON i.id = s.item_id
              WHERE s.batch_id = ${req.params.batchId}
              ORDER BY s.created_at DESC
            `;
        return { submissions: rows };
      }),
  );
}
