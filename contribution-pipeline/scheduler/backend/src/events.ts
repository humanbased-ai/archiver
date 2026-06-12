/**
 * M9: 业务事件流 (最小版)
 *
 * emit(req, kind, ...): 跟 audit 行为一致 — 异步写 events 表, 不阻塞响应, 失败仅 warn.
 *
 * 暴露 GET /api/v1/events?since=<id>&kind=<filter>&limit=<n> 给外部业务系统轮询.
 *   - id 单调递增, since 是上次已消费的最大 id, 客户端记住并下次传入
 *   - tenant 由 RLS 隔离, 不能跨租户拉
 *
 * 后续扩展 webhook 投递层时, 把 emit 升级到 transactional outbox (主 tx 同提交) +
 * 后台 worker SKIP LOCKED 投递. 当前最小版选异步独立写, 跟 audit 同等可靠性.
 */

import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { asSystem, withCallerTx } from "./db.ts";
import { DEFAULT_TENANT_ID } from "./auth.ts";

export interface EmitOpts {
  resourceKind?: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
}

/**
 * 异步写一行 events. tenant 来自 caller, 缺省落 DEFAULT_TENANT_ID.
 * 失败仅 warn (失败可能丢事件, 但不阻塞响应; 后续 webhook 升级到 transactional outbox 后修).
 */
export function emit(
  req: FastifyRequest,
  kind: string,
  opts: EmitOpts = {},
): void {
  const tenantId = req.caller?.tenantId ?? DEFAULT_TENANT_ID;
  asSystem(async (tx) => {
    await tx`
      INSERT INTO events (tenant_id, kind, resource_kind, resource_id, payload)
      VALUES (
        ${tenantId},
        ${kind},
        ${opts.resourceKind ?? null},
        ${opts.resourceId ?? null},
        ${tx.json(opts.payload ?? {})}
      )
    `;
  }).catch((e) => req.log.warn({ err: e, kind }, "emit event failed"));
}

const QSchema = z.object({
  since: z.string().optional(),
  kind: z.string().optional(),
  limit: z.string().optional(),
  resource_kind: z.string().optional(),
  resource_id: z.string().optional(),
});

export function registerEventsRoutes(app: FastifyInstance) {
  app.get("/api/v1/events", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const q = QSchema.parse(req.query ?? {});
      const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? "200", 10) || 200));
      const sinceStr = q.since && /^\d+$/.test(q.since) ? q.since : "0";

      const rows = await tx`
        SELECT id::text AS id, tenant_id, kind, resource_kind, resource_id, payload, created_at
        FROM events
        WHERE id > ${sinceStr}::bigint
          ${q.kind          ? tx`AND kind = ${q.kind}`                   : tx``}
          ${q.resource_kind ? tx`AND resource_kind = ${q.resource_kind}` : tx``}
          ${q.resource_id   ? tx`AND resource_id   = ${q.resource_id}`   : tx``}
        ORDER BY id ASC
        LIMIT ${limit}
      `;
      const lastId = rows.length > 0 ? (rows as any[])[rows.length - 1].id : sinceStr;
      return { events: rows, lastId };
    }),
  );
}
