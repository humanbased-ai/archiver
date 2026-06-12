from datetime import datetime, timezone
from .registry import register_driver, Driver, DriverJob, DriverResult
from .base import InProcessNode

NODE_DEFINITION = {
    "key": "ingest", "version": "1.0", "displayName": "采集 Ingest",
    "category": "data", "runMode": "external_worker",
    "manual": False, "supportsDryRun": True,
    "description": (
        "外部 worker 进程执行的数据采集节点。\n\n"
        "`params.source` 决定采集类型:\n"
        "- `manual` — 通用占位, 直接 ack\n"
        "- `form` — 前端表单提交; 按 `params.schema.required` 做字段校验\n"
        "- `script` — Node.js 脚本处理 (worker 侧执行)\n\n"
        "dry-run 在调度器主进程内模拟 worker 行为。"
    ),
    "paramsSchema": {
        "type": "object",
        "properties": {
            "source": {"type": "string", "enum": ["manual", "form", "script"], "default": "manual"},
            "schema": {"type": "object"},
            "script": {"type": "string"},
        },
    },
    "uiSchema": {
        "fields": {
            "source": {"widget": "select", "options": [["manual", "通用"], ["form", "表单"], ["script", "脚本"]]},
            "schema": {"widget": "json-editor"},
            "script": {"widget": "code-editor", "language": "javascript"},
        },
    },
    "presets": {"defaults": {"source": "manual"}},
    "outputsSchema": {
        "type": "object",
        "properties": {
            "acknowledged": {"type": "boolean"},
            "source":       {"type": "string"},
            "fieldCount":   {"type": "number"},
            "receivedAt":   {"type": "string"},
        },
    },
    "outputsValidation": "warn",
    "idempotent": True, "defaultTimeoutMs": 30000, "defaultMaxAttempts": 3,
    "examples": [
        {"title": "source=manual — 通用占位",
         "step": {"params": {"source": "manual"}},
         "envelope": {"payload": {"text": "任意内容"}, "outputs": {}, "tags": {}}},
    ],
}


class IngestNode(InProcessNode):
    node_definition = NODE_DEFINITION

    @property
    def name(self) -> str:
        return "builtin:ingest-stub"

    async def handle(self, job: DriverJob) -> DriverResult:
        source = str(job.params.get("source") or "manual")
        if source == "form":
            schema = job.params.get("schema") or {}
            payload = job.envelope.get("payload") or {}
            required: list[str] = schema.get("required") or []
            missing = [k for k in required if not payload.get(k)]
            if missing:
                return {"status": "failed", "error": {"code": "MISSING_REQUIRED", "message": f"payload 缺少必填字段: {', '.join(missing)}", "retryable": False}}

        output: dict = {
            "acknowledged": True,
            "source": source,
            "fieldCount": len(job.envelope.get("payload") or {}),
            "receivedAt": datetime.now(timezone.utc).isoformat(),
        }
        if job.ctx.get("dryRun"):
            output["dryRun"] = True
        return {"status": "success", "output": output}


def register_ingest_driver() -> None:
    d = IngestNode().as_driver()
    register_driver(Driver(**{**d.__dict__, "skip_auto_lease": True}))
