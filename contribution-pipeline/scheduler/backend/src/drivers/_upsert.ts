/**
 * Auto-upsert: 启动时把 drivers 携带的 nodeDefinition UPSERT 到 node_definitions 表.
 *
 * 为什么:
 *   - 之前 driver 代码 + migration SQL 双写 node_definitions, 改一处忘了同步另一处就漂
 *   - driver 就是 (key, version) 的具体实现, 它最了解自己的 paramsSchema/presets/uiSchema
 *   - migration 仍然是首次安装 / 老节点的 seed 路径, 但活节点 schema 以 driver 为准
 *
 * 调度核心 RLS: node_definitions 没有 tenant_id 列, 但 RLS 是 PERMISSIVE+FORCE 模式
 *               系统 actor 才能跨租户写; 这里通过 asSystem 拿到系统级 tx.
 *
 * 失败语义: upsert 失败 (e.g. DB schema migration 没跑过, 缺 ui_schema/presets 列) 必须把
 *           autoworker 启动整体阻断 — 让 driver 在不匹配的 schema 上拉活会埋下 silent drift.
 */

import { asSystem } from "../db.ts";
import { collectedNodeDefinitions } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";

export async function upsertCollectedNodeDefinitions(): Promise<void> {
  const defs = collectedNodeDefinitions();
  if (defs.length === 0) return;
  await asSystem(async (tx) => {
    for (const d of defs) {
      await upsertOne(tx, d);
    }
  });
}

async function upsertOne(tx: import("../db.ts").SQL, d: DriverNodeDefinition): Promise<void> {
  // status 故意不在 UPDATE 列里 — 管理后台 archive/activate 写入的状态不能被进程重启覆盖.
  // 首次 INSERT 走默认值 ('active', 表 default), 之后只有 admin endpoint 改它.
  await tx`
    INSERT INTO node_definitions
      (key, version, display_name, params_schema, ui_schema, presets, inputs_schema, outputs_schema,
       category, run_mode, description,
       idempotent, default_timeout_ms, default_max_attempts, manual,
       examples, supports_dry_run, outputs_validation)
    VALUES (
      ${d.key},
      ${d.version},
      ${d.displayName},
      ${tx.json(d.paramsSchema)},
      ${d.uiSchema ? tx.json(d.uiSchema) : null},
      ${d.presets ? tx.json(d.presets) : null},
      ${d.inputsSchema ? tx.json(d.inputsSchema) : null},
      ${d.outputsSchema ? tx.json(d.outputsSchema) : null},
      ${d.category ?? null},
      ${d.runMode ?? null},
      ${d.description ?? null},
      ${d.idempotent ?? false},
      ${d.defaultTimeoutMs ?? 30000},
      ${d.defaultMaxAttempts ?? 3},
      ${d.manual ?? false},
      ${d.examples && d.examples.length > 0 ? tx.json(d.examples) : null},
      ${d.supportsDryRun ?? false},
      ${d.outputsValidation ?? "strict"}
    )
    ON CONFLICT (key, version) DO UPDATE SET
      display_name         = EXCLUDED.display_name,
      params_schema        = EXCLUDED.params_schema,
      ui_schema            = EXCLUDED.ui_schema,
      presets              = EXCLUDED.presets,
      inputs_schema        = EXCLUDED.inputs_schema,
      outputs_schema       = EXCLUDED.outputs_schema,
      category             = EXCLUDED.category,
      run_mode             = EXCLUDED.run_mode,
      description          = EXCLUDED.description,
      idempotent           = EXCLUDED.idempotent,
      default_timeout_ms   = EXCLUDED.default_timeout_ms,
      default_max_attempts = EXCLUDED.default_max_attempts,
      manual               = EXCLUDED.manual,
      examples             = EXCLUDED.examples,
      supports_dry_run     = EXCLUDED.supports_dry_run,
      outputs_validation   = EXCLUDED.outputs_validation
  `;
}
