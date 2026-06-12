/**
 * 节点三层配置: UI / runtime / presets — 共享原语
 *
 * 为什么三层:
 *   ui_schema     前端编辑器读 — 渲染指示 (widget/分组), 调度核心不解读
 *   paramsSchema  worker 收到的 step.params 形态, JSON Schema 约束
 *   presets       节点作者预设, 不进 pipeline JSON, lease 时 (Phase 2 后服务端) 合并:
 *                   - defaults  step.params 没填时兜底
 *                   - constants 节点作者预设的常量值
 *                   - pin       constants 中需强制锁死的字段名 — 即使 step.params 试图覆盖也以 constants 为准
 *                   - secrets   secret 引用 (envVar / secretManagerRef), worker 自行解析
 *
 * Phase 1 阶段: driver 在 handle() 里调 mergeEffectiveParams; Phase 2 把 merge 搬到 lease SQL,
 * driver 直接拿 effective params (X12/X13 测试届时要重定向).
 */

import type { NodePresets } from "./types.ts";
export type { NodePresets } from "./types.ts";

/**
 * 每个 driver export 一份, 供 auto-upsert 写到 node_definitions 表.
 * Phase 1 还容忍 driver 不提供 (Driver.nodeDefinition 可选);
 * Phase 2 之后建议所有具体 nodeKey 的 driver 都填.
 */
export interface DriverNodeDefinition {
  key: string;
  version: string;
  displayName: string;
  paramsSchema: Record<string, unknown>;
  uiSchema?: Record<string, unknown> | null;
  presets?: NodePresets | null;
  /**
   * driver 期望的运行时输入字段声明; lease 服务端 resolver 按这里的 properties 列表 +
   * step.inputs 的表达式求值, 喂给 driver 的 job.inputs.
   * 每个字段可带 `defaultBinding` (表达式), step.inputs 没指定时兜底.
   */
  inputsSchema?: InputsSchema | null;
  /**
   * 输出契约 — 给编辑器渲染"下游可绑字段"列表; 调度核心不解读 (不校验 driver 返回值结构).
   * 形态参考 JSON Schema, 仅描述 driver.handle() output 字段, 不强制运行时校验.
   */
  outputsSchema?: Record<string, unknown> | null;
  /** UI 分组提示; 不参与调度. e.g. 'ai' / 'data' / 'manual' / 'system' / 'external' */
  category?: NodeCategory;
  /** 节点运行方式 — 展示用, 调度核心仍按 driver 注册决定派发 */
  runMode?: NodeRunMode;
  /** 节点说明 (Markdown), 编辑器侧渲染 */
  description?: string;
  /** 默认超时 (ms), 写入 node_definitions.default_timeout_ms */
  defaultTimeoutMs?: number;
  /** 默认重试次数, 写入 node_definitions.default_max_attempts */
  defaultMaxAttempts?: number;
  idempotent?: boolean;
  /** true = 人工节点, autoworker 不接 (理论上 driver 不应注册人工节点; 字段保留以防需要) */
  manual?: boolean;
  /**
   * driver 显式承诺 "调试 dry-run 时不触发线上副作用" (不写库 / 不打外网).
   * 默认 false — 保守不误导. 后台调试面板按这个亮 badge: true=绿(纯模拟); false=红(谨慎调试).
   * 实现侧: handle 内部识别 `job.ctx.dryRun === true`, 跳过持久化, 返回 mock output 即可.
   */
  supportsDryRun?: boolean;
  /**
   * 输出强校验模式 — 节点输出是否按 outputsSchema 强约束 (06-node-design §4.4).
   *   strict (默认): 不符 → result 转 failed, retryable=false, 不写下游
   *   warn:           记 audit_log warning 但仍写下游 (生产/兼容期临时)
   *   off:            完全跳过 (meta 节点 / 没声明 outputsSchema 时设)
   * 没声明 outputsSchema 时不管这个字段 — 没契约可校验.
   */
  outputsValidation?: "strict" | "warn" | "off";
  /**
   * 使用示例 — 给管理后台节点详情页展示 "如何用这个节点".
   * 每条 example 是一段可粘到 pipeline 的 step 片段 + 配套 envelope 样例,
   * 后台一键填入调试面板触发 dry-run.
   */
  examples?: NodeExample[];
}

export interface NodeExample {
  title: string;
  description?: string;
  /** step 片段 — params / inputs / routes, 不含 nodeKey/Version (引用本节点时自动补) */
  step: {
    params?: Record<string, unknown>;
    inputs?: Record<string, unknown>;
    routes?: Record<string, unknown>;
  };
  /** 配套 envelope 样例, 给 inputs 表达式求值用 */
  envelope?: {
    payload?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    tags?: Record<string, unknown>;
  };
}

export type NodeCategory = "ai" | "data" | "manual" | "system" | "external";
export type NodeRunMode = "embedded" | "internal_http" | "external_worker" | "manual";
export const NODE_CATEGORIES = ["ai", "data", "manual", "system", "external"] as const;
export const NODE_RUN_MODES = ["embedded", "internal_http", "external_worker", "manual"] as const;

