/**
 * http driver — 异构外部 worker 转发
 *
 * 触发条件: step.params.driver === "http"
 *   适用任意 nodeKey, 让 Python / Go / 任意语言的 worker 暴露一个 HTTP endpoint 接活,
 *   调度核心一行不改就能用。
 *
 * 配置 (step.params):
 *   driver:    "http"        必须
 *   url:       string        外部 worker endpoint (POST), 必须在 SANDBOX_URL_ALLOWLIST 内
 *   timeoutMs: 1000~120000   默认 30000
 *
 * 安全 (SSRF 防御):
 *   - URL 必须经过 SANDBOX_URL_ALLOWLIST (env: SANDBOX_URL_ALLOWLIST=http://py:8080,...)
 *   - 拒绝内网/链路本地/loopback IP, 除非 allowlist 显式包含
 *   - 响应大小硬上限 1 MiB
 *
 * 协议:
 *   request  : { runId, itemId, taskId, tenantId, stepKey, nodeKey, params, envelope, ctx }
 *   response : { status: "success", output: {...}, nextHint? }
 *           或 { status: "failed",  error: { code, message, retryable? } }
 */

import { registerDriver, type Driver, type DriverJob, type DriverResult } from "./registry.ts";

const RESPONSE_CAP_BYTES = 1024 * 1024;

function parseAllowlist(): string[] {
  const raw = process.env.SANDBOX_URL_ALLOWLIST ?? "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function isUrlAllowed(url: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return false;
  // 完整前缀匹配 (含 scheme + host + 可选路径前缀); 简单可靠, 不做正则便于审计
  return allowlist.some((prefix) => url.startsWith(prefix));
}

function clamp(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
}

const httpDriver: Driver = {
  name: "builtin:http",
  // nodeKey 留空特殊值, 实际 enable 决定; registry.pickDriver 仍按 nodeKey 严格匹配,
  // 所以 http driver 改用通配: 注册时不指定 nodeKey, 由 enable 接管。
  // 这里 hack: nodeKey 用 "*" 占位, registry 默认严格匹配会失败, 所以 enable 不会被调到。
  // 正确做法: 让 registry 支持 nodeKey: "*" 通配 或 注册回调。
  // 简化策略: 在 registry 里检查 d.nodeKey === "*" 时跳过 nodeKey 匹配, 仅 enable 决定。
  nodeKey: "*",
  enable: (job) => job.params.driver === "http",
  async handle(job: DriverJob): Promise<DriverResult> {
    const url = typeof job.params.url === "string" ? job.params.url : "";
    if (!url) {
      return {
        status: "failed",
        error: { code: "NO_URL", message: "params.url 缺失", retryable: false },
      };
    }
    const allowlist = parseAllowlist();
    if (!isUrlAllowed(url, allowlist)) {
      return {
        status: "failed",
        error: {
          code: "URL_NOT_ALLOWED",
          message: `${url} 不在 SANDBOX_URL_ALLOWLIST 中`,
          retryable: false,
        },
      };
    }
    const timeoutMs = clamp(job.params.timeoutMs, 1000, 120_000, 30_000);

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-runid": job.runId,
          "x-tenant-id": job.tenantId,
        },
        body: JSON.stringify(job),
        signal: ac.signal,
      });
    } catch (e: any) {
      clearTimeout(t);
      const isAbort = e?.name === "AbortError";
      return {
        status: "failed",
        error: {
          code: isAbort ? "HTTP_TIMEOUT" : "HTTP_NETWORK_ERROR",
          message: String(e?.message ?? e),
          retryable: true,
        },
      };
    }
    clearTimeout(t);

    // 响应大小 cap, 防 worker 返回超大 body 撑爆调度
    const text = await resp.text();
    if (text.length > RESPONSE_CAP_BYTES) {
      return {
        status: "failed",
        error: {
          code: "HTTP_RESPONSE_TOO_LARGE",
          message: `response > ${RESPONSE_CAP_BYTES} bytes`,
          retryable: false,
        },
      };
    }

    if (!resp.ok) {
      return {
        status: "failed",
        error: {
          code: `HTTP_${resp.status}`,
          message: text.slice(0, 500),
          retryable: resp.status >= 500,
        },
      };
    }

    let parsed: any;
    try { parsed = JSON.parse(text); } catch {
      return {
        status: "failed",
        error: { code: "HTTP_BAD_JSON", message: text.slice(0, 200), retryable: false },
      };
    }

    if (parsed?.status === "success" && parsed?.output && typeof parsed.output === "object") {
      return { status: "success", output: parsed.output, nextHint: parsed.nextHint };
    }
    if (parsed?.status === "failed" && parsed?.error?.code) {
      return {
        status: "failed",
        error: {
          code: parsed.error.code,
          message: parsed.error.message ?? "",
          retryable: parsed.error.retryable !== false,
        },
      };
    }
    return {
      status: "failed",
      error: { code: "HTTP_BAD_PROTOCOL", message: "响应不符合 driver result 协议", retryable: false },
    };
  },
};

export function registerHttpDriver() {
  registerDriver(httpDriver);
}
