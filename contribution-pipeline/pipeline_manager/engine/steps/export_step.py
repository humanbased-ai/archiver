"""ExportStep — export records to various formats.

Format handlers are loaded from a registry.
"""

import json
import logging
import os
from abc import ABC, abstractmethod
from pathlib import Path

from ..base_step import BaseStep
from ..context import PipelineContext, RecordInfo

logger = logging.getLogger(__name__)


# --- Format registry ---

class ExportFormat(ABC):
    name: str = ""

    @abstractmethod
    def export(self, records: list[RecordInfo], output_path: str, params: dict) -> str:
        """Export records to file. Returns the output file path."""
        ...


EXPORT_REGISTRY: dict[str, type[ExportFormat]] = {}


def register_export(name: str):
    def decorator(cls):
        cls.name = name
        EXPORT_REGISTRY[name] = cls
        return cls
    return decorator


@register_export("jsonl")
class JsonlExport(ExportFormat):
    def export(self, records, output_path, params):
        include_metadata = params.get("include_metadata", True)
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w") as f:
            for r in records:
                row = {
                    "uid": r.uid,
                    "data_type": r.data_type,
                    "content": r.content,
                    "annotations": r.annotations,
                    "predictions": r.predictions,
                    "status": r.status,
                }
                if include_metadata:
                    row["metadata"] = r.metadata
                f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
        return output_path


@register_export("json")
class JsonExport(ExportFormat):
    def export(self, records, output_path, params):
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        rows = []
        for r in records:
            rows.append({
                "uid": r.uid, "data_type": r.data_type,
                "content": r.content, "annotations": r.annotations,
                "predictions": r.predictions, "metadata": r.metadata,
            })
        with open(output_path, "w") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2, default=str)
        return output_path


@register_export("csv")
class CsvExport(ExportFormat):
    def export(self, records, output_path, params):
        import csv
        fields = params.get("fields", [])
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        if not records:
            return output_path

        # Auto-detect fields if not specified
        if not fields:
            fields = ["uid", "data_type", "status"]
            sample = records[0]
            if isinstance(sample.content, dict):
                fields.extend(f"content.{k}" for k in sample.content.keys())
            if isinstance(sample.annotations, dict):
                fields.extend(f"annotations.{k}" for k in sample.annotations.keys())

        with open(output_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(fields)
            for r in records:
                row = []
                for field in fields:
                    parts = field.split(".", 1)
                    if len(parts) == 2:
                        obj = getattr(r, parts[0], {})
                        val = obj.get(parts[1], "") if isinstance(obj, dict) else ""
                    else:
                        val = getattr(r, field, "")
                    if isinstance(val, (dict, list)):
                        val = json.dumps(val, ensure_ascii=False)
                    row.append(val)
                writer.writerow(row)
        return output_path


# --- Step ---

class ExportStep(BaseStep):
    name = "export"
    input_slots = ["records"]
    output_slots = []

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        input_slot = self.params.get("input_slot", "records")
        fmt = self.params.get("format", "jsonl")
        output_path = self.params.get("output_path", f"./exports/run_{ctx.run_id}.{fmt}")

        # Resolve template variables in output_path
        output_path = output_path.replace("${run.id}", str(ctx.run_id))
        output_path = output_path.replace("${project.id}", str(ctx.project_id))

        records = ctx.get_records(input_slot)
        format_cls = EXPORT_REGISTRY.get(fmt)
        if format_cls is None:
            raise ValueError(f"Unknown export format: {fmt}. Available: {list(EXPORT_REGISTRY.keys())}")

        exporter = format_cls()
        result_path = exporter.export(records, output_path, self.params)
        ctx.set_slot("export_path", result_path)
        logger.info(f"Exported {len(records)} records to {result_path} ({fmt})")
        return ctx

    def _get_stats(self, ctx):
        return {"export_path": ctx.get_slot("export_path", ""), "format": self.params.get("format", "jsonl")}
