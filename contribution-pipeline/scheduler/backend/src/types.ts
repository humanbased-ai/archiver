export type RouteAction =
  | "next"
  | "done"
  | { goto: string; maxLoops?: number };

export interface Routes {
  on: string;                          // JSON path 在 output 上, e.g. "verdict.kept"
  cases: Record<string, RouteAction>;
  default?: RouteAction;
}

export interface StepPolicy {
  timeoutMs: number;
  maxAttempts: number;
  baseBackoffMs: number;
}

export interface StepConfig {
  key: string;                         // 在 pipeline 内唯一 (如 "translate#1")
  nodeKey: string;                     // 节点类型 (引用 node_definitions.key)
  nodeVersion?: string;
  label?: string;                      // 显示名 (UI 用)
  params: Record<string, unknown>;
  /**
   * 运行时输入绑定. value 是表达式字符串或字面量:
   *   "{{payload.x}}"            envelope.payload.x
   *   "{{outputs.stepKey.y}}"    envelope.outputs.stepKey.y
   *   "{{tags.z}}"               envelope.tags.z
   *   "literal text"             字面量 (含空字符串 "")
   *   "prefix {{payload.x}}"     部分模板, 结果强制 String()
   * 整段 {{path}} 保持原值类型 (number/object/array); 部分模板 coerce 成 string.
   * 缺失路径返回 undefined (整段) 或 "" (部分模板片段).
   * 在 step.inputs 没给某 key 时, 走 nodeDefinition.inputs_schema.properties.<k>.defaultBinding.
   */
  inputs?: Record<string, unknown>;
  routes?: Routes;
  policy?: Partial<StepPolicy>;
}

export type Pipeline = StepConfig[];

export interface Envelope {
  payload: Record<string, unknown>;
  outputs: Record<string, unknown>;
  tags: Record<string, string>;
}

export interface NodeDefinition {
  key: string;
  version: string;
  display_name: string;
  params_schema: Record<string, unknown>;
  /** 前端编辑器渲染指示 (widget/分组), 调度核心不解读; v1 期间老节点为 null */
  ui_schema?: Record<string, unknown> | null;
  /** 节点作者预设: defaults(兜底)/constants+pin(锁死)/secrets(env 引用) */
  presets?: NodePresets | null;
  /**
   * driver 期望的运行时输入字段声明 (JSON Schema 风格). 给前端编辑器知道有哪些 input slot 要绑.
   * 字段可带 defaultBinding (表达式), 在 step.inputs 没指定时兜底.
   */
  inputs_schema?: Record<string, unknown> | null;
  /** 输出契约 — 给编辑器渲染下游可绑字段; 调度核心不解读 */
  outputs_schema?: Record<string, unknown> | null;
  /** 生命周期 2 态: 'active' 可被新 pipeline 引用; 'archived' 阻挡新引用, 在飞 item 不受影响 */
  status: "active" | "archived";
  /** UI 分组提示 */
  category?: string | null;
  /** 节点运行方式 */
  run_mode?: string | null;
  /** 节点说明 (Markdown) */
  description?: string | null;
  idempotent: boolean;
  default_timeout_ms: number;
  default_max_attempts: number;
  manual: boolean;
  updated_at: string;
}

export interface NodePresets {
  /** 兜底值, 当 step.params 没填时生效 */
  defaults?: Record<string, unknown>;
  /** 节点作者锁死的常量 */
  constants?: Record<string, unknown>;
  /** constants 中需强制锁死的字段名列表, 即使 step.params 试图覆盖也以 constants 为准 */
  pin?: string[];
  /** secret 引用, 不进 pipeline JSON, worker 从环境/secret manager 自行解析 */
  secrets?: Record<string, { envVar?: string; secretManagerRef?: string }>;
}

export interface Layout {
  positions: Record<string, { x: number; y: number }>;
}

export interface ItemRow {
  id: string;
  tenant_id: string;
  task_id: string;
  pipeline_version_id: string;  // 钉死创建时的 pipeline 版本, 后续 save 不影响该 item
  current_step: string;
  envelope: Envelope;
  loop_counts: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface PipelineVersion {
  id: string;
  task_id: string;
  tenant_id: string;
  version: number;
  steps: Pipeline;
  layout: Layout | null;
  forms: Record<string, { schema: unknown; uiSchema: unknown }>;
  forms_etag: string;
  published_at: string;
  published_by: string | null;
}

export interface OutboxRow {
  run_id: string;
  tenant_id: string;
  item_id: string;
  task_id: string;
  step_key: string;
  node_key: string;
  status: "pending" | "leased" | "done" | "failed";
  attempt: number;
  scheduled_at: string;
  expected_by: string | null;
  leased_by: string | null;
  leased_at: string | null;
  created_at: string;
  updated_at: string;
}
