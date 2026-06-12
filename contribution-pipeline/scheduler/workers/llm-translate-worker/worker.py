"""
llm_translate 独立 worker (Path C 参考实现).

本进程不暴露任何 HTTP 端口, 主动调调度核心的 4 个公开接口:
  POST /api/v1/queue/llm_translate/lease     拉活
  POST /api/v1/queue/lease/<runId>/heartbeat 续租 (长任务必备)
  POST /api/v1/queue/lease/<runId>/release   优雅停机时归还在飞 run
  POST /api/v1/result                        交差

部署:
  - 调度核心先签出 worker-only API key:
      npm run keys:create -- --name=llm-translate --tenant=<slug> --roles=worker
  - 设置环境变量:
      SCHEDULER_URL         调度核心地址 (含端口, 不带尾斜杠)
      SCHEDULER_API_KEY     上面签出的 key
      ANTHROPIC_API_KEY     上游 LLM API key
      WORKER_ID             集群内唯一 (建议 podname + ord)
      LEASE_SECONDS         默认 90; 心跳每 LEASE_SECONDS/3 一次
      BATCH_SIZE            默认 5

异常路径:
  - lease 失败: log + 退避后重试
  - LLM 调用失败: 按 status 分 retryable/non-retryable, 走 /result failed
  - SIGTERM: 停 lease → 等 inflight (deadline 30s) → release 剩余 → 退出
"""
from __future__ import annotations

import asyncio
import os
import signal
import uuid
from typing import Any

import httpx

# ============ 配置 ============

SCHEDULER_URL = os.environ["SCHEDULER_URL"].rstrip("/")
SCHEDULER_API_KEY = os.environ["SCHEDULER_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
WORKER_ID = os.environ.get("WORKER_ID", f"llm-translate-{uuid.uuid4().hex[:8]}")

NODE_KEY = "llm_translate"
LEASE_SECONDS = int(os.environ.get("LEASE_SECONDS", "90"))
HEARTBEAT_INTERVAL_S = max(5, LEASE_SECONDS // 3)
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "5"))
POLL_BUSY_S = 1.0
POLL_IDLE_S = 2.0
SHUTDOWN_DEADLINE_S = 30.0

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_MODEL = "claude-haiku-4-5-20251001"
DEFAULT_MAX_TOKENS = 2048
UPSTREAM_TIMEOUT_S = 60.0

# ============ 全局 ============

sched = httpx.AsyncClient(
    base_url=SCHEDULER_URL,
    timeout=30.0,
    headers={"x-api-key": SCHEDULER_API_KEY},
)
llm = httpx.AsyncClient(timeout=UPSTREAM_TIMEOUT_S)

stopping = asyncio.Event()
inflight: set[str] = set()

# ============ 调度核心 4 接口 ============

async def lease() -> list[dict[str, Any]]:
    r = await sched.post(
        f"/api/v1/queue/{NODE_KEY}/lease",
        json={"workerId": WORKER_ID, "batchSize": BATCH_SIZE, "leaseSeconds": LEASE_SECONDS},
    )
    r.raise_for_status()
    return (r.json() or {}).get("jobs") or []


async def heartbeat(run_id: str) -> bool:
    """True = 续租成功; False = 409 LEASE_LOST (调用方可放弃)"""
    r = await sched.post(
        f"/api/v1/queue/lease/{run_id}/heartbeat",
        json={"workerId": WORKER_ID, "extendSeconds": LEASE_SECONDS},
    )
    return r.status_code == 200


async def release(run_id: str) -> None:
    try:
        await sched.post(
            f"/api/v1/queue/lease/{run_id}/release",
            json={"workerId": WORKER_ID},
        )
    except Exception:
        pass  # 兜底, 失败让 reconciler 自然回收


async def report(run_id: str, result: dict[str, Any]) -> None:
    await sched.post("/api/v1/result", json={"runId": run_id, **result})


# ============ 翻译核心 ============

def _fail(code: str, message: str, retryable: bool) -> dict[str, Any]:
    return {"status": "failed", "error": {"code": code, "message": message, "retryable": retryable}}


def _classify(status: int) -> tuple[str, bool]:
    if status == 429:
        return "LLM_RATE_LIMIT", True
    if 500 <= status < 600:
        return f"LLM_{status}", True
    if 400 <= status < 500:
        return f"LLM_{status}", False
    return f"LLM_{status}", False


