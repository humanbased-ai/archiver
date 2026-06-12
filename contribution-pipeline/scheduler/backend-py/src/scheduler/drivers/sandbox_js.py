"""
sandbox_js driver — JS 沙箱. 调用 node 子进程执行 JS 脚本 (asyncio.create_subprocess_exec).
对应 drivers/sandbox-js.ts; 子进程入口是 backend/src/sandbox-runner.ts (一次性 stdin/stdout JSON RPC).
"""
from __future__ import annotations
import asyncio
import json
import shutil
from pathlib import Path

from .registry import register_driver, DriverJob, DriverResult
from .base import InProcessNode

# __file__ = .../scheduler/backend-py/src/scheduler/drivers/sandbox_js.py
# parents[5] = label-studio-pipeline 仓库根
_BACKEND_NODE_DIR = Path(__file__).resolve().parents[5] / "scheduler" / "backend"
_WORKER_PATH = str(_BACKEND_NODE_DIR / "src" / "sandbox-runner.ts")
_TSX_LOCAL = _BACKEND_NODE_DIR / "node_modules" / ".bin" / "tsx"


def _resolve_tsx() -> str | None:
    """优先用 Node backend 本地 node_modules 里的 tsx, 再 fallback PATH."""
    if _TSX_LOCAL.exists():
        return str(_TSX_LOCAL)
    return shutil.which("tsx")

NODE_DEFINITION = {
    "key": "script", "version": "1.0", "displayName": "JS 脚本 Script",
    "category": "system", "runMode": "embedded",
    "description": "在 Node.js vm 沙箱中执行任意 JS 脚本. params.script = JS 代码; return 一个 object 作为 output.",
    "paramsSchema": {
        "type": "object", "required": ["script"],
        "properties": {"script": {"type": "string"}, "timeoutMs": {"type": "number", "default": 5000}},
    },
    "uiSchema": {"fields": {"script": {"widget": "code-editor", "language": "javascript"}, "timeoutMs": {"widget": "number"}}},
    "inputsSchema": {"type": "object", "properties": {}},
    "outputsSchema": {"type": "object"},
    "outputsValidation": "off",
    "idempotent": False, "defaultTimeoutMs": 10000, "defaultMaxAttempts": 1,
    "manual": False, "supportsDryRun": True,
    "examples": [
        {"title": "Hello World", "step": {"params": {"script": "return { hello: 'world', n: inputs.n * 2 };"},
                                          "inputs": {"n": "{{payload.n}}"}},
         "envelope": {"payload": {"n": 21}, "outputs": {}, "tags": {}}},
    ],
}


class SandboxJsNode(InProcessNode):
    node_definition = NODE_DEFINITION

    @property
    def name(self) -> str:
        return "builtin:script"

    async def handle(self, job: DriverJob) -> DriverResult:
        script = str(job.params.get("script") or "").strip()
        if not script:
            return {"status": "failed", "error": {"code": "NO_SCRIPT", "message": "params.script 缺失", "retryable": False}}

        timeout_ms = int(job.params.get("timeoutMs") or 5000)

        if job.ctx.get("dryRun"):
            return {"status": "success", "output": {"dryRun": True, "_note": "dry-run 跳过实际 JS 执行"}}

        tsx = _resolve_tsx()
        if tsx is None:
            return {"status": "failed", "error": {"code": "NO_NODE", "message": "tsx/node 未找到, 无法运行 JS 沙箱 (装 backend/node_modules 或全局 tsx)", "retryable": False}}

        payload = json.dumps({
            "script": script,
            "inputs": job.inputs,
            "params": job.params,
            "timeoutMs": timeout_ms,
        }).encode()

        try:
            proc = await asyncio.create_subprocess_exec(
                tsx, _WORKER_PATH,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=payload),
                timeout=(timeout_ms + 2000) / 1000,
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            return {"status": "failed", "error": {"code": "TIMEOUT", "message": f"JS 沙箱超时 ({timeout_ms}ms)", "retryable": True}}
        except FileNotFoundError:
            return {"status": "failed", "error": {"code": "NO_NODE", "message": "tsx/node 未找到, 无法运行 JS 沙箱", "retryable": False}}

        if proc.returncode != 0:
            err_msg = (stderr or b"").decode()[:500]
            return {"status": "failed", "error": {"code": "SANDBOX_ERROR", "message": err_msg or f"exit {proc.returncode}", "retryable": False}}

        try:
            result = json.loads(stdout.decode())
            return result
        except Exception:
            return {"status": "failed", "error": {"code": "INVALID_OUTPUT", "message": "JS 沙箱返回非 JSON", "retryable": False}}


def register_sandbox_js_driver() -> None:
    register_driver(SandboxJsNode().as_driver())
