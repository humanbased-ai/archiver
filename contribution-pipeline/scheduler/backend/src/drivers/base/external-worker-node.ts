/**
 * ExternalWorkerNode — 独立进程 external_worker 壳 (07-node-class-hierarchy.md §6 P1)
 *
 * 封装的公共能力:
 *   ① leaseLoop  — 向调度核心 poll jobs, 串/并发处理
 *   ② heartbeat  — 长任务按 leaseSeconds/2 定时续约; LEASE_LOST 时停计时器
 *   ③ submitResult — POST /result, 含基本错误日志
 *   ④ release    — 优雅停机时归还 in-flight lease (比等 reconciler 更快)
 *   ⑤ backoff    — 连续空轮询时退避 pollBusyMs → pollIdleMs
 *   ⑥ start/stop — 生命周期; start 触发 BaseNode.onInit 钩子
 *
 * 子类约束:
 *   - 实现 nodeDefinition + handle(job) 即可
 *   - start(config) 启动; stop() 优雅停机
 *   - asDriver() 已禁用: ExternalWorkerNode 自带 leaseLoop, 不经 autoworker
 *
 * 用法:
 *   const node = new MySandboxNode();
 *   await node.start({ schedulerBaseUrl, apiKey, workerId, nodeKey });
 *   process.on("SIGTERM", () => node.stop().then(() => process.exit(0)));
 */

import { BaseNode } from "./base-node.ts";
import type { DriverJob, DriverResult } from "../registry.ts";
import { API_KEY_HEADER, TENANT_ID_HEADER } from "../../auth.ts";

export interface ExternalWorkerConfig {
  /** 调度核心 HTTP 地址, e.g. "http://localhost:4000" */
  schedulerBaseUrl: string;
  /** API key — 需有 queue.lease + queue.result 权限 */
  apiKey: string;
  /** 唯一 worker ID, 写入 outbox.leased_by */
  workerId: string;
  /** 要消费的 nodeKey 队列 (同 nodeDefinition.key) */
  nodeKey: string;
  /** lease 时长 (秒). default 60 */
  leaseSeconds?: number;
  /** 单次 lease 最多拉取条数. default 1 */
  batchSize?: number;
  /** 有活时下一轮 poll 的等待 (ms). default 1000 */
  pollBusyMs?: number;
  /** 连续空轮询达 idleThreshold 次后的等待 (ms). default 10000 */
  pollIdleMs?: number;
  /** 触发退避所需的连续空轮询次数. default 5 */
  idleThreshold?: number;
  /** 优雅停机等待 in-flight 完成的最大时间 (ms). default 30000 */
  shutdownDeadlineMs?: number;
}

type ResolvedConfig = Required<ExternalWorkerConfig>;

export abstract class ExternalWorkerNode extends BaseNode {
  protected config!: ResolvedConfig;

  private stopped = false;
  private inflight = new Set<string>();

  // ─── 生命周期 ─────────────────────────────────────────────────────

  async start(config: ExternalWorkerConfig): Promise<void> {
    this.config = {
      leaseSeconds:       60,
      batchSize:          1,
      pollBusyMs:         1_000,
      pollIdleMs:         10_000,
      idleThreshold:      5,
      shutdownDeadlineMs: 30_000,
      ...config,
    };
    this.stopped = false;
    await this.onInit();
    console.log(
      `[${this.name}] started — worker=${this.config.workerId} nodeKey=${this.config.nodeKey} base=${this.config.schedulerBaseUrl}`,
    );
    this.leaseLoop();
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    console.log(`[${this.name}] stopping — ${this.inflight.size} in-flight job(s)...`);
    const deadline = Date.now() + this.config.shutdownDeadlineMs;
    while (this.inflight.size > 0 && Date.now() < deadline) {
      await sleep(200);
    }
    if (this.inflight.size > 0) {
      console.warn(`[${this.name}] ${this.inflight.size} job(s) past deadline, releasing leases`);
      await Promise.all([...this.inflight].map((runId) => this.release(runId, null)));
    }
    await this.onShutdown();
    console.log(`[${this.name}] stopped`);
  }

  // ─── 主循环 ───────────────────────────────────────────────────────

