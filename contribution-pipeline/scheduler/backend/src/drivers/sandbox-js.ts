/**
 * sandbox-js driver — ingest source=script
 *
 * 用 node:vm 同进程跑用户脚本, 支持 timeoutMs / 受限 globals。
 *
 * ⚠ 安全模型:
 *   - 只适合 dev / staging / 内部受信脚本
 *   - 生产环境不要让租户上传任意 JS 直接进 vm: 脚本能 OOM 进程, 通过 prototype pollution
 *     拿到 process / require 等; 真正隔离需要 worker_threads + resourceLimits, 或外置
 *     Firecracker / gVisor microVM (P1-F sandbox sidecar)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 强制规则: 脚本只读 inputs.*, 不直接读 payload / outputs / tags.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 为什么:
 *   - payload / outputs / tags 是 envelope 内部结构, 跟 item 数据格式 / pipeline 拓扑紧耦合.
 *     直接读这些字段, 等于把 "数据从哪取" 硬编码到脚本里 — pipeline 改个 step key 或者
 *     上游数据结构变化, 脚本就崩.
 *   - inputs.* 是 pipeline 作者通过 step.inputs.{{表达式}} 显式映射出来的语义形参,
 *     是脚本跟 envelope 之间的契约层. 上游变了改 binding, 不动脚本.
 *
 * globals:
 *   inputs   ← 主入参 (lease 服务端 resolveBindings 后, 已是字面量)
 *   params   ← 本节点配置 (effective: defaults + step.params + pin). 算法参数 / 阈值放这
 *
 * 返回值: 必须是一个对象, 会作为 output 写入 envelope.outputs[stepKey]
 */

import vm from "node:vm";
import { registerDriver, type DriverJob, type DriverResult } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";
import { InProcessNode } from "./base/index.ts";

// 文件名 sandbox-js, nodeKey 是 "script" — 历史命名: 文件突出实现 (Node vm 沙箱),
// nodeKey 突出用户视角 (一个"脚本节点"). 不改 nodeKey, DB 行依赖它.

function clamp(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
}

