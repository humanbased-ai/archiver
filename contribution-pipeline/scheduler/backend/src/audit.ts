/**
 * 审计日志 helper (P0-E)
 *
 * 用法 (mutating handler 完成后调一次):
 *   await audit(req, "pipeline.publish", { kind: "pipeline", id: pipeId },
 *               { steps: oldSteps }, { steps: newSteps });
 *
 * 行为:
 *   - 异步写 audit_log (不阻塞响应)
 *   - 走 asSystem 跳 RLS — audit_log 跨租户共写一份, RLS 仅作读隔离用
 *   - 失败仅 warn, 不影响主流程
 *   - 大字段截断到 4 KiB JSON, 防个别请求把分区撑爆
 *
 * tracing: trace_id 字段为 OTel traceparent 预留;
 *          P0-E 本轮不引入 OpenTelemetry SDK, 后续完整接入时填。
 */

import type { FastifyRequest } from "fastify";
import { asSystem } from "./db.ts";
import { requestContext } from "@fastify/request-context";

interface Resource {
  kind: string;
  id: string;
  [extra: string]: unknown;
}

const FIELD_CAP = 4096;

function truncate(v: unknown): unknown {
  if (v == null) return v;
  const s = JSON.stringify(v);
  if (s.length <= FIELD_CAP) return v;
  return { _truncated: true, _length: s.length, _head: s.slice(0, FIELD_CAP) };
}

function callerToActor(req: FastifyRequest): string {
  const c = req.caller;
  if (!c) return "anonymous";
  if (c.id === "internal") return "system:in-process";
  if (c.id === "auth-disabled") return "dev:auth-disabled";
  if (c.scope === "system") return `system:${c.name}`;
  return `user:${c.id}`;
}

export async function audit(
  req: FastifyRequest,
  action: string,
  resource: Resource,
  before: unknown = null,
  after: unknown = null,
): Promise<void> {
  const tenantId = req.caller?.tenantId ?? null;
  if (!tenantId) {
    req.log.warn({ action, resource }, "audit skipped: no tenant context");
    return;
  }
  const actor = callerToActor(req);
  const reqId = (req as any).id as string | undefined;
  const traceId = requestContext.get("traceId" as any) as string | undefined;

  // 异步写, 不阻塞响应
  asSystem(async (tx) => {
    await tx`
      INSERT INTO audit_log (tenant_id, actor, action, resource, before, after, trace_id, request_id)
      VALUES (
        ${tenantId}, ${actor}, ${action},
        ${tx.json(resource as any)},
        ${before == null ? null : tx.json(truncate(before) as any)},
        ${after == null ? null : tx.json(truncate(after) as any)},
        ${traceId ?? null},
        ${reqId ?? null}
      )
    `;
  }).catch((e) => req.log.warn({ err: e, action, resource }, "audit write failed"));
}

/**
 * 系统级 actor (autoworker / reconciler) 的审计入口 — 没有 req 上下文
 */
export async function auditSystem(
  tenantId: string,
  actor: string,
  action: string,
  resource: Resource,
  before: unknown = null,
  after: unknown = null,
): Promise<void> {
  asSystem(async (tx) => {
    await tx`
      INSERT INTO audit_log (tenant_id, actor, action, resource, before, after)
      VALUES (
        ${tenantId}, ${actor}, ${action},
        ${tx.json(resource as any)},
        ${before == null ? null : tx.json(truncate(before) as any)},
        ${after == null ? null : tx.json(truncate(after) as any)}
      )
    `;
  }).catch((e) => console.warn(`[audit:${actor}] write failed:`, e));
}
