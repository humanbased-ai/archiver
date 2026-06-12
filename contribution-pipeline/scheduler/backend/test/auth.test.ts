// API key 鉴权 (γ 模式) 单元测试
// 用 app.inject 构造一个临时 Fastify, 不打 4000 端口的常驻 dev server
//
// 跑法: cd scheduler/backend && npx tsx --test test/auth.test.ts
import "./_assert-test-db.ts";

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { sql } from "../src/db.ts";
import {
  registerAuth,
  registerRbac,
  hashKey,
  getInternalKey,
  API_KEY_HEADER,
  TENANT_ID_HEADER,
  DEFAULT_TENANT_ID,
  ROUTE_PERMISSIONS,
} from "../src/auth.ts";

async function buildApp(opts: { authRequired: boolean; rbac?: boolean }) {
  // 中间件读 process.env.AUTH_REQUIRED, 在测试里临时切换
  process.env.AUTH_REQUIRED = opts.authRequired ? "true" : "false";
  const app = Fastify({ logger: false });
  registerAuth(app);
  if (opts.rbac) registerRbac(app);
  app.get("/health", async () => ({ ok: true }));
  app.get("/api/v1/protected", async (req) => ({
    ok: true,
    caller: req.caller ? { ...req.caller, permissions: [...req.caller.permissions] } : null,
  }));
  // 用 ROUTE_PERMISSIONS 里实际存在的一条路由测 RBAC 行为
  app.get("/api/v1/admin/queue", async () => ({ queue: [] }));
  return app;
}

const TEST_KEY = "test-key-deadbeef-12345678";
let testKeyId = "";

before(async () => {
  // 写一把测试用 key (sha256 入库; tenant_id 落 default 租户)
  const rows = await sql<{ id: string }[]>`
    INSERT INTO api_keys (name, key_hash, scope, tenant_id)
    VALUES ('e2e-test-key', ${hashKey(TEST_KEY)}, 'admin', ${DEFAULT_TENANT_ID})
    RETURNING id
  `;
  testKeyId = rows[0].id;
});

after(async () => {
  await sql`DELETE FROM api_keys WHERE id = ${testKeyId}`;
  // 注意: 不在这里 sql.end(), 让 node:test 自然退出 (其它测试文件可能并发跑)
});

