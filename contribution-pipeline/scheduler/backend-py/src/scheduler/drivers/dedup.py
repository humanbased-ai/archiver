import hashlib
import json
from .registry import register_driver, DriverJob, DriverResult
from .base import InProcessNode
from ._client import sched_post, notify_business_result

NODE_DEFINITION = {
    "key": "dedup", "version": "1.0", "displayName": "去重 Dedup",
    "category": "data", "runMode": "embedded",
    "description": "按 params.dedupFields 计 hash, 调 /api/v1/dedup/check 做字段级原子去重。命中输出 decision='duplicate', 未命中 'keep'。",
    "inputsSchema": {"type": "object", "properties": {}},
    "outputsSchema": {
        "type": "object",
        "properties": {
            "decision":    {"type": "string", "enum": ["keep", "duplicate"]},
            "hash":        {"type": "string"},
            "deduped":     {"type": "boolean"},
            "firstItemId": {"type": "string"},
        },
    },
    "paramsSchema": {
        "type": "object",
        "properties": {
            "algo":        {"type": "string", "default": "exact"},
            "dedupFields": {"type": "array", "items": {"type": "string"}},
        },
    },
    "uiSchema": {
        "fields": {
            "algo":        {"widget": "select", "options": [["exact", "精确"]]},
            "dedupFields": {"widget": "string-list"},
        },
    },
    "presets": {"defaults": {"algo": "exact"}},
    "idempotent": True, "defaultTimeoutMs": 10000, "defaultMaxAttempts": 3,
    "manual": False, "supportsDryRun": True,
    "examples": [
        {
            "title": "按 text 单字段去重",
            "step": {"params": {"dedupFields": ["text"]}, "inputs": {"text": "{{payload.text}}"},
                     "routes": {"on": "decision", "cases": {"duplicate": "done", "keep": "next"}}},
            "envelope": {"payload": {"text": "测试文本 A"}, "outputs": {}, "tags": {}},
        },
    ],
}


class DedupNode(InProcessNode):
    node_definition = NODE_DEFINITION

    @property
    def name(self) -> str:
        return "builtin:dedup"

    async def handle(self, job: DriverJob) -> DriverResult:
        dedup_fields: list[str] = job.params.get("dedupFields") or []
        inputs = job.inputs
        hash_input = {f: inputs.get(f) for f in dedup_fields} if dedup_fields else dict(inputs)

        h = hashlib.sha256(json.dumps(hash_input, sort_keys=True).encode()).hexdigest()[:16]

        if job.ctx.get("dryRun"):
            return {"status": "success", "output": {"decision": "keep", "hash": h, "deduped": False, "dryRun": True}}

        resp = await sched_post(
            "/dedup/check",
            {"taskId": job.task_id, "itemId": job.item_id, "stepKey": job.step_key, "hash": h, "fields": hash_input},
            job.tenant_id,
        )
        if resp.get("kept"):
            return {"status": "success", "output": {"decision": "keep", "hash": h, "deduped": False}}

        import asyncio
        asyncio.create_task(
            notify_business_result(job.tenant_id, job.item_id, "ingest", "duplicate", f"撞重 hash={h}")
        )
        return {"status": "success", "output": {"decision": "duplicate", "hash": h, "deduped": True, "firstItemId": resp.get("firstItemId")}}


def register_dedup_driver() -> None:
    register_driver(DedupNode().as_driver())
