from .registry import register_driver, DriverJob, DriverResult
from .base import InProcessNode

NODE_DEFINITION = {
    "key": "collect", "version": "1.0", "displayName": "人工采集 Collect",
    "category": "manual", "runMode": "manual",
    "manual": True, "supportsDryRun": True,
    "description": (
        "人工填写表单采集节点。autoworker 不自动处理；C 端用户通过 `/api/collect/:itemId/claim` 认领，"
        "`/api/collect/:itemId/submit` 提交表单，表单字段作为 output 推进 pipeline。\n\n"
        "`params.schema` 声明表单控件 (JSON Schema 形态，RJSF 直接消费)；"
        "`params.uiSchema` 控制控件样式 (可选)；"
        "`step.inputs` 可把 envelope 字段注入上下文，供 C 端展示参考信息或预填默认值。\n\n"
        "**dry-run**: 把要模拟的表单提交数据填在 `inputs` 面板，driver 会按 `params.schema.required` 做校验，"
        "通过则把 `inputs` 原样作为 output 返回。"
    ),
    "inputsSchema": {
        "type": "object",
        "description": "dry-run 时在此填写模拟提交的表单数据",
        "properties": {},
    },
    "paramsSchema": {
        "type": "object",
        "properties": {
            "schema":                  {"type": "object", "description": "表单字段声明 (JSON Schema style)"},
            "uiSchema":                {"type": "object", "description": "RJSF uiSchema (可选)"},
            "max_concurrent_per_user": {"type": "number", "default": 1},
            "max_total_per_user":      {"type": "number", "default": 99},
        },
    },
    "uiSchema": {
        "fields": {
            "schema":                  {"widget": "json-editor"},
            "uiSchema":                {"widget": "json-editor"},
            "max_concurrent_per_user": {"widget": "number"},
            "max_total_per_user":      {"widget": "number"},
        },
    },
    "outputsSchema": {"type": "object", "description": "用户提交的表单字段透传到 outputs[stepKey]。"},
    "outputsValidation": "off",
    "idempotent": False, "defaultTimeoutMs": 86400000, "defaultMaxAttempts": 1,
    "examples": [
        {
            "title": "1. 纯文本采集 — 参考原文 + 采集内容",
            "description": "step.inputs 把 payload.rawText 绑定到 sourceText (readonly 参考字段)；采集员在 text 字段填写采集内容。",
            "step": {
                "params": {
                    "schema": {
                        "type": "object", "required": ["text"],
                        "properties": {
                            "sourceText": {"type": "string", "title": "原始文本 (参考)"},
                            "text":       {"type": "string", "title": "采集内容", "minLength": 1},
                        },
                    },
                    "uiSchema": {
                        "sourceText": {"ui:widget": "textarea", "ui:readonly": True, "ui:rows": 3},
                        "text":       {"ui:widget": "textarea", "ui:placeholder": "请输入采集内容…", "ui:rows": 4},
                    },
                    "max_concurrent_per_user": 1, "max_total_per_user": 99,
                },
                "inputs": {"sourceText": "{{payload.rawText}}"},
            },
            "envelope": {"payload": {"rawText": "这是一段来自上游的原始文本，供采集员参考并填写采集内容。"}, "outputs": {}, "tags": {}},
        },
        {
            "title": "2. 校对复核表单 — 原文只读 + 判定可编辑",
            "description": "step.inputs 把 payload.originalText 绑定到 originalText (readonly)；annotator 填写质量判定 (radio) + 可选备注。",
            "step": {
                "params": {
                    "schema": {
                        "type": "object", "required": ["quality"],
                        "properties": {
                            "originalText": {"type": "string", "title": "原文 (只读参考)"},
                            "quality":      {"type": "string", "title": "质量判定", "enum": ["pass", "fail", "skip"]},
                            "note":         {"type": "string", "title": "备注 (可选)"},
                        },
                    },
                    "uiSchema": {
                        "originalText": {"ui:widget": "textarea", "ui:readonly": True, "ui:rows": 3},
                        "quality":      {"ui:widget": "radio", "ui:enumNames": ["通过", "不通过", "跳过"]},
                        "note":         {"ui:widget": "textarea", "ui:rows": 2, "ui:placeholder": "可选，不通过时说明原因"},
                    },
                    "max_concurrent_per_user": 1, "max_total_per_user": 20,
                },
                "inputs": {"originalText": "{{payload.originalText}}"},
            },
            "envelope": {"payload": {"originalText": "待校对的原始文本示例，生产环境下此字段由上游节点输出填入。"}, "outputs": {}, "tags": {}},
        },
    ],
}


class CollectNode(InProcessNode):
    node_definition = NODE_DEFINITION

    @property
    def name(self) -> str:
        return "builtin:collect"

    async def handle(self, job: DriverJob) -> DriverResult:
        if job.ctx.get("dryRun"):
            schema = job.params.get("schema") or {}
            required: list[str] = schema.get("required") or []
            missing = [k for k in required if not job.inputs.get(k)]
            if missing:
                return {"status": "failed", "error": {"code": "MISSING_REQUIRED", "message": f"模拟提交缺少必填字段: {', '.join(missing)}", "retryable": False}}
            return {"status": "success", "output": {**job.inputs, "dryRun": True}}
        return {"status": "failed", "error": {"code": "MANUAL_NODE", "message": "collect 是人工节点, 请通过 C 端 claim/submit 完成", "retryable": False}}


def register_collect_driver() -> None:
    from .registry import Driver
    d = CollectNode().as_driver()
    register_driver(Driver(**{**d.__dict__, "skip_auto_lease": True}))
