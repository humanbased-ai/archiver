/**
 * Form driver: 来自前端表单提交的 ingest。
 * - 按 params.schema.required 做 required 字段校验
 * - 校验失败 -> retryable=false (脏数据丢 DLQ, 不要重试)
 */
import type { IngestDriver } from "./index.ts";

type JsonSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
};

export const formDriver: IngestDriver = {
  source: "form",
  description: "Web form submission with schema validation",
  async handle(job) {
    const schema = job.params.schema as JsonSchema | undefined;
    const payload = job.envelope.payload ?? {};
    const required = schema?.required ?? [];
    const missing = required.filter((k) => {
      const v = (payload as Record<string, unknown>)[k];
      return v === undefined || v === null || v === "";
    });
    if (missing.length > 0) {
      return {
        status: "failed",
        error: {
          code: "MISSING_REQUIRED",
          message: `payload missing required field(s): ${missing.join(", ")}`,
          retryable: false,
        },
      };
    }
    return {
      output: {
        acknowledged: true,
        source: "form",
        fieldCount: Object.keys(payload).length,
        receivedAt: new Date().toISOString(),
      },
    };
  },
};
