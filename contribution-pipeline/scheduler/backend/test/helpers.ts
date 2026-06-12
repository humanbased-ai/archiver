// E2E test helpers — 直接打 HTTP, 不绕开任何中间件 / 数据库

export const BASE = process.env.SCHEDULER_BASE ?? "http://127.0.0.1:4000";
export const PREFIX = "/api/v1";

export interface Resp<T = any> {
  status: number;
  body: T;
}

export async function req<T = any>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Resp<T>> {
  const headers: Record<string, string> = {
    ...(body !== undefined ? { "content-type": "application/json" } : {}),
    ...(extraHeaders ?? {}),
  };
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: r.status, body: parsed };
}

export async function get<T = any>(path: string) {
  return req<T>("GET", path);
}
export async function post<T = any>(path: string, body?: unknown, headers?: Record<string, string>) {
  return req<T>("POST", path, body, headers);
}
export async function del<T = any>(path: string) {
  return req<T>("DELETE", path);
}

// 给测试 pipeline / item 用的唯一名字 — 跑完顺手清理也方便筛
let counter = 0;
export function uniqueId(label = "test"): string {
  counter += 1;
  return `e2e-${label}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 6)}`;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 预制 pipeline 模板 ── 4 步: ingest → translate → review (loopback) → export
export interface BuildOpts {
  name?: string;
  baseBackoffMs?: number;
  maxAttempts?: number;
  reviewMaxLoops?: number;
}

export function buildSamplePipeline(opts: BuildOpts = {}) {
  const policy = {
    timeoutMs: 30_000,
    maxAttempts: opts.maxAttempts ?? 2,
    baseBackoffMs: opts.baseBackoffMs ?? 1, // 1ms 退避: 测试不用等
  };
  return {
    name: opts.name ?? uniqueId("pipeline"),
    steps: [
      { key: "ingest", nodeKey: "ingest", label: "采集", params: { source: "manual" }, policy },
      { key: "translate", nodeKey: "translate", label: "翻译", params: { model: "demo" }, policy },
      {
        key: "review",
        nodeKey: "review",
        label: "审核",
        params: { rubric: "default" },
        routes: {
          on: "decision",
          cases: {
            approved: "next",
            rejected: { goto: "translate", maxLoops: opts.reviewMaxLoops ?? 2 },
          },
        },
        policy,
      },
      { key: "export", nodeKey: "export", label: "导出", params: { format: "json" }, policy },
    ] as const,
  };
}

// 创建一条测试 pipeline (一次性). 返回 task_id
export async function createPipeline(
  steps: any[],
  name = uniqueId("pipeline"),
): Promise<string> {
  const r = await post<{ task_id: string }>(`${PREFIX}/pipelines/create`, {
    name,
    steps,
  });
  if (r.status !== 200) {
    throw new Error(`createPipeline failed ${r.status}: ${JSON.stringify(r.body)}`);
  }
  return r.body.task_id;
}

export async function deletePipeline(taskId: string) {
  await del(`${PREFIX}/pipelines/${taskId}`);
}

// 投一条 item, 返回 itemId
export async function ingest(taskId: string, payload: Record<string, unknown> = {}) {
  const r = await post<{ itemId: string; runId: string }>(`${PREFIX}/items/create`, {
    taskId,
    envelope: { payload },
  });
  if (r.status !== 200) {
    throw new Error(`ingest failed ${r.status}: ${JSON.stringify(r.body)}`);
  }
  return r.body;
}

// lease 一条 (从全局队列按 nodeKey 抓, 仅 D 套件这种"专测 lease"的场景使用)
export async function leaseOne(
  nodeKey: string,
  workerId: string,
  leaseSeconds = 60,
): Promise<any | null> {
  const r = await post(`${PREFIX}/queue/${nodeKey}/lease`, {
    workerId,
    batchSize: 1,
    leaseSeconds,
  });
  if (r.status !== 200) throw new Error(`lease failed ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body.jobs?.[0] ?? null;
}

// 直接认领特定 item 当前 pending 的 run — 避免跨套件 / 跨 demo 数据污染队列
// 大部分行为测试用这个, 不要用 leaseOne
export async function claimItem(
  itemId: string,
  workerId: string,
  leaseSeconds = 60,
): Promise<{
  runId: string;
  itemId: string;
  stepKey: string;
  nodeKey: string;
  envelope: any;
}> {
  const detail = await getItem(itemId);
  if (detail.status !== 200) {
    throw new Error(`getItem ${itemId} failed: ${detail.status}`);
  }
  const pending = detail.body.inflight.find((x: any) => x.status === "pending");
  if (!pending) {
    throw new Error(
      `no pending inflight for item ${itemId}; current_step=${detail.body.item.current_step} inflight=${JSON.stringify(detail.body.inflight)}`,
    );
  }
  const r = await post(`${PREFIX}/queue/run/${pending.run_id}/claim`, {
    workerId,
    leaseSeconds,
  });
  if (r.status !== 200) {
    throw new Error(`claim failed ${r.status}: ${JSON.stringify(r.body)}`);
  }
  return r.body.job;
}

export async function postResult(body: {
  runId: string;
  status: "success" | "failed";
  output?: Record<string, unknown>;
  error?: { code: string; message: string; retryable?: boolean };
  nextHint?: string;
}) {
  return post(`${PREFIX}/result`, body);
}

export async function getItem(itemId: string) {
  return get(`${PREFIX}/items/${itemId}`);
}
