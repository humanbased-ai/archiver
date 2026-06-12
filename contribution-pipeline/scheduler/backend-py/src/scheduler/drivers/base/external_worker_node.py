"""
ExternalWorkerNode — 独立进程 external_worker 壳, 与 base/external-worker-node.ts 1:1 对应

封装的公共能力:
  ① lease_loop    — 向调度核心 poll jobs, 串/并发处理
  ② heartbeat     — 长任务按 lease_seconds/2 定时续约; LEASE_LOST 时停心跳
  ③ submit_result — POST /result, 含基本错误日志
  ④ release       — 优雅停机时归还 in-flight lease (比等 reconciler 更快)
  ⑤ backoff       — 连续空轮询时从 poll_busy_ms 退避到 poll_idle_ms
  ⑥ start/stop    — 生命周期; start 触发 BaseNode.on_init 钩子

子类约束:
  - 实现 node_definition + handle(job) 即可
  - start(config) 启动; stop() 优雅停机
  - as_driver() 已禁用: ExternalWorkerNode 自带 lease_loop, 不经 autoworker

用法:
    node = MySandboxNode()
    await node.start(ExternalWorkerConfig(
        scheduler_base_url="http://localhost:4000",
        api_key="...",
        worker_id="my-worker",
        node_key="script",
    ))
    # 进程退出时:
    await node.stop()
"""
from __future__ import annotations
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

from .base_node import BaseNode
from ..registry import Driver, DriverJob, DriverResult
from ...auth import API_KEY_HEADER, TENANT_ID_HEADER

log = logging.getLogger(__name__)


@dataclass
class ExternalWorkerConfig:
    scheduler_base_url: str
    api_key: str
    worker_id: str
    node_key: str
    lease_seconds: int = 60
    batch_size: int = 1
    poll_busy_ms: int = 1_000
    poll_idle_ms: int = 10_000
    idle_threshold: int = 5
    shutdown_deadline_ms: int = 30_000
    # httpx trust_env: 默认跟随系统代理 (HTTP_PROXY 等). 跑本地测试时常需置 False.
    trust_env: bool = True


def _job_from_response(d: dict[str, Any]) -> DriverJob:
    return DriverJob(
        run_id=d["runId"],
        item_id=d["itemId"],
        task_id=d["taskId"],
        tenant_id=d["tenantId"],
        step_key=d["stepKey"],
        node_key=d["nodeKey"],
        node_version=d.get("nodeVersion"),
        params=d.get("params") or {},
        inputs=d.get("inputs") or {},
        envelope=d.get("envelope") or {},
        ctx=d.get("ctx") or {},
    )


