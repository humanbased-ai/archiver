"""
节点三层配置 + bindings resolver — 与 node-config.ts 1:1 对应
"""
from __future__ import annotations
import os
import re
from typing import Any

from .types import NodePresets

FORBIDDEN_KEYS = {"__proto__", "constructor", "prototype"}


def merge_effective_params(
    step_params: dict[str, Any],
    presets: NodePresets | None,
) -> dict[str, Any]:
    """defaults(兜底) < step(pipeline 作者) < pin(节点作者锁死)"""
    if not presets:
        return dict(step_params)
    eff = {**(presets.defaults or {}), **step_params}
    for key in presets.pin or []:
        if presets.constants and key in presets.constants:
            eff[key] = presets.constants[key]
    return eff


def resolve_secret(presets: NodePresets | None, name: str) -> str | None:
    ref = (presets.secrets or {}).get(name) if presets else None
    if not ref:
        return None
    if env_var := ref.get("envVar"):
        return os.environ.get(env_var)
    return None


def render_template(template: str, vars: dict[str, Any]) -> str:
    """极简 {{var}} 渲染. 未匹配保留原样."""
    return re.sub(
        r"\{\{(\w+)\}\}",
        lambda m: str(vars[m.group(1)]) if m.group(1) in vars else m.group(0),
        template,
    )


# ── Bindings resolver ────────────────────────────────────────────────────────

_FULL_EXPR = re.compile(r'^\{\{([\w.]+)\}\}$')
_PARTIAL_EXPR = re.compile(r'\{\{([\w.]+)\}\}')


def get_path(obj: Any, path: str) -> Any:
    """沿点路径取值; 仅走 own dict keys, 屏蔽原型链攻击."""
    for k in path.split("."):
        if k in FORBIDDEN_KEYS:
            return None
        if not isinstance(obj, dict) or k not in obj:
            return None
        obj = obj[k]
    return obj


def resolve_one(value: Any, ctx: dict[str, Any]) -> Any:
    """解析单个表达式值. 整段 {{path}} 保类型; 部分模板 coerce string."""
    if not isinstance(value, str):
        return value
    m = _FULL_EXPR.match(value)
    if m:
        return get_path(ctx, m.group(1))
    if "{{" not in value:
        return value

    def replace(match: re.Match) -> str:
        v = get_path(ctx, match.group(1))
        return "" if v is None else str(v)

    return _PARTIAL_EXPR.sub(replace, value)


def resolve_bindings(
    step_inputs: dict[str, Any] | None,
    schema_props: dict[str, Any] | None,
    ctx: dict[str, Any],
) -> dict[str, Any]:
    """把 step.inputs 按 envelope 上下文求值; schema defaultBinding 兜底."""
    out: dict[str, Any] = {}
    schema_keys = list(schema_props.keys()) if schema_props else []
    step_keys = list(step_inputs.keys()) if step_inputs else []
    all_keys = dict.fromkeys(schema_keys + step_keys)  # 保序去重

    for key in all_keys:
        if key in FORBIDDEN_KEYS:
            continue
        if step_inputs and key in step_inputs:
            expr: Any = step_inputs[key]
        else:
            expr = (schema_props or {}).get(key, {}).get("defaultBinding")
        if expr is None:
            continue
        out[key] = resolve_one(expr, ctx)

    return out
