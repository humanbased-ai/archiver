"""step_rules — 与 step-rules.ts 1:1."""
from __future__ import annotations
from typing import Any

from .node_config import get_path
from .types import Routes, StepConfig


def expand_disallowed_steps(step: dict | None) -> list[str]:
    """step.params 中 disallowedFromSteps + disallowSelfReview 兼容糖展开."""
    if not step:
        return []
    p: dict[str, Any] = step.get("params") or {}
    out: set[str] = set()
    if isinstance(p.get("disallowedFromSteps"), list):
        for s in p["disallowedFromSteps"]:
            if isinstance(s, str):
                out.add(s)
    if p.get("disallowSelfReview") is True and isinstance(p.get("reviewedStepKey"), str):
        out.add(p["reviewedStepKey"])
    return list(out)


def resolve_next_step(
    routes: Routes | None,
    output: dict[str, Any],
    steps: list[StepConfig],
    current_step_key: str,
) -> str | None:
    """返回下一个 stepKey. 'done' 表示终止; None 表示走 next (顺序下一步)."""
    if routes is None:
        return None  # 顺序

    value = get_path(output, routes.on)
    str_value = str(value) if value is not None else ""

    action = routes.cases.get(str_value) or routes.default
    if action is None:
        return None

    if action == "done":
        return "done"
    if action == "next":
        return None
    if isinstance(action, dict) and "goto" in action:
        return str(action["goto"])
    return None


def find_step_index(steps: list[StepConfig], key: str) -> int:
    for i, s in enumerate(steps):
        if s.key == key:
            return i
    return -1
