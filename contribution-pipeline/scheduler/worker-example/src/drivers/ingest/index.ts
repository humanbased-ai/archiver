/**
 * Ingest 驱动注册表 (折中模式 / Driver Pattern)
 *
 * - 只有一个 ingest worker 进程, 拉同一个队列 (nodeKey=ingest)
 * - 进程内根据 params.source 派发到不同的 driver 模块
 * - 新增数据源 = 新建一个文件 + 在 register 这里登记一行
 *
 * 失败 / 重试 / 队列由统一的 worker.ts 管;
 * driver 只负责把 params + envelope 转成业务 output。
 */

export type IngestJob = {
  runId: string;
  itemId: string;
  taskId: string;
  stepKey: string;
  nodeKey: string;
  params: Record<string, unknown>;
  envelope: {
    payload: Record<string, unknown>;
    outputs: Record<string, unknown>;
    tags: Record<string, string>;
  };
};

export type IngestResult = {
  output?: Record<string, unknown>;
  status?: "success" | "failed";
  error?: { code: string; message: string; retryable?: boolean };
};

export type IngestDriver = {
  /** 用于 params.source 匹配 */
  source: string;
  /** 短描述, 启动时打印 */
  description?: string;
  handle: (job: IngestJob) => Promise<IngestResult>;
};

import { manualDriver } from "./manual.ts";
import { formDriver } from "./form.ts";
import { scriptDriver } from "./script.ts";

const drivers: Record<string, IngestDriver> = {};

function register(d: IngestDriver) {
  drivers[d.source] = d;
}

register(manualDriver);
register(formDriver);
register(scriptDriver);

export function listDrivers(): string[] {
  return Object.keys(drivers);
}

export async function dispatchIngest(job: IngestJob): Promise<IngestResult> {
  const source = (job.params.source as string | undefined) ?? "manual";
  const driver = drivers[source];
  if (!driver) {
    return {
      status: "failed",
      error: {
        code: "UNKNOWN_INGEST_SOURCE",
        message: `no driver registered for source=${source}`,
        retryable: false,
      },
    };
  }
  return driver.handle(job);
}
