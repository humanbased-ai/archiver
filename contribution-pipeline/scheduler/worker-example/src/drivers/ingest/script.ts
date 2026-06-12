/**
 * Script driver: 在 node:vm context 里跑 pipeline 配置里的 JS 片段。
 *
 * 威胁模型: 脚本来自可信的 pipeline JSON (内部配置, 非外部用户上传)。
 * node:vm 不是真沙箱 (脚本理论上可以通过 constructor 链爬出 host realm),
 * 我们依赖"脚本可信"前提 + timeout 防误用拖死 worker。
 * 注入的 globals 是 structuredClone 副本, 脚本写回不影响外部状态;
 * 沙箱里没有 fetch / fs / require / setTimeout 等可达。
 *
 * 脚本可见的 globals:
 *   - payload   (envelope.payload, 副本)
 *   - outputs   (envelope.outputs, 副本)
 *   - tags      (envelope.tags, 副本)
 *   - params    (本步 params, 不含 script 字段)
 * 通过 `return ...` 返回一个对象作为 step output。
 */
import * as vm from "node:vm";
import type { IngestDriver, IngestResult } from "./index.ts";

const DEFAULT_TIMEOUT_MS = 2000;
const MAX_TIMEOUT_MS = 30_000;

export const scriptDriver: IngestDriver = {
  source: "script",
  description: "Inline JS in node:vm context; pipeline-config trusted",
  async handle(job) {
    const code = String(job.params.script ?? "").trim();
    if (!code) {
      return fail("EMPTY_SCRIPT", "params.script 缺失");
    }
    const timeoutMs = clamp(Number(job.params.timeoutMs ?? DEFAULT_TIMEOUT_MS), 100, MAX_TIMEOUT_MS);
    const tag = `script step=${job.stepKey} run=${job.runId.slice(0, 8)}`;
    const startedAt = Date.now();

    try {
      const safeParams: Record<string, unknown> = { ...job.params };
      delete safeParams.script;
      const sandbox: Record<string, unknown> = {
        payload: structuredClone(job.envelope.payload ?? {}),
        outputs: structuredClone(job.envelope.outputs ?? {}),
        tags: structuredClone(job.envelope.tags ?? {}),
        params: structuredClone(safeParams),
      };
      const ctx = vm.createContext(sandbox);
      const wrapped = `(function(){\n${code}\n})()`;
      const raw = vm.runInContext(wrapped, ctx, { timeout: timeoutMs });
      const elapsedMs = Date.now() - startedAt;
      const output = normalizeOutput(raw);
      logEvent("ok", { tag, elapsedMs, outputKeys: Object.keys(output).length });
      return {
        output: {
          ...output,
          _meta: { elapsedMs, timeoutMs },
        },
      };
    } catch (e: any) {
      const elapsedMs = Date.now() - startedAt;
      const msg = String(e?.message ?? e);
      const errCode = classifyError(msg);
      logEvent("fail", { tag, elapsedMs, code: errCode, msg });
      return fail(errCode, msg);
    }
  },
};

function normalizeOutput(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return structuredClone(raw) as Record<string, unknown>;
  }
  return { value: raw };
}

function classifyError(msg: string): string {
  if (/Script execution timed out/i.test(msg)) return "SCRIPT_TIMEOUT";
  return "SCRIPT_ERROR";
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function fail(code: string, message: string): IngestResult {
  return { status: "failed", error: { code, message, retryable: false } };
}

// 结构化日志钩子 — 后续接 pino / OpenTelemetry / 可用性告警就改这里
function logEvent(kind: "ok" | "fail", fields: Record<string, unknown>): void {
  const level = kind === "ok" ? "info" : "warn";
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event: `script.${kind}`, ...fields });
  if (kind === "ok") console.log(line);
  else console.warn(line);
}
