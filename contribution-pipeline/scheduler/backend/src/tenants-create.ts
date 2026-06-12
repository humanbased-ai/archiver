/**
 * CLI: 创建租户
 *
 * 用法:
 *   npm run tenants:create -- --slug=acme --name="Acme Corp"
 *   npm run tenants:create -- --slug=acme --name="Acme Corp" --plan=enterprise
 *
 * slug 只能含小写字母 / 数字 / 连字符, 长度 2~32 (路由 / 日志 / 子域名复用此值)。
 * 创建后输出 tenant id, 后续 keys:create 时用 --tenant=<slug>。
 */

import { sql } from "./db.ts";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

function parseArgs(): { slug: string; name: string; plan: string } {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  if (!args.slug || !args.name) {
    console.error("用法: npm run tenants:create -- --slug=<slug> --name=<name> [--plan=standard]");
    process.exit(1);
  }
  if (!SLUG_RE.test(args.slug)) {
    console.error(`slug 不合法: ${args.slug}`);
    console.error("规则: 小写字母 / 数字 / 连字符, 长度 2~32, 不能以连字符开头或结尾");
    process.exit(1);
  }
  return { slug: args.slug, name: args.name, plan: args.plan ?? "standard" };
}

async function main() {
  const { slug, name, plan } = parseArgs();
  const rows = await sql<{ id: string }[]>`
    INSERT INTO tenants (slug, name, plan)
    VALUES (${slug}, ${name}, ${plan})
    RETURNING id
  `;
  console.log("✓ 租户已创建");
  console.log(`  id:    ${rows[0].id}`);
  console.log(`  slug:  ${slug}`);
  console.log(`  name:  ${name}`);
  console.log(`  plan:  ${plan}`);
  console.log("");
  console.log(`下一步: npm run keys:create -- --name=<service> --tenant=${slug}`);
  await sql.end();
}

main().catch((e) => {
  if (typeof e?.message === "string" && /duplicate key/.test(e.message)) {
    console.error("✗ slug 已存在,换一个");
  } else {
    console.error(e);
  }
  process.exit(1);
});
