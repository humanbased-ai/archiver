"""
E2E 测试 helpers — 与 backend/test/helpers.ts 1:1.

打真实的 uvicorn server (默认 http://127.0.0.1:4001, 由 SCHEDULER_BASE 覆盖).
不走 ASGITransport 是因为 business._sched_post 自己也走 httpx, 内嵌 + 嵌套
re-entrance 容易卡住; 真 socket 反而最直白.
"""
from __future__ import annotations
import asyncio
import os
import random
import string
import time
from typing import Any

from httpx import AsyncClient

BASE = os.environ.get("SCHEDULER_BASE") or "http://127.0.0.1:4001"
PREFIX = "/api/v1"

_counter = 0


def unique_id(label: str = "test") -> str:
    global _counter
    _counter += 1
    rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"e2e-{label}-{int(time.time()*1000)}-{_counter}-{rand}"


async def sleep(ms: int) -> None:
    await asyncio.sleep(ms / 1000)


class Resp:
    __slots__ = ("status", "body")

    def __init__(self, status: int, body: Any):
        self.status = status
        self.body = body


async def req(method: str, path: str, body: Any = None,
              headers: dict[str, str] | None = None) -> Resp:
    h = dict(headers or {})
    if body is not None:
        h.setdefault("content-type", "application/json")
    async with AsyncClient(base_url=BASE, timeout=30.0, trust_env=False) as ac:
        r = await ac.request(method, path, json=body if body is not None else None, headers=h)
    try:
        parsed = r.json() if r.text else None
    except Exception:
        parsed = r.text
    return Resp(r.status_code, parsed)


async def get(path: str, headers: dict[str, str] | None = None) -> Resp:
    return await req("GET", path, None, headers)


async def post(path: str, body: Any = None, headers: dict[str, str] | None = None) -> Resp:
    return await req("POST", path, body, headers)


async def delete(path: str, headers: dict[str, str] | None = None) -> Resp:
    return await req("DELETE", path, None, headers)


# ── 预制 pipeline (与 helpers.ts buildSamplePipeline 对应) ─────────────────────
def build_sample_pipeline(
    name: str | None = None,
    base_backoff_ms: int = 1,
    max_attempts: int = 2,
    review_max_loops: int = 2,
) -> dict[str, Any]:
    policy = {"timeoutMs": 30_000, "maxAttempts": max_attempts, "baseBackoffMs": base_backoff_ms}
    return {
        "name": name or unique_id("pipeline"),
        "steps": [
            {"key": "ingest",    "nodeKey": "ingest",    "label": "采集", "params": {"source": "manual"}, "policy": policy},
            {"key": "translate", "nodeKey": "translate", "label": "翻译", "params": {"model": "demo"},    "policy": policy},
            {"key": "review", "nodeKey": "review", "label": "审核",
             "params": {"rubric": "default"},
             "routes": {"on": "decision",
                        "cases": {"approved": "next",
                                  "rejected": {"goto": "translate", "maxLoops": review_max_loops}}},
             "policy": policy},
            {"key": "export", "nodeKey": "export", "label": "导出", "params": {"format": "json"}, "policy": policy},
        ],
    }


async def create_pipeline(steps: list[dict[str, Any]], name: str | None = None) -> str:
    name = name or unique_id("pipeline")
    r = await post(f"{PREFIX}/pipelines/create", {"name": name, "steps": steps})
    if r.status != 200:
        raise AssertionError(f"createPipeline failed {r.status}: {r.body}")
    return r.body["task_id"]


async def delete_pipeline(task_id: str) -> None:
    await delete(f"{PREFIX}/pipelines/{task_id}")


async def ingest(task_id: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    r = await post(f"{PREFIX}/items/create", {"taskId": task_id, "envelope": {"payload": payload or {}}})
    if r.status != 200:
        raise AssertionError(f"ingest failed {r.status}: {r.body}")
    return r.body


async def lease_one(node_key: str, worker_id: str, lease_seconds: int = 60) -> dict[str, Any] | None:
    r = await post(f"{PREFIX}/queue/{node_key}/lease",
                   {"workerId": worker_id, "batchSize": 1, "leaseSeconds": lease_seconds})
    if r.status != 200:
        raise AssertionError(f"lease failed {r.status}: {r.body}")
    jobs = (r.body or {}).get("jobs") or []
    return jobs[0] if jobs else None


async def claim_item(item_id: str, worker_id: str, lease_seconds: int = 60) -> dict[str, Any]:
    detail = await get_item(item_id)
    if detail.status != 200:
        raise AssertionError(f"getItem {item_id} failed: {detail.status}")
    pending = next((x for x in detail.body["inflight"] if x["status"] == "pending"), None)
    if not pending:
        raise AssertionError(
            f"no pending inflight for item {item_id}; "
            f"current_step={detail.body['item']['current_step']} "
            f"inflight={detail.body['inflight']}"
        )
    r = await post(f"{PREFIX}/queue/run/{pending['run_id']}/claim",
                   {"workerId": worker_id, "leaseSeconds": lease_seconds})
    if r.status != 200:
        raise AssertionError(f"claim failed {r.status}: {r.body}")
    return r.body["job"]


async def post_result(body: dict[str, Any]) -> Resp:
    return await post(f"{PREFIX}/result", body)


async def get_item(item_id: str) -> Resp:
    return await get(f"{PREFIX}/items/{item_id}")