describe("S. API key 鉴权 (γ 模式)", () => {
  test("S1. AUTH_REQUIRED=false → 缺 key 也能访问", async () => {
    const app = await buildApp({ authRequired: false });
    const r = await app.inject({ method: "GET", url: "/api/v1/protected" });
    assert.equal(r.statusCode, 200);
    await app.close();
  });

  test("S2. AUTH_REQUIRED=true 且缺 key → 401 UNAUTHORIZED", async () => {
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({ method: "GET", url: "/api/v1/protected" });
    assert.equal(r.statusCode, 401);
    const body = JSON.parse(r.payload);
    assert.equal(body.error.code, "UNAUTHORIZED");
    await app.close();
  });

  test("S3. AUTH_REQUIRED=true 但 key 错 → 401", async () => {
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: { [API_KEY_HEADER]: "bogus-key-not-in-db" },
    });
    assert.equal(r.statusCode, 401);
    await app.close();
  });

  test("S4. AUTH_REQUIRED=true 且 key 正确 → 200, caller 信息已挂上", async () => {
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: { [API_KEY_HEADER]: TEST_KEY },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    assert.equal(body.caller.name, "e2e-test-key");
    assert.equal(body.caller.scope, "admin");
    await app.close();
  });

  test("S5. INTERNAL_KEY (同进程 inject 直通) → 200, caller=internal:in-process", async () => {
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: { [API_KEY_HEADER]: getInternalKey() },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    assert.equal(body.caller.id, "internal");
    await app.close();
  });

  test("S6. revoked 的 key → 401", async () => {
    // 先吊销测试 key
    await sql`UPDATE api_keys SET revoked_at = NOW() WHERE id = ${testKeyId}`;
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: { [API_KEY_HEADER]: TEST_KEY },
    });
    assert.equal(r.statusCode, 401);
    await app.close();
    // 复活, 不影响 cleanup hook
    await sql`UPDATE api_keys SET revoked_at = NULL WHERE id = ${testKeyId}`;
  });

  test("S7. /health 公开访问 → 200", async () => {
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({ method: "GET", url: "/health" });
    assert.equal(r.statusCode, 200);
    await app.close();
  });

  test("S8. 普通 admin key → 跟 api_keys.tenant_id; isSystemActor=false", async () => {
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: { [API_KEY_HEADER]: TEST_KEY },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    assert.equal(body.caller.tenantId, DEFAULT_TENANT_ID);
    assert.equal(body.caller.isSystemActor, false);
    await app.close();
  });

  test("S9. 非 system scope 即使带 X-Tenant-Id 也忽略 (防越权)", async () => {
    const otherTenant = "11111111-2222-3333-4444-555555555555";
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: {
        [API_KEY_HEADER]: TEST_KEY,
        [TENANT_ID_HEADER]: otherTenant,
      },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    // admin scope 不允许切租户, 应仍是 default
    assert.equal(body.caller.tenantId, DEFAULT_TENANT_ID);
    assert.equal(body.caller.isSystemActor, false);
    await app.close();
  });

  test("S10. INTERNAL_KEY 不带 X-Tenant-Id → isSystemActor=true (跨租户)", async () => {
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: { [API_KEY_HEADER]: getInternalKey() },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    assert.equal(body.caller.tenantId, DEFAULT_TENANT_ID);
    assert.equal(body.caller.isSystemActor, true);
    await app.close();
  });

  test("S11. INTERNAL_KEY 携带 X-Tenant-Id → isSystemActor=false, 受目标租户 RLS", async () => {
    const overrideTenant = "11111111-2222-3333-4444-555555555555";
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: {
        [API_KEY_HEADER]: getInternalKey(),
        [TENANT_ID_HEADER]: overrideTenant,
      },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    assert.equal(body.caller.tenantId, overrideTenant);
    assert.equal(body.caller.isSystemActor, false);
    await app.close();
  });

  test("S12. system scope key + X-Tenant-Id → 跟随 header (代行租户)", async () => {
    // 临时把测试 key 改成 system scope, 验证 X-Tenant-Id 生效
    const otherTenant = "22222222-3333-4444-5555-666666666666";
    await sql`UPDATE api_keys SET scope = 'system' WHERE id = ${testKeyId}`;
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: {
        [API_KEY_HEADER]: TEST_KEY,
        [TENANT_ID_HEADER]: otherTenant,
      },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    assert.equal(body.caller.tenantId, otherTenant);
    assert.equal(body.caller.isSystemActor, false); // 带 header → 代行模式, 受 RLS
    await app.close();
    // 复位
    await sql`UPDATE api_keys SET scope = 'admin' WHERE id = ${testKeyId}`;
  });

  test("S13. system scope key 不带 header → isSystemActor=true (跨租户系统职责)", async () => {
    await sql`UPDATE api_keys SET scope = 'system' WHERE id = ${testKeyId}`;
    const app = await buildApp({ authRequired: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
      headers: { [API_KEY_HEADER]: TEST_KEY },
    });
    assert.equal(r.statusCode, 200);
    const body = JSON.parse(r.payload);
    assert.equal(body.caller.isSystemActor, true);
    await app.close();
    await sql`UPDATE api_keys SET scope = 'admin' WHERE id = ${testKeyId}`;
  });

  test("S14. RBAC: 无角色的 key 访问受保护路由 → 403 FORBIDDEN", async () => {
    // testKey 没绑任何 role
    const app = await buildApp({ authRequired: true, rbac: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/admin/queue",
      headers: { [API_KEY_HEADER]: TEST_KEY },
    });
    assert.equal(r.statusCode, 403);
    const body = JSON.parse(r.payload);
    assert.equal(body.error.code, "FORBIDDEN");
    await app.close();
  });

  test("S15. RBAC: 绑定 tenant_admin 后可访问 admin.queue", async () => {
    // 临时绑 tenant_admin
    const [adminRole] = await sql<{ id: string }[]>`
      SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'
    `;
    await sql`INSERT INTO api_key_roles (api_key_id, role_id) VALUES (${testKeyId}, ${adminRole.id})`;
    try {
      const app = await buildApp({ authRequired: true, rbac: true });
      const r = await app.inject({
        method: "GET",
        url: "/api/v1/admin/queue",
        headers: { [API_KEY_HEADER]: TEST_KEY },
      });
      assert.equal(r.statusCode, 200);
      await app.close();
    } finally {
      await sql`DELETE FROM api_key_roles WHERE api_key_id = ${testKeyId}`;
    }
  });

  test("S16. RBAC: INTERNAL_KEY 自带 * 通配, 跳 RBAC", async () => {
    const app = await buildApp({ authRequired: true, rbac: true });
    const r = await app.inject({
      method: "GET",
      url: "/api/v1/admin/queue",
      headers: { [API_KEY_HEADER]: getInternalKey() },
    });
    assert.equal(r.statusCode, 200);
    await app.close();
  });

  test("S17. RBAC: 路由→权限映射表完备性 (smoke check)", async () => {
    // 关键路由都被映射
    assert.equal(ROUTE_PERMISSIONS["GET /api/v1/admin/queue"], "admin.queue");
    assert.equal(ROUTE_PERMISSIONS["POST /api/v1/queue/:nodeKey/lease"], "queue.lease");
    assert.equal(ROUTE_PERMISSIONS["POST /api/v1/result"], "queue.result");
    assert.equal(ROUTE_PERMISSIONS["POST /api/batches"], "batch.create");
    assert.equal(ROUTE_PERMISSIONS["POST /api/collect/:itemId/submit"], "collect.write");
  });
});
