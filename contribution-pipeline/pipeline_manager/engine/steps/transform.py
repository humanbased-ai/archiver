"""TransformStep — apply a sequence of transform operations to records.

Operations are loaded from a registry, making it extensible.
"""

import json
import logging
import uuid
from abc import ABC, abstractmethod

from ..base_step import BaseStep
from ..context import PipelineContext, RecordInfo

logger = logging.getLogger(__name__)


# --- Operation registry ---

class TransformOperation(ABC):
    name: str = ""

    @abstractmethod
    def apply(self, records: list[RecordInfo], params: dict) -> list[RecordInfo]:
        ...


TRANSFORM_REGISTRY: dict[str, type[TransformOperation]] = {}


def register_transform(name: str):
    def decorator(cls):
        cls.name = name
        TRANSFORM_REGISTRY[name] = cls
        return cls
    return decorator


@register_transform("extract_fields")
class ExtractFieldsOp(TransformOperation):
    """Extract/rename fields from record content to metadata or top-level."""

    def apply(self, records: list[RecordInfo], params: dict) -> list[RecordInfo]:
        mapping = params.get("mapping", {})
        for r in records:
            src = r.content if isinstance(r.content, dict) else {"content": r.content}
            for target_field, source_path in mapping.items():
                parts = source_path.split(".")
                val = src
                for p in parts:
                    if isinstance(val, dict):
                        val = val.get(p)
                    else:
                        val = None
                        break
                if val is not None:
                    r.metadata[target_field] = val
        return records


@register_transform("set_field")
class SetFieldOp(TransformOperation):
    """Set a field on each record."""

    def apply(self, records: list[RecordInfo], params: dict) -> list[RecordInfo]:
        field = params.get("field", "")
        value = params.get("value", "")
        for r in records:
            parts = field.split(".")
            if parts[0] == "annotations" and len(parts) == 2:
                r.annotations[parts[1]] = value
            elif parts[0] == "predictions" and len(parts) == 2:
                r.predictions[parts[1]] = value
            elif parts[0] == "metadata" and len(parts) == 2:
                r.metadata[parts[1]] = value
        return records


@register_transform("resize_images")
class ResizeImagesOp(TransformOperation):
    """Resize images to a maximum dimension."""

    def apply(self, records: list[RecordInfo], params: dict) -> list[RecordInfo]:
        # Placeholder — actual implementation requires PIL
        max_size = params.get("max_size", 1920)
        logger.info(f"ResizeImages: max_size={max_size} (placeholder)")
        return records


# --- Step ---

class TransformStep(BaseStep):
    name = "transform"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        input_slot = self.params.get("input_slot", "records")
        output_slot = self.params.get("output_slot", "records")
        output_mode = self.params.get("output_mode", "replace")
        operations = self.params.get("operations", [])

        records = list(ctx.get_records(input_slot))

        for op_def in operations:
            op_type = op_def.get("type", "")
            op_cls = TRANSFORM_REGISTRY.get(op_type)
            if op_cls is None:
                logger.warning(f"Unknown transform operation: {op_type}")
                continue
            op = op_cls()
            records = op.apply(records, op_def)

        if output_mode == "append":
            ctx.append_records(records, slot=output_slot)
        else:
            ctx.set_records(records, slot=output_slot)
        return ctx

    def _get_stats(self, ctx):
        output_slot = self.params.get("output_slot", "records")
        return {"records_after_transform": len(ctx.get_records(output_slot))}
