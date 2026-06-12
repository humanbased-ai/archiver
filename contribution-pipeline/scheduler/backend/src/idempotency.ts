/**
 * Idempotency-Key 支持 (含 M5 严格并发去重)
 *
 * 用法:
 *   1) 调用方在 POST 请求加 header `Idempotency-Key: <opaque-string>` (建议 UUID)
 *   2) preHandler 拿 PG advisory_xact_lock + 占位:
 *      - 第一次 → INSERT status='pending', 继续 handler (onSend 收尾 → status='completed')
 *      - 同 key + 同 hash + completed → 重放原响应
 *      - 同 key + 同 hash + pending → 409 IDEMPOTENCY_IN_PROGRESS (并发, 客户端串行重试)
 *      - 同 key + 不同 hash → 409 IDEMPOTENCY_HASH_MISMATCH (误用)
 *   3) 缓存 24h 后过期; pending 行 5 分钟未完成视为 stuck, 后续请求可覆盖
 *
 * 适用接口: 创建型/状态推进型 POST (`/items/create`, `/result`, `/api/batches`).
 * 不适用: 纯查询 GET, 或本身用 runId 做天然幂等的内部接口.
 */

import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { asSystem } from "./db.ts";
import { DEFAULT_TENANT_ID } from "./auth.ts";

export const IDEMPOTENCY_HEADER = "idempotency-key";

const PENDING_TTL_SEC = 5 * 60;       // pending 行有效 5 分钟
const COMPLETED_TTL_SEC = 24 * 3600;  // completed 行缓存 24 小时

interface ExistingRow {
  request_hash: string;
  status: "pending" | "completed";
  status_code: number | null;
  response_body: unknown;
}

function bodyHash(body: unknown): string {
  const s = body == null ? "" : JSON.stringify(body);
  return createHash("sha256").update(s).digest("hex");
}

/**
 * 路由级注册: 把要做幂等的路由路径加进 `protectedRoutes` 集合,
 * preHandler 钩子拿锁占位, onSend 钩子收尾.
 */
