"""
ExternalWorkerNode e2e — Python 端独立 worker 路径冒烟覆盖

跟 backend/src/drivers/base/external-worker-node.ts 1:1 对齐:
  - start → lease_loop 自动 poll 调度核心
  - invoke + submit_result 把 job 跑完落库
  - stop 优雅停机 + release in-flight lease
"""
from __future__ import annotations
import asyncio
import os
from typing import Any

import pytest
import pytest_asyncio

from scheduler.db import as_system
from scheduler.drivers.base import ExternalWorkerNode, ExternalWorkerConfig
from scheduler.drivers.registry import DriverJob, DriverResult

from .helpers import (
    PREFIX, BASE,
    create_pipeline, delete_pipeline, get_item, ingest, sleep, unique_id,
)


# ─────────────────────────────────────────────────────────────────────────────
# 测试用 ExternalWorkerNode — 一个不在 autoworker 节点目录里的 nodeKey, 避免和
# 主 autoworker 抢 lease. node_definitions 由测试夹具直接插.
# ─────────────────────────────────────────────────────────────────────────────

NODE_KEY = "external-test"
NODE_VERSION = "1.0"


class _EchoExternalNode(ExternalWorkerNode):
    """收到啥 inputs 就 echo 回去, 方便断言 envelope 落库正确."""

    handled: list[DriverJob]

    def __init__(self) -> None:
        super().__init__()
        self.handled = []

    @property
    def node_definition(self) -> dict[str, Any]:
        return {
            "key": NODE_KEY,
            "version": NODE_VERSION,
            "displayName": "External Test Node",
            "category": "test",
            "runMode": "external_worker",
            "idempotent": True,
            "defaultTimeoutMs": 30_000,
            "defaultMaxAttempts": 3,
            "manual": False,
            "outputsSchema": {"type": "object"},
        }

    async def handle(self, job: DriverJob) -> DriverResult:
        self.handled.append(job)
        return {"status": "success", "output": {"echo": job.inputs, "params": job.params}}


# ─────────────────────────────────────────────────────────────────────────────
# Fixture: 在测试 DB 写 external-test node_definitions 行
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(loop_scope="session", autouse=True)
async def _ensure_external_test_node(db_pool):
    async def _do(conn):
        await conn.execute(
            """INSERT INTO node_definitions
                 (key, version, display_name, params_schema, idempotent,
                  default_timeout_ms, default_max_attempts, manual)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (key, version) DO UPDATE SET
                 display_name         = EXCLUDED.display_name,
                 params_schema        = EXCLUDED.params_schema,
                 idempotent           = EXCLUDED.idempotent,
                 default_timeout_ms   = EXCLUDED.default_timeout_ms,
                 default_max_attempts = EXCLUDED.default_max_attempts,
                 manual               = EXCLUDED.manual""",
            NODE_KEY, NODE_VERSION, "External Test Node",
            {"type": "object"}, True, 30_000, 3, False,
        )
    await as_system(_do)
    yield


async def _wait_item_done(item_id: str, timeout: float = 10.0) -> dict[str, Any]:
    deadline = asyncio.get_event_loop().time() + timeout
    r = None
    while asyncio.get_event_loop().time() < deadline:
        r = await get_item(item_id)
        assert r.status == 200, r.body
        if r.body["item"]["current_step"] == "done":
            return r.body
        await sleep(100)
    raise AssertionError(f"item {item_id} not done within {timeout}s; last={r.body['item'] if r else None}")


# ─────────────────────────────────────────────────────────────────────────────
# 用例
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio(loop_scope="session")
async def test_ew1_lease_loop_drives_item_to_done():
    """启动 ExternalWorkerNode → ingest 一条 → item 自动跑完 → handle 收到 job."""
    task_id = await create_pipeline([
        {"key": "step1", "nodeKey": NODE_KEY, "label": "外部测试",
         "params": {"k": "v"},
         "inputs": {"x": "{{payload.x}}"}},
    ], name=unique_id("ew-pipe"))
    try:
        node = _EchoExternalNode()
        await node.start(ExternalWorkerConfig(
            scheduler_base_url=BASE,
            api_key=os.environ.get("INTERNAL_KEY") or "test-key",
            worker_id=f"ew-test-{unique_id('w')}",
            node_key=NODE_KEY,
            lease_seconds=30,
            poll_busy_ms=100,
            poll_idle_ms=100,
            idle_threshold=1,
            trust_env=False,
        ))
        try:
            item = await ingest(task_id, {"x": 42})
            done = await _wait_item_done(item["itemId"])
            assert len(node.handled) >= 1
            handled = node.handled[0]
            assert handled.node_key == NODE_KEY
            assert handled.inputs == {"x": 42}
            assert handled.params == {"k": "v"}
            outputs = (done["item"]["envelope"] or {}).get("outputs") or {}
            assert outputs.get("step1", {}).get("echo") == {"x": 42}
        finally:
            await node.stop()
    finally:
        await delete_pipeline(task_id)


@pytest.mark.asyncio(loop_scope="session")
async def test_ew2_as_driver_is_disabled():
    """ExternalWorkerNode.as_driver() 必须抛, 不允许被 autoworker 当 Driver 注册."""
    node = _EchoExternalNode()
    with pytest.raises(RuntimeError, match="ExternalWorkerNode"):
        node.as_driver()


@pytest.mark.asyncio(loop_scope="session")
async def test_ew3_stop_releases_inflight_lease():
    """stop 时若仍有 lease 持有, 强制 release 让 reconciler 之外的路径也能快速回收."""
    task_id = await create_pipeline([
        {"key": "slow", "nodeKey": NODE_KEY, "label": "慢", "params": {}, "inputs": {}},
    ], name=unique_id("ew-slow"))
    try:
        gate = asyncio.Event()

        class _SlowNode(_EchoExternalNode):
            async def handle(self, job: DriverJob) -> DriverResult:
                self.handled.append(job)
                # 卡住直到 stop() 推动 deadline, 走 release 分支
                try:
                    await asyncio.wait_for(gate.wait(), timeout=10.0)
                except asyncio.TimeoutError:
                    pass
                return {"status": "success", "output": {"ok": True}}

        node = _SlowNode()
        await node.start(ExternalWorkerConfig(
            scheduler_base_url=BASE,
            api_key=os.environ.get("INTERNAL_KEY") or "test-key",
            worker_id=f"ew-slow-{unique_id('w')}",
            node_key=NODE_KEY,
            lease_seconds=30,
            poll_busy_ms=100,
            poll_idle_ms=100,
            idle_threshold=1,
            shutdown_deadline_ms=500,
            trust_env=False,
        ))
        await ingest(task_id, {"x": 1})
        # 等 lease 被拉走
        for _ in range(50):
            if node.handled:
                break
            await sleep(100)
        assert node.handled, "ExternalWorkerNode 没拉到 lease"

        # 立即 stop, 应触发 release 分支 (in-flight 跑不完, 强制归还)
        stop_task = asyncio.create_task(node.stop())
        await stop_task

        # 让 handle 卡的 wait 结束, 否则 handle 之后会去 POST /result, 但 stop 已经
        # close 了 httpx client, 那个 submit 会失败被吞掉 — 期望日志友好不抛.
        gate.set()
        await sleep(200)

        # release 后, item 不一定 done (handle 已返回但 client 关了), 起码 outbox
        # 这一条应该回到可重投或被 reconciler 处理. 这里只验证 stop 不抛 + handled 至少 1.
    finally:
        await delete_pipeline(task_id)
