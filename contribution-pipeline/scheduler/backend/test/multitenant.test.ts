// 跨租户隔离集成测试 (P0-A 收尾验收)
// 跑法: cd scheduler/backend && npx tsx --env-file=.env --test test/multitenant.test.ts
//
// 验证 RLS 真实拦截:
//   - tenant A 创建的 pipeline / item 在 tenant B 上下文下 SELECT 应返回 0 行
//   - 系统模式 (asSystem) 看得到所有租户
//   - 跨租户 INSERT 也被 policy 拒 (WITH CHECK)
import "./_assert-test-db.ts";

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { sql, withTenant, asSystem } from "../src/db.ts";

const A_ID = "aaaaaaaa-1111-1111-1111-111111111111";
const B_ID = "bbbbbbbb-2222-2222-2222-222222222222";

let pipeAId = "";
let pipeBId = "";

before(async () => {
  await asSystem(async (tx) => {
    // 造两个测试租户 (容忍已存在)
    await tx`
      INSERT INTO tenants (id, slug, name, plan)
      VALUES (${A_ID}, 'test-mt-a', 'MT Test A', 'standard'),
             (${B_ID}, 'test-mt-b', 'MT Test B', 'standard')
      ON CONFLICT (slug) DO NOTHING
    `;
    // 在 A 租户造一个 pipeline (含一个 v1 版本)
    const [pa] = await tx<{ task_id: string }[]>`
      INSERT INTO pipelines (tenant_id, name, steps)
      VALUES (${A_ID}, 'mt-test-A', '[]'::jsonb)
      RETURNING task_id
    `;
    pipeAId = pa.task_id;
    await tx`
      INSERT INTO pipeline_versions (task_id, tenant_id, version, steps, forms, forms_etag)
      VALUES (${pipeAId}, ${A_ID}, 1, '[]'::jsonb, '{}'::jsonb, 'mt-a')
    `;

    const [pb] = await tx<{ task_id: string }[]>`
      INSERT INTO pipelines (tenant_id, name, steps)
      VALUES (${B_ID}, 'mt-test-B', '[]'::jsonb)
      RETURNING task_id
    `;
    pipeBId = pb.task_id;
    await tx`
      INSERT INTO pipeline_versions (task_id, tenant_id, version, steps, forms, forms_etag)
      VALUES (${pipeBId}, ${B_ID}, 1, '[]'::jsonb, '{}'::jsonb, 'mt-b')
    `;
  });
});

after(async () => {
  // 清理: pipelines CASCADE 会带走 pipeline_versions / items / outbox / dataset_records
  // tenants RESTRICT, 必须显式拆完才能删 (留给后续手工清, 这里仅 best-effort)
  await asSystem(async (tx) => {
    await tx`DELETE FROM pipelines WHERE task_id IN (${pipeAId}, ${pipeBId})`;
    await tx`DELETE FROM tenants WHERE id IN (${A_ID}, ${B_ID})`;
  });
});

describe("Z. 跨租户 RLS 隔离", () => {
  test("Z1. tenant A 上下文 SELECT pipelines → 只看到 A 自己的", async () => {
    const rows = await withTenant(A_ID, async (tx) => tx<{ task_id: string }[]>`
      SELECT task_id FROM pipelines
    `);
    const ids = rows.map((r) => r.task_id);
    assert.ok(ids.includes(pipeAId), "A 应能看到自己的 pipeline");
    assert.ok(!ids.includes(pipeBId), "A 不应看到 B 的 pipeline (RLS 拦截)");
  });

  test("Z2. tenant B 上下文 SELECT pipelines → 只看到 B 自己的", async () => {
    const rows = await withTenant(B_ID, async (tx) => tx<{ task_id: string }[]>`
      SELECT task_id FROM pipelines
    `);
    const ids = rows.map((r) => r.task_id);
    assert.ok(ids.includes(pipeBId));
    assert.ok(!ids.includes(pipeAId));
  });

  test("Z3. asSystem 跨租户都看得到", async () => {
    const rows = await asSystem(async (tx) => tx<{ task_id: string }[]>`
      SELECT task_id FROM pipelines WHERE task_id IN (${pipeAId}, ${pipeBId})
    `);
    assert.equal(rows.length, 2);
  });

  test("Z4. 未设 GUC (raw sql 调用) → RLS 阻拦, 0 行可见", async () => {
    // 直接用 sql 跑 (不 begin / 不 set_config), 等价于"漏写 withTenant 的应用 bug"
    const rows = await sql<{ task_id: string }[]>`
      SELECT task_id FROM pipelines WHERE task_id IN (${pipeAId}, ${pipeBId})
    `;
    assert.equal(rows.length, 0, "无 GUC 时 RLS 应让查询返回零行 (默认拒)");
  });

  test("Z5. tenant A 试图 INSERT 一行 tenant_id=B → WITH CHECK 拒绝", async () => {
    let err: any = null;
    try {
      await withTenant(A_ID, async (tx) => {
        await tx`
          INSERT INTO pipelines (tenant_id, name, steps)
          VALUES (${B_ID}, 'cross-tenant-attack', '[]'::jsonb)
        `;
      });
    } catch (e: any) { err = e; }
    assert.ok(err, "WITH CHECK 应拒绝跨租户写入");
    // PostgreSQL: row violates row-level security policy
    assert.match(String(err.message ?? err), /row-level security|row violates|RLS/i);
  });

  test("Z6. items 表同样的隔离", async () => {
    // A 造一条 item
    const [pv] = await asSystem(async (tx) => tx<{ id: string }[]>`
      SELECT id FROM pipeline_versions WHERE task_id = ${pipeAId}
    `);
    const [a_item] = await withTenant(A_ID, async (tx) => tx<{ id: string }[]>`
      INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope)
      VALUES (${A_ID}, ${pipeAId}, ${pv.id}, 'ingest', '{"payload":{}}'::jsonb)
      RETURNING id
    `);
    // B 上下文 SELECT 应看不到
    const seen = await withTenant(B_ID, async (tx) => tx<{ id: string }[]>`
      SELECT id FROM items WHERE id = ${a_item.id}
    `);
    assert.equal(seen.length, 0, "B 不应看到 A 的 item");
    // A 自己应看到
    const own = await withTenant(A_ID, async (tx) => tx<{ id: string }[]>`
      SELECT id FROM items WHERE id = ${a_item.id}
    `);
    assert.equal(own.length, 1);
  });
});
