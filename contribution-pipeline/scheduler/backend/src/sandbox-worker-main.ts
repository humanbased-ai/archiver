/**
 * sandbox-worker 独立进程入口
 *
 * 运行方式:
 *   npm run sandbox-worker                  # 前台, dev 模式 (watch)
 *   SCHEDULER_BASE_URL=http://sched:4000 \
 *   SCHEDULER_API_KEY=<key> \
 *   npm run sandbox-worker                  # 生产模式
 *
 * 环境变量:
 *   SCHEDULER_BASE_URL   调度核心地址 (default: http://localhost:4000)
 *   SCHEDULER_API_KEY    API key, 需 queue.lease + queue.result 权限 (default: 同进程 INTERNAL_KEY)
 *   WORKER_ID            唯一 worker ID (default: sandbox-worker-<pid>)
 *   LEASE_SECONDS        lease 时长秒 (default: 60)
 *   BATCH_SIZE           单次 lease 拉取数 (default: 1)
 */

import { SandboxWorkerNode } from "./drivers/sandbox-worker-node.ts";
import { getInternalKey } from "./auth.ts";

const node = new SandboxWorkerNode();

async function main() {
  const baseUrl = process.env.SCHEDULER_BASE_URL ?? "http://localhost:4000";
  // 未配置 SCHEDULER_API_KEY 时回落到 INTERNAL_KEY (同机器部署, dev 友好)
  const apiKey  = process.env.SCHEDULER_API_KEY  || getInternalKey();
  const workerId = process.env.WORKER_ID ?? `sandbox-worker-${process.pid}`;

  await node.start({
    schedulerBaseUrl: baseUrl,
    apiKey,
    workerId,
    nodeKey:      "script",
    leaseSeconds: Number(process.env.LEASE_SECONDS ?? "60"),
    batchSize:    Number(process.env.BATCH_SIZE    ?? "1"),
  });

  const shutdown = async (sig: string) => {
    console.log(`[sandbox-worker] ${sig} received`);
    await node.stop();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT",  () => void shutdown("SIGINT"));
}

main().catch((e) => {
  console.error("[sandbox-worker] fatal:", e);
  process.exit(1);
});
