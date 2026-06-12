/**
 * 通用 worker 模板 (Path C 参考实现)
 *
 * 部署模式:
 *   - 默认:同进程处理所有 nodeKey (适合本地调试)
 *   - 生产:NODE_KEYS=translate npm run worker (一种 nodeKey 一个进程)
 *           NODE_KEYS=ingest,dedup 也支持多种共存
 *
 * 长任务必须做的事 (本模板已内置):
 *   - heartbeat: 每 leaseSeconds/3 调一次 /heartbeat, 防止被 reconciler 收走
 *   - 优雅停机:  SIGTERM/SIGINT → 停 lease → 等 inflight → release 剩余 → 退出
 *   - 空队列退避: 整轮无活时 sleep 久一点, 避免打死调度核心
 *
 * 人工节点 (annotate/review) 不在这里; 由前端 lease/result。
 */
import { fetch } from "undici";
import { dispatchIngest, listDrivers } from "./drivers/ingest/index.ts";

const BASE = process.env.SCHEDULER_URL ?? "http://localhost:4000";
const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`;
const NODE_KEYS_ENV = process.env.NODE_KEYS?.trim();
const API_KEY = process.env.SCHEDULER_API_KEY ?? "";

// 长任务推荐 leaseSeconds=90, 心跳 30s; 短任务可以 leaseSeconds=30
const LEASE_SECONDS = Number(process.env.LEASE_SECONDS ?? 90);
const HEARTBEAT_INTERVAL_MS = Math.max(5_000, Math.floor((LEASE_SECONDS * 1000) / 3));
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 5);
const POLL_BUSY_MS = 1_000;   // 有活时下一轮 sleep
const POLL_IDLE_MS = 2_000;   // 整轮空时 sleep
const SHUTDOWN_DEADLINE_MS = 30_000;

// 所有出向请求统一加 x-api-key (鉴权服务端要求)
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return API_KEY ? { ...extra, "x-api-key": API_KEY } : extra;
}

type Job = {
  runId: string;
  itemId: string;
  taskId: string;
  stepKey: string;
  nodeKey: string;
  params: Record<string, unknown>;
  envelope: { payload: Record<string, unknown>; outputs: Record<string, unknown>; tags: Record<string, string> };
  ctx: { runId: string; attempt: number; deadline: string | null };
};

type Handler = (job: Job) => Promise<{
  output?: Record<string, unknown>;
  status?: "success" | "failed";
  error?: { code: string; message: string; retryable?: boolean };
  nextHint?: string;
}>;

// 各种 nodeKey 的处理器
const handlers: Record<string, Handler> = {
  // ingest 内部按 params.source 派发到不同 driver (manual / form / ...);
  // 详见 drivers/ingest/index.ts
  ingest: async (job) => dispatchIngest(job),
  translate: async (job) => {
    const text = String(job.envelope.payload.text ?? "");
    if (!text) return { status: "failed", error: { code: "NO_TEXT", message: "payload.text 缺失", retryable: false } };
    const target = String(job.params.targetLang ?? "zh");
    // 模拟一些处理时间
    await new Promise((r) => setTimeout(r, 300));
    return { output: { translated: `[${target}] ${text}`, model: job.params.model } };
  },
  dedup: async (job) => {
    const fields = (job.params.dedupFields as string[] | undefined) ?? [];
    if (fields.length === 0) {
      // 兜底:无字段配置时按整段 text
      const text = String(job.envelope.payload.text ?? "");
      const dup = text.includes("duplicate");
      return {
        output: { decision: dup ? "duplicate" : "keep", kept: !dup, hash: simpleHash(text) },
      };
    }
    // 按字段路径取值, 拼接, 计算 hash
    const extracted: Record<string, unknown> = {};
    const parts: string[] = [];
    for (const f of fields) {
      const v = getByPath(job.envelope.payload, f);
      extracted[f] = v;
      parts.push(`${f}=${stringifyVal(v)}`);
    }
    const hash = simpleHash(parts.join("|"));
    const r = await fetch(`${BASE}/api/v1/dedup/check`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        taskId: job.taskId,
        itemId: job.itemId,
        stepKey: job.stepKey,
        hash,
        fields: extracted,
      }),
    });
    if (!r.ok) {
      throw new Error(`dedup check failed: ${r.status} ${await r.text()}`);
    }
    const data = (await r.json()) as { kept: boolean; firstItemId?: string | null };
    return {
      output: {
        decision: data.kept ? "keep" : "duplicate",
        kept: data.kept,
        hash,
        fields: extracted,
        firstItemId: data.firstItemId ?? null,
      },
    };
  },
  // export = 业务最终入库; 写到 dataset_records 表 (与 items/outbox/attempts 操作层分离)
  export: async (job) => {
    const format = String(job.params.format ?? "json");
    const completedAt = new Date().toISOString();
    const metadata = {
      format,
      outputs: job.envelope.outputs ?? {},
      tags: job.envelope.tags ?? {},
      completedAt,
    };
    const r = await fetch(`${BASE}/api/v1/dataset/records/save`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        taskId: job.taskId,
        itemId: job.itemId,
        payload: job.envelope.payload ?? {},
        metadata,
      }),
    });
    if (!r.ok) {
      throw new Error(`dataset insert failed: ${r.status} ${await r.text()}`);
    }
    const data = (await r.json()) as { id: string };
    return {
      output: {
        recordId: data.id,
        format,
        bytes: JSON.stringify(job.envelope).length,
        completedAt,
      },
    };
  },
};

// ============ HTTP helpers (调度核心 4 接口) ============

async function leaseOnce(nodeKey: string): Promise<Job[]> {
  const res = await fetch(`${BASE}/api/v1/queue/${nodeKey}/lease`, {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ workerId: WORKER_ID, batchSize: BATCH_SIZE, leaseSeconds: LEASE_SECONDS }),
  });
  if (!res.ok) throw new Error(`lease ${nodeKey} failed: ${res.status}`);
  const data = (await res.json()) as { jobs: Job[] };
  return data.jobs;
}

async function heartbeat(runId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/v1/queue/lease/${runId}/heartbeat`, {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ workerId: WORKER_ID, extendSeconds: LEASE_SECONDS }),
  });
  return res.ok; // 409 LEASE_LOST 时返回 false, 调用方可放弃当前 run
}

