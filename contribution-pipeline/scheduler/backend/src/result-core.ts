// 提交执行结果的核心逻辑
//
// 设计:
//  - 路由层 (api.ts) 调 applyResult(body) → 自己开 sql.begin
//  - 业务层 (business.ts) 想"业务写入 + 调度推进"原子时, 自己 sql.begin 后传 tx 进来
//  - 错误统一通过 ResultError 抛出, 调用方按 httpStatus/code 翻译

import { sql, type SQL } from "./db.ts";
import { computeNextStep } from "./router.ts";
import { validateNodeOutput, type ValidationMode } from "./output-validator.ts";
import type { Envelope, ItemRow, NodeDefinition, OutboxRow, Pipeline } from "./types.ts";

/**
 * 节点输出隔离: 一个 step 提交的 output 只能写自己的 outputs[stepKey] slot,
 * 不能影响 payload (原始数据) / tags (元数据) / outputs[其他 stepKey]。
 *
 * 双层防御:
 *   1. 应用层 (本函数): 显式逐字段构造 newEnvelope, 不 spread 用户 output 到 payload/tags
 *   2. DB 层 (1715000170000_envelope_isolation.sql trigger): payload/tags UPDATE 一律拒
 *
 * Output 形态校验:
 *   - 必须是 plain object (非 null/array/primitive); 否则 BAD_OUTPUT 400
 *   - 大小硬上限 64 KiB JSON (per-step 容量, 防个别节点输出膨胀拖死全 pipeline)
 */
const STEP_OUTPUT_CAP_BYTES = 64 * 1024;

function sanitizeStepOutput(output: unknown): Record<string, unknown> {
  if (output == null || typeof output !== "object" || Array.isArray(output)) {
    throw new ResultError(400, "BAD_OUTPUT", "step output must be a plain object");
  }
  const json = JSON.stringify(output);
  if (json.length > STEP_OUTPUT_CAP_BYTES) {
    throw new ResultError(
      400, "OUTPUT_TOO_LARGE",
      `step output > ${STEP_OUTPUT_CAP_BYTES} bytes (${json.length} actual)`,
    );
  }
  return output as Record<string, unknown>;
}

function buildIsolatedEnvelope(
  prev: Envelope,
  stepKey: string,
  output: Record<string, unknown>,
): Envelope {
  // 显式逐字段构造, 拒绝用户 output 越权写到 payload/tags/其他 step 的 slot
  const prevOutputs = prev.outputs ?? {};
  const newOutputs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(prevOutputs)) {
    if (k !== stepKey) newOutputs[k] = v; // 其他 step 的 slot 原样保留, 不被本次 output 影响
  }
  newOutputs[stepKey] = output; // 本 step slot, 唯一允许写的位置
  return {
    payload: prev.payload,        // 原始数据不可变 (DB trigger 兜底)
    outputs: newOutputs,
    tags: prev.tags,              // tags 不变 (DB trigger 兜底)
  };
}

export interface ApplyResultBody {
  runId: string;
  status: "success" | "failed";
  output?: Record<string, unknown>;
  error?: { code: string; message: string; retryable?: boolean };
  nextHint?: string;
}

export type ApplyResultOutput =
  | { ok: true; applied: false }
  | { ok: true; applied: true; nextStep: string }
  | { ok: true; applied: true; retryAt: string }
  | { ok: true; applied: true; dlq: true };

export class ResultError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ResultError";
  }
}

// 主入口: tx 缺省时自己开事务, 提供时复用调用方事务
export async function applyResult(
  body: ApplyResultBody,
  tx?: SQL,
): Promise<ApplyResultOutput> {
  const runInTx = (t: SQL) => applyResultIn(body, t);
  if (tx) return runInTx(tx);
  return sql.begin((t) => runInTx(t as unknown as SQL)) as Promise<ApplyResultOutput>;
}