  private async leaseLoop(): Promise<void> {
    let consecutiveEmpty = 0;
    while (!this.stopped) {
      let count = 0;
      try {
        const jobs = await this.leaseBatch();
        count = jobs.length;
        if (count > 0) {
          await Promise.all(jobs.map((j) => this.processJob(j)));
        }
      } catch (e) {
        console.error(`[${this.name}] leaseLoop error:`, e);
      }
      if (this.stopped) break;
      consecutiveEmpty = count > 0 ? 0 : consecutiveEmpty + 1;
      const wait =
        consecutiveEmpty >= this.config.idleThreshold
          ? this.config.pollIdleMs
          : this.config.pollBusyMs;
      await sleep(wait);
    }
  }

  private async processJob(job: DriverJob): Promise<void> {
    this.inflight.add(job.runId);
    const stopHb = this.startHeartbeat(job);
    try {
      // BaseNode.invoke 封装 validate + hook + handle + classifyError, 永不 throw
      const result = await this.invoke(job);
      await this.submitResult(job.runId, job.tenantId, result).catch((e) =>
        console.error(`[${this.name}] submitResult failed run=${job.runId}:`, e),
      );
    } finally {
      stopHb();
      this.inflight.delete(job.runId);
    }
  }

  // ─── 心跳 ────────────────────────────────────────────────────────

  private startHeartbeat(job: DriverJob): () => void {
    const intervalMs = Math.max(5_000, Math.floor((this.config.leaseSeconds * 1_000) / 2));
    const t = setInterval(async () => {
      if (!this.inflight.has(job.runId)) return;
      const ok = await this.heartbeat(job.runId, job.tenantId).catch(() => false);
      if (!ok) clearInterval(t); // LEASE_LOST: 停心跳; handle 仍在跑但 result 会被服务端拒
    }, intervalMs);
    return () => clearInterval(t);
  }

  // ─── HTTP 客户端 (调度核心 4 接口) ───────────────────────────────

  private async leaseBatch(): Promise<DriverJob[]> {
    const data = await this.post<{ jobs: DriverJob[] }>(
      `/queue/${this.config.nodeKey}/lease`,
      { workerId: this.config.workerId, batchSize: this.config.batchSize, leaseSeconds: this.config.leaseSeconds },
      null, // 跨租户 lease — 不带 X-Tenant-Id → 调度核心 asSystem
    );
    return data.jobs ?? [];
  }

  private async heartbeat(runId: string, tenantId: string): Promise<boolean> {
    const res = await fetch(
      `${this.config.schedulerBaseUrl}/api/v1/queue/lease/${runId}/heartbeat`,
      {
        method:  "POST",
        headers: this.headers(tenantId),
        body:    JSON.stringify({ workerId: this.config.workerId, extendSeconds: this.config.leaseSeconds }),
      },
    );
    return res.ok;
  }

  private async submitResult(runId: string, tenantId: string, result: DriverResult): Promise<void> {
    const body: Record<string, unknown> = { runId };
    if (result.status === "success") {
      body.status = "success";
      body.output = result.output;
      if (result.nextHint) body.nextHint = result.nextHint;
    } else {
      body.status = "failed";
      body.error  = result.error;
    }
    await this.post("/result", body, tenantId);
  }

  private async release(runId: string, tenantId: string | null): Promise<void> {
    try {
      await this.post(`/queue/lease/${runId}/release`, { workerId: this.config.workerId }, tenantId);
    } catch { /* shutdown 兜底, reconciler 会自然回收 */ }
  }

  private async post<T = unknown>(path: string, body: unknown, tenantId: string | null): Promise<T> {
    const res = await fetch(`${this.config.schedulerBaseUrl}/api/v1${path}`, {
      method:  "POST",
      headers: this.headers(tenantId),
      body:    JSON.stringify(body),
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { /* 空响应 */ }
    if (!res.ok) {
      const msg  = (data as any)?.error?.message ?? `HTTP ${res.status}`;
      const code = (data as any)?.error?.code ?? "REMOTE_ERROR";
      throw Object.assign(new Error(msg), { code });
    }
    return data as T;
  }

  private headers(tenantId: string | null): Record<string, string> {
    const h: Record<string, string> = {
      "content-type": "application/json",
      [API_KEY_HEADER]: this.config.apiKey,
    };
    if (tenantId) h[TENANT_ID_HEADER] = tenantId;
    return h;
  }

  // ─── asDriver() 禁用 ─────────────────────────────────────────────

  public override asDriver(): never {
    throw new Error(
      `${this.name}: ExternalWorkerNode 走自己的 leaseLoop, 不兼容 autoworker Driver 协议. 请调用 start(config).`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
