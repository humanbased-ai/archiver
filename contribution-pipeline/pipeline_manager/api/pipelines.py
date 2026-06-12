"""Pipeline REST API endpoints."""

import json
import threading
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..models.db import get_session
from ..models.pipeline_run import PipelineRun
from ..models.run_step import RunStep
from ..models.run_frame import RunFrame
from ..engine.runner import run_pipeline

router = APIRouter(prefix="/api/v1/pipelines", tags=["pipelines"])


class RunRequest(BaseModel):
    source_path: str
    pipeline_config: str = "frames_segment"
    project_id: int = 0
    mode: str = "frames"
    fps: float = 5.0
    overrides: Optional[dict] = None


class RunResponse(BaseModel):
    run_id: int
    status: str
    message: str


@router.post("/run", response_model=RunResponse)
def start_run(req: RunRequest, session: Session = Depends(get_session)):
    """Start a new pipeline run (async in background thread)."""
    # Start pipeline in background
    def _run():
        try:
            run_pipeline(
                source_path=req.source_path,
                pipeline_config=req.pipeline_config,
                project_id=req.project_id,
                mode=req.mode,
                fps=req.fps,
                overrides=req.overrides,
            )
        except Exception:
            pass  # Error is recorded in DB by runner

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    # Return immediately with a pending status
    # The actual run_id is created inside the thread, so we query for the latest
    import time
    time.sleep(0.5)
    stmt = select(PipelineRun).order_by(PipelineRun.id.desc()).limit(1)
    run = session.exec(stmt).first()
    if run:
        return RunResponse(run_id=run.id, status=run.status, message="Pipeline started")
    return RunResponse(run_id=0, status="pending", message="Pipeline starting...")


@router.get("/runs")
def list_runs(session: Session = Depends(get_session)):
    """List all pipeline runs."""
    runs = session.exec(
        select(PipelineRun).order_by(PipelineRun.id.desc()).limit(50)
    ).all()
    return [
        {
            "id": r.id,
            "project_id": r.project_id,
            "pipeline_config": r.pipeline_config,
            "source_path": r.source_path,
            "mode": r.mode,
            "status": r.status,
            "total_frames": r.total_frames,
            "kept_frames": r.kept_frames,
            "filtered_frames": r.filtered_frames,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in runs
    ]


@router.get("/runs/{run_id}")
def get_run(run_id: int, session: Session = Depends(get_session)):
    """Get a single pipeline run with step details."""
    run = session.get(PipelineRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    steps = session.exec(
        select(RunStep).where(RunStep.run_id == run_id).order_by(RunStep.step_index)
    ).all()

    return {
        "id": run.id,
        "project_id": run.project_id,
        "pipeline_config": run.pipeline_config,
        "source_path": run.source_path,
        "mode": run.mode,
        "status": run.status,
        "total_frames": run.total_frames,
        "kept_frames": run.kept_frames,
        "filtered_frames": run.filtered_frames,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "error_message": run.error_message,
        "steps": [
            {
                "name": s.step_name,
                "status": s.status,
                "duration_sec": s.duration_sec,
                "stats": json.loads(s.stats_json) if s.stats_json else {},
                "log": s.log,
            }
            for s in steps
        ],
    }


@router.get("/runs/{run_id}/stats")
def get_run_stats(run_id: int, session: Session = Depends(get_session)):
    """Get aggregated statistics for a pipeline run."""
    run = session.get(PipelineRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Get aggregate step stats
    agg_step = session.exec(
        select(RunStep).where(RunStep.run_id == run_id, RunStep.step_name == "aggregate")
    ).first()

    stats = json.loads(agg_step.stats_json) if agg_step and agg_step.stats_json else {}
    stats.update({
        "total_frames": run.total_frames,
        "kept_frames": run.kept_frames,
        "filtered_frames": run.filtered_frames,
        "filter_rate": round(run.filtered_frames / run.total_frames, 3) if run.total_frames else 0,
    })
    return stats


@router.get("/runs/{run_id}/preview")
def get_run_preview(
    run_id: int,
    page: int = 1,
    page_size: int = 50,
    kept_only: bool = True,
    session: Session = Depends(get_session),
):
    """Get paginated frame list for preview gallery."""
    run = session.get(PipelineRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    query = select(RunFrame).where(RunFrame.run_id == run_id)
    if kept_only:
        query = query.where(RunFrame.kept == True)
    query = query.order_by(RunFrame.frame_index)

    # Count total
    all_frames = session.exec(query).all()
    total = len(all_frames)

    # Paginate
    offset = (page - 1) * page_size
    frames = all_frames[offset : offset + page_size]

    ls_url = run.source_path  # placeholder
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "frames": [
            {
                "index": f.frame_index,
                "filename": f.filename,
                "kept": f.kept,
                "confidence": f.filter_confidence,
                "detected_classes": json.loads(f.detected_classes),
                "task_id": f.task_id,
                "predictions_count": len(json.loads(f.predictions_json)) if f.predictions_json else 0,
            }
            for f in frames
        ],
    }