async function releaseLease(runId: string): Promise<void> {
  try {
    await fetch(`${BASE}/api/v1/queue/lease/${runId}/release`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ workerId: WORKER_ID }),
    });
  } catch { /* shutdown 兜底, 失败让 reconciler 自然回收 */ }
}

async function reportResult(
  runId: string,
  result: Awaited<ReturnType<Handler>>,
): Promise<void> {
  const status = result.status ?? "success";
  await fetch(`${BASE}/api/v1/result`, {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({
      runId,
      status,
      output: result.output,
      error: result.error,
      nextHint: result.nextHint,
    }),
  });
}

// ============ 小工具 ============

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function getByPath(obj: any, path: string): unknown {
  return path.split(".").reduce<any>((cur, k) => (cur == null ? cur : cur[k]), obj);
}

function stringifyVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 按 NODE_KEYS 过滤本进程要处理的能力
const activeKeys: string[] = (() => {
  if (!NODE_KEYS_ENV) return Object.keys(handlers);
  const requested = NODE_KEYS_ENV.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = requested.filter((k) => !handlers[k]);
  if (unknown.length > 0) {
    console.error(`[worker] unknown NODE_KEYS: ${unknown.join(", ")}`);
    process.exit(1);
  }
  return requested;
})();

// ============ 主循环 + 心跳 + 优雅停机 ============

let stopped = false;
const inflight = new Set<string>();

// 每个 inflight run 一个心跳; 失败 (LEASE_LOST) 时停止该 run 的心跳, 让 handler 自然走完
// 不强行中断 handler — handler 完成后 reportResult 会拿到 409, 业务层视为 "applied=false"
function startHeartbeat(runId: string): () => void {
  const t = setInterval(async () => {
    if (!inflight.has(runId)) return;
    const ok = await heartbeat(runId).catch(() => false);
    if (!ok) {
      // 租约丢了, 停心跳; handler 仍在跑, 但 result 会被调度核心拒
      clearInterval(t);
    }
  }, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(t);
}

async function runJob(nodeKey: string, job: Job): Promise<void> {
  inflight.add(job.runId);
  const stopHb = startHeartbeat(job.runId);
  try {
    const r = await handlers[nodeKey](job);
    await reportResult(job.runId, r);
    console.log(`  ✓ ${job.stepKey} (run=${job.runId.slice(0, 8)}) done`);
  } catch (err: any) {
    await reportResult(job.runId, {
      status: "failed",
      error: { code: "HANDLER_THREW", message: String(err?.message ?? err), retryable: true },
    });
    console.log(`  ✗ ${job.stepKey} (run=${job.runId.slice(0, 8)}) failed: ${err}`);
  } finally {
    stopHb();
    inflight.delete(job.runId);
  }
}

async function tick(): Promise<boolean> {
  let anyWork = false;
  for (const nodeKey of activeKeys) {
    if (stopped) break;
    try {
      const jobs = await leaseOnce(nodeKey);
      if (jobs.length === 0) continue;
      anyWork = true;
      console.log(`[${nodeKey}] leased ${jobs.length} job(s)`);
      // 并发处理同一 nodeKey 内的 batch; 不同 nodeKey 串行避免阻塞
      await Promise.all(jobs.map((j) => runJob(nodeKey, j)));
    } catch (err) {
      console.error(`[${nodeKey}] tick error:`, err);
    }
  }
  return anyWork;
}

async function shutdown(signal: string): Promise<void> {
  if (stopped) return;
  stopped = true;
  console.log(`[worker] received ${signal}, draining ${inflight.size} inflight run(s)...`);
  const deadline = Date.now() + SHUTDOWN_DEADLINE_MS;
  while (inflight.size > 0 && Date.now() < deadline) {
    await sleep(200);
  }
  // 仍未完成的, 显式 release 让它们立即重派 (而不是等 reconciler 30-60s)
  const remaining = [...inflight];
  if (remaining.length > 0) {
    console.warn(`[worker] ${remaining.length} run(s) still running past deadline, releasing leases`);
    await Promise.all(remaining.map(releaseLease));
  }
  console.log("[worker] bye");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT",  () => void shutdown("SIGINT"));

async function main(): Promise<void> {
  console.log(`[worker] ${WORKER_ID} polling ${BASE}, handlers: ${activeKeys.join(", ")}`);
  console.log(`[worker] leaseSeconds=${LEASE_SECONDS}, heartbeat=${HEARTBEAT_INTERVAL_MS}ms, batch=${BATCH_SIZE}`);
  if (activeKeys.includes("ingest")) {
    console.log(`[worker] ingest drivers: ${listDrivers().join(", ")}`);
  }
  while (!stopped) {
    const busy = await tick();
    if (stopped) break;
    await sleep(busy ? POLL_BUSY_MS : POLL_IDLE_MS);
  }
}

main();