export interface InputsSchema {
  type?: "object";
  required?: string[];
  properties: Record<string, InputFieldSchema>;
}

export interface InputFieldSchema {
  type?: string;
  description?: string;
  /** step.inputs 没给该字段时使用的默认表达式; 不写则 driver 拿到 undefined */
  defaultBinding?: string;
}

/**
 * 一层浅 merge — paramsSchema 是 flat 字段, 不嵌套. 嵌套字段以整体覆盖语义.
 *   defaults  最底 (step.params 没填时兜底)
 *   step      中间 (pipeline 作者填的)
 *   pin       最上 (constants 强制顶回, 即使 step 覆盖也无效)
 */
export function mergeEffectiveParams(
  stepParams: Record<string, unknown>,
  p: NodePresets | null | undefined,
): Record<string, unknown> {
  if (!p) return { ...stepParams };
  const eff: Record<string, unknown> = { ...(p.defaults ?? {}), ...stepParams };
  for (const key of p.pin ?? []) {
    if (p.constants && Object.prototype.hasOwnProperty.call(p.constants, key)) {
      eff[key] = p.constants[key];
    }
  }
  return eff;
}

/**
 * 把 secret 引用解析为实际值 — Phase 1 只支持 envVar; secretManagerRef 留给后续阶段 (KMS / Vault).
 */
export function resolveSecret(p: NodePresets | null | undefined, name: string): string | undefined {
  const ref = p?.secrets?.[name];
  if (!ref) return undefined;
  if (ref.envVar) return process.env[ref.envVar];
  return undefined;
}

/**
 * 极简 {{var}} 模板渲染 — 给 systemPrompt 等场景, 不引入完整模板引擎.
 * 未匹配的 {{x}} 保留原样, 不抛错.
 */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{{${k}}}`,
  );
}

// ============ Bindings resolver (Phase 3) ============
//
// 表达式语义:
//   "{{payload.x}}"        → ctx.payload.x  (envelope.payload.x)
//   "{{outputs.A.y}}"      → ctx.outputs.A.y (上游 step A 的 output 字段 y)
//   "{{tags.z}}"           → ctx.tags.z
//   "literal text"         → 字面量字符串 (含 "")
//   "prefix {{payload.x}}" → 字符串拼接, 强制 String() 替换
//
// 整段 {{path}}: 保留原值类型 (number/object/array 不变 string)
// 部分模板:     coerce 整体 string, 未匹配片段保留 "{{x}}"
// 缺失路径:     undefined (整段) 或 "" (部分模板片段)
//
// 安全: 路径只走 own properties, 显式屏蔽 __proto__/constructor/prototype, 防止
//      attacker-controlled envelope 通过表达式做 prototype walk.

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** 沿点路径取值; 仅走 own properties, 屏蔽原型链 */
export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<any>((cur, k) => {
    if (cur == null || typeof cur !== "object") return undefined;
    if (FORBIDDEN_KEYS.has(k)) return undefined;
    return Object.hasOwn(cur, k) ? (cur as any)[k] : undefined;
  }, obj);
}

const FULL_EXPR = /^\{\{([\w.]+)\}\}$/;
const PARTIAL_EXPR = /\{\{([\w.]+)\}\}/g;

/** 解析单个表达式值 */
export function resolveOne(value: unknown, ctx: Record<string, unknown>): unknown {
  if (typeof value !== "string") return value;            // 非字符串(已经是字面量), 透传
  const full = value.match(FULL_EXPR);
  if (full) return getPath(ctx, full[1]);                 // 整段 → 保类型
  if (!value.includes("{{")) return value;                // 无表达式 → 字面量
  return value.replace(PARTIAL_EXPR, (_, p) => {           // 部分模板 → 字符串
    const v = getPath(ctx, p);
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * 把 step.inputs 的表达式按 envelope 上下文求值. inputsSchema.properties 列出的字段:
 *   - step.inputs 有 → 用 step 表达式 (包括字面量空字符串 "")
 *   - step.inputs 无该 key → 用 schema 的 defaultBinding 兜底
 *   - 都没有 → 不出现在结果里 (driver 拿到 undefined)
 *
 * step.inputs 多出的字段(schema 未声明)按 step 表达式照常解析, 让 power user 可以传额外参数.
 */
export function resolveBindings(
  stepInputs: Record<string, unknown> | undefined,
  schemaProps: Record<string, InputFieldSchema> | undefined,
  ctx: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const schemaKeys = schemaProps ? Object.keys(schemaProps) : [];
  const stepKeys = stepInputs ? Object.keys(stepInputs) : [];
  const allKeys = new Set([...schemaKeys, ...stepKeys]);
  for (const key of allKeys) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    let expr: unknown;
    if (stepInputs && Object.hasOwn(stepInputs, key)) {
      expr = stepInputs[key];                              // step 显式给的 (含 "")
    } else {
      expr = schemaProps?.[key]?.defaultBinding;           // 兜底
    }
    if (expr === undefined) continue;
    out[key] = resolveOne(expr, ctx);
  }
  return out;
}
