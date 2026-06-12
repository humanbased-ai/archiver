import cron from "node-cron";
import { sql, asSystem, type SQL } from "./db.ts";
import { auditSystem } from "./audit.ts";
import { ensureAuditPartitions } from "./partition.ts";
import type { NodeDefinition, OutboxRow, StepConfig } from "./types.ts";

const RECONCILER_LOCK = 9527;

let stopped = false;
let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

export function startReconciler() {
  scheduledTask = cron.schedule("*/30 * * * * *", () => {
    if (stopped) return;
    reconcileTick().catch((e) => console.error("[reconciler] tick error:", e));
  });
  console.log("[reconciler] started, every 30s");
}

export function stopReconciler() {
  stopped = true;
  scheduledTask?.stop();
  scheduledTask = null;
}

// 月度分区滚动节流: 一个 tick 周期内最多检查一次, 避免每 30s 都 CREATE IF NOT EXISTS
let lastPartitionCheck = 0;
const PARTITION_CHECK_INTERVAL_MS = 6 * 3600 * 1000; // 6 小时

export async function reconcileTick() {
  // 顺手维护 audit_log 月度分区 (轻量, IF NOT EXISTS 多数时候秒回, 但仍节流以防出错刷屏)
  if (Date.now() - lastPartitionCheck > PARTITION_CHECK_INTERVAL_MS) {
    lastPartitionCheck = Date.now();
    ensureAuditPartitions().catch((e) => console.warn("[reconciler] partition ensure failed:", e));
  }

  // 整个 tick 跑在一个事务里, 走 asSystem 跳 RLS:
  //   - reconciler 是跨租户的系统职责 (扫全表过期 lease)
  //   - xact 锁随事务自动释放, 不会因连接挪用而泄漏
  //   - 同事务批量过期处理, 与其他写入隔离
  await asSystem(async (tx) => {
    const got = await tx<{ ok: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(${RECONCILER_LOCK}) AS ok
    `;
    if (!got[0]?.ok) return;

    const expired = await tx<OutboxRow[]>`
      SELECT * FROM outbox
      WHERE status = 'leased' AND expected_by < NOW()
      ORDER BY expected_by ASC
      LIMIT 100
    `;
    if (expired.length === 0) return;
    console.log(`[reconciler] found ${expired.length} expired leases`);

    // 批量预取 node_definitions (按 node_key) 和 pipeline_versions (按 item 钉的版本)
    // 不能再按 task_id 预取 pipelines —— item 钉死的可能是旧版本, 当前激活版本不一定相同
    const nodeKeys = [...new Set(expired.map((e) => e.node_key))];
    const itemIds = [...new Set(expired.map((e) => e.item_id))];

    const nodes = await tx<NodeDefinition[]>`
      SELECT DISTINCT ON (key) * FROM node_definitions
      WHERE key IN ${tx(nodeKeys)}
      ORDER BY key, version DESC
    `;
    const nodeByKey = new Map(nodes.map((n) => [n.key, n]));

    const stepsByItem = new Map<string, StepConfig[]>();
    if (itemIds.length > 0) {
      const rows = await tx<{ item_id: string; steps: StepConfig[] }[]>`
        SELECT i.id AS item_id, pv.steps
        FROM items i JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
        WHERE i.id IN ${tx(itemIds)}
      `;
      for (const r of rows) stepsByItem.set(r.item_id, r.steps);
    }

    for (const ob of expired) {
      const node = nodeByKey.get(ob.node_key) ?? null;
      const stepPolicy =
        stepsByItem.get(ob.item_id)?.find((s) => s.key === ob.step_key)?.policy ?? null;
      await reconcileOne(tx, ob, node, stepPolicy);
    }
  });
}

async function reconcileOne(
  tx: SQL,
  ob: OutboxRow,
  node: NodeDefinition | null,
  stepPolicy: { maxAttempts?: number; baseBackoffMs?: number } | null,
) {
  const maxAttempts = stepPolicy?.maxAttempts ?? node?.default_max_attempts ?? 3;
  const baseBackoff = stepPolicy?.baseBackoffMs ?? 1000;
  const canRetry = !!node?.idempotent && ob.attempt < maxAttempts;

  // 1. 写 timeout attempt (新行继承原 outbox 行的 tenant_id)
  await tx`
    INSERT INTO attempts (
      tenant_id, run_id, item_id, task_id, step_key, node_key, attempt, outcome,
      worker_id, started_at, finished_at
    ) VALUES (
      ${ob.tenant_id}, ${ob.run_id}, ${ob.item_id}, ${ob.task_id}, ${ob.step_key}, ${ob.node_key},
      ${ob.attempt}, 'timeout', ${ob.leased_by}, ${ob.leased_at}, NOW()
    )
  `;

  // 2. 关闭当前 run
  await tx`
    UPDATE outbox SET status = 'failed', updated_at = NOW()
    WHERE run_id = ${ob.run_id}
  `;

  if (canRetry) {
    const delayMs = Math.round(baseBackoff * Math.pow(2, ob.attempt - 1));
    const scheduledAt = new Date(Date.now() + delayMs);
    await tx`
      INSERT INTO outbox (
        tenant_id, item_id, task_id, step_key, node_key, status, attempt, scheduled_at
      ) VALUES (
        ${ob.tenant_id}, ${ob.item_id}, ${ob.task_id}, ${ob.step_key}, ${ob.node_key},
        'pending', ${ob.attempt + 1}, ${scheduledAt}
      )
    `;
  } else {
    await tx`
      UPDATE items SET current_step = 'stuck', updated_at = NOW()
      WHERE id = ${ob.item_id}
    `;
    await tx`
      INSERT INTO attempts (
        tenant_id, run_id, item_id, task_id, step_key, node_key, attempt, outcome,
        error, finished_at
      ) VALUES (
        ${ob.tenant_id}, ${ob.run_id}, ${ob.item_id}, ${ob.task_id}, ${ob.step_key}, ${ob.node_key},
        ${ob.attempt}, 'dlq',
        ${sql.json({ reason: "timeout, retries exhausted or non-idempotent" })},
        NOW()
      )
    `;
    auditSystem(ob.tenant_id, "system:reconciler", "item.dlq",
      { kind: "item", id: ob.item_id },
      { stepKey: ob.step_key, attempt: ob.attempt },
      { reason: "timeout, retries exhausted or non-idempotent" });
  }
}
