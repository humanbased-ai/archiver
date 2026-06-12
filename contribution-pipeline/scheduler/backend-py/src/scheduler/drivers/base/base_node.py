"""
BaseNode — 节点公共基类, 与 base/base-node.ts 1:1 对应

模板方法: invoke() → beforeHandle → handle → afterHandle → outputsSchema 校验
子类只实现 handle(). 4 个钩子可选重写.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

from ..registry import Driver, DriverJob, DriverResult
from .errors import classify_error

if TYPE_CHECKING:
    from ...node_config import NodePresets


class BaseNode(ABC):

    @property
    @abstractmethod
    def node_definition(self) -> Any:  # DriverNodeDefinition
        ...

    @abstractmethod
    async def handle(self, job: DriverJob) -> DriverResult:
        ...

    def enable(self, job: DriverJob) -> bool:
        return True

    @property
    def name(self) -> str:
        return f"class:{self.node_definition['key']}"

    async def invoke(self, job: DriverJob) -> DriverResult:
        try:
            await self.before_handle(job)
            out = await self.handle(job)
            await self.after_handle(job, out)

            if out["status"] == "success":
                from ...output_validator import validate_node_output
                validation = out.get("outputsValidation", self.node_definition.get("outputsValidation", "strict"))
                result = validate_node_output(
                    node_key=self.node_definition["key"],
                    node_version=self.node_definition["version"],
                    outputs_schema=self.node_definition.get("outputsSchema"),
                    outputs_validation=validation,
                    output=out["output"],
                )
                if result and validation == "strict":
                    sample = "; ".join(
                        f"{v.path}: {v.message}" for v in result.errors[:3]
                    )
                    suffix = " ..." if len(result.errors) > 3 else ""
                    return {
                        "status": "failed",
                        "error": {
                            "code": "OUTPUT_SCHEMA_VIOLATION",
                            "message": f"节点 {self.node_definition['key']}@{self.node_definition['version']} 输出不符 outputsSchema: {sample}{suffix}",
                            "retryable": False,
                        },
                    }
            return out
        except Exception as e:
            c = classify_error(e)
            return {"status": "failed", "error": {"code": c.code, "message": c.message, "retryable": c.retryable}}

    # ── 可选钩子 ──────────────────────────────────────────────────────────────
    async def on_init(self) -> None:
        pass

    async def on_shutdown(self) -> None:
        pass

    async def before_handle(self, job: DriverJob) -> None:
        pass

    async def after_handle(self, job: DriverJob, out: DriverResult) -> None:
        pass

    # ── 适配 registry.Driver ──────────────────────────────────────────────────
    def as_driver(self) -> Driver:
        return Driver(
            name=self.name,
            node_key=self.node_definition["key"],
            node_definition=self.node_definition,
            enable=self.enable,
            handle=self.invoke,
        )
