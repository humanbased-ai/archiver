/**
 * ingest driver stub — 仅用于 nodeDefinition upsert + dry-run
 *
 * 真实 job 由外部 worker 进程 (worker-example) 拉取执行:
 *   - worker-example/src/worker.ts 直接 POST /queue/ingest/lease
 *   - 调度器主进程不参与 lease 循环 (skipAutoLease = true)
 *
 * 为什么需要这个 stub:
 *   - nodeDefinition 需要注册进 node_definitions 表 (描述/schema/examples 供管理后台展示)
 *   - 管理后台 dry-run 端点需要在当前进程找到 driver.handle()
 *   - 外部 worker 进程无法响应 dry-run (独立进程, 没有 HTTP 入口)
 *
 * params.source 决定派发到哪个子驱动:
 *   manual — 通用占位, 不校验, 直接 ack
 *   form   — 校验 params.schema.required; 字段缺失 → failed retryable=false
 *   script — 用 Node.js 处理 (worker 侧; dry-run 这里返回 mock)
 */

import { registerDriver, type DriverJob, type DriverResult } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";
import { InProcessNode } from "./base/index.ts";

export const nodeDefinition: DriverNodeDefinition = {
  key: "ingest",
  version: "1.0",
  displayName: "采集 Ingest",
  category: "data",
  runMode: "external_worker",
  manual: false,
  supportsDryRun: true,
  description:
    "外部 worker 进程执行的数据采集节点。调度器 lease 任务后由独立 worker 拉取处理。\n\n" +
    "`params.source` 决定采集类型:\n" +
    "- `manual` — 通用占位, 直接 ack, 不校验\n" +
    "- `form` — 前端表单提交; 按 `params.schema.required` 做字段校验\n" +
    "- `script` — Node.js 脚本处理 (worker 侧执行)\n\n" +
    "dry-run 在调度器主进程内模拟 worker 行为, 不实际写库。",
  paramsSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        enum: ["manual", "form", "script"],
        default: "manual",
        description: "采集来源类型; 决定 worker 内部派发到哪个子驱动",
      },
      schema: {
        type: "object",
        description: "form 模式下的字段校验 schema (JSON Schema subset)",
      },
      script: {
        type: "string",
        description: "script 模式下执行的 JS 代码 (worker 侧执行, dry-run 跳过实际运行)",
      },
    },
  },
  uiSchema: {
    fields: {
      source: { widget: "select", options: [["manual","通用"], ["form","表单"], ["script","脚本"]] },
      schema: { widget: "json-editor" },
      script: { widget: "code-editor", language: "javascript" },
    },
  },
  presets: {
    defaults: { source: "manual" },
  },
  outputsSchema: {
    type: "object",
    properties: {
      acknowledged: { type: "boolean" },
      source:       { type: "string" },
      fieldCount:   { type: "number", description: "form 模式: 收到的字段数" },
      receivedAt:   { type: "string", description: "ISO 时间戳" },
    },
  },
  outputsValidation: "warn",
  idempotent: true,
  defaultTimeoutMs: 30_000,
  defaultMaxAttempts: 3,
  examples: [
    {
      title: "source=manual — 通用占位",
      description: "不校验任何字段, 直接 ack. 适合测试 pipeline 拓扑 / 上游 step 没有填写来源时的兜底.",
      step: { params: { source: "manual" } },
      envelope: { payload: { text: "任意内容" }, outputs: {}, tags: {} },
    },
    {
      title: "source=form — 表单字段校验",
      description: "按 params.schema.required 校验 payload 字段。字段缺失 → failed retryable=false（不重试, 走 DLQ）.",
      step: {
        params: {
          source: "form",
          schema: {
            required: ["text", "source"],
            properties: {
              text:   { type: "string", title: "原始文本" },
              source: { type: "string", title: "数据来源" },
            },
          },
        },
      },
      envelope: {
        payload: { text: "这是表单提交的文本内容", source: "web-scraper" },
        outputs: {}, tags: {},
      },
    },
  ],
};

export class IngestNode extends InProcessNode {
  readonly nodeDefinition = nodeDefinition;

  public override get name(): string { return "builtin:ingest-stub"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    const source = (job.params.source as string | undefined) ?? "manual";

    if (source === "form") {
      const schema = job.params.schema as { required?: string[] } | undefined;
      const payload = job.envelope.payload ?? {};
      const missing = (schema?.required ?? []).filter(
        (k) => payload[k] === undefined || payload[k] === null || payload[k] === "",
      );
      if (missing.length > 0) {
        return {
          status: "failed",
          error: {
            code: "MISSING_REQUIRED",
            message: `payload 缺少必填字段: ${missing.join(", ")}`,
            retryable: false,
          },
        };
      }
    }

    return {
      status: "success",
      output: {
        acknowledged: true,
        source,
        fieldCount: Object.keys(job.envelope.payload ?? {}).length,
        receivedAt: new Date().toISOString(),
        ...(job.ctx.dryRun ? { dryRun: true } : {}),
      },
    };
  }
}

export function registerIngestDriver() {
  registerDriver({ ...new IngestNode().asDriver(), skipAutoLease: true });
}
