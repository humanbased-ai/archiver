"""LLMInvokeStep — call an LLM backend for any purpose at any pipeline position.

Supports: classification, extraction, generation, review, augmentation, etc.
"""

import json
import logging
import re
import string

from ..base_step import BaseStep
from ..context import PipelineContext, RecordInfo

logger = logging.getLogger(__name__)


def _render_template(template: str, record: RecordInfo, variables: dict) -> str:
    """Render a prompt template with ${variable} and ${record.field} substitutions."""
    result = template

    # Substitute ${record.xxx} — deep field access
    def replace_record_ref(match):
        path = match.group(1)
        parts = path.split(".")
        val = None
        if parts[0] == "record" and len(parts) > 1:
            obj = record
            for p in parts[1:]:
                if isinstance(obj, dict):
                    obj = obj.get(p)
                elif hasattr(obj, p):
                    obj = getattr(obj, p)
                else:
                    obj = None
                    break
            val = obj
        if val is None:
            val = variables.get(path, match.group(0))
        if isinstance(val, (dict, list)):
            return json.dumps(val, ensure_ascii=False)
        return str(val) if val is not None else ""

    result = re.sub(r'\$\{([^}]+)\}', replace_record_ref, result)
    return result


class LLMInvokeStep(BaseStep):
    name = "llm_invoke"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        input_slot = self.params.get("input_slot", "records")
        output_slot = self.params.get("output_slot", "records")
        output_mode = self.params.get("output_mode", "replace")  # replace | append | expand
        backend_name = self.params.get("backend", "")
        prompt_template = self.params.get("prompt_template", "")
        response_format = self.params.get("response_format", "text")
        output_field = self.params.get("output_field", "predictions.llm")
        batch_size = self.params.get("batch_size", 1)
        attach_image = self.params.get("attach_image", False)

        # Resolve backend name from variables
        if backend_name.startswith("${"):
            var_name = backend_name[2:-1]
            backend_name = ctx.variables.get(var_name, backend_name)

        backend = ctx.model_backends.get(backend_name)
        if backend is None:
            raise ValueError(f"Model backend not found: {backend_name}")

        records = list(ctx.get_records(input_slot))
        total = len(records)
        output_records = []

        # Process in batches
        for batch_start in range(0, total, batch_size):
            batch = records[batch_start:batch_start + batch_size]
            inputs = []
            for r in batch:
                prompt = _render_template(prompt_template, r, ctx.variables)
                inp = {"prompt": prompt}
                if attach_image and r.data_type == "image" and isinstance(r.content, str):
                    inp["image_path"] = r.content
                inputs.append(inp)

            params = {"response_format": response_format}
            results = backend.predict(inputs, params)

            for r, res in zip(batch, results):
                result_data = res.get("result")
                # Write result to the specified output_field
                self._set_nested_field(r, output_field, result_data)

                if output_mode == "expand" and isinstance(result_data, list):
                    # One record becomes N records
                    for i, item in enumerate(result_data):
                        new_r = RecordInfo(
                            parent_uid=r.uid,
                            group_id=r.uid,
                            data_type=r.data_type,
                            content=item if isinstance(item, (dict, str)) else r.content,
                            metadata={**r.metadata, "expand_index": i},
                            predictions=r.predictions.copy(),
                        )
                        output_records.append(new_r)
                else:
                    output_records.append(r)

            processed = min(batch_start + batch_size, total)
            if processed % 50 == 0 or processed == total:
                logger.info(f"LLM invoke ({backend_name}): {processed}/{total}")

        if output_mode == "append":
            ctx.append_records(output_records, slot=output_slot)
        else:
            ctx.set_records(output_records, slot=output_slot)

        return ctx

    def _set_nested_field(self, record: RecordInfo, field_path: str, value):
        """Set a nested field like 'predictions.category' on a record."""
        parts = field_path.split(".")
        if len(parts) == 1:
            setattr(record, parts[0], value)
            return
        # Navigate to the parent dict
        obj = record
        for part in parts[:-1]:
            if hasattr(obj, part):
                parent = getattr(obj, part)
                if not isinstance(parent, dict):
                    setattr(obj, part, {})
                    parent = getattr(obj, part)
                obj = parent
            elif isinstance(obj, dict):
                if part not in obj or not isinstance(obj[part], dict):
                    obj[part] = {}
                obj = obj[part]
            else:
                return
        if isinstance(obj, dict):
            obj[parts[-1]] = value

    def _get_stats(self, ctx):
        output_slot = self.params.get("output_slot", "records")
        records = ctx.get_records(output_slot)
        return {"processed": len(records), "backend": self.params.get("backend", "")}
