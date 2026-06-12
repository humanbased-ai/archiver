/**
 * 节点输出强校验 (06-node-design §4.4)
 *
 * 校验时机:
 *   1. POST /result  (生产 lease 链路, 见 result-core.ts apply)
 *   2. POST /admin/nodes/:k/:v/debug/run  (dry-run, 见 api.ts)
 *
 * 行为 (按 nodeDefinition.outputsValidation):
 *   - strict (默认): 不符 → 抛 OutputSchemaViolation, 上层把 result 转 failed retryable=false
 *   - warn:           不符 → 返回 violations 数组但不抛, 上层 audit 后照常 apply
 *   - off:            完全跳过 (return null)
 *
 * 性能: ajv compile 结果按 (nodeKey + version) 缓存. schema 多份但每份只编译一次,
 *       热路径只跑 validator function — 跟 lease 同量级开销, 不引入瓶颈.
 */

import Ajv, { type ValidateFunction } from "ajv";

const ajv = new Ajv({
  // 允许 schema 有未知 keyword (例如 description), 不阻断
  strict: false,
  // 不全员要 additionalProperties=false — schema 是"声明的输出形状", 多余字段允许
  // (driver 在 dry-run 时可能多塞 dryRun 标记, 老 schema 不该挡)
  allErrors: true,
});

// key = `${nodeKey}@${version}`. schema 内容变化时缓存键也变 (但当前 driver-first 模式下
// 同一个 key@version 的 schema 不会变, 重启后 auto-upsert 重新写入而已).
const validatorCache = new Map<string, ValidateFunction>();

export type ValidationMode = "strict" | "warn" | "off";

export interface OutputViolation {
  /** ajv 报的具体错误数组 (含 instancePath / message) */
  errors: { path: string; message: string; keyword: string }[];
  /** 完整原始 errors (调试用) */
  raw: unknown;
}

/**
 * 校验节点 output. 返回:
 *   - null              校验通过 / 跳过 (off / 无 schema)
 *   - { errors, raw }   有违规 (上层按 mode 决定 strict 抛错还是 warn 记录)
 */
export function validateNodeOutput(args: {
  nodeKey: string;
  nodeVersion: string;
  outputsSchema: Record<string, unknown> | null | undefined;
  outputsValidation: ValidationMode | null | undefined;
  output: unknown;
}): OutputViolation | null {
  const mode = args.outputsValidation ?? "strict";
  if (mode === "off") return null;
  if (!args.outputsSchema || typeof args.outputsSchema !== "object") return null;

  const cacheKey = `${args.nodeKey}@${args.nodeVersion}`;
  let validate = validatorCache.get(cacheKey);
  if (!validate) {
    try {
      validate = ajv.compile(args.outputsSchema);
    } catch (e: any) {
      // schema 本身写错 (例如非法 JSON Schema) — 当 off 处理, 但记一次 console.warn
      console.warn(`[output-validator] schema compile failed for ${cacheKey}: ${e?.message}`);
      return null;
    }
    validatorCache.set(cacheKey, validate);
  }

  const ok = validate(args.output);
  if (ok) return null;

  const errors = (validate.errors ?? []).map((e) => ({
    path: e.instancePath || "/",
    message: e.message ?? "schema violation",
    keyword: e.keyword,
  }));
  return { errors, raw: validate.errors };
}

/** strict 模式专用 — 校验失败时抛出, 携带可读 message + 结构化 violations */
export class OutputSchemaViolationError extends Error {
  readonly code = "OUTPUT_SCHEMA_VIOLATION";
  readonly violations: OutputViolation["errors"];
  constructor(nodeRef: string, violation: OutputViolation) {
    const sample = violation.errors.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join("; ");
    super(`节点 ${nodeRef} 输出不符 outputsSchema: ${sample}${violation.errors.length > 3 ? " ..." : ""}`);
    this.violations = violation.errors;
    this.name = "OutputSchemaViolationError";
  }
}

/** 测试场景: 清缓存. 生产路径不调用. */
export function __resetValidatorCacheForTests(): void {
  validatorCache.clear();
}
