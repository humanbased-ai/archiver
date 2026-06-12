/**
 * llm_translate driver (Path A 参考实现) — in-process TS driver
 *
 * 直调 Anthropic Messages API, 不引入 SDK 依赖 (raw fetch).
 * 只有 ANTHROPIC_API_KEY 在环境里时才注册; 缺 key 时 autoworker 启动日志会提示, 不阻塞其它 driver.
 *
 * 三层配置 (Phase 2 后):
 *   ui_schema    前端编辑器读, 调度核心不解读
 *   paramsSchema step.params 形态约束
 *   presets      defaults/constants+pin — 由 lease endpoint 服务端 merge 后, driver 拿到
 *                的 job.params 已经是 effective params, 不再 driver 端 merge
 *                presets.secrets 留给 driver 端解析 (envVar 是 worker 进程的环境)
 *
 * 加新版本: 同时注册 v1.0/v1.1 两个 driver, pickDriver 按 (nodeKey, nodeVersion) 派发,
 *           item 钉死的 pipeline_versions.steps[].nodeVersion 决定走哪个 driver.
 */

import { registerDriver, type Driver, type DriverJob, type DriverResult } from "./registry.ts";
import {
  resolveSecret,
  renderTemplate,
  type DriverNodeDefinition,
} from "../node-config.ts";
import { InProcessNode } from "./base/index.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// ============ 节点能力声明 (driver 端单一来源, auto-upsert 同步到 DB) ============

export const nodeDefinition: DriverNodeDefinition = {
  key: "llm_translate",
  version: "1.0",
  displayName: "大模型翻译",
  category: "ai",
  runMode: "embedded",
  description: "调用 Anthropic Messages API 把 inputs.text 翻译到 params.targetLang。embedded 模式下 driver 与 autoworker 同进程; step.params.driver=http 切到 Path B 内网服务。",
  outputsSchema: {
    type: "object",
    properties: {
      translated: { type: "string", description: "翻译后的文本" },
      targetLang: { type: "string", description: "目标语种 (回显)" },
      model:      { type: "string", description: "实际使用的模型 id" },
    },
  },
  paramsSchema: {
    type: "object",
    required: ["targetLang"],
    properties: {
      model:      { type: "string", description: "Anthropic model id" },
      targetLang: { type: "string", description: "BCP-47 lang code (zh/en/ja/...)" },
      driver:     { type: "string", enum: ["http"], description: "走 Path B 时设为 http" },
      url:        { type: "string", description: "driver=http 时必填, 在 SANDBOX_URL_ALLOWLIST 内" },
      timeoutMs:  { type: "number", minimum: 1000, maximum: 120000 },
    },
  },
  uiSchema: {
    groups: [
      { id: "basic",    label: "基础", fields: ["targetLang", "model"] },
      { id: "advanced", label: "高级", fields: ["timeoutMs"] },
    ],
    fields: {
      targetLang: { widget: "select", options: [["zh","中文"],["en","英文"],["ja","日文"],["ko","韩文"],["fr","法文"],["de","德文"]] },
      model:      { widget: "select", optionsFrom: "anthropic.models" },
      timeoutMs:  { widget: "slider", min: 1000, max: 120000, step: 1000, hint: "driver=http 时单次调用超时" },
    },
  },
  inputsSchema: {
    type: "object",
    required: ["text"],
    properties: {
      text: {
        type: "string",
        description: "要翻译的文本; pipeline 作者通过 step.inputs.text 绑定到上游 output 或 payload",
        // 兜底: pipeline 没显式绑时, 自动从 payload.text 取 (保留 ingest 直投的最简场景)
        defaultBinding: "{{payload.text}}",
      },
    },
  },
  presets: {
    defaults: {
      model:     "claude-haiku-4-5-20251001",
      timeoutMs: 60_000,
    },
    constants: {
      systemPrompt: "Translate the following text to {{targetLang}}. Output ONLY the translation, no preface, no quotes.",
      maxTokens:    2048,
    },
    pin: ["systemPrompt", "maxTokens"],
    secrets: {
      anthropicKey: { envVar: "ANTHROPIC_API_KEY" },
    },
  },
  idempotent: true,
  defaultTimeoutMs: 60_000,
  defaultMaxAttempts: 3,
  manual: false,
  // dry-run 时不打 Anthropic (省 token / 不可重现), 返回 mock 翻译文本
  supportsDryRun: true,
  examples: [
    {
      title: "把 payload.text 翻译成英文",
      description: "最常见路径: 上游 ingest 把原文落在 payload.text, 本步翻译给下游审校用",
      step: {
        params: { targetLang: "en", model: "claude-haiku-4-5-20251001" },
        // inputs.text 不写则走 inputsSchema.defaultBinding = {{payload.text}}
        inputs: {},
      },
      envelope: { payload: { text: "今天的天气真不错" }, outputs: {}, tags: {} },
    },
    {
      title: "翻译上游 step 的 ocr.text",
      description: "OCR → 翻译 流水: text 显式绑定上游 step 'ocr' 的 text 字段",
      step: {
        params: { targetLang: "zh" },
        inputs: { text: "{{outputs.ocr.text}}" },
      },
      envelope: { payload: {}, outputs: { ocr: { text: "Hello world" } }, tags: {} },
    },
  ],
};

