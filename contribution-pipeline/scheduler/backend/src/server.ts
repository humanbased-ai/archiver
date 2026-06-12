import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyRequestContext, requestContext } from "@fastify/request-context";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { registerRoutes } from "./api.ts";
import { registerBusinessRoutes } from "./business.ts";
import { registerEventsRoutes } from "./events.ts";
import { startReconciler, stopReconciler } from "./reconciler.ts";
import { startAutoWorker, stopAutoWorker, AUTOWORKER_ID } from "./autoworker.ts";
import { sql } from "./db.ts";
import { registerIdempotency } from "./idempotency.ts";
import { z } from "zod";
import { registerAuth, registerRbac, bootstrapApiKey } from "./auth.ts";
import { validateProductionEnv } from "./env-check.ts";

// 生产环境门禁 (M3 fail-fast). 详见 env-check.ts
{
  const fatals = validateProductionEnv(process.env);
  if (fatals.length > 0) {
    for (const f of fatals) console.error(`[FATAL] ${f}`);
    process.exit(1);
  }
}

declare module "@fastify/request-context" {
  interface RequestContextData {
    reqId?: string;
    tenantId?: string;
    traceId?: string;     // OTel traceparent 解析后的 trace_id, 给 audit_log / 日志关联
  }
}

const app = Fastify({
  // 把 request-id 透传到日志中, 便于跨请求/异步追踪
  genReqId: (req) => {
    const incoming = req.headers["x-request-id"];
    return typeof incoming === "string" && incoming.length > 0
      ? incoming
      : randomUUID();
  },
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    // pino 自带 reqId; 这里再把上下文里的 reqId / tenantId 也吐出来 (异步/后台任务也能引用)
    mixin() {
      const ctxId = requestContext.get("reqId");
      const tenantId = requestContext.get("tenantId");
      const extra: Record<string, string> = {};
      if (ctxId) extra.ctxReqId = ctxId;
      if (tenantId) extra.tenantId = tenantId;
      return extra;
    },
  },
});

await app.register(fastifyRequestContext, { hook: "onRequest" });
await app.register(cors, { origin: true });

// 进请求时同步把 reqId / traceparent 写进 AsyncLocalStorage 上下文
// traceparent 格式: 00-<trace_id 32hex>-<span_id 16hex>-<flags>
const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i;
app.addHook("onRequest", async (req, reply) => {
  requestContext.set("reqId", req.id);
  reply.header("x-request-id", req.id);
  const tp = req.headers["traceparent"];
  if (typeof tp === "string") {
    const m = tp.match(TRACEPARENT_RE);
    if (m) requestContext.set("traceId", m[1]);
  }
});

// 鉴权中间件先于业务路由注册, 但仍在 reqId hook 之后 (这样 401 也带 x-request-id)
registerAuth(app);

// 鉴权之后:把 caller.tenantId 抬到 request-context, 让 handler / autoworker / 日志统一引用
app.addHook("onRequest", async (req) => {
  if (req.caller?.tenantId) {
    requestContext.set("tenantId", req.caller.tenantId);
  }
});

// RBAC: 集中式路由→权限映射, preHandler 钩子拦截
registerRbac(app);

registerRoutes(app);
registerBusinessRoutes(app);
registerEventsRoutes(app);

// Idempotency-Key 仅作用于"创建/状态推进"型 POST
registerIdempotency(app, [
  { method: "POST", url: "/api/v1/items/create" },
  { method: "POST", url: "/api/v1/result" },
  { method: "POST", url: "/api/v1/pipelines/create" },
  { method: "POST", url: "/api/batches" },
]);

// 全局错误翻译: zod 校验失败 → 400 BAD_REQUEST 统一形态; 其它 5xx 走 fastify 默认
app.setErrorHandler((err, _req, reply) => {
  if (err instanceof z.ZodError) {
    return reply.code(400).send({
      error: {
        code: "BAD_REQUEST",
        message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      },
    });
  }
  reply.send(err); // 默认处理
});

app.get("/health", async () => ({ ok: true }));

// 文档静态托管 ── /docs/openapi.yaml + /docs 跳转 swagger UI
const DOCS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs");
app.get("/docs", async (_req, reply) => reply.redirect("/docs/api-tester.html"));
app.get<{ Params: { "*": string } }>("/docs/*", async (req, reply) => {
  const sub = (req.params as any)["*"] as string;
  if (!sub || sub.includes("..")) return reply.code(400).send("bad path");
  const ext = sub.split(".").pop()?.toLowerCase();
  const ct =
    ext === "html" ? "text/html; charset=utf-8" :
    ext === "yaml" || ext === "yml" ? "text/yaml; charset=utf-8" :
    ext === "json" ? "application/json; charset=utf-8" :
    ext === "md"   ? "text/markdown; charset=utf-8" :
    "text/plain; charset=utf-8";
  try {
    const body = await readFile(resolve(DOCS_DIR, sub));
    return reply.header("content-type", ct).send(body);
  } catch (e: any) {
    if (e?.code === "ENOENT") return reply.code(404).send("not found");
    throw e;
  }
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await bootstrapApiKey();

await app.listen({ port, host });
console.log(`[scheduler] listening on http://${host}:${port}`);

startReconciler();
await startAutoWorker(app);

// ── Graceful shutdown ────────────────────────────────────────
// 顺序:
//   1. 停后台 tick (autoworker + reconciler)
//   2. 把本进程持有的在飞 lease 主动 release 回 pending, 避免新工作必须等 60s 过期
//   3. app.close() 拒新请求 + 等在飞 HTTP 请求结束
//   4. sql.end() 关 DB 连接池
let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[scheduler] received ${signal}, shutting down…`);
  const timeout = setTimeout(() => {
    console.error("[scheduler] shutdown timed out, forcing exit");
    process.exit(1);
  }, 15_000);
  timeout.unref();
  try {
    stopReconciler();
    stopAutoWorker();
    // 把当前进程的 autoworker 还持有的 lease 还回去
    try {
      const released = await sql`
        UPDATE outbox SET
          status='pending', leased_by=NULL, leased_at=NULL, expected_by=NULL, updated_at=NOW()
        WHERE status='leased' AND leased_by = ${AUTOWORKER_ID}
        RETURNING run_id
      `;
      if (released.length > 0) {
        console.log(`[scheduler] released ${released.length} in-flight lease(s) on shutdown`);
      }
    } catch (e) {
      console.warn("[scheduler] release-on-shutdown failed:", e);
    }
    await app.close();
    await sql.end({ timeout: 5 });
    clearTimeout(timeout);
    process.exit(0);
  } catch (err) {
    console.error("[scheduler] shutdown error:", err);
    process.exit(1);
  }
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
