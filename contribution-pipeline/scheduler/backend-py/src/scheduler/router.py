"""pipeline step 路由计算 — 与 router.ts 1:1."""
from __future__ import annotations
from typing import Any
from dataclasses import dataclass

from .types import StepConfig


@dataclass
class RouteResult:
    next_step_key: str
    loop_increment: dict[str, Any] | None = None  # {"stepKey": str, "value": int}


def _get_by_path(obj: dict[str, Any], path: str) -> Any:
    cur: Any = obj
    for k in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(k)
    return cur


def _default_next(pipeline: list[StepConfig], current_key: str) -> RouteResult:
    idx = next((i for i, s in enumerate(pipeline) if s.key == current_key), -1)
    if idx < 0 or idx == len(pipeline) - 1:
        return RouteResult(next_step_key="done")
    return RouteResult(next_step_key=pipeline[idx + 1].key)


def _resolve_action(
    pipeline: list[StepConfig],
    current_key: str,
    action: Any,
    loop_counts: dict[str, int],
) -> RouteResult:
    if action == "next":
        return _default_next(pipeline, current_key)
    if action == "done":
        return RouteResult(next_step_key="done")
    # dict with "goto"
    if isinstance(action, dict) and "goto" in action:
        lc = (loop_counts.get(current_key) or 0) + 1
        max_loops = action.get("maxLoops")
        if max_loops and lc > max_loops:
            return RouteResult(next_step_key="stuck")
        if not any(s.key == action["goto"] for s in pipeline):
            return RouteResult(next_step_key="stuck")
        return RouteResult(next_step_key=action["goto"], loop_increment={"stepKey": current_key, "value": 1})
    return _default_next(pipeline, current_key)


def compute_next_step(
    pipeline: list[StepConfig],
    current_step_key: str,
    output: dict[str, Any],
    next_hint: str | None,
    loop_counts: dict[str, int],
) -> RouteResult:
    if next_hint:
        if next_hint in ("done", "stuck"):
            return RouteResult(next_step_key=next_hint)
        if any(s.key == next_hint for s in pipeline):
            return RouteResult(next_step_key=next_hint)

    cur = next((s for s in pipeline if s.key == current_step_key), None)
    if cur and cur.routes:
        value = str(_get_by_path(output, cur.routes.on) or "")
        action = cur.routes.cases.get(value) or cur.routes.default
        if action is not None:
            return _resolve_action(pipeline, current_step_key, action, loop_counts)

    return _default_next(pipeline, current_step_key)