// ============ 测试钩子 ============

let fetchImpl: typeof fetch = globalThis.fetch;
export function __setFetchForTests(f: typeof fetch | null): void {
  fetchImpl = f ?? globalThis.fetch;
}

function classify(status: number): { code: string; retryable: boolean } {
  if (status === 429) return { code: "LLM_RATE_LIMIT", retryable: true };
  if (status >= 500 && status < 600) return { code: `LLM_${status}`, retryable: true };
  if (status >= 400 && status < 500) return { code: `LLM_${status}`, retryable: false };
  return { code: `LLM_${status}`, retryable: false };
}

// ============ Driver (class 化) ============

export class LlmTranslateNode extends InProcessNode {
  readonly nodeDefinition = nodeDefinition;

  public override get name(): string { return "builtin:llm_translate"; }

  // enable: 让 driver=http 的 step 由 HTTP driver 接 (Path B);
  // 依赖 bootstrapDrivers() 里同时注册了 http driver — 若有人把 http driver 拿掉,
  // params.driver=http 的 job 会进 NO_DRIVER park 而非失败. 见 autoworker.ts:bootstrapDrivers
  public override enable(job: DriverJob): boolean { return job.params.driver !== "http"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    const apiKey = resolveSecret(nodeDefinition.presets, "anthropicKey");
    if (!apiKey) {
      return { status: "failed", error: { code: "NO_API_KEY", message: "anthropicKey secret 未解析 (检查环境变量)", retryable: false } };
    }
    // Phase 3: 从 job.inputs.text 取, 不再硬编码 envelope.payload.text;
    // 服务端 resolver 已经按 step.inputs / inputsSchema.defaultBinding 求值好了.
    const text = String(job.inputs?.text ?? "").trim();
    if (!text) {
      return { status: "failed", error: { code: "NO_TEXT", message: "inputs.text 缺失或为空", retryable: false } };
    }

    // job.params 已是服务端 merge 后的 effective params (defaults + step.params + pin);
    // driver 端只剩两件 worker-side 职责: secret resolution + 模板 {{var}} 替换.
    const target = String(job.params.targetLang ?? "").trim();
    if (!target) {
      return { status: "failed", error: { code: "NO_TARGET_LANG", message: "params.targetLang 必填", retryable: false } };
    }
    const model = String(job.params.model);
    const maxTokens = Number(job.params.maxTokens);
    const systemPrompt = renderTemplate(String(job.params.systemPrompt), { targetLang: target });

    // dry-run: 不打 Anthropic API, 返回固定 mock 翻译, 便于演示翻译节点的输出形态.
    // 注: 服务端 merge effectiveParams 不依赖 secrets, 即使没 ANTHROPIC_API_KEY 也能 dry-run.
    if (job.ctx.dryRun) {
      return {
        status: "success",
        output: {
          translated: `[mock ${target}] ${text}`,
          targetLang: target,
          model,
          dryRun: true,
        },
      };
    }
    // 防御性 fallback: 服务端 merge 应当总是塞入 timeoutMs (来自 presets.defaults), 但若有人配错
    // pipeline 让 lease 拿不到 presets, 至少不要 NaN abort (setTimeout(NaN) 会无声丢弃, 然后 LLM 调用可能挂死)
    const timeoutMs = Number.isFinite(Number(job.params.timeoutMs)) ? Number(job.params.timeoutMs) : 30_000;

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    let resp: Response;
    try {
      resp = await fetchImpl(ANTHROPIC_URL, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: `${systemPrompt}\n\n${text}` }],
        }),
      });
    } catch (e: any) {
      clearTimeout(t);
      const isAbort = e?.name === "AbortError";
      return {
        status: "failed",
        error: { code: isAbort ? "LLM_TIMEOUT" : "LLM_NETWORK", message: String(e?.message ?? e), retryable: true },
      };
    }
    clearTimeout(t);

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      const { code, retryable } = classify(resp.status);
      return { status: "failed", error: { code, message: body.slice(0, 500), retryable } };
    }

    let parsed: any;
    try { parsed = await resp.json(); } catch (e: any) {
      return { status: "failed", error: { code: "LLM_BAD_RESPONSE", message: `JSON parse: ${e?.message}`, retryable: false } };
    }
    const translated: string = (parsed?.content ?? [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => String(b.text ?? ""))
      .join("")
      .trim();
    if (!translated) {
      return { status: "failed", error: { code: "LLM_BAD_RESPONSE", message: "无 text block 或为空", retryable: false } };
    }
    return { status: "success", output: { translated, targetLang: target, model } };
  }
}

// 兼容老 driver 字面量 export — drivers.test.ts 直接 import 这个调 handle.
// asDriver() 返回的 .handle 走 invoke 模板方法 (包含 validateOutput strict),
// 跟生产路径完全一致.
export const llmTranslateDriver: Driver = new LlmTranslateNode().asDriver();

export function registerLlmTranslateDriver(): void {
  if (!resolveSecret(nodeDefinition.presets, "anthropicKey")) {
    console.warn("[autoworker] anthropicKey secret 未解析 (检查 ANTHROPIC_API_KEY 环境变量), 跳过 builtin:llm_translate 注册");
    return;
  }
  registerDriver(llmTranslateDriver);
}
