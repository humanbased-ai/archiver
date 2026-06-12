/**
 * Driver 公共 HTTP 客户端
 *
 * 透明适配:
 *   - 同进程: app.inject + INTERNAL_KEY (零网络)
 *   - 拆服务: SCHEDULER_BASE_URL / BUSINESS_BASE_URL → 真 HTTP + SCHEDULER_API_KEY / BUSINESS_API_KEY
 *
 * 所有调用强制带 X-Tenant-Id; driver 在 lease 时拿到的 job.tenantId 必须透传,
 * 否则调度核心 RLS 会拒绝跨租户的 runId 操作。
 */

import type { FastifyInstance } from "fastify";
import { API_KEY_HEADER, TENANT_ID_HEADER, getInternalKey } from "../auth.ts";

let appRef: FastifyInstance | null = null;

const REMOTE_SCHED = process.env.SCHEDULER_BASE_URL?.replace(/\/$/, "");
const REMOTE_BIZ = process.env.BUSINESS_BASE_URL?.replace(/\/$/, "");
const REMOTE_SCHED_KEY = process.env.SCHEDULER_API_KEY ?? "";
const REMOTE_BIZ_KEY = process.env.BUSINESS_API_KEY ?? "";

export function bindApp(app: FastifyInstance): void {
  appRef = app;
}

/**
 * tenantId:
 *   - 具体 UUID → 调度核心 RLS 在该租户上下文执行 (代行用户)
 *   - null/undefined → 不带 X-Tenant-Id, 调度核心 isSystemActor=true → asSystem (跨租户系统职责)
 */
export async function schedPost<T = any>(
  path: string,
  body: unknown,
  tenantId: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    [API_KEY_HEADER]: REMOTE_SCHED ? REMOTE_SCHED_KEY : getInternalKey(),
  };
  if (tenantId) headers[TENANT_ID_HEADER] = tenantId;
  if (REMOTE_SCHED) {
    const r = await fetch(`${REMOTE_SCHED}/api/v1${path}`, {
      method: "POST", headers, body: JSON.stringify(body),
    });
    let data: any = null;
    try { data = await r.json(); } catch {}
    if (!r.ok) {
      throw Object.assign(new Error(data?.error?.message ?? `SCHED_ERROR(${r.status})`), {
        code: data?.error?.code,
      });
    }
    return data as T;
  }
  if (!appRef) throw new Error("driver client not bound and no SCHEDULER_BASE_URL set");
  const r = await appRef.inject({
    method: "POST", url: `/api/v1${path}`, payload: body, headers,
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

export async function notifyBusinessResult(
  tenantId: string,
  itemId: string,
  stepKey: string,
  result: "approved" | "rejected" | "duplicate",
  reason?: string,
): Promise<void> {
  const payload = { itemId, stepKey, result, reason };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    [API_KEY_HEADER]: REMOTE_BIZ ? REMOTE_BIZ_KEY : getInternalKey(),
    [TENANT_ID_HEADER]: tenantId,
  };
  if (REMOTE_BIZ) {
    await fetch(`${REMOTE_BIZ}/api/internal/submission-result`, {
      method: "POST", headers, body: JSON.stringify(payload),
    });
    return;
  }
  if (!appRef) return;
  await appRef.inject({
    method: "POST", url: "/api/internal/submission-result", payload, headers,
  });
}