export const nodeDefinition: DriverNodeDefinition = {
  key: "script",
  version: "1.0",
  displayName: "脚本 Script (沙箱)",
  category: "system",
  runMode: "embedded",
  description:
    "node:vm 同进程跑用户脚本。⚠ 仅 dev/staging 用; 生产请走外置 microVM。\n\n" +
    "**强制规则**: 脚本只读 `inputs.*` 与 `params.*`, 不直接读 `payload` / `outputs` / `tags`。\n" +
    "上游数据通过 step.inputs 的 `{{...}}` 表达式映射进 `inputs.*`, 让脚本与 pipeline 拓扑解耦 — \n" +
    "改 step key / payload 结构不动脚本.",
  outputsSchema: {
    type: "object",
    description: "脚本 return 的对象, 透传写到 envelope.outputs[stepKey]",
  },
  paramsSchema: {
    type: "object",
    required: ["script"],
    properties: {
      script:    { type: "string", description: "JS 片段, 可访问 inputs/params, return 一个对象" },
      timeoutMs: { type: "number", minimum: 100, maximum: 30000 },
      memoryMb:  { type: "number", minimum: 1, maximum: 1024 },
    },
  },
  uiSchema: {
    groups: [
      { id: "code",   label: "脚本",     fields: ["script"] },
      { id: "limits", label: "资源限制", fields: ["timeoutMs", "memoryMb"] },
    ],
    fields: {
      script:    { widget: "code-editor", language: "javascript" },
      timeoutMs: { widget: "slider", min: 100, max: 30000, step: 100 },
      memoryMb:  { widget: "slider", min: 1,   max: 1024,  step: 1 },
    },
  },
  presets: {
    defaults: { timeoutMs: 2000, memoryMb: 32 },
  },
  idempotent: true,
  defaultTimeoutMs: 10_000,
  defaultMaxAttempts: 3,
  manual: false,
  // vm globals 已屏蔽 require/fetch/process/setTimeout — 脚本只能读 inputs/params,
  // 是纯函数, dry-run 与生产逻辑完全一致, 无副作用
  supportsDryRun: true,
  examples: [
    {
      title: "1. 两数相加 — 最简: 全走 inputs",
      description:
        "强制规则示范: 脚本只读 inputs.a / inputs.b / params.factor, 不直接读 payload. " +
        "pipeline 作者负责在 step.inputs 里把 a/b 映射到具体 envelope 字段; 改 payload 字段名只动 binding, 不动脚本.",
      step: {
        params: {
          script: "return {\n  sum: inputs.a + inputs.b,\n  doubled: params.factor * inputs.a,\n};",
          factor: 3,
        },
        inputs: {
          a: "{{payload.a}}",
          b: "{{payload.b}}",
        },
      },
      envelope: { payload: { a: 5, b: 7 }, outputs: {}, tags: {} },
    },
    {
      title: "2. 决策路由 — inputs 接数据, params 配阈值, output 给路由",
      description:
        "三层各司其职: inputs.score 是这条 item 的数据 (变量); params.threshold 是 pipeline 作者配置 (常量); " +
        "脚本输出 decision 字段, step.routes.on='decision' 据此分支: pass→export, fail→manual_review.",
      step: {
        params: {
          script:
            "const score = inputs.score ?? 0;\n" +
            "const threshold = params.threshold ?? 0.8;\n" +
            "return {\n  decision: score >= threshold ? 'pass' : 'fail',\n  score,\n  threshold,\n};",
          threshold: 0.8,
        },
        inputs: {
          score: "{{payload.score}}",
        },
        routes: {
          on: "decision",
          cases: { pass: { goto: "export" }, fail: { goto: "manual_review" } },
        },
      },
      envelope: { payload: { score: 0.92 }, outputs: {}, tags: {} },
    },
    {
      title: "3. 聚合上游 outputs — 把 OCR + 翻译两个 step 的产出合一",
      description:
        "上游 step 的产出也通过 inputs 摊平进来: inputs.ocrText / inputs.zhText. " +
        "改 ocr 节点名为 ocr_invoice 时只改 binding, 脚本一行不动.",
      step: {
        params: {
          script:
            "const ocrText = inputs.ocrText ?? '';\n" +
            "const zhText  = inputs.zhText ?? '';\n" +
            "return {\n  original: ocrText,\n  translated: zhText,\n  lengthRatio: zhText.length / Math.max(ocrText.length, 1),\n};",
        },
        inputs: {
          ocrText: "{{outputs.ocr.text}}",
          zhText:  "{{outputs.translate.translated}}",
        },
      },
      envelope: {
        payload: {},
        outputs: {
          ocr:       { text: "Hello World", confidence: 0.95 },
          translate: { translated: "你好世界", targetLang: "zh" },
        },
        tags: {},
      },
    },
    {
      title: "4. 字段清洗 + 失败 throw — inputs.text 接原文, throw 进重试",
      description:
        "真实清洗场景: inputs.text 接原始文本 (binding 从 payload.text 取); 没识别到手机号 throw, " +
        "autoworker 视为 retryable failed 进入重试. 验证失败路径: 改 envelope.payload.text 删掉手机号再跑.",
      step: {
        params: {
          script:
            "const m = String(inputs.text ?? '').match(/(1[3-9]\\d{9})/);\n" +
            "if (!m) throw new Error('手机号未识别');\n" +
            "return {\n  phone: m[1],\n  masked: m[1].slice(0, 3) + '****' + m[1].slice(7),\n};",
        },
        inputs: {
          text: "{{payload.text}}",
        },
      },
      envelope: {
        payload: { text: "请联系客户: 13812345678, 紧急" },
        outputs: {}, tags: {},
      },
    },
    {
      title: "5. inputs 解耦 — 可复用清洗脚本, 与 pipeline 上游字段名解绑",
      description:
        "脚本只认 inputs.text 这个语义字段, 不写死 payload.title / outputs.ocr.text. " +
        "不同 pipeline 把不同上游字段绑到 inputs.text 上 (binding 是 pipeline 作者的事), " +
        "同一段清洗逻辑可被多个 pipeline 复用 — 改 pipeline 不动脚本.",
      step: {
        params: {
          script:
            "// 纯函数: (text) → cleaned. 上游接哪里跟脚本无关\n" +
            "const text = String(inputs.text ?? '');\n" +
            "return {\n" +
            "  cleaned: text.trim().toUpperCase().slice(0, 50),\n" +
            "  originalLength: text.length,\n" +
            "};",
        },
        // pipeline 作者负责"接线": 这里演示从 payload.title 接;
        // 换 pipeline 时把表达式改成 {{outputs.ocr.text}} 或 {{payload.summary}}, 脚本不动
        inputs: { text: "{{payload.title}}" },
      },
      envelope: {
        payload: { title: "  hello world from script node  " },
        outputs: {},
        tags: {},
      },
    },
    {
      title: "6. inputs 重命名 — 聚合多上游 outputs, 隔离深路径 + step key 命名",
      description:
        "脚本只看 inputs.{text, zh, score} 三个语义字段, 与 pipeline 内 step key 命名 / 路径深度脱钩. " +
        "改 step key 名 (例 ocr → ocr_invoice_step) 只改 inputs binding, 脚本一行不动.",
      step: {
        params: {
          script:
            "// 脚本只关心语义字段, 不感知 step 命名 / 路径深度\n" +
            "return {\n" +
            "  line: `${inputs.text} → ${inputs.zh} [${inputs.score}]`,\n" +
            "  pass: inputs.score >= 0.8,\n" +
            "};",
        },
        // pipeline 作者声明: text 从 ocr_invoice_step 取, zh 从 translate_zh_en 取, score 从 score_v2 取
        inputs: {
          text:  "{{outputs.ocr_invoice_step.text}}",
          zh:    "{{outputs.translate_zh_en.translated}}",
          score: "{{outputs.score_v2.value}}",
        },
      },
      envelope: {
        payload: {},
        outputs: {
          ocr_invoice_step: { text: "Hello World", confidence: 0.95 },
          translate_zh_en:  { translated: "你好世界", targetLang: "zh" },
          score_v2:         { value: 0.92, model: "v2" },
        },
        tags: {},
      },
    },
  ],
};

