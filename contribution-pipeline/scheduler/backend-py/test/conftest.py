"""
pytest 共用配置 — 加载 .env.test, 兜底检查测试库名以 _test/_e2e 结尾, 提供 DB pool fixture,
按需自动启动 uvicorn 测试 server.

对应 backend/test/_assert-test-db.ts: 防止误把生产/dev DB 当测试 DB 拿来 TRUNCATE.
"""
from __future__ import annotations
import asyncio
import os
import re
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import AsyncIterator
from urllib.parse import urlparse

import httpx
import pytest_asyncio
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
for candidate in (".env.test", ".env"):
    p = ROOT / candidate
    if p.exists():
        load_dotenv(p, override=True)
        break

SCHEDULER_BASE = os.environ.get("SCHEDULER_BASE") or "http://127.0.0.1:4001"


def _assert_test_db() -> None:
    url = os.environ.get("DATABASE_URL", "")
    m = re.search(r"/([A-Za-z0-9_-]+)(?:\?|$)", url)
    db_name = m.group(1) if m else "(unknown)"
    if not re.search(r"(_test|_e2e)$", db_name, re.IGNORECASE):
        raise SystemExit(
            f"\n[FATAL] 测试库名校验失败: DATABASE_URL={url}\n"
            f"        库名 \"{db_name}\" 不以 _test / _e2e 结尾, 拒绝执行测试.\n"
        )


def _port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0


def _wait_for_health(base: str, timeout: float = 15.0) -> None:
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = httpx.get(f"{base}/health", timeout=1.0, trust_env=False)
            if r.status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.2)
    raise RuntimeError(f"测试 server 起不来 ({base}/health 不通 within {timeout}s)")


@pytest_asyncio.fixture(scope="session", loop_scope="session", autouse=True)
def scheduler_server():
    """会话级 server fixture. 若 SCHEDULER_BASE 已通, 复用; 否则起一个 uvicorn 子进程."""
    _assert_test_db()
    parsed = urlparse(SCHEDULER_BASE)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 4001

    if _port_in_use(host, port):
        # 已有外部 server (开发者跑着 uv run python -m scheduler.server). 不重启.
        yield SCHEDULER_BASE
        return

    env = os.environ.copy()
    env["PORT"] = str(port)
    env["HOST"] = host
    # business._sched_post 通过 httpx 回打 localhost — 必须绕开 shell 里的 SOCKS/HTTP 代理
    env["NO_PROXY"] = "localhost,127.0.0.1,::1"
    env["no_proxy"] = env["NO_PROXY"]
    for k in ("ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"):
        env.pop(k, None)
    # sandbox_js driver 走 tsx 子进程跑 backend/src/sandbox-runner.ts
    node_bin = ROOT.parent / "backend" / "node_modules" / ".bin"
    if node_bin.exists():
        env["PATH"] = f"{node_bin}:" + env.get("PATH", "")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "scheduler.server:app",
         "--host", host, "--port", str(port), "--log-level", "warning"],
        env=env, cwd=ROOT, stdout=sys.stderr, stderr=sys.stderr,
    )
    try:
        _wait_for_health(SCHEDULER_BASE)
        yield SCHEDULER_BASE
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def db_pool(scheduler_server) -> AsyncIterator[None]:
    """会话级 DB pool. 跑一次 init_pool, 结束时 close_pool."""
    from scheduler.db import init_pool, close_pool
    await init_pool()
    yield
    await close_pool()
