/**
 * AutoWorker — 薄循环, 不感知具体节点
 *
 * 设计:
 *   1. 启动时引导一次 driver registry (registerDedup/Export/SandboxJs/Http)
 *   2. 主循环按 autoNodeKeys() 列表逐个 nodeKey lease
 *   3. lease 到的 job 派发到 pickDriver(job) — 没匹配 → /result failed NO_DRIVER
 *   4. driver.handle 返回 DriverResult → POST /result
 *
 * 加新自动节点 = 写一个 driver + register, autoworker 一行不改。
 *
 * 跨租户: autoworker 是系统 actor, schedPost 通过 INTERNAL_KEY 不带 X-Tenant-Id → asSystem。
 *        lease 返回的每个 job 携带 tenantId, driver 调子接口时按 job.tenantId 转发。
 */

import type { FastifyInstance } from "fastify";
import { schedPost, bindApp } from "./drivers/_client.ts";
import {
  pickDriver,
  toResultBody,
  toFailedResult,
  autoNodeKeys,
  type DriverJob,
} from "./drivers/registry.ts";
import { registerDedupDriver } from "./drivers/dedup.ts";
import { registerExportDriver } from "./drivers/export.ts";
import { registerSandboxJsDriver } from "./drivers/sandbox-js.ts";
import { registerHttpDriver } from "./drivers/http.ts";
import { registerLlmTranslateDriver } from "./drivers/llm-translate.ts";
import { registerComputeDriver } from "./drivers/compute.ts";
import { registerCollectDriver } from "./drivers/collect.ts";
import { registerIngestDriver } from "./drivers/ingest.ts";
import { upsertCollectedNodeDefinitions } from "./drivers/_upsert.ts";

export const AUTOWORKER_ID = "auto-worker";
const WORKER_ID = AUTOWORKER_ID;

let stopped = false;
let pendingTimer: NodeJS.Timeout | null = null;
let bootstrapped = false;

async function bootstrapDrivers(): Promise<void> {
  if (bootstrapped) return;
  registerDedupDriver();
  registerExportDriver();
  registerSandboxJsDriver();
  registerComputeDriver();
  registerHttpDriver();
  registerLlmTranslateDriver(); // ANTHROPIC_API_KEY 缺时自动跳过
  registerCollectDriver();       // manual=true, skipAutoLease: 仅 upsert + dry-run, C 端 claim/submit
  registerIngestDriver();        // external_worker, skipAutoLease: 仅 upsert + dry-run, 真实 job 走 worker-example
  // driver 注册完成后, 把它们携带的 nodeDefinition UPSERT 进 DB.
  // 这里失败必须抛出, 阻断 autoworker 启动 — driver 跟 DB schema 漂移会埋下 silent bug.
  await upsertCollectedNodeDefinitions();
  bootstrapped = true;
}

// 没匹配到 driver 的 job (典型是 ingest source=form/manual 等人工节点) 把租约 park 给人工:
// 既不 /result failed (避免被算作失败 → 重试耗尽 → stuck), 也不立即重新 lease (避免热循环)。
const NO_DRIVER_PARK_SECONDS = 60;

async function processOne(nodeKey: string): Promise<number> {
  // lease 是跨租户操作: 传 null tenantId → schedPost 不带 X-Tenant-Id → 调度核心 isSystemActor=true → asSystem
  const resp = await schedPost<{ jobs: DriverJob[] }>(
    `/queue/${nodeKey}/lease`,
    { workerId: WORKER_ID, batchSize: 5, leaseSeconds: 30 },
    null,
  );
  const jobs = resp.jobs ?? [];
  for (const job of jobs) {
    const driver = pickDriver(job);
    if (!driver) {
      // 让出给人工 claim: 释放租约并把 scheduled_at 推到未来, 短期内不会被 autoworker 再领走
      await schedPost(
        `/queue/lease/${job.runId}/release`,
        { workerId: WORKER_ID, parkSeconds: NO_DRIVER_PARK_SECONDS },
        job.tenantId,
      ).catch((e) => console.warn("[autoworker] park-release failed for run", job.runId, e));
      continue;
    }

    let result;
    try {
      result = await driver.handle(job);
    } catch (e) {
      console.error(`[autoworker:${driver.name}] run`, job.runId, e);
      result = toFailedResult(e, "DRIVER_EXCEPTION");
    }
    try {
      await schedPost("/result", toResultBody(job.runId, result), job.tenantId);
    } catch (e) {
      console.error("[autoworker] /result failed for run", job.runId, e);
    }
  }
  return jobs.length;
}

// 空轮询退避: idle 时把 tick 间隔从 2s 拉到 10s, 省 ~80% 空 lease SQL.
// 任一 nodeKey 拿到 job 立即把间隔打回 2s — "热路径" 仍是秒级响应.
//
// 参数权衡:
//   IDLE_THRESHOLD=5 → 连续 10s 空闲才进退避态, 一次 ingest 抖动不会触发
//   IDLE_TICK_MS=10s → 退避态下单次新任务最多等 10s, 体感可接受
//
// 注: 这是"省 idle 空查询"的本地优化, 不是事件驱动. 真正零浪费要等 P1 上 LISTEN/NOTIFY.
//     当前规模 (<50 节点) 退避就够了, NOTIFY 留到节点过百再做.
const ACTIVE_TICK_MS = 2000;
const IDLE_TICK_MS   = 10_000;
const IDLE_THRESHOLD = 5;

export async function startAutoWorker(app: FastifyInstance): Promise<void> {
  bindApp(app);
  await bootstrapDrivers();
  stopped = false;
  console.log(`[autoworker] started; drivers cover nodeKeys: ${autoNodeKeys().join(", ")}`);

  let consecutiveEmpty = 0;
  const loop = async () => {
    if (stopped) return;
    // 串行扫每个 nodeKey, 串行也避免一个 nodeKey 卡住其它。
    // 后续要并行可以 Promise.all, 但要注意 lease 的批大小和 backpressure
    let tickJobs = 0;
    for (const nk of autoNodeKeys()) {
      try { tickJobs += await processOne(nk); } catch (e) {
        console.error(`[autoworker:${nk}]`, e);
      }
    }
    if (tickJobs > 0) {
      // 拿到活 → 重置计数, 下轮 2s 后再 tick (热路径)
      consecutiveEmpty = 0;
    } else {
      consecutiveEmpty++;
    }
    const nextMs = consecutiveEmpty >= IDLE_THRESHOLD ? IDLE_TICK_MS : ACTIVE_TICK_MS;
    if (!stopped) pendingTimer = setTimeout(loop, nextMs);
  };
  loop();
}

export function stopAutoWorker() {
  stopped = true;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}
