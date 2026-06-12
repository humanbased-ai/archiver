export type RouteAction = "next" | "done" | { goto: string; maxLoops?: number };

export interface Routes {
  on: string;
  cases: Record<string, RouteAction>;
  default?: RouteAction;
}

export interface StepConfig {
  key: string;
  nodeKey: string;
  nodeVersion?: string;
  label?: string;
  params: Record<string, unknown>;
  routes?: Routes;
  policy?: { timeoutMs?: number; maxAttempts?: number; baseBackoffMs?: number };
}

export interface NodeDef {
  key: string;
  version: string;
  display_name: string;
  manual: boolean;
  idempotent: boolean;
  default_timeout_ms: number;
  default_max_attempts: number;
  params_schema: Record<string, unknown>;
}

export interface Layout {
  positions: Record<string, { x: number; y: number }>;
}

export type PipelineStatus = "active" | "paused" | "archived";
export type BatchStatus = "active" | "paused" | "archived";

export interface PipelineFull {
  task_id: string;
  name: string;
  steps: StepConfig[];
  layout: Layout | null;
  status?: PipelineStatus;
  updated_at: string;
  // 仅 getItemPipeline 返回 — 该 item 钉死的版本号; getPipeline (按 taskId) 不带
  version?: number;
}

export interface Item {
  id: string;
  task_id: string;
  current_step: string;
  envelope: { payload: Record<string, unknown>; outputs: Record<string, unknown>; tags: Record<string, string> };
  loop_counts: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Attempt {
  id: number;
  run_id: string;
  step_key: string;
  attempt: number;
  outcome: string;
  output: any;
  error: any;
  finished_at: string;
}

export interface ItemDetail {
  item: Item;
  inflight: any[];
  history: Attempt[];
  batch: { id: string; name: string } | null;
}

// ── 业务层类型 ──────────────────────────────────────────────────────

export interface Batch {
  id: string;
  task_id: string;
  name: string;
  target: number;
  pipeline_name: string;
  status?: BatchStatus;
  pipeline_status?: PipelineStatus;
  created_at: string;
  // 进度字段 (detail 接口返回)
  approved?: number;
  stuck?: number;
  stepCounts?: { step: string; n: number }[];
}

export interface StuckItem {
  id: string;
  envelope: { payload: Record<string, unknown>; outputs: Record<string, unknown>; tags: Record<string, string> };
  loop_counts: Record<string, number>;
  updated_at: string;
}

export interface CollectTask {
  id: string;
  task_id: string;
  current_step: string;
  envelope: { payload: Record<string, unknown>; outputs: Record<string, unknown>; tags: Record<string, string> };
  run_id: string;
}

export interface UserStat {
  user_id: string;
  status: string;
  n: number;
}

export interface KanbanRun {
  run_id: string;
  item_id: string;
  step_key: string;
  node_key: string;
  status: "pending" | "leased";
  attempt: number;
  leased_by: string | null;
  leased_at: string | null;
  expected_by: string | null;
}

export interface KanbanStep {
  stepKey: string;
  nodeKey: string;
  label?: string;
  items: { item: Item; run: KanbanRun | null }[];
}

import { tracedFetch } from "./trace";

const API = "/api/v1";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await tracedFetch(
    `${API}${path}`,
    {
      ...init,
      headers: { ...(init?.body !== undefined ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
    },
    "scheduler",
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${r.status} ${path}: ${text}`);
  }
  return (await r.json()) as T;
}

export interface ProjectListItem {
  task_id: string;
  name: string;
  template_id: string | null;
  template_name: string | null;
  step_count: number;
  created_at: string;
  updated_at: string;
  batch_count: number;
  item_count: number;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string | null;
  steps: StepConfig[];
  layout: Layout | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  step_count: number;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  tenant_id: string;
  actor: string;
  action: string;
  resource: { kind: string; id: string; [k: string]: unknown };
  before: unknown;
  after: unknown;
  trace_id: string | null;
  request_id: string | null;
  created_at: string;
}

export interface AuditQuery {
  actor?: string;
  action?: string;
  kind?: string;
  id?: string;
  since?: string;     // ISO
  limit?: number;
}

// 节点管理 — 列表行 (后端 GET /admin/nodes), 字段对齐 db 行 + 引用数
export interface AdminNodeRow {
  key: string;
  version: string;
  display_name: string;
  status: "active" | "archived" | "paused";
  category: string | null;
  run_mode: string | null;
  description: string | null;
  idempotent: boolean;
  manual: boolean;
  updated_at: string;
  usage_count: number;
  supports_dry_run: boolean;
  has_examples: boolean;
  pending_count: number;
  inflight_count: number;
}

// driver 自带的"如何用"示例 — 详情页展示 + 一键填入调试面板
export interface NodeExample {
  title: string;
  description?: string;
  step: {
    params?: Record<string, unknown>;
    inputs?: Record<string, unknown>;
    routes?: Record<string, unknown>;
  };
  envelope?: {
    payload?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    tags?: Record<string, unknown>;
  };
}

// 节点管理 — 详情 (后端 GET /admin/nodes/:key/:version), 返回完整 DB 行
export interface AdminNodeDetail {
  key: string;
  version: string;
  display_name: string;
  params_schema: Record<string, unknown>;
  ui_schema: Record<string, unknown> | null;
  presets: Record<string, unknown> | null;
  inputs_schema: Record<string, unknown> | null;
  outputs_schema: Record<string, unknown> | null;
  status: "active" | "archived" | "paused";
  category: string | null;
  run_mode: string | null;
  description: string | null;
  idempotent: boolean;
  manual: boolean;
  default_timeout_ms: number;
  default_max_attempts: number;
  updated_at: string;
  supports_dry_run: boolean;
  examples: NodeExample[] | null;
}

export interface AdminNodeUsages {
  pipelines: { task_id: string; name: string; tenant_id: string }[];
  inflightCount: number;
}

export interface AdminNodeDebugResult {
  effectiveParams: Record<string, unknown>;
  resolvedInputs: Record<string, unknown>;
  driver: { name: string; nodeKey: string };
  result:
    | { status: "success"; output: Record<string, unknown> }
    | { status: "failed"; error: { code: string; message: string; retryable?: boolean } };
  durationMs: number;
  /** null = 通过 / 跳过; 否则有 schema 违规 (strict 模式 result 已被翻成 failed) */
  outputValidation: null | {
    mode: "strict" | "warn" | "off";
    violations: { path: string; message: string; keyword: string }[];
  };
}

export interface ReviewTaskItem {
  item_id: string;
  task_id: string;
  envelope: { payload: Record<string, unknown>; outputs: Record<string, unknown>; tags: Record<string, string> };
  run_id: string;
  step_key: string;
  node_key: string;
  status: "pending" | "leased";
  leased_by: string | null;
  expected_by: string | null;
  batch_id: string;
  batch_name: string;
  pipeline_name: string;
}

export const api = {
  listNodes: () => j<{ nodes: NodeDef[] }>("/nodes"),
  listPipelines: () =>
    j<{ pipelines: { task_id: string; name: string; step_count: number; updated_at: string }[] }>("/pipelines"),
  listProjects: () => j<{ projects: ProjectListItem[] }>("/projects"),
  getPipeline: (id: string) => j<PipelineFull>(`/pipelines/${id}`),
  createPipeline: (body: { name: string; steps: StepConfig[]; layout?: Layout }) =>
    j<PipelineFull>("/pipelines/create", { method: "POST", body: JSON.stringify(body) }),
  updatePipeline: (id: string, body: Partial<{ name: string; steps: StepConfig[]; layout: Layout }>) =>
    j<PipelineFull>(`/pipelines/${id}/save`, { method: "POST", body: JSON.stringify(body) }),
  deletePipeline: (id: string) => j<{ ok: true }>(`/pipelines/${id}`, { method: "DELETE" }),
  pausePipeline:  (id: string) => j<{ ok: true; status: PipelineStatus }>(`/pipelines/${id}/pause`,  { method: "POST" }),
  resumePipeline: (id: string) => j<{ ok: true; status: PipelineStatus }>(`/pipelines/${id}/resume`, { method: "POST" }),
  ingest: (taskId: string, payload: Record<string, unknown>) =>
    j<{ itemId: string; runId: string }>("/items/create", {
      method: "POST",
      body: JSON.stringify({ taskId, envelope: { payload } }),
    }),
  getItem: (id: string) => j<ItemDetail>(`/items/${id}`),
  // 按 item 钉死版本拿 pipeline. 用于 collect/review 这类 "在飞 item 视图":
  // admin 改 schema 不会污染在飞行的 item — 它们继续读自己创建时那一版.
  getItemPipeline: (itemId: string) => j<PipelineFull>(`/items/${itemId}/pipeline`),
  listItems: (taskId: string) => j<{ items: Item[] }>(`/tasks/${taskId}/items`),
  queueSnapshot: () => j<{ queue: { node_key: string; status: string; n: number }[] }>("/admin/queue"),
  replay: (itemId: string, stepKey: string) =>
    j<{ ok: true }>(`/admin/items/${itemId}/replay`, { method: "POST", body: JSON.stringify({ stepKey }) }),
  kanban: (taskId: string, batchId?: string) =>
    j<{ steps: KanbanStep[]; stuck: StuckItem[] }>(
      batchId ? `/tasks/${taskId}/kanban?batchId=${batchId}` : `/tasks/${taskId}/kanban`,
    ),
  claimRun: (runId: string, workerId: string, leaseSeconds = 60) =>
    j<{ job: any }>(`/queue/run/${runId}/claim`, {
      method: "POST",
      body: JSON.stringify({ workerId, leaseSeconds }),
    }),
  // 模板
  listTemplates: () => j<{ templates: TemplateListItem[] }>("/templates"),
  getTemplate: (id: string) => j<PipelineTemplate>(`/templates/${id}`),
  createTemplate: (body: { name: string; description?: string; steps: StepConfig[]; layout?: Layout }) =>
    j<PipelineTemplate>("/templates/create", { method: "POST", body: JSON.stringify(body) }),
  updateTemplate: (id: string, body: Partial<{ name: string; description: string; steps: StepConfig[]; layout: Layout }>) =>
    j<PipelineTemplate>(`/templates/${id}/save`, { method: "POST", body: JSON.stringify(body) }),
  deleteTemplate: (id: string) => j<{ ok: true }>(`/templates/${id}`, { method: "DELETE" }),
  instantiateTemplate: (id: string, body: { name: string }) =>
    j<{ taskId: string; name: string }>(`/templates/${id}/instantiate`, {
      method: "POST", body: JSON.stringify(body),
    }),
  // 审计日志查询 (admin)
  auditList: (q: AuditQuery) => {
    const params = new URLSearchParams();
    if (q.actor)  params.set("actor", q.actor);
    if (q.action) params.set("action", q.action);
    if (q.kind)   params.set("kind", q.kind);
    if (q.id)     params.set("id", q.id);
    if (q.since)  params.set("since", q.since);
    if (q.limit)  params.set("limit", String(q.limit));
    const qs = params.toString();
    return j<{ entries: AuditEntry[] }>(`/admin/audit${qs ? `?${qs}` : ""}`);
  },
  // 节点管理 (admin) — 列表 / 详情 / 引用关系 / archive / activate / 创建 / 更新 / 调试
  adminListNodes: (q?: { status?: "active" | "archived" | "paused"; category?: string; runMode?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (q?.status)   params.set("status",   q.status);
    if (q?.category) params.set("category", q.category);
    if (q?.runMode)  params.set("runMode",  q.runMode);
    if (q?.search)   params.set("search",   q.search);
    const qs = params.toString();
    return j<{ nodes: AdminNodeRow[] }>(`/admin/nodes${qs ? `?${qs}` : ""}`);
  },
  adminGetNode: (key: string, version: string) =>
    j<{ node: AdminNodeDetail }>(`/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}`),
  adminGetNodeUsages: (key: string, version: string) =>
    j<AdminNodeUsages>(`/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}/usages`),
  adminArchiveNode: (key: string, version: string) =>
    j<{ ok: true; status: "archived" }>(`/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}/archive`, { method: "POST" }),
  adminActivateNode: (key: string, version: string) =>
    j<{ ok: true; status: "active" }>(`/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}/activate`, { method: "POST" }),
  adminUpdateNode: (key: string, version: string, body: Partial<{
    displayName: string; paramsSchema: Record<string, unknown>;
    uiSchema: Record<string, unknown> | null; presets: Record<string, unknown> | null;
    inputsSchema: Record<string, unknown> | null; outputsSchema: Record<string, unknown> | null;
    category: string | null; runMode: string | null; description: string | null;
    idempotent: boolean; defaultTimeoutMs: number; defaultMaxAttempts: number; manual: boolean;
  }>) =>
    j<{ node: AdminNodeDetail }>(`/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}`,
      { method: "PATCH", body: JSON.stringify(body) }),
  adminDebugRunNode: (key: string, version: string, body: {
    params?: Record<string, unknown>; inputs?: Record<string, unknown>;
    envelope?: { payload?: Record<string, unknown>; outputs?: Record<string, unknown>; tags?: Record<string, unknown> };
  }) =>
    j<AdminNodeDebugResult>(`/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}/debug/run`,
      { method: "POST", body: JSON.stringify(body) }),
  adminGetNodeRuntime: (key: string, version: string) =>
    j<{ pending: number; inflight: number; driverRegistered: boolean }>(
      `/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}/runtime`
    ),
  adminPauseNode: (key: string, version: string) =>
    j<{ ok: boolean; status: string }>(
      `/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}/pause`,
      { method: "POST" }
    ),
  adminResumeNode: (key: string, version: string) =>
    j<{ ok: boolean; status: string }>(
      `/admin/nodes/${encodeURIComponent(key)}/${encodeURIComponent(version)}/resume`,
      { method: "POST" }
    ),
  // Review 列表
  reviewTasks: (userId: string, batchId?: string) =>
    j<{ items: ReviewTaskItem[] }>(
      batchId
        ? `/review/tasks?userId=${encodeURIComponent(userId)}&batchId=${batchId}`
        : `/review/tasks?userId=${encodeURIComponent(userId)}`,
    ),
};

// 业务层 API (注意:前缀 /api 不含 /v1)
const BIZ = "/api";
async function b<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await tracedFetch(
    `${BIZ}${path}`,
    {
      ...init,
      headers: { ...(init?.body !== undefined ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
    },
    "business",
  );
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    const err = (data as any)?.error;
    throw Object.assign(new Error(err?.message ?? `${r.status} ${path}`), { code: err?.code });
  }
  return r.json() as Promise<T>;
}

export const biz = {
  listBatches: () => b<{ batches: Batch[] }>("/batches"),
  getBatch: (id: string) => b<Batch>(`/batches/${id}`),
  createBatch: (body: { pipelineId: string; name: string; target: number }) =>
    b<{ batchId: string; target: number; firstStep: string }>("/batches", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pauseBatch:  (id: string) => b<{ ok: true; status: BatchStatus }>(`/batches/${id}/pause`,  { method: "POST" }),
  resumeBatch: (id: string) => b<{ ok: true; status: BatchStatus }>(`/batches/${id}/resume`, { method: "POST" }),
  collectTasks: (batchId: string, userId: string) =>
    b<{
      items: CollectTask[];
      canClaim: boolean;
      quota: { approved: number; target: number };
      userCapacity: { active: number; maxConcurrent: number; total_submitted: number; maxTotal: number };
    }>(`/collect/tasks?batchId=${batchId}&userId=${encodeURIComponent(userId)}`),
  claimCollect: (itemId: string, userId: string, batchId: string) =>
    b<{ ok: true; runId: string; stepKey: string }>(`/collect/${itemId}/claim`, {
      method: "POST",
      body: JSON.stringify({ userId, batchId }),
    }),
  submitCollect: (itemId: string, userId: string, payload: Record<string, unknown>) =>
    b<{ ok: true; nextStep: string }>(`/collect/${itemId}/submit`, {
      method: "POST",
      body: JSON.stringify({ userId, payload }),
    }),
  releaseCollect: (itemId: string, userId: string) =>
    b<{ ok: true }>(`/collect/${itemId}/release`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  collectState: (itemId: string, userId: string) =>
    b<{ my_last_result: "duplicate" | "rejected" | "approved" | null; my_last_reason: string | null; my_last_result_at: string | null }>(
      `/collect/${itemId}/state?userId=${encodeURIComponent(userId)}`,
    ),
  redoCollect: (itemId: string, userId: string) =>
    b<{ ok: true; removed: number }>(`/collect/${itemId}/redo`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  reviewDecide: (itemId: string, userId: string, batchId: string | undefined, decision: "approved" | "rejected", reason?: string) =>
    b<{ ok: true; nextStep: string }>(`/review/${itemId}/decide`, {
      method: "POST",
      body: JSON.stringify({ userId, ...(batchId ? { batchId } : {}), decision, ...(reason ? { reason } : {}) }),
    }),
  userStats: (batchId: string) => b<{ stats: UserStat[] }>(`/batches/${batchId}/user-stats`),
  mySubmissions: (userId: string) =>
    b<{ submissions: MySubmission[] }>(`/work/my-submissions?userId=${encodeURIComponent(userId)}`),
  workCollectTasks: (userId: string, batchId?: string) =>
    b<{ items: WorkCollectTask[] }>(
      batchId
        ? `/work/collect-tasks?userId=${encodeURIComponent(userId)}&batchId=${batchId}`
        : `/work/collect-tasks?userId=${encodeURIComponent(userId)}`,
    ),
};

export interface WorkCollectTask {
  id: string;
  task_id: string;
  envelope: { payload: Record<string, unknown>; outputs: Record<string, unknown>; tags: Record<string, string> };
  current_step: string;
  run_id: string;
  batch_id: string;
  batch_name: string;
  pipeline_name: string;
  // 当前 userId 在该 item 上一次 submission 的结果; 没提交过为 null
  my_last_result: "approved" | "rejected" | "duplicate" | null;
}

export interface MySubmission {
  id: string;
  batch_id: string;
  batch_name: string;
  pipeline_name: string;
  item_id: string;
  task_id: string;
  step_key: string;
  user_id: string;
  status: "claimed" | "submitted" | "returned";
  result: "approved" | "rejected" | "duplicate" | null;
  result_reason: string | null;
  created_at: string;
  updated_at: string;
  result_at: string | null;
  current_step: string;
  dataset_at: string | null;
}
