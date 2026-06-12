"""
FastAPI 应用入口 — 与 server.ts 1:1 对应

lifespan: DB pool init → bootstrap API key → start reconciler + autoworker → graceful shutdown
中间件顺序: request-id 注入 → CORS → Auth → RBAC → Idempotency → 路由
"""
from __future__ import annotations
import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from contextvars import ContextVar

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from .env_check import validate_production_env
from .db import init_pool, close_pool, get_pool
from .auth import AuthMiddleware, bootstrap_api_key
from .idempotency import IdempotencyMiddleware
from .reconciler import reconciler_loop, stop_reconciler
from .autoworker import autoworker_loop, stop_autoworker, AUTOWORKER_ID

logger = logging.getLogger(__name__)

# ── 请求上下文 (等价 @fastify/request-context) ────────────────────────────────
_req_id_var:    ContextVar[str | None] = ContextVar("req_id",    default=None)
_tenant_id_var: ContextVar[str | None] = ContextVar("tenant_id", default=None)

_background_tasks: list[asyncio.Task] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 生产环境门禁
    fatals = validate_production_env(dict(os.environ))
    if fatals:
        for f in fatals:
            logger.critical(f"[FATAL] {f}")
        raise SystemExit(1)

    await init_pool()
    await bootstrap_api_key()

    rec_task = asyncio.create_task(reconciler_loop())
    aw_task  = asyncio.create_task(autoworker_loop())
    _background_tasks.extend([rec_task, aw_task])

    yield

    # Graceful shutdown
    logger.info("[scheduler] shutting down…")
    stop_reconciler()
    stop_autoworker()

    for t in _background_tasks:
        t.cancel()
    await asyncio.gather(*_background_tasks, return_exceptions=True)

    # 释放 autoworker 持有的 lease
    try:
        pool = get_pool()
        released = await pool.fetch(
            """UPDATE outbox SET status='pending', leased_by=NULL, leased_at=NULL,
               expected_by=NULL, updated_at=NOW()
               WHERE status='leased' AND leased_by=$1 RETURNING run_id""",
            AUTOWORKER_ID,
        )
        if released:
            logger.info(f"[scheduler] released {len(released)} in-flight lease(s) on shutdown")
    except Exception as e:
        logger.warning(f"[scheduler] release-on-shutdown failed: {e}")

    await close_pool()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Scheduler Backend",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None, redoc_url=None,
    )

    # ── 中间件添加顺序 = 反向执行顺序 ─────────────────────────────────────────
    # Starlette/FastAPI 中 "后 add = 外层 = 先执行". 期望请求流: Auth → RBAC →
    # inject_ctx → Idempotency → CORS → route, 因此倒序 add (CORS 先, Auth 最后).

    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(
        IdempotencyMiddleware,
        routes=[
            {"method": "POST", "path": "/api/v1/items/create"},
            {"method": "POST", "path": "/api/v1/result"},
            {"method": "POST", "path": "/api/v1/pipelines/create"},
            {"method": "POST", "path": "/api/batches"},
        ],
    )

    @app.middleware("http")
    async def inject_request_context(request: Request, call_next):
        from .audit import set_request_id, set_trace_id_from_header
        incoming = request.headers.get("x-request-id") or str(uuid.uuid4())
        _req_id_var.set(incoming)
        set_request_id(incoming)
        set_trace_id_from_header(request.headers.get("traceparent"))
        caller = getattr(request.state, "caller", None)
        if caller:
            _tenant_id_var.set(caller.tenant_id)
        response = await call_next(request)
        response.headers["x-request-id"] = incoming
        return response

    # 集中式 RBAC: 读 request.state.caller, 必须在 AuthMiddleware 之后 add.
    from .auth import add_rbac_middleware
    add_rbac_middleware(app)

    # AuthMiddleware: 写 request.state.caller, 必须最先执行 → 最后 add.
    app.add_middleware(AuthMiddleware)

    # ── 全局错误翻译 ────────────────────────────────────────────────────────────
    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        msg = "; ".join(f"{'.'.join(str(x) for x in e['loc'])}: {e['msg']}" for e in exc.errors())
        return JSONResponse(status_code=400, content={"error": {"code": "BAD_REQUEST", "message": msg}})

    @app.exception_handler(ValidationError)
    async def pydantic_handler(request: Request, exc: ValidationError):
        return JSONResponse(status_code=400, content={"error": {"code": "BAD_REQUEST", "message": str(exc)}})

    # ── /health ──────────────────────────────────────────────────────────────────
    @app.get("/health")
    async def health():
        return {"ok": True}

    # ── /docs 静态托管 ──────────────────────────────────────────────────────────
    from pathlib import Path
    DOCS_DIR = Path(__file__).parent.parent.parent.parent / "docs"

    @app.get("/docs")
    async def docs_redirect():
        from fastapi.responses import RedirectResponse
        return RedirectResponse("/docs/api-tester.html")

    @app.get("/docs/{path:path}")
    async def serve_docs(path: str):
        if ".." in path:
            return Response(status_code=400, content="bad path")
        ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
        ct = {"html": "text/html; charset=utf-8", "yaml": "text/yaml; charset=utf-8",
              "yml": "text/yaml; charset=utf-8", "json": "application/json; charset=utf-8",
              "md": "text/markdown; charset=utf-8"}.get(ext, "text/plain; charset=utf-8")
        try:
            content = (DOCS_DIR / path).read_bytes()
            return Response(content=content, media_type=ct)
        except FileNotFoundError:
            return Response(status_code=404, content="not found")

    # ── 路由注册 ─────────────────────────────────────────────────────────────────
    from .api import router as core_router
    from .business import router as business_router
    from .events import router as events_router
    app.include_router(core_router)
    app.include_router(business_router)
    app.include_router(events_router)

    return app


app = create_app()


def main() -> None:
    import uvicorn
    from dotenv import load_dotenv
    load_dotenv()
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
    uvicorn.run(
        "scheduler.server:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", 4000)),
        reload=os.environ.get("DEV", "false").lower() == "true",
    )


if __name__ == "__main__":
    main()
