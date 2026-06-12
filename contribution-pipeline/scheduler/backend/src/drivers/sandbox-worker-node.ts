/**
 * SandboxWorkerNode — worker_threads 隔离沙箱 (ExternalWorkerNode 首个实例)
 *
 * 与 sandbox-js.ts (SandboxJsNode) 的关系:
 *   SandboxJsNode   — InProcessNode, 同进程 node:vm, 适合 dev/staging
 *   SandboxWorkerNode — ExternalWorkerNode, worker_threads 独立线程, 适合生产
 *
 * 安全改进:
 *   - 每个 job 在独立 Worker 线程中执行, 脚本 OOM 不会打垮主进程
 *   - resourceLimits.maxOldGenerationSizeMb 控制线程堆上限
 *   - Worker terminate() 保证脚本超时后线程强制终止
 *
 * nodeKey 与 SandboxJsNode 相同 ("script"): 两者竞争同一队列.
 * 生产环境建议: 不调用 registerSandboxJsDriver() 以禁用同进程版本.
 */

import { Worker } from "node:worker_threads";
import { ExternalWorkerNode } from "./base/index.ts";
import type { DriverJob, DriverResult } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";

// worker_threads 内联脚本 (CJS 风格, eval: true 模式)
// 注: eval:true 的 worker 与外部 "type":"module" 无关, 可使用 require()
const THREAD_SCRIPT = `
const { workerData, parentPort } = require("node:worker_threads");
const vm = require("node:vm");

const { script, inputs, params, envelope, timeoutMs } = workerData;

const sandbox = {
  inputs:  JSON.parse(JSON.stringify(inputs  ?? {})),
  params:  JSON.parse(JSON.stringify(params  ?? {})),
  payload: JSON.parse(JSON.stringify(envelope.payload ?? {})),
  outputs: JSON.parse(JSON.stringify(envelope.outputs ?? {})),
  tags:    JSON.parse(JSON.stringify(envelope.tags    ?? {})),
};

try {
  const ctx = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const wrapped = "(function userScript(){ " + script + "\\n })()";
  const output = vm.runInContext(wrapped, ctx, { timeout: timeoutMs, displayErrors: true });

  if (output == null || typeof output !== "object" || Array.isArray(output)) {
    parentPort.postMessage({
      status: "failed",
      error: { code: "BAD_OUTPUT", message: "脚本必须 return 一个对象", retryable: false },
    });
  } else {
    parentPort.postMessage({ status: "success", output });
  }
} catch (e) {
  const msg = e && e.message ? e.message : String(e);
  const isTimeout = /script execution timed out/i.test(msg);
  parentPort.postMessage({
    status: "failed",
    error: {
      code:      isTimeout ? "SCRIPT_TIMEOUT" : "SCRIPT_ERROR",
      message:   msg,
      retryable: false,
    },
  });
}
`;

function clamp(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
}

export class SandboxWorkerNode extends ExternalWorkerNode {
  readonly nodeDefinition: DriverNodeDefinition = {
    key:         "script",
    version:     "1.0",
    displayName: "脚本 Script (worker_threads 隔离)",
    category:    "system",
    runMode:     "external_worker",
    description:
      "worker_threads 独立线程隔离的用户脚本执行。每个 job 在独立 Worker 线程中运行 node:vm " +
      "沙箱, 脚本 OOM 不影响主进程。\n\n" +
      "**强制规则**: 脚本只读 `inputs.*` 与 `params.*`, 不直接读 `payload` / `outputs` / `tags`。",
    outputsSchema: {
      type: "object",
      description: "脚本 return 的对象, 透传写到 envelope.outputs[stepKey]",
    },
    paramsSchema: {
      type: "object",
      required: ["script"],
      properties: {
        script:    { type: "string", description: "JS 片段, return 一个对象" },
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
    presets: { defaults: { timeoutMs: 2000, memoryMb: 32 } },
    idempotent:      true,
    defaultTimeoutMs: 10_000,
    defaultMaxAttempts: 3,
    manual:          false,
    supportsDryRun:  true,
  };

  public override get name(): string { return "external:sandbox-worker"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    const params = job.params;
    const script = typeof params.script === "string" ? params.script : "";
    if (!script) {
      return { status: "failed", error: { code: "NO_SCRIPT", message: "params.script 缺失", retryable: false } };
    }

    const timeoutMs = clamp(params.timeoutMs, 100, 30_000, 2_000);
    const memoryMb  = clamp(params.memoryMb,  1,   1_024,  32);

    return new Promise<DriverResult>((resolve) => {
      const worker = new Worker(THREAD_SCRIPT, {
        eval: true,
        workerData: {
          script,
          inputs:   job.inputs,
          params,
          envelope: job.envelope,
          timeoutMs,
        },
        resourceLimits: {
          maxOldGenerationSizeMb: memoryMb,
          codeRangeSizeMb: 8,
        },
      });

      // 安全网: vm 超时后线程仍有可能未退出, 给额外 1s 再强杀
      const killTimer = setTimeout(async () => {
        await worker.terminate();
        resolve({
          status: "failed",
          error: { code: "SCRIPT_TIMEOUT", message: `脚本超时 (${timeoutMs}ms)`, retryable: false },
        });
      }, timeoutMs + 1_000);

      worker.once("message", (result: DriverResult) => {
        clearTimeout(killTimer);
        resolve(result);
      });

      worker.once("error", (err) => {
        clearTimeout(killTimer);
        resolve({
          status: "failed",
          error: { code: "WORKER_ERROR", message: err.message, retryable: false },
        });
      });

      worker.once("exit", (code) => {
        clearTimeout(killTimer);
        if (code !== 0) {
          resolve({
            status: "failed",
            error: { code: "WORKER_CRASH", message: `worker 线程异常退出 (code=${code})`, retryable: false },
          });
        }
      });
    });
  }
}
