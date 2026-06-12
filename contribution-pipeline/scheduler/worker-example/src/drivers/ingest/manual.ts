/**
 * Manual driver: 给手动 / 测试 / 通用情况兜底,
 * 仅做一次 ack, 不读 payload, 不做校验。
 */
import type { IngestDriver } from "./index.ts";

export const manualDriver: IngestDriver = {
  source: "manual",
  description: "Manual / generic ingest, no validation",
  async handle(job) {
    return {
      output: {
        acknowledged: true,
        source: "manual",
        receivedAt: new Date().toISOString(),
      },
    };
  },
};