export function registerIdempotency(
  app: FastifyInstance,
  protectedRoutes: { method: string; url: string }[],
) {
  const protectedSet = new Set(
    protectedRoutes.map((r) => `${r.method.toUpperCase()} ${r.url}`),
  );

  app.decorateRequest("idemKey", null as null | string);
  app.decorateRequest("idemScope", null as null | string);
  app.decorateRequest("idemHash", null as null | string);
  app.decorateRequest("idemTenant", null as null | string);
  app.decorateRequest("idemReplayed", false);
  app.decorateRequest("idemNeedsCompletion", false);  // M5: 是否要在 onSend 收尾

  app.addHook("preHandler", async (req, reply) => {
    const routeKey = `${req.method.toUpperCase()} ${req.routeOptions.url ?? req.url}`;
    if (!protectedSet.has(routeKey)) return;

    const key = req.headers[IDEMPOTENCY_HEADER];
    if (!key || typeof key !== "string") return;
    if (key.length < 8 || key.length > 200) {
      return reply.code(400).send({
        error: { code: "BAD_IDEMPOTENCY_KEY", message: "Idempotency-Key 长度必须在 8-200 之间" },
      });
    }

    const scope = req.routeOptions.url ?? req.url;
    const hash = bodyHash(req.body);
    const tenantId = req.caller?.tenantId ?? DEFAULT_TENANT_ID;
    (req as any).idemKey = key;
    (req as any).idemScope = scope;
    (req as any).idemHash = hash;
    (req as any).idemTenant = tenantId;

    // M5: 单事务内拿 advisory lock + 查现状 + 占位. lock 在 COMMIT 时自动释放,
    // 同 key 并发请求会串行排队 (第二个看到 pending 行 → IDEMPOTENCY_IN_PROGRESS).
    type Decision =
      | { kind: "first" }
      | { kind: "replay"; status_code: number; response_body: unknown }
      | { kind: "in_progress" }
      | { kind: "hash_mismatch" };

    const decision: Decision = await asSystem(async (tx) => {
      // hashtextextended 同一 (tenant, key, scope) 必同, 不同 key 极小概率撞 → 锁串行有限可接受
      const lockKey = createHash("sha256")
        .update(`${tenantId}|${key}|${scope}`)
        .digest()
        .readBigInt64BE(0);
      // postgres.js 不直接接受 BigInt 给 ?, 用字符串
      await tx`SELECT pg_advisory_xact_lock(${lockKey.toString()}::bigint)`;

      // 抽样清过期 (1%)
      if (Math.random() < 0.01) {
        await tx`DELETE FROM idempotency_keys WHERE expires_at < NOW()`.catch(() => {});
      }

      const existingRows = await tx<ExistingRow[]>`
        SELECT request_hash, status, status_code, response_body
        FROM idempotency_keys
        WHERE tenant_id = ${tenantId} AND key = ${key} AND scope = ${scope}
          AND expires_at > NOW()
      `;
      const existing = existingRows[0];

      if (!existing) {
        // 没记录, INSERT pending 占位 (UPSERT 兼顾"老 stuck 行已过期"被 SELECT 漏掉的边界)
        await tx`
          INSERT INTO idempotency_keys
            (tenant_id, key, scope, request_hash, status, status_code, response_body, expires_at)
          VALUES
            (${tenantId}, ${key}, ${scope}, ${hash}, 'pending', NULL, NULL,
             NOW() + (${PENDING_TTL_SEC} || ' seconds')::interval)
          ON CONFLICT (tenant_id, key, scope) DO UPDATE SET
            request_hash = EXCLUDED.request_hash,
            status = 'pending',
            status_code = NULL,
            response_body = NULL,
            expires_at = EXCLUDED.expires_at,
            created_at = NOW()
        `;
        return { kind: "first" };
      }

      if (existing.request_hash !== hash) {
        return { kind: "hash_mismatch" };
      }
      if (existing.status === "completed") {
        return {
          kind: "replay",
          status_code: existing.status_code ?? 200,
          response_body: existing.response_body,
        };
      }
      // status='pending' + hash 一致: 同 key 并发. 让客户端串行重试 (而不是穿透).
      return { kind: "in_progress" };
    });

    if (decision.kind === "first") {
      (req as any).idemNeedsCompletion = true;
      return;  // 继续 handler
    }
    if (decision.kind === "replay") {
      (req as any).idemReplayed = true;
      return reply.code(decision.status_code).send(decision.response_body);
    }
    if (decision.kind === "in_progress") {
      return reply.code(409).send({
        error: {
          code: "IDEMPOTENCY_IN_PROGRESS",
          message: "同 Idempotency-Key 的请求正在处理, 请稍后重试",
        },
      });
    }
    return reply.code(409).send({
      error: {
        code: "IDEMPOTENCY_HASH_MISMATCH",
        message: "相同 Idempotency-Key 已用于不同请求体",
      },
    });
  });

  // onSend: 把首次响应缓存下来 (4xx/5xx 也存, 避免错误重试穿透)
  app.addHook("onSend", async (req, reply, payload) => {
    if (!(req as any).idemNeedsCompletion) return payload;
    const key = (req as any).idemKey as string;
    const scope = (req as any).idemScope as string;
    const hash = (req as any).idemHash as string;
    const tenantId = (req as any).idemTenant as string;

    let body: unknown = payload;
    if (typeof payload === "string") {
      try { body = JSON.parse(payload); } catch { /* 留作字符串 */ }
    }
    try {
      await asSystem(async (tx) => {
        await tx`
          UPDATE idempotency_keys SET
            status = 'completed',
            status_code = ${reply.statusCode},
            response_body = ${tx.json(body as any)},
            request_hash = ${hash},
            expires_at = NOW() + (${COMPLETED_TTL_SEC} || ' seconds')::interval
          WHERE tenant_id = ${tenantId} AND key = ${key} AND scope = ${scope}
        `;
      });
    } catch (e) {
      req.log.warn({ err: e }, "idempotency completion write failed");
    }
    return payload;
  });
}
