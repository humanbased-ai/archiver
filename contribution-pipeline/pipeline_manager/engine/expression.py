"""Safe expression evaluator for pipeline conditions.

Uses simpleeval for sandboxed evaluation. Falls back to a minimal built-in
parser if simpleeval is not installed.

Supports:
    record.field.nested >= 0.8
    record.data_type == "image"
    record.data_type in ["image", "video"]
    exists(record.content.image_url)
    len(record.content) > 10
    condition1 and condition2
    not condition
"""

import logging
import operator
from typing import Any

logger = logging.getLogger(__name__)


def _deep_get(obj: Any, path: str, default: Any = None) -> Any:
    """Safely traverse nested dicts/objects by dot-separated path."""
    parts = path.split(".")
    current = obj
    for part in parts:
        if current is None:
            return default
        if isinstance(current, dict):
            current = current.get(part, default)
        elif hasattr(current, part):
            current = getattr(current, part, default)
        else:
            return default
    return current


def _record_to_dict(record) -> dict:
    """Convert a RecordInfo (or any dataclass/object) to a nested dict for evaluation."""
    if isinstance(record, dict):
        return record
    result = {}
    for attr in ("uid", "parent_uid", "group_id", "data_type", "content",
                 "metadata", "predictions", "annotations", "status", "external_id"):
        val = getattr(record, attr, None)
        if val is not None:
            result[attr] = val
    return result


def _exists(val: Any) -> bool:
    """Check if a value exists (not None, not empty string)."""
    if val is None:
        return False
    if isinstance(val, str) and val.strip() == "":
        return False
    return True


def evaluate_condition(condition: str, record: Any, variables: dict | None = None) -> bool:
    """Evaluate a condition expression against a record and optional variables.

    Args:
        condition: Expression string, e.g. "record.confidence >= 0.8"
        record: RecordInfo or dict
        variables: Pipeline variables dict

    Returns:
        True if the condition matches.
    """
    record_dict = _record_to_dict(record)
    names = {
        "record": record_dict,
        **(variables or {}),
    }
    functions = {
        "len": len,
        "abs": abs,
        "min": min,
        "max": max,
        "exists": _exists,
        "str": str,
        "int": int,
        "float": float,
        "bool": bool,
    }

    try:
        from simpleeval import simple_eval, EvalWithCompoundTypes
        evaluator = EvalWithCompoundTypes(names=names, functions=functions)
        result = evaluator.eval(condition)
        return bool(result)
    except ImportError:
        return _fallback_eval(condition, record_dict, variables or {})
    except Exception as e:
        logger.warning(f"Expression evaluation failed for '{condition}': {e}")
        return False


def _fallback_eval(condition: str, record: dict, variables: dict) -> bool:
    """Minimal fallback evaluator when simpleeval is not available.

    Supports: field op value, 'and', 'or', 'not', 'in'.
    """
    condition = condition.strip()

    # Handle 'and' / 'or'
    if " and " in condition:
        parts = condition.split(" and ", 1)
        return _fallback_eval(parts[0], record, variables) and _fallback_eval(parts[1], record, variables)
    if " or " in condition:
        parts = condition.split(" or ", 1)
        return _fallback_eval(parts[0], record, variables) or _fallback_eval(parts[1], record, variables)
    if condition.startswith("not "):
        return not _fallback_eval(condition[4:], record, variables)

    # Handle 'in' operator: field in [list]
    if " in " in condition and "[" in condition:
        field_part, list_part = condition.split(" in ", 1)
        field_val = _resolve_value(field_part.strip(), record, variables)
        list_str = list_part.strip().strip("[]")
        list_vals = [v.strip().strip("'\"") for v in list_str.split(",")]
        return str(field_val) in list_vals

    # Handle comparison operators
    ops = {
        ">=": operator.ge, "<=": operator.le,
        "!=": operator.ne, "==": operator.eq,
        ">": operator.gt, "<": operator.lt,
    }
    for op_str, op_func in ops.items():
        if op_str in condition:
            left, right = condition.split(op_str, 1)
            left_val = _resolve_value(left.strip(), record, variables)
            right_val = _resolve_value(right.strip(), record, variables)
            # Try numeric comparison
            try:
                return op_func(float(left_val), float(right_val))
            except (ValueError, TypeError):
                return op_func(str(left_val), str(right_val))

    # Handle function calls like exists(...)
    if condition.startswith("exists(") and condition.endswith(")"):
        path = condition[7:-1].strip()
        val = _resolve_value(path, record, variables)
        return _exists(val)

    return False


def _resolve_value(token: str, record: dict, variables: dict) -> Any:
    """Resolve a token to its value — could be a field path, variable, or literal."""
    token = token.strip()

    # String literal
    if (token.startswith('"') and token.endswith('"')) or (token.startswith("'") and token.endswith("'")):
        return token[1:-1]

    # Numeric literal
    try:
        if "." in token and not token.startswith("record"):
            return float(token)
        return int(token)
    except ValueError:
        pass

    # Boolean
    if token == "true" or token == "True":
        return True
    if token == "false" or token == "False":
        return False
    if token == "null" or token == "None" or token == "none":
        return None

    # Field path: record.xxx or variable
    if token.startswith("record."):
        return _deep_get(record, token[7:])

    # Variable reference
    if token.startswith("${") and token.endswith("}"):
        var_name = token[2:-1]
        return variables.get(var_name)

    # Direct variable
    if token in variables:
        return variables[token]

    # Try as a deep field path on record as last resort
    return _deep_get(record, token)