async def translate(job: dict[str, Any]) -> dict[str, Any]:
    payload = (job.get("envelope") or {}).get("payload") or {}
    text = str(payload.get("text") or "").strip()
    if not text:
        return _fail("NO_TEXT", "payload.text 缺失或为空", retryable=False)
    params = job.get("params") or {}
    target = str(params.get("targetLang") or "").strip()
    if not target:
        return _fail("NO_TARGET_LANG", "params.targetLang 必填", retryable=False)
    model = str(params.get("model") or DEFAULT_MODEL)

    body = {
        "model": model,
        "max_tokens": DEFAULT_MAX_TOKENS,
        "messages": [{
            "role": "user",
            "content": f"Translate the following text to {target}. Output ONLY the translation, no preface, no quotes.\n\n{text}",
        }],
    }
    try:
        resp = await llm.post(
            ANTHROPIC_URL,
            json=body,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
        )
    except httpx.TimeoutException as e:
        return _fail("LLM_TIMEOUT", str(e), retryable=True)
    except httpx.HTTPError as e:
        return _fail("LLM_NETWORK", str(e), retryable=True)

    if resp.status_code != 200:
        code, retryable = _classify(resp.status_code)
        return _fail(code, resp.text[:500], retryable=retryable)
    try:
        data = resp.json()
    except ValueError as e:
        return _fail("LLM_BAD_RESPONSE", f"JSON parse: {e}", retryable=False)
    translated = "".join(
        str(b.get("text") or "")
        for b in (data.get("content") or [])
        if b.get("type") == "text"
    ).strip()
    if not translated:
        return _fail("LLM_BAD_RESPONSE", "无 text block 或为空", retryable=False)
    return {"status": "success", "output": {"translated": translated, "targetLang": target, "model": model}}


# ============ 心跳协程 + 单 run 处理 ============

async def heartbeat_loop(run_id: str) -> None:
    while run_id in inflight and not stopping.is_set():
        try:
            await asyncio.sleep(HEARTBEAT_INTERVAL_S)
        except asyncio.CancelledError:
            return
        if run_id not in inflight:
            return
        ok = await heartbeat(run_id)
        if not ok:
            # 租约丢了, 停心跳; handler 仍可能在跑, /result 会 409, 当作 applied=false
            return


async def run_job(job: dict[str, Any]) -> None:
    run_id = job["runId"]
    inflight.add(run_id)
    hb_task = asyncio.create_task(heartbeat_loop(run_id))
    try:
        try:
            result = await translate(job)
        except Exception as e:
            result = _fail("HANDLER_THREW", str(e), retryable=True)
        try:
            await report(run_id, result)
            tag = "✓" if result.get("status") == "success" else "✗"
            print(f"  {tag} run={run_id[:8]} step={job.get('stepKey')} status={result.get('status')}")
        except Exception as e:
            print(f"  ! run={run_id[:8]} report failed: {e}")
    finally:
        hb_task.cancel()
        try:
            await hb_task
        except (asyncio.CancelledError, Exception):
            pass
        inflight.discard(run_id)


# ============ 主循环 + 优雅停机 ============

async def tick() -> bool:
    """返回 True 表示本轮拉到活了"""
    try:
        jobs = await lease()
    except Exception as e:
        print(f"[worker] lease error: {e}")
        return False
    if not jobs:
        return False
    print(f"[worker] leased {len(jobs)} job(s)")
    await asyncio.gather(*(run_job(j) for j in jobs))
    return True


async def shutdown() -> None:
    if stopping.is_set():
        return
    stopping.set()
    print(f"[worker] draining {len(inflight)} inflight run(s)...")
    deadline = asyncio.get_event_loop().time() + SHUTDOWN_DEADLINE_S
    while inflight and asyncio.get_event_loop().time() < deadline:
        await asyncio.sleep(0.2)
    remaining = list(inflight)
    if remaining:
        print(f"[worker] {len(remaining)} run(s) past deadline, releasing leases")
        await asyncio.gather(*(release(r) for r in remaining), return_exceptions=True)
    await sched.aclose()
    await llm.aclose()
    print("[worker] bye")


async def main() -> None:
    print(f"[worker] {WORKER_ID} polling {SCHEDULER_URL}, node={NODE_KEY}")
    print(f"[worker] leaseSeconds={LEASE_SECONDS}, heartbeat={HEARTBEAT_INTERVAL_S}s, batch={BATCH_SIZE}")
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown()))
    while not stopping.is_set():
        busy = await tick()
        if stopping.is_set():
            break
        try:
            await asyncio.wait_for(stopping.wait(), timeout=POLL_BUSY_S if busy else POLL_IDLE_S)
        except asyncio.TimeoutError:
            pass


if __name__ == "__main__":
    asyncio.run(main())
