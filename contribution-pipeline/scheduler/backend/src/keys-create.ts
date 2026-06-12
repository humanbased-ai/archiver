/**
 * 一次性 CLI: 生成一把新的 API key
 *
 * 用法:
 *   npm run keys:create -- --name=worker-translate --tenant=acme --roles=worker
 *   npm run keys:create -- --name=integration --tenant=acme --roles=tenant_admin --expires-days=30
 *   npm run keys:create -- --name=multi-role --tenant=acme --roles=pipeline_editor,batch_operator
 *
 * 行为:
 *   - 必须指定 --tenant=<slug>; 单租户起步用 --tenant=default
 *   - --roles 接逗号分隔的 role 名列表; 内建 role: tenant_admin / pipeline_editor / batch_operator / worker
 *   - 缺 --roles 时不绑任何角色, 调用任何受保护接口都会 403 (生产防误);
 *     dev 测试可加 --roles=tenant_admin 拿全权
 *   - 用 crypto.randomBytes(24) 生成 key, 不可被服务端反推
 *   - 只在 stdout 打印一次明文; DB 只存 sha256
 */

import { randomBytes } from "node:crypto";
import { sql } from "./db.ts";
import { hashKey } from "./auth.ts";

function parseArgs(): { name: string; tenant: string; expiresDays?: number; scope: string; roles: string[] } {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  if (!args.name || !args.tenant) {
    console.error("用法: npm run keys:create -- --name=<service> --tenant=<slug> --roles=<r1,r2> [--expires-days=N] [--scope=admin]");
    process.exit(1);
  }
  return {
    name: args.name,
    tenant: args.tenant,
    scope: args.scope ?? "admin",
    expiresDays: args["expires-days"] ? Number(args["expires-days"]) : undefined,
    roles: args.roles ? args.roles.split(",").map((s) => s.trim()).filter(Boolean) : [],
  };
}

async function main() {
  const { name, tenant, scope, expiresDays, roles } = parseArgs();

  // 解析 tenant slug → id
  const tenants = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE slug = ${tenant}`;
  if (tenants.length === 0) {
    console.error(`✗ 租户 slug 不存在: ${tenant}`);
    console.error("先建租户: npm run tenants:create -- --slug=<slug> --name=<name>");
    await sql.end();
    process.exit(1);
  }
  const tenantId = tenants[0].id;

  // 解析 role 名 → role.id (内建角色 tenant_id IS NULL; 自定义角色 tenant_id = 当前租户)
  const roleIds: string[] = [];
  for (const r of roles) {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM roles
      WHERE name = ${r}
        AND (tenant_id IS NULL OR tenant_id = ${tenantId})
      ORDER BY tenant_id NULLS LAST
      LIMIT 1
    `;
    if (rows.length === 0) {
      console.error(`✗ role 不存在: ${r}`);
      await sql.end();
      process.exit(1);
    }
    roleIds.push(rows[0].id);
  }

  const key = randomBytes(24).toString("base64url"); // 32 字符, URL-safe
  const hash = hashKey(key);
  const expiresAt = expiresDays
    ? new Date(Date.now() + expiresDays * 86400_000).toISOString()
    : null;

  let apiKeyId = "";
  await sql.begin(async (tx) => {
    const rows = await tx<{ id: string }[]>`
      INSERT INTO api_keys (name, key_hash, scope, expires_at, tenant_id)
      VALUES (${name}, ${hash}, ${scope}, ${expiresAt}, ${tenantId})
      RETURNING id
    `;
    apiKeyId = rows[0].id;
    for (const rid of roleIds) {
      await tx`INSERT INTO api_key_roles (api_key_id, role_id) VALUES (${apiKeyId}, ${rid})`;
    }
  });

  console.log("✓ API key 已创建");
  console.log(`  id:         ${apiKeyId}`);
  console.log(`  name:       ${name}`);
  console.log(`  tenant:     ${tenant} (${tenantId})`);
  console.log(`  scope:      ${scope}`);
  console.log(`  roles:      ${roles.length > 0 ? roles.join(", ") : "(none — 所有受保护接口将 403)"}`);
  console.log(`  expires_at: ${expiresAt ?? "never"}`);
  console.log("");
  console.log("⚠ 以下 key 只在此处显示一次, 请立即记录:");
  console.log("");
  console.log(`  ${key}`);
  console.log("");
  console.log("用法 (header):  x-api-key: " + key);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
