import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db, get_scheduled_posts, save_results
from app.routers import compose, publish, history, health
from app.routers import accounts, upload


async def _scheduler_loop():
    while True:
        await asyncio.sleep(30)
        try:
            due = await get_scheduled_posts()
            for post in due:
                from app.services.publisher import publish_to_accounts
                results = await publish_to_accounts(post["cards"], post["account_ids"])
                succeeded = sum(1 for r in results if r["success"])
                status = ("published" if succeeded == len(results)
                          else "failed" if succeeded == 0 else "partial_failure")
                await save_results(post["id"], results, status)
        except Exception as e:
            print(f"[scheduler] error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(_scheduler_loop())
    yield
    task.cancel()


app = FastAPI(title="Codatta Tweet Agent", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

app.include_router(compose.router, prefix="/api")
app.include_router(publish.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

# Serve uploaded media
uploads_dir = Path(__file__).parent.parent / "data" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Serve frontend (must be last)
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
