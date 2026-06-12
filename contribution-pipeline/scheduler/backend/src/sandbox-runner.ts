/**
 * sandbox-runner — stdin/stdout JSON RPC 入口, 给 Python backend 的 sandbox_js driver 调用.
 *
 * 协议:
 *   stdin  (一次性, EOF 触发执行):  {"script": "...", "inputs": {...}, "params": {...}, "timeoutMs": 5000}
 *   stdout (single JSON line):
 *     成功 → {"status": "success", "output": {...}}
 *     失败 → {"status": "failed", "error": {"code": "SCRIPT_TIMEOUT|SCRIPT_ERROR|BAD_OUTPUT|...", "message": "...", "retryable": false}}
 *
 * 进程退出码总是 0 — 沙箱级错误由 JSON 表达, runner 自身故障 (parse 失败等) 才用非 0 + stderr.
 * 与 drivers/sandbox-js.ts 同源, 共享 vm globals 屏蔽规则.
 */
import vm from "node:vm";

function clamp(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
}

function emit(payload: unknown): void {
  process.stdout.write(JSON.stringify(payload));
}

function readAllStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", reject);
  });
}

async function main() {
  let payload: any;
  try {
    const raw = await readAllStdin();
    payload = JSON.parse(raw);
  } catch (e: any) {
    process.stderr.write(`sandbox-runner: invalid stdin JSON: ${e?.message ?? e}\n`);
    process.exit(2);
  }

  const script: string = typeof payload?.script === "string" ? payload.script : "";
  if (!script) {
    emit({ status: "failed", error: { code: "NO_SCRIPT", message: "params.script 缺失或不是字符串", retryable: false } });
    return;
  }

  const timeoutMs = clamp(payload?.timeoutMs, 100, 30_000, 2000);
  const inputs = payload?.inputs ?? {};
  const params = payload?.params ?? {};

  // 与 drivers/sandbox-js.ts 同样的 vm globals: 只有 inputs + params, 禁 codeGen / wasm
  const sandbox: Record<string, unknown> = {
    inputs: structuredClone(inputs),
    params: structuredClone(params),
  };

  let output: unknown;
  try {
    const ctx = vm.createContext(sandbox, {
      codeGeneration: { strings: false, wasm: false },
    });
    const wrapped = `(function userScript(){ ${script}\n })()`;
    output = vm.runInContext(wrapped, ctx, { timeout: timeoutMs, displayErrors: true });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const isTimeout = /script execution timed out/i.test(msg);
    emit({
      status: "failed",
      error: { code: isTimeout ? "SCRIPT_TIMEOUT" : "SCRIPT_ERROR", message: msg, retryable: false },
    });
    return;
  }

  if (output == null || typeof output !== "object" || Array.isArray(output)) {
    emit({ status: "failed", error: { code: "BAD_OUTPUT", message: "脚本必须 return 一个对象", retryable: false } });
    return;
  }

  emit({ status: "success", output });
}

main().catch((e: any) => {
  process.stderr.write(`sandbox-runner: fatal: ${e?.message ?? e}\n`);
  process.exit(3);
});
