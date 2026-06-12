/**
 * export driver — 成品入库
 *
 * 行为: 把 job.inputs (step.inputs 映射的字段) 写到 dataset_records
 */

import { schedPost } from "./_client.ts";
import { registerDriver, type DriverJob, type DriverResult } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";
import { InProcessNode } from "./base/index.ts";

export const nodeDefinition: DriverNodeDefinition = {
  key: "export",
  version: "1.0",
  displayName: "导出 Export",
  category: "data",
  runMode: "embedded",
  description: "把 step.inputs 映射的字段落到 dataset_records, 作为 pipeline 终态节点。pipeline 作者在 step.inputs 里声明要归档的字段 (可用 `{{payload}}` 存整包, 也可按字段选取)。",
  inputsSchema: {
    type: "object",
    properties: {},
  },
  outputsSchema: {
    type: "object",
    properties: {
      stored: { type: "boolean", description: "写入成功" },
    },
  },
  paramsSchema: {
    type: "object",
    properties: {
      format: { type: "string", enum: ["json", "csv"], default: "json" },
    },
  },
  uiSchema: {
    fields: {
      format: { widget: "select", options: [["json","JSON"],["csv","CSV"]] },
    },
  },
  presets: {
    defaults: { format: "json" },
  },
  idempotent: true,
  defaultTimeoutMs: 30_000,
  defaultMaxAttempts: 3,
  manual: false,
  // dry-run 时不写 dataset_records, 返回 stored=true 但 dryRun 标记
  supportsDryRun: true,
  examples: [
    {
      title: "选字段归档 (JSON)",
      description: "step.inputs 声明要持久化的字段; driver 把 job.inputs 整包写入 dataset_records. 想存整包 payload 用 {{payload}}, 想精选字段按需映射.",
      step: {
        params: { format: "json" },
        inputs: {
          text:   "{{payload.text}}",
          review: "{{outputs.review}}",
        },
      },
      envelope: {
        payload: { text: "我是一条示例数据" },
        outputs: { review: { decision: "approved", score: 0.92 } },
        tags: {},
      },
    },
  ],
};

export class ExportNode extends InProcessNode {
  readonly nodeDefinition = nodeDefinition;

  public override get name(): string { return "builtin:export"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    // dry-run: 不调 /dataset/records/save (不落 dataset_records), 返回 mock 结构
    if (job.ctx.dryRun) {
      return { status: "success", output: { stored: true, dryRun: true } };
    }

    await schedPost(
      "/dataset/records/save",
      {
        taskId: job.taskId,
        itemId: job.itemId,
        payload: job.inputs,        // dataset_records.payload 存的是 job.inputs 字段集合
        metadata: { stepKey: job.stepKey },
      },
      job.tenantId,
    );

    return { status: "success", output: { stored: true } };
  }
}

export function registerExportDriver() {
  registerDriver(new ExportNode().asDriver());
}
