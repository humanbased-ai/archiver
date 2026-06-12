/**
 * collect driver — 人工表单采集节点
 *
 * 运行模式: manual (skipAutoLease=true)
 *   - autoworker 不 lease collect 队列; C 端通过 /api/collect/:itemId/claim 认领
 *   - /api/collect/:itemId/submit 提交表单 → 业务层写 /result → 推进到下一个 step
 *
 * 配置核心:
 *   params.schema   — JSON Schema 声明表单字段; C 端 RJSF 直接消费
 *   params.uiSchema — RJSF uiSchema, 控制控件样式 (可选)
 *   step.inputs     — 把 envelope 字段注入上下文 (可用作表单默认值 / 参考信息)
 *
 * 关键约束:
 *   - 每条 item 生成一个 outbox run; claim 是认领具体 run_id, 不是随机抢
 *   - supportsDryRun: true → dry-run 时 inputs = 模拟表单提交, driver 校验 required 后返回 output
 *   - idempotent: false — 人工提交不应自动重试; 打回走 business.ts redo 端点
 */

import { registerDriver, type DriverJob, type DriverResult } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";
import { InProcessNode } from "./base/index.ts";

export const nodeDefinition: DriverNodeDefinition = {
  key: "collect",
  version: "1.0",
  displayName: "人工采集 Collect",
  category: "manual",
  runMode: "manual",
  manual: true,
  supportsDryRun: true,
  description:
    "人工填写表单采集节点。autoworker 不自动处理；C 端用户通过 `/api/collect/:itemId/claim` 认领，" +
    "`/api/collect/:itemId/submit` 提交表单，表单字段作为 output 推进 pipeline。\n\n" +
    "`params.schema` 声明表单控件 (JSON Schema 形态，RJSF 直接消费)；" +
    "`params.uiSchema` 控制控件样式 (可选)；" +
    "`step.inputs` 可把 envelope 字段注入上下文，供 C 端展示参考信息或预填默认值。\n\n" +
    "**dry-run**: 把要模拟的表单提交数据填在 `inputs` 面板，driver 会按 `params.schema.required` 做校验，" +
    "通过则把 `inputs` 原样作为 output 返回 — 等同于 C 端提交的效果。",
  inputsSchema: {
    type: "object",
    description: "dry-run 时在此填写模拟提交的表单数据 (字段由 params.schema 定义)；生产路径下此字段由 C 端 submit 覆盖。",
    properties: {},
  },
  paramsSchema: {
    type: "object",
    properties: {
      schema: {
        type: "object",
        description: "表单字段声明 (JSON Schema style), C 端 RJSF 按此渲染输入控件",
      },
      uiSchema: {
        type: "object",
        description: "RJSF uiSchema, 控制控件样式 / 顺序 / widget 类型 (可选)",
      },
      max_concurrent_per_user: {
        type: "number",
        default: 1,
        description: "单用户最多同时认领几条 (并发上限)",
      },
      max_total_per_user: {
        type: "number",
        default: 99,
        description: "单用户最多提交几条 (整个 batch 配额)",
      },
    },
  },
  uiSchema: {
    fields: {
      schema:                  { widget: "json-editor" },
      uiSchema:                { widget: "json-editor" },
      max_concurrent_per_user: { widget: "number" },
      max_total_per_user:      { widget: "number" },
    },
  },
  outputsSchema: {
    type: "object",
    description: "用户提交的表单字段透传到 outputs[stepKey]。具体字段由 params.schema 决定，不做强校验。",
  },
  outputsValidation: "off",
  idempotent: false,
  defaultTimeoutMs: 86_400_000,
  defaultMaxAttempts: 1,
  examples: [
    {
      title: "1. 纯文本采集 — 参考原文 + 采集内容",
      description:
        "step.inputs 把 payload.rawText 绑定到 sourceText (readonly 参考字段)；" +
        "采集员在 text 字段填写采集内容。uiSchema 一套描述两种角色：只读回填 + 可编辑提交。",
      step: {
        params: {
          schema: {
            type: "object",
            required: ["text"],
            properties: {
              sourceText: { type: "string", title: "原始文本 (参考)" },
              text:       { type: "string", title: "采集内容", minLength: 1 },
            },
          },
          uiSchema: {
            sourceText: { "ui:widget": "textarea", "ui:readonly": true, "ui:rows": 3 },
            text:       { "ui:widget": "textarea", "ui:placeholder": "请输入采集内容…", "ui:rows": 4 },
          },
          max_concurrent_per_user: 1,
          max_total_per_user: 99,
        },
        inputs: {
          sourceText: "{{payload.rawText}}",
        },
      },
      envelope: {
        payload: { rawText: "这是一段来自上游的原始文本，供采集员参考并填写采集内容。" },
        outputs: {},
        tags: {},
      },
    },
    {
      title: "2. 校对复核表单 — 原文只读 + 判定可编辑",
      description:
        "step.inputs 把 payload.originalText 绑定到 originalText (readonly)；" +
        "annotator 填写质量判定 (radio) + 可选备注。" +
        "同一套 uiSchema：ui:readonly 字段来自上下文绑定，其余字段为用户新输入。",
      step: {
        params: {
          schema: {
            type: "object",
            required: ["quality"],
            properties: {
              originalText: { type: "string", title: "原文 (只读参考)" },
              quality: {
                type: "string",
                title: "质量判定",
                enum: ["pass", "fail", "skip"],
              },
              note: { type: "string", title: "备注 (可选)" },
            },
          },
          uiSchema: {
            originalText: { "ui:widget": "textarea", "ui:readonly": true, "ui:rows": 3 },
            quality:      { "ui:widget": "radio", "ui:enumNames": ["通过", "不通过", "跳过"] },
            note:         { "ui:widget": "textarea", "ui:rows": 2, "ui:placeholder": "可选，不通过时说明原因" },
          },
          max_concurrent_per_user: 1,
          max_total_per_user: 20,
        },
        inputs: {
          originalText: "{{payload.originalText}}",
        },
      },
      envelope: {
        payload: { originalText: "待校对的原始文本示例，生产环境下此字段由上游节点输出填入。" },
        outputs: {},
        tags: {},
      },
    },
  ],
};

export class CollectNode extends InProcessNode {
  readonly nodeDefinition = nodeDefinition;

  public override get name(): string { return "builtin:collect"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    if (job.ctx.dryRun) {
      // dry-run: job.inputs = 模拟的 C 端表单提交数据
      // 按 params.schema.required 做校验，通过则原样返回作为 output
      const schema = job.params.schema as { required?: string[] } | undefined;
      const missing = (schema?.required ?? []).filter(
        (k) => job.inputs[k] === undefined || job.inputs[k] === null || job.inputs[k] === "",
      );
      if (missing.length > 0) {
        return {
          status: "failed",
          error: {
            code: "MISSING_REQUIRED",
            message: `模拟提交缺少必填字段: ${missing.join(", ")}`,
            retryable: false,
          },
        };
      }
      return { status: "success", output: { ...job.inputs, dryRun: true } };
    }
    // 生产路径: collect 是人工节点, 走 C 端 claim/submit; autoworker 不会调到这里 (skipAutoLease=true)
    return {
      status: "failed",
      error: { code: "MANUAL_NODE", message: "collect 是人工节点, 请通过 C 端 claim/submit 完成", retryable: false },
    };
  }
}

export function registerCollectDriver() {
  registerDriver({ ...new CollectNode().asDriver(), skipAutoLease: true });
}
