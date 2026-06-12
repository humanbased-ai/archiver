/**
 * 服务对服务 API key 鉴权 (γ 模式) + 多租户身份派生
 *
 * 模型:
 *   - 调用方在 header 带 `x-api-key: <opaque-string>`
 *   - 服务端 sha256(key) 查 api_keys 表, revoked_at IS NULL 且未过期 → 通过
 *   - 通过后把 caller (含 tenantId) 挂到 req, 后续 handler / 日志可以引用
 *
 * 多租户:
 *   - api_keys.tenant_id 是身份的根; 一把 key 只属于一个租户
 *   - Phase 1 (当前): tenant_id NULLable, 历史 key 回落到 DEFAULT_TENANT_ID
 *     系统级 actor (reconciler/autoworker self-call) 也用此默认租户
 *   - Phase 2 (后续 backfill 后): tenant_id NOT NULL + RLS 强制隔离
 *
 * INTERNAL_KEY (dev/test 专用, 生产应禁用):
 *   - 启动时生成 (内存常驻, 不入库, 进程退出即销毁)
 *   - 同进程 app.inject 直通, 不走 DB 校验
 *   - 接受 X-Tenant-Id header 显式指定租户; 缺省落 DEFAULT_TENANT_ID
 *   - 拆服务部署 (SCHEDULER_BASE_URL 真 HTTP) 后失效, 调用方必须用真 API key
 *
 * Bootstrap:
 *   - BOOTSTRAP_API_KEY + BOOTSTRAP_TENANT_SLUG (可选) 启动时 upsert
 *   - 后续 key: `npm run keys:create -- --name=<service> --tenant=<slug>`
 *   - 新租户: `npm run tenants:create -- --slug=<x> --name=<x>`
 *
 * 开发开关:
 *   - AUTH_REQUIRED=false → 中间件直接 next, 仅本地 demo;
 *     生产部署务必显式 AUTH_REQUIRED=true (默认就是 true)
 */

import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { sql } from "./db.ts";

export const API_KEY_HEADER = "x-api-key";
export const TENANT_ID_HEADER = "x-tenant-id";
/** 默认租户 (1715000040000_tenants.sql 已 INSERT) */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
// 不需要 key 的前缀.
// /api/v1/dev/* 是 dev 演示用的 (e.g. tenants picker). 路由处理函数自己根据
// AUTH_REQUIRED / DEV_TENANT_PICKER 决定要不要 404, 这里只决定不卡 api-key 校验.
const PUBLIC_PREFIXES = ["/health", "/docs", "/api/v1/dev"];
const INTERNAL_KEY = randomUUID(); // 进程随启动随生成的 inject 直通 key

export function getInternalKey(): string {
  return INTERNAL_KEY;
}

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function isAuthRequired(): boolean {
  return (process.env.AUTH_REQUIRED ?? "true").toLowerCase() !== "false";
}

interface CallerInfo {
  id: string;          // api_keys.id 或 'internal'
  name: string;        // 调用方名 (用于日志)
  scope: string;       // admin / readonly / system / ...
  tenantId: string;    // 派生自 api_keys.tenant_id; system / INTERNAL_KEY 时来自 X-Tenant-Id header 或默认
  isSystemActor: boolean; // true = 跨租户系统职责 (autoworker / reconciler 等), 跳过 RLS
  permissions: Set<string>; // RBAC 解析结果; "*" = 通配 (auth-disabled / INTERNAL_KEY)
}

declare module "fastify" {
  interface FastifyRequest {
    caller?: CallerInfo;
  }
}

