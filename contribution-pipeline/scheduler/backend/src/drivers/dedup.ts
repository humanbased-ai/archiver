/**
 * dedup driver — 字段级去重
 *
 * 行为:
 *   1. 按 params.dedupFields 从 job.inputs 抽出 hash 输入(缺省对所有 inputs 字段计 hash)
 *   2. POST /api/v1/dedup/check 原子写 dedup_keys
 *   3. 命中 → output { decision: "duplicate", deduped: true, hash, firstItemId? }
 *      未命中 → output { decision: "keep", deduped: false, hash }
 *   4. 撞重时通知业务层, 在对应 submission 落 result
 *
 * 业务层通知失败不阻塞调度主流程 (设计: 业务侧用 audit_log + 定时对账兜底)
 */

import { createHash } from "node:crypto";
import { schedPost, notifyBusinessResult } from "./_client.ts";
import { registerDriver, type DriverJob, type DriverResult } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";
import { InProcessNode } from "./base/index.ts";

export const nodeDefinition: DriverNodeDefinition = {
  key: "dedup",
  version: "1.0",
  displayName: "去重 Dedup",
  category: "data",
  runMode: "embedded",
  description: "按 params.dedupFields 计 hash, 调 /api/v1/dedup/check 做字段级原子去重。命中输出 decision='duplicate', 未命中 'keep'。\n\n**接入规则**: dedupFields 填 inputs 字段名 (例 `text`), pipeline 作者在 step.inputs 里把 envelope 字段映射进来。",
  inputsSchema: {
    type: "object",
    properties: {},
  },
  outputsSchema: {
    type: "object",
    properties: {
      decision:    { type: "string", enum: ["keep", "duplicate"], description: "用于 step.routes 分支" },
      hash:        { type: "string", description: "16 字符短 hash" },
      deduped:     { type: "boolean" },
      firstItemId: { type: "string", description: "撞重时首次落库 item id" },
    },
  },
  paramsSchema: {
    type: "object",
    properties: {
      algo:        { type: "string", default: "exact" },
      dedupFields: { type: "array", items: { type: "string" }, description: "inputs 字段名列表; 缺省时按所有 inputs 字段计 hash" },
    },
  },
  uiSchema: {
    fields: {
      algo:        { widget: "select", options: [["exact","精确"]] },
      dedupFields: { widget: "string-list", hint: "inputs 字段名, 一行一个 (例: text, source)" },
    },
  },
  presets: {
    defaults: { algo: "exact" },
  },
  idempotent: true,
  defaultTimeoutMs: 10_000,
  defaultMaxAttempts: 3,
  manual: false,
  // 调试 dry-run 时 driver 跳过 /dedup/check (不写 dedup_keys), 返回 mock decision.
  supportsDryRun: true,
  examples: [
    {
      title: "按 text 单字段去重",
      description: "最常见: 采集后立刻去重, 命中 duplicate 走拒收分支, keep 进下一步. pipeline 作者把 payload.text 映射到 inputs.text.",
      step: {
        params: { dedupFields: ["text"] },
        inputs: { text: "{{payload.text}}" },
        routes: {
          on: "decision",
          cases: { duplicate: "done", keep: "next" },
        },
      },
      envelope: { payload: { text: "测试文本 A" }, outputs: {}, tags: {} },
    },
    {
      title: "多字段联合 hash",
      description: "对 (source, externalId) 组合去重. pipeline 作者在 step.inputs 里把两个 payload 字段映射进来; driver 只认 inputs 字段名.",
      step: {
        params: { dedupFields: ["source", "externalId"] },
        inputs: { source: "{{payload.source}}", externalId: "{{payload.externalId}}" },
      },
      envelope: {
        payload: { source: "import", externalId: "EXT-001", text: "x" },
        outputs: {}, tags: {},
      },
    },
  ],
};

export class DedupNode extends InProcessNode {
  readonly nodeDefinition = nodeDefinition;

  // 兼容老 name (跟旧字面量 driver 一样, 测试 / 日志保持稳定)
  public override get name(): string { return "builtin:dedup"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    const params = job.params;
    const dedupFields = (params.dedupFields as string[] | undefined) ?? [];

    // 所有数据通过 step.inputs 映射进来; driver 只读 job.inputs, 不直接读 envelope
    const inputs = job.inputs;
    const hashInput: Record<string, unknown> =
      dedupFields.length > 0
        ? Object.fromEntries(dedupFields.map((f) => [f, inputs[f]]))
        : inputs;

    const hash = createHash("sha256")
      .update(JSON.stringify(hashInput))
      .digest("hex")
      .slice(0, 16);

    // dry-run: 不写 dedup_keys, 不通知业务层. 计算 hash 是纯运算, 保留以展示真实输出形态.
    if (job.ctx.dryRun) {
      return {
        status: "success",
        output: { decision: "keep", hash, deduped: false, dryRun: true },
      };
    }

    const dedupResp = await schedPost<{ kept: boolean; firstItemId?: string }>(
      "/dedup/check",
      {
        taskId: job.taskId,
        itemId: job.itemId,
        stepKey: job.stepKey,
        hash,
        fields: hashInput,
      },
      job.tenantId,
    );

    if (dedupResp.kept) {
      return { status: "success", output: { decision: "keep", hash, deduped: false } };
    }

    // 撞重: 业务层落"被拒事件", 失败不影响主流程
    notifyBusinessResult(job.tenantId, job.itemId, "ingest", "duplicate", `撞重 hash=${hash}`).catch(
      () => {},
    );
    return {
      status: "success",
      output: { decision: "duplicate", hash, deduped: true, firstItemId: dedupResp.firstItemId },
    };
  }
}

export function registerDedupDriver() {
  registerDriver(new DedupNode().asDriver());
}