class ExternalWorkerNode(BaseNode):
    config: ExternalWorkerConfig
    _stopped: bool
    _inflight: set[str]
    _tasks: set[asyncio.Task[Any]]
    _client: httpx.AsyncClient | None

    def __init__(self) -> None:
        self._stopped = True
        self._inflight = set()
        self._tasks = set()
        self._client = None

    @property
    def name(self) -> str:
        return f"external:{self.node_definition['key']}"

    # ── 生命周期 ──────────────────────────────────────────────────────────────

    async def start(self, config: ExternalWorkerConfig) -> None:
        self.config = config
        self._stopped = False
        self._client = httpx.AsyncClient(timeout=30.0, trust_env=config.trust_env)
        await self.on_init()
        log.info(
            "[%s] started — worker=%s nodeKey=%s base=%s",
            self.name, config.worker_id, config.node_key, config.scheduler_base_url,
        )
        # 后台启动 lease_loop, 由 stop() 等待退出
        loop_task = asyncio.create_task(self._lease_loop(), name=f"{self.name}:lease-loop")
        self._tasks.add(loop_task)
        loop_task.add_done_callback(self._tasks.discard)

    async def stop(self) -> None:
        if self._stopped:
            return
        self._stopped = True
        log.info("[%s] stopping — %d in-flight job(s)...", self.name, len(self._inflight))
        deadline = asyncio.get_running_loop().time() + self.config.shutdown_deadline_ms / 1000
        while self._inflight and asyncio.get_running_loop().time() < deadline:
            await asyncio.sleep(0.2)
        # 兜底: 把仍 in-flight 的 lease 归还给调度核心 (跑得动就让 reconciler 自然回收)
        if self._inflight:
            log.warning(
                "[%s] %d job(s) past deadline, releasing leases",
                self.name, len(self._inflight),
            )
            await asyncio.gather(
                *[self._release(run_id, None) for run_id in list(self._inflight)],
                return_exceptions=True,
            )
        # 等 lease_loop / heartbeat 任务退出
        if self._tasks:
            await asyncio.gather(*list(self._tasks), return_exceptions=True)
        await self.on_shutdown()
        if self._client is not None:
            await self._client.aclose()
            self._client = None
        log.info("[%s] stopped", self.name)

    # ── 主循环 ────────────────────────────────────────────────────────────────

    async def _lease_loop(self) -> None:
        consecutive_empty = 0
        while not self._stopped:
            count = 0
            try:
                jobs = await self._lease_batch()
                count = len(jobs)
                if count > 0:
                    await asyncio.gather(
                        *[self._process_job(j) for j in jobs],
                        return_exceptions=True,
                    )
            except Exception as e:
                log.error("[%s] lease_loop error: %s", self.name, e)
            if self._stopped:
                break
            consecutive_empty = 0 if count > 0 else consecutive_empty + 1
            wait_ms = (
                self.config.poll_idle_ms
                if consecutive_empty >= self.config.idle_threshold
                else self.config.poll_busy_ms
            )
            await asyncio.sleep(wait_ms / 1000)

    async def _process_job(self, job: DriverJob) -> None:
        self._inflight.add(job.run_id)
        hb_task = asyncio.create_task(self._heartbeat_loop(job), name=f"{self.name}:hb:{job.run_id}")
        self._tasks.add(hb_task)
        hb_task.add_done_callback(self._tasks.discard)
        try:
            # BaseNode.invoke 封装 validate + hook + handle + classify_error, 永不抛
            result = await self.invoke(job)
            try:
                await self._submit_result(job.run_id, job.tenant_id, result)
            except Exception as e:
                log.error("[%s] submit_result failed run=%s: %s", self.name, job.run_id, e)
        finally:
            hb_task.cancel()
            self._inflight.discard(job.run_id)

    # ── 心跳 ──────────────────────────────────────────────────────────────────

    async def _heartbeat_loop(self, job: DriverJob) -> None:
        interval = max(5.0, self.config.lease_seconds / 2)
        try:
            while True:
                await asyncio.sleep(interval)
                if job.run_id not in self._inflight:
                    return
                ok = await self._heartbeat(job.run_id, job.tenant_id)
                if not ok:
                    return  # LEASE_LOST: 停心跳; handle 仍在跑但 result 会被服务端拒
        except asyncio.CancelledError:
            return

    # ── HTTP 客户端 (调度核心 4 接口) ─────────────────────────────────────────

    async def _lease_batch(self) -> list[DriverJob]:
        data = await self._post(
            f"/queue/{self.config.node_key}/lease",
            {
                "workerId": self.config.worker_id,
                "batchSize": self.config.batch_size,
                "leaseSeconds": self.config.lease_seconds,
            },
            None,  # 跨租户 lease — 不带 X-Tenant-Id → 调度核心 as_system
        )
        return [_job_from_response(j) for j in (data.get("jobs") or [])]

    async def _heartbeat(self, run_id: str, tenant_id: str) -> bool:
        assert self._client is not None
        url = f"{self.config.scheduler_base_url}/api/v1/queue/lease/{run_id}/heartbeat"
        try:
            res = await self._client.post(
                url,
                headers=self._headers(tenant_id),
                json={
                    "workerId": self.config.worker_id,
                    "extendSeconds": self.config.lease_seconds,
                },
            )
            return res.status_code < 400
        except Exception:
            return False

    async def _submit_result(self, run_id: str, tenant_id: str, result: DriverResult) -> None:
        body: dict[str, Any] = {"runId": run_id}
        if result["status"] == "success":
            body["status"] = "success"
            body["output"] = result["output"]
            if result.get("nextHint"):
                body["nextHint"] = result["nextHint"]
        else:
            body["status"] = "failed"
            body["error"] = result["error"]
        await self._post("/result", body, tenant_id)

    async def _release(self, run_id: str, tenant_id: str | None) -> None:
        try:
            await self._post(
                f"/queue/lease/{run_id}/release",
                {"workerId": self.config.worker_id},
                tenant_id,
            )
        except Exception:
            # shutdown 兜底, reconciler 会自然回收
            pass

    async def _post(self, path: str, body: Any, tenant_id: str | None) -> dict[str, Any]:
        assert self._client is not None
        url = f"{self.config.scheduler_base_url}/api/v1{path}"
        res = await self._client.post(url, headers=self._headers(tenant_id), json=body)
        try:
            data = res.json() if res.content else None
        except Exception:
            data = None
        if res.status_code >= 400:
            err = (data or {}).get("error") if isinstance(data, dict) else None
            msg = (err or {}).get("message") or f"HTTP {res.status_code}"
            code = (err or {}).get("code") or "REMOTE_ERROR"
            exc = RuntimeError(msg)
            exc.code = code  # type: ignore[attr-defined]
            raise exc
        return data if isinstance(data, dict) else {}

    def _headers(self, tenant_id: str | None) -> dict[str, str]:
        h: dict[str, str] = {
            "content-type": "application/json",
            API_KEY_HEADER: self.config.api_key,
        }
        if tenant_id:
            h[TENANT_ID_HEADER] = tenant_id
        return h

    # ── as_driver() 禁用 ──────────────────────────────────────────────────────

    def as_driver(self) -> Driver:
        raise RuntimeError(
            f"{self.name}: ExternalWorkerNode 走自己的 lease_loop, 不兼容 autoworker Driver 协议. "
            f"请调用 start(config)."
        )
