from .registry import register_driver, DriverJob, DriverResult
from .base import InProcessNode
from ._client import sched_post

NODE_DEFINITION = {
    "key": "export", "version": "1.0", "displayName": "导出 Export",
    "category": "data", "runMode": "embedded",
    "description": "把 step.inputs 映射的字段落到 dataset_records, 作为 pipeline 终态节点。",
    "inputsSchema": {"type": "object", "properties": {}},
    "outputsSchema": {"type": "object", "properties": {"stored": {"type": "boolean"}}},
    "paramsSchema": {
        "type": "object",
        "properties": {"format": {"type": "string", "enum": ["json", "csv"], "default": "json"}},
    },
    "uiSchema": {"fields": {"format": {"widget": "select", "options": [["json", "JSON"], ["csv", "CSV"]]}}},
    "presets": {"defaults": {"format": "json"}},
    "idempotent": True, "defaultTimeoutMs": 30000, "defaultMaxAttempts": 3,
    "manual": False, "supportsDryRun": True,
    "examples": [
        {
            "title": "选字段归档 (JSON)",
            "step": {"params": {"format": "json"}, "inputs": {"text": "{{payload.text}}", "review": "{{outputs.review}}"}},
            "envelope": {"payload": {"text": "示例数据"}, "outputs": {"review": {"decision": "approved", "score": 0.92}}, "tags": {}},
        },
    ],
}


class ExportNode(InProcessNode):
    node_definition = NODE_DEFINITION

    @property
    def name(self) -> str:
        return "builtin:export"

    async def handle(self, job: DriverJob) -> DriverResult:
        if job.ctx.get("dryRun"):
            return {"status": "success", "output": {"stored": True, "dryRun": True}}

        await sched_post(
            "/dataset/records/save",
            {"taskId": job.task_id, "itemId": job.item_id,
             "payload": job.inputs, "metadata": {"stepKey": job.step_key}},
            job.tenant_id,
        )
        return {"status": "success", "output": {"stored": True}}


def register_export_driver() -> None:
    register_driver(ExportNode().as_driver())