function isPublicPath(url: string): boolean {
  return PUBLIC_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`));
}

function readTenantHeader(req: FastifyRequest): string | undefined {
  const v = req.headers[TENANT_ID_HEADER];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

async function resolveCaller(req: FastifyRequest): Promise<CallerInfo | null> {
  const presented = req.headers[API_KEY_HEADER];
  if (!presented || typeof presented !== "string") return null;

  if (presented === INTERNAL_KEY) {
    const headerTenant = readTenantHeader(req);
    return {
      id: "internal",
      name: "internal:in-process",
      scope: "admin",
      tenantId: headerTenant ?? DEFAULT_TENANT_ID,
      isSystemActor: !headerTenant,
      permissions: new Set(["*"]), // 同进程旁路, 跳 RBAC
    };
  }

  const hash = hashKey(presented);
  const rows = await sql<{
    id: string;
    name: string;
    scope: string;
    tenant_id: string | null;
    expires_at: string | null;
  }[]>`
    SELECT id, name, scope, tenant_id, expires_at FROM api_keys
    WHERE key_hash = ${hash} AND revoked_at IS NULL
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  // last_used_at 异步更新 (1% 抽样, 不每次请求都写)
  if (Math.random() < 0.01) {
    sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${row.id}`.catch(() => {});
  }

  const headerTenant = readTenantHeader(req);
  const isSystemScope = row.scope === "system";
  const effectiveTenant = isSystemScope && headerTenant
    ? headerTenant
    : (row.tenant_id ?? DEFAULT_TENANT_ID);

  // 解析 RBAC: api_key → roles → permissions
  const permRows = await sql<{ name: string }[]>`
    SELECT DISTINCT p.name
    FROM api_key_roles akr
    JOIN role_permissions rp ON rp.role_id = akr.role_id
    JOIN permissions p       ON p.id       = rp.permission_id
    WHERE akr.api_key_id = ${row.id}
  `;
  const permissions = new Set(permRows.map((r) => r.name));

  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    tenantId: effectiveTenant,
    isSystemActor: isSystemScope && !headerTenant,
    permissions,
  };
}

export function registerAuth(app: FastifyInstance) {
  if (!isAuthRequired()) {
    app.log.warn("[auth] AUTH_REQUIRED=false; api-key 检查已禁用 (仅限本地 dev)");
  }

  app.addHook("onRequest", async (req, reply) => {
    if (isPublicPath(req.url)) return;

    if (!isAuthRequired()) {
      // dev 模式: 仍要给 req.caller 一个稳定值, 让 withCallerTx / RLS / requirePermission 钩子有上下文
      //
      // 解析顺序 (任一命中就用它):
      //   1. 有效 api-key → 真按 key 解析 (tenant / 角色都来自 DB), 让 dev 也能演示多租户切换;
      //   2. 显式 X-Tenant-Id → 模拟 system 代行该租户;
      //   3. 兜底 → 跨租户 system actor (旧行为).
      // 三种情况权限都给 ["*"] 避免 RBAC 在 dev 时挡路; 真正鉴权交给 AUTH_REQUIRED=true.
      const presented = req.headers[API_KEY_HEADER];
      if (typeof presented === "string" && presented.length > 0) {
        const resolved = await resolveCaller(req).catch(() => null);
        if (resolved) {
          req.caller = { ...resolved, permissions: new Set(["*"]) };
          return;
        }
      }
      const headerTenant = readTenantHeader(req);
      req.caller = {
        id: "auth-disabled",
        name: "auth-disabled",
        scope: "admin",
        tenantId: headerTenant ?? DEFAULT_TENANT_ID,
        isSystemActor: !headerTenant,
        permissions: new Set(["*"]),
      };
      return;
    }

    const caller = await resolveCaller(req);
    if (!caller) {
      reply.code(401).send({
        error: { code: "UNAUTHORIZED", message: "missing or invalid api key" },
      });
      return reply;
    }
    req.caller = caller;
  });
}

/**
 * 单点路由→权限映射. 集中维护, 比每条 route 加 preHandler 更易审计。
 * key = `${METHOD} ${routeOptions.url}` (路由模板, 不是 req.url)
 *
 * 没有列出的路由 = 无需特定权限 (但仍要过 auth + tenant; 例如 /health, /api/internal/*).
 * "*" 通配 (auth-disabled / INTERNAL_KEY) 总是放行。
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  // 调度核心
  "GET /api/v1/nodes":                                    "pipeline.read",
  "GET /api/v1/pipelines":                                "pipeline.read",
  "GET /api/v1/pipelines/:id":                            "pipeline.read",
  "GET /api/v1/pipelines/:id/forms":                      "pipeline.read",
  "GET /api/v1/projects":                                 "pipeline.read",
  "POST /api/v1/pipelines/create":                        "pipeline.write",
  "POST /api/v1/pipelines/:id/save":                      "pipeline.write",
  "POST /api/v1/pipelines/:id/pause":                     "pipeline.write",
  "POST /api/v1/pipelines/:id/resume":                    "pipeline.write",
  "DELETE /api/v1/pipelines/:id":                         "pipeline.write",
  // 模板
  "GET /api/v1/templates":                                "template.read",
  "GET /api/v1/templates/:id":                            "template.read",
  "POST /api/v1/templates/create":                        "template.write",
  "POST /api/v1/templates/:id/save":                      "template.write",
  "DELETE /api/v1/templates/:id":                         "template.write",
  "POST /api/v1/templates/:id/instantiate":               "pipeline.write",
  // Review 列表 (业务层 review 写权限)
  "GET /api/v1/review/tasks":                             "review.write",
  "POST /api/v1/items/create":                            "batch.create",
  "GET /api/v1/items/:id":                                "item.read",
  "GET /api/v1/items/:id/pipeline":                       "item.read",
  "GET /api/v1/tasks/:taskId/items":                      "item.read",
  "GET /api/v1/tasks/:taskId/kanban":                     "item.read",
  "GET /api/v1/tasks/:taskId/records":                    "item.read",
  "POST /api/v1/queue/:nodeKey/lease":                    "queue.lease",
  "POST /api/v1/queue/run/:runId/claim":                  "queue.lease",
  "POST /api/v1/queue/lease/:runId/release":              "queue.lease",
  "POST /api/v1/queue/lease/:runId/heartbeat":            "queue.lease",
  "POST /api/v1/result":                                  "queue.result",
  "POST /api/v1/dedup/check":                             "dedup.check",
  "POST /api/v1/dataset/records/save":                    "dataset.write",
  "GET /api/v1/admin/queue":                              "admin.queue",
  "GET /api/v1/admin/stuck":                              "admin.stuck",
  "GET /api/v1/admin/audit":                              "audit.read",
  // 节点管理 (06-node-design §10.2): 读 = node.read, 写/dry-run = node.admin
  "GET /api/v1/admin/nodes":                              "node.read",
  "GET /api/v1/admin/nodes/:key/:version":                "node.read",
  "GET /api/v1/admin/nodes/:key/:version/usages":         "node.read",
  "POST /api/v1/admin/nodes/:key/:version/archive":       "node.admin",
  "POST /api/v1/admin/nodes/:key/:version/activate":      "node.admin",
  "POST /api/v1/admin/nodes/:key/:version/debug/run":     "node.admin",
  "GET /api/v1/admin/nodes/:key/:version/runtime":        "node.read",
  "POST /api/v1/admin/nodes/:key/:version/pause":         "node.admin",
  "POST /api/v1/admin/nodes/:key/:version/resume":        "node.admin",
  "GET /api/v1/events":                                   "audit.read",
  "POST /api/v1/admin/items/:id/replay":                  "item.replay",
  "POST /api/v1/admin/items/:id/recall":                  "item.replay",
  // 业务层
  "POST /api/batches":                                    "batch.create",
  "POST /api/batches/:batchId/pause":                     "batch.create",
  "POST /api/batches/:batchId/resume":                    "batch.create",
  "POST /api/batches/:batchId/close":                     "batch.create",
  "POST /api/items/:itemId/replay-request":               "collect.write",
  "GET /api/batches":                                     "batch.read",
  "GET /api/batches/:batchId":                            "batch.read",
  "GET /api/batches/:batchId/user-stats":                 "batch.read",
  "GET /api/batches/:batchId/submissions":                "batch.read",
  "GET /api/collect/tasks":                               "collect.write",
  "POST /api/collect/:itemId/claim":                      "collect.write",
  "POST /api/collect/:itemId/submit":                     "collect.write",
  "POST /api/collect/:itemId/release":                    "collect.write",
  "GET /api/collect/:itemId/state":                       "collect.write",
  "POST /api/collect/:itemId/redo":                       "collect.write",
  "POST /api/review/:itemId/decide":                      "review.write",
  "GET /api/work/collect-tasks":                          "collect.write",
  "GET /api/work/my-submissions":                         "collect.write",
  // 内部回调 (仅 INTERNAL_KEY 调; 不需要 RBAC 权限, 但 isSystemActor=true 会带 "*" 通配)
  // "POST /api/internal/submission-result": (省略, 无权限要求)
};

function checkPermission(caller: CallerInfo, perm: string): boolean {
  return caller.permissions.has("*") || caller.permissions.has(perm);
}

/**
 * 注册集中式 RBAC 钩子. registerAuth 之后调用, 让 caller 已就位。
 */
export function registerRbac(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (isPublicPath(req.url)) return;
    const caller = req.caller;
    if (!caller) return; // auth 钩子应已拦截 (除非 AUTH_REQUIRED=false 但走到 public path)

    const key = `${req.method.toUpperCase()} ${req.routeOptions.url ?? ""}`;
    const perm = ROUTE_PERMISSIONS[key];
    if (!perm) return; // 无 RBAC 要求 (e.g. internal callbacks)

    if (!checkPermission(caller, perm)) {
      reply.code(403).send({
        error: {
          code: "FORBIDDEN",
          message: `caller "${caller.name}" 缺少权限: ${perm}`,
        },
      });
      return reply;
    }
  });
}

/**
 * 单条路由的内联权限校验 (handler 内自检, 用于动态权限或非 fastify 路由).
 */
export function ensurePermission(caller: CallerInfo | undefined, perm: string): void {
  if (!caller || !checkPermission(caller, perm)) {
    throw new Error(`FORBIDDEN: ${perm}`);
  }
}

/**
 * 进程启动时调一次, 把 BOOTSTRAP_API_KEY upsert 进库.
 * 已存在则只刷新 hash (允许通过修改环境变量轮换 bootstrap key).
 *
 * BOOTSTRAP_TENANT_SLUG (可选): 把 bootstrap key 绑到指定租户;
 *   未设置 → 落默认租户 (default), 用于 dev / 单租户起步
 */
export async function bootstrapApiKey(): Promise<void> {
  const k = process.env.BOOTSTRAP_API_KEY;
  if (!k) return;
  if (k.length < 16) {
    console.warn("[auth] BOOTSTRAP_API_KEY 长度过短 (<16), 已忽略");
    return;
  }

  const slug = process.env.BOOTSTRAP_TENANT_SLUG?.trim();
  let tenantId: string = DEFAULT_TENANT_ID;
  if (slug) {
    const rows = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE slug = ${slug}`;
    if (rows.length === 0) {
      console.warn(`[auth] BOOTSTRAP_TENANT_SLUG="${slug}" 未找到对应租户, 回落到 default`);
    } else {
      tenantId = rows[0].id;
    }
  }

  const hash = hashKey(k);
  // upsert key + 绑 tenant_admin role; 否则启用 RBAC 后这把 key 调任何接口都 403
  await sql.begin(async (tx) => {
    const rows = await tx<{ id: string }[]>`
      INSERT INTO api_keys (name, key_hash, scope, tenant_id)
      VALUES ('bootstrap', ${hash}, 'admin', ${tenantId})
      ON CONFLICT (key_hash) DO UPDATE SET
        name = EXCLUDED.name,
        tenant_id = EXCLUDED.tenant_id
      RETURNING id
    `;
    const apiKeyId = rows[0].id;
    const [adminRole] = await tx<{ id: string }[]>`
      SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'
    `;
    if (adminRole) {
      await tx`
        INSERT INTO api_key_roles (api_key_id, role_id)
        VALUES (${apiKeyId}, ${adminRole.id})
        ON CONFLICT DO NOTHING
      `;
    }
  });
  console.log(`[auth] bootstrap api key upserted (tenant=${slug ?? "default"}, role=tenant_admin)`);
}