async function applyResultIn(body: ApplyResultBody, tx: SQL): Promise<ApplyResultOutput> {
  const obs = await tx<OutboxRow[]>`SELECT * FROM outbox WHERE run_id = ${body.runId}`;
  const ob = obs[0];
  if (!ob) throw new ResultError(404, "UNKNOWN_RUN", "run not found");

  if (ob.status === "done" || ob.status === "failed") {
    return { ok: true, applied: false };
  }

  if (ob.status === "leased" && ob.expected_by && new Date(ob.expected_by) < new Date()) {
    throw new ResultError(409, "LEASE_EXPIRED", "租约已过期，请重新领取任务");
  }

  // outputsSchema 强校验 (06-node-design §4.4):
  //   business 说 success 但输出不符契约 → strict 翻转成 failed (retryable=false), warn 仅 console
  //   翻转必须在写 attempts 之前, 让 attempts.outcome 反映"实际生效结果"
  let effectiveBody = body;
  if (body.status === "success" && body.output != null) {
    const lookup = await tx<{
      node_version: string;
      outputs_schema: Record<string, unknown> | null;
      outputs_validation: ValidationMode | null;
    }[]>`
      SELECT
        COALESCE(s->>'nodeVersion', '1.0') AS node_version,
        nd.outputs_schema,
        nd.outputs_validation
      FROM items i
      JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
      JOIN LATERAL jsonb_array_elements(pv.steps) s ON TRUE
      LEFT JOIN node_definitions nd
        ON nd.key = ${ob.node_key}
       AND nd.version = COALESCE(s->>'nodeVersion', '1.0')
      WHERE i.id = ${ob.item_id} AND s->>'key' = ${ob.step_key}
      LIMIT 1
    `;
    const row = lookup[0];
    if (row?.outputs_schema) {
      const violation = validateNodeOutput({
        nodeKey: ob.node_key,
        nodeVersion: row.node_version,
        outputsSchema: row.outputs_schema,
        outputsValidation: row.outputs_validation,
        output: body.output,
      });
      if (violation) {
        const mode: ValidationMode = row.outputs_validation ?? "strict";
        const sample = violation.errors.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join("; ");
        const msg = `节点 ${ob.node_key}@${row.node_version} 输出不符 outputsSchema: ${sample}${violation.errors.length > 3 ? " ..." : ""}`;
        if (mode === "strict") {
          // 翻转 success → failed retryable=false. attempts 会记 outcome=failed + error=OUTPUT_SCHEMA_VIOLATION,
          // outbox 走 applyFailed 路径直接进 DLQ (重试无意义, driver 行为不变就还是不符 schema)
          effectiveBody = {
            ...body,
            status: "failed",
            output: undefined,
            error: { code: "OUTPUT_SCHEMA_VIOLATION", message: msg, retryable: false },
          };
        } else {
          // warn: 不翻转, 但留下记录. console 写 (audit 异步写跨 tx 不挡主流程, 这里足够)
          console.warn(`[output-validator:warn] run=${body.runId} ${msg}`);
        }
      }
    }
  }

  // 1. 写 attempts (派生 tenant_id 来自 outbox 行)
  await tx`
    INSERT INTO attempts (
      tenant_id, run_id, item_id, task_id, step_key, node_key, attempt, outcome,
      output, error, worker_id, started_at, finished_at
    ) VALUES (
      ${ob.tenant_id}, ${ob.run_id}, ${ob.item_id}, ${ob.task_id}, ${ob.step_key}, ${ob.node_key},
      ${ob.attempt}, ${effectiveBody.status === "success" ? "success" : "failed"},
      ${effectiveBody.output ? sql.json(effectiveBody.output) : null},
      ${effectiveBody.error ? sql.json(effectiveBody.error) : null},
      ${ob.leased_by}, ${ob.leased_at}, NOW()
    )
  `;

  if (effectiveBody.status === "success") {
    return await applySuccess(effectiveBody, tx, ob);
  }
  return await applyFailed(effectiveBody, tx, ob);
}

async function applySuccess(
  body: ApplyResultBody,
  tx: SQL,
  ob: OutboxRow,
): Promise<ApplyResultOutput> {
  const its = await tx<ItemRow[]>`SELECT * FROM items WHERE id = ${ob.item_id}`;
  const it = its[0];
  // item 钉的 pipeline 版本: save 后路由仍按原版本走
  const pipe = await tx<{ steps: Pipeline }[]>`
    SELECT steps FROM pipeline_versions WHERE id = ${it.pipeline_version_id}
  `;
  const route = computeNextStep(
    pipe[0].steps,
    ob.step_key,
    body.output ?? {},
    body.nextHint,
    it.loop_counts ?? {},
  );

  const safeOutput = sanitizeStepOutput(body.output ?? {});
  const newEnvelope = buildIsolatedEnvelope(
    {
      payload: it.envelope.payload ?? {},
      outputs: it.envelope.outputs ?? {},
      tags: it.envelope.tags ?? {},
    },
    ob.step_key,
    safeOutput,
  );
  const newLoopCounts = route.loopIncrement
    ? {
        ...(it.loop_counts ?? {}),
        [route.loopIncrement.stepKey]:
          (it.loop_counts?.[route.loopIncrement.stepKey] ?? 0) + route.loopIncrement.value,
      }
    : it.loop_counts;

  await tx`
    UPDATE items SET
      envelope = ${sql.json(newEnvelope)},
      current_step = ${route.nextStepKey},
      loop_counts = ${sql.json(newLoopCounts ?? {})},
      updated_at = NOW()
    WHERE id = ${ob.item_id}
  `;
  await tx`UPDATE outbox SET status='done', updated_at=NOW() WHERE run_id=${ob.run_id}`;

  if (route.nextStepKey !== "done" && route.nextStepKey !== "stuck") {
    const nextStep = pipe[0].steps.find((s) => s.key === route.nextStepKey)!;
    await tx`
      INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
      VALUES (${ob.tenant_id}, ${ob.item_id}, ${ob.task_id}, ${route.nextStepKey}, ${nextStep.nodeKey}, 'pending', 1)
    `;
  }

  return { ok: true, applied: true, nextStep: route.nextStepKey };
}

async function applyFailed(
  body: ApplyResultBody,
  tx: SQL,
  ob: OutboxRow,
): Promise<ApplyResultOutput> {
  const retryable = body.error?.retryable !== false;
  const node = await tx<NodeDefinition[]>`
    SELECT * FROM node_definitions WHERE key = ${ob.node_key} ORDER BY version DESC LIMIT 1
  `;
  // policy 也走 item 钉的版本
  const pipe = await tx<{ steps: Pipeline }[]>`
    SELECT pv.steps FROM items i
    JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
    WHERE i.id = ${ob.item_id}
  `;
  const policy = pipe[0]?.steps.find((s) => s.key === ob.step_key)?.policy;
  const maxAttempts = policy?.maxAttempts ?? node[0]?.default_max_attempts ?? 3;
  const baseBackoff = policy?.baseBackoffMs ?? 1000;

  await tx`UPDATE outbox SET status='failed', updated_at=NOW() WHERE run_id=${ob.run_id}`;

  if (retryable && ob.attempt < maxAttempts) {
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
    return { ok: true, applied: true, retryAt: scheduledAt.toISOString() };
  }

  await tx`UPDATE items SET current_step='stuck', updated_at=NOW() WHERE id=${ob.item_id}`;
  return { ok: true, applied: true, dlq: true };
}