export class SandboxJsNode extends InProcessNode {
  readonly nodeDefinition = nodeDefinition;

  public override get name(): string { return "builtin:sandbox-js"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    const params = job.params;
    const script = typeof params.script === "string" ? params.script : "";
    if (!script) {
      return {
        status: "failed",
        error: { code: "NO_SCRIPT", message: "params.script 缺失或不是字符串", retryable: false },
      };
    }

    const timeoutMs = clamp(params.timeoutMs, 100, 30_000, 2000);

    // 只暴露 inputs + params; 不给 payload/outputs/tags (envelope 内部结构不泄漏给脚本)
    // 不给 require / process / fetch / setTimeout / global
    const sandbox: Record<string, unknown> = {
      inputs: structuredClone(job.inputs ?? {}),
      params: structuredClone(params),
    };

    let output: unknown;
    try {
      const ctx = vm.createContext(sandbox, {
        // 不让脚本通过 codeGeneration 漏洞跑 eval
        codeGeneration: { strings: false, wasm: false },
      });
      const wrapped = `(function userScript(){ ${script}\n })()`;
      output = vm.runInContext(wrapped, ctx, { timeout: timeoutMs, displayErrors: true });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const isTimeout = /script execution timed out/i.test(msg);
      return {
        status: "failed",
        error: {
          code: isTimeout ? "SCRIPT_TIMEOUT" : "SCRIPT_ERROR",
          message: msg,
          retryable: false,
        },
      };
    }

    if (output == null || typeof output !== "object" || Array.isArray(output)) {
      return {
        status: "failed",
        error: { code: "BAD_OUTPUT", message: "脚本必须 return 一个对象", retryable: false },
      };
    }

    return { status: "success", output: output as Record<string, unknown> };
  }
}

export function registerSandboxJsDriver() {
  registerDriver(new SandboxJsNode().asDriver());
}
