"""输出契约校验 — 与 output-validator.ts 1:1 对应"""
from __future__ import annotations
from typing import Any
from dataclasses import dataclass

try:
    import jsonschema
    _HAS_JSONSCHEMA = True
except ImportError:
    _HAS_JSONSCHEMA = False


@dataclass
class OutputViolation:
    path: str
    message: str
    keyword: str


@dataclass
class OutputValidationResult:
    errors: list[OutputViolation]


def validate_node_output(
    *,
    node_key: str,
    node_version: str,
    outputs_schema: dict[str, Any] | None,
    outputs_validation: str,
    output: dict[str, Any],
) -> OutputValidationResult | None:
    if outputs_validation == "off":
        return None
    if not outputs_schema:
        return None
    if not _HAS_JSONSCHEMA:
        return None

    validator = jsonschema.Draft7Validator(outputs_schema)
    errors: list[OutputViolation] = []
    for err in validator.iter_errors(output):
        path = "/" + "/".join(str(p) for p in err.absolute_path) if err.absolute_path else "/"
        errors.append(OutputViolation(path=path, message=err.message, keyword=err.validator or ""))

    return OutputValidationResult(errors=errors) if errors else None
