"""Task REST API endpoints."""

import json
import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..models.db import get_session
from ..models.task import Task
from ..models.pipeline_run import PipelineRun
from ..engine.runner import run_pipeline

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.get("/{task_id}")
def get_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": task.id, "project_id": task.project_id,
        "name": task.name, "description": task.description,
        "status": task.status,
        "pipeline_config": task.pipeline_config,
        "annotation_config": json.loads(task.annotation_config),
        "ui_config": task.ui_config,
        "data_schema": json.loads(task.data_schema),
        "annotation_backend": task.annotation_backend,
        "priority": task.priority,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


class TaskUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    pipeline_config: str | None = None
    annotation_config: dict | None = None
    ui_config: str | None = None
    data_schema: dict | None = None
    annotation_backend: str | None = None


@router.put("/{task_id}")
def update_task(task_id: int, req: TaskUpdate, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field in ("name", "description", "status", "pipeline_config", "ui_config", "annotation_backend"):
        val = getattr(req, field)
        if val is not None:
            setattr(task, field, val)
    if req.annotation_config is not None:
        task.annotation_config = json.dumps(req.annotation_config, default=str)
    if req.data_schema is not None:
        task.data_schema = json.dumps(req.data_schema, default=str)
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    return {"id": task.id, "name": task.name}


@router.delete("/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return {"deleted": task_id}


# --- Run pipeline for a task ---

class RunRequest(BaseModel):
    source_path: str = ""
    overrides: dict | None = None


@router.post("/{task_id}/run")
def run_task_pipeline(task_id: int, req: RunRequest, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not task.pipeline_config:
        raise HTTPException(status_code=400, detail="Task has no pipeline_config")

    def _run():
        try:
            run_pipeline(
                source_path=req.source_path,
                pipeline_config=task.pipeline_config,
                project_id=task.project_id,
                task_id=task_id,
                overrides=req.overrides,
            )
        except Exception:
            pass

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return {"task_id": task_id, "status": "pipeline_started", "pipeline_config": task.pipeline_config}


@router.get("/{task_id}/runs")
def list_task_runs(task_id: int, session: Session = Depends(get_session)):
    runs = session.exec(
        select(PipelineRun).where(PipelineRun.task_id == task_id).order_by(PipelineRun.id.desc()).limit(50)
    ).all()
    return [
        {
            "id": r.id, "status": r.status, "pipeline_config": r.pipeline_config,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in runs
    ]


@router.get("/{task_id}/progress")
def get_task_progress(task_id: int, session: Session = Depends(get_session)):
    """Get annotation progress by querying the annotation backend."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Find the latest waiting_annotation run
    run = session.exec(
        select(PipelineRun).where(
            (PipelineRun.task_id == task_id) &
            (PipelineRun.status == "waiting_annotation")
        ).order_by(PipelineRun.id.desc()).limit(1)
    ).first()

    if not run or not run.external_project_id or not run.annotation_backend:
        return {"status": "no_active_annotation", "total": 0, "completed": 0}

    from ..backends.registry import create_annotation_backend
    from ..models.backend_config import AnnotationBackendConfig
    cfg = session.exec(
        select(AnnotationBackendConfig).where(AnnotationBackendConfig.name == run.annotation_backend)
    ).first()
    if not cfg:
        return {"status": "backend_not_found"}

    backend = create_annotation_backend(cfg)
    progress = backend.get_progress(run.external_project_id)
    return {"run_id": run.id, **progress}
