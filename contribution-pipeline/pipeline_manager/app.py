"""Pipeline Manager — FastAPI application."""

import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import config
from .models.db import init_db
# Register all SQLModel tables (import triggers metadata registration)
from .models.project import Project  # noqa: F401
from .models.task import Task  # noqa: F401
from .models.dataset import DataSet  # noqa: F401
from .models.data_record import DataRecord  # noqa: F401
from .models.backend_config import ModelBackendConfig, AnnotationBackendConfig  # noqa: F401
from .models.pipeline_run import PipelineRun  # noqa: F401
from .models.run_step import RunStep  # noqa: F401
from .models.run_frame import RunFrame  # noqa: F401
from .models.run_record import RunRecord  # noqa: F401
from .api.pipelines import router as pipelines_router
from .api.projects import router as projects_router
from .api.tasks import router as tasks_router
from .api.backends import router as backends_router
from .api.webhooks import router as webhooks_router
from .dashboard.routes import router as dashboard_router

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="Label Studio Pipeline Manager", version="0.1.0")

# API routes
app.include_router(pipelines_router)
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(backends_router)
app.include_router(webhooks_router)

# Dashboard routes
app.include_router(dashboard_router)

# Static files
app.mount(
    "/static",
    StaticFiles(directory=str(config.BASE_DIR / "dashboard" / "static")),
    name="static",
)


@app.on_event("startup")
def on_startup():
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    init_db()
    logging.getLogger(__name__).info(
        f"Pipeline Manager started — DB: {config.DB_PATH}"
    )


@app.get("/health")
def health():
    return {"status": "ok"}


def main():
    import uvicorn
    uvicorn.run(
        "pipeline_manager.app:app",
        host=config.HOST,
        port=config.PORT,
        reload=True,
    )


if __name__ == "__main__":
    main()
