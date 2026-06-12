"""
Driver Registry — 与 drivers/registry.ts 1:1 对应

加新节点 = registerDriver(...), autoworker 不改.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable, Awaitable

DriverResult = dict[str, Any]  # {"status": "success", "output": {...}} | {"status": "failed", "error": {...}}


@dataclass
class DriverJob:
    run_id: str
    item_id: str
    task_id: str
    tenant_id: str
    step_key: str
    node_key: str
    node_version: str | None
    params: dict[str, Any]
    inputs: dict[str, Any]
    envelope: dict[str, Any]
    ctx: dict[str, Any]


@dataclass
class Driver:
    name: str
    node_key: str
    handle: Callable[[DriverJob], Awaitable[DriverResult]]
    enable: Callable[[DriverJob], bool] | None = None
    node_definition: dict[str, Any] | None = None
    skip_auto_lease: bool = False


_drivers: list[Driver] = []


def register_driver(d: Driver) -> None:
    _drivers.append(d)


def pick_driver(job: DriverJob) -> Driver | None:
    # 三轮派发: 精确版本 → nodeKey 兜底 → 通配 "*"
    if job.node_version:
        for d in _drivers:
            if d.node_key == "*":
                continue
            if d.node_key != job.node_key:
                continue
            if d.node_definition and d.node_definition.get("version") != job.node_version:
                continue
            if d.enable and not d.enable(job):
                continue
            return d

    for d in _drivers:
        if d.node_key == "*":
            continue
        if d.node_key != job.node_key:
            continue
        if d.enable and not d.enable(job):
            continue
        return d

    for d in _drivers:
        if d.node_key != "*":
            continue
        if d.enable and not d.enable(job):
            continue
        return d

    return None


def auto_node_keys() -> list[str]:
    seen: dict[str, None] = {}
    for d in _drivers:
        if d.node_key != "*" and not d.skip_auto_lease:
            seen[d.node_key] = None
    return list(seen)


def list_drivers() -> list[dict[str, Any]]:
    return [{"name": d.name, "nodeKey": d.node_key, "hasEnable": d.enable is not None} for d in _drivers]


def collected_node_definitions() -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    for d in _drivers:
        if not d.node_definition:
            continue
        k = f"{d.node_definition['key']}@{d.node_definition['version']}"
        seen[k] = d.node_definition
    return list(seen.values())


def to_failed_result(err: Exception, code: str = "DRIVER_ERROR") -> DriverResult:
    return {"status": "failed", "error": {"code": code, "message": str(err), "retryable": True}}


def to_result_body(run_id: str, r: DriverResult) -> dict[str, Any]:
    if r["status"] == "success":
        body: dict[str, Any] = {"runId": run_id, "status": "success", "output": r["output"]}
        if "nextHint" in r:
            body["nextHint"] = r["nextHint"]
        return body
    return {"runId": run_id, "status": "failed", "error": r["error"]}
