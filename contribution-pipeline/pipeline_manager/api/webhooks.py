"""Webhook endpoints — receive notifications from annotation backends."""

import logging
import threading

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from ..models.db import get_session
from ..models.pipeline_run import PipelineRun
from ..engine.runner import trigger_post_annotation_run

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


class AnnotationCompletePayload(BaseModel):
    """Webhook payload when annotation backend reports completion."""
    backend: str = ""
    project_id: str = ""
    completed_count: int = 0
    total_count: int = 0
    # Label Studio sends its own format — we handle both
    action: str = ""  # Label Studio: ANNOTATION_CREATED, etc.


@router.post("/annotation-complete")
def annotation_complete(payload: AnnotationCompletePayload, session: Session = Depends(get_session)):
    """Handle annotation completion webhook.

    Finds the waiting pipeline run and triggers the post-annotation segment.
    """
    project_id = payload.project_id
    if not project_id:
        return {"status": "ignored", "reason": "no project_id"}

    # Find matching waiting run
    run = session.exec(
        select(PipelineRun).where(
            (PipelineRun.status == "waiting_annotation") &
            (PipelineRun.external_project_id == project_id)
        ).order_by(PipelineRun.id.desc()).limit(1)
    ).first()

    if not run:
        logger.info(f"Webhook: no waiting run found for project_id={project_id}")
        return {"status": "ignored", "reason": "no matching waiting run"}

    # Check if enough annotations are complete
    completion_threshold = 1.0  # require 100% by default
    if payload.total_count > 0:
        ratio = payload.completed_count / payload.total_count
        if ratio < completion_threshold:
            logger.info(f"Webhook: run {run.id} not yet complete ({ratio:.0%})")
            return {"status": "waiting", "run_id": run.id,
                    "completed": payload.completed_count, "total": payload.total_count}

    # Trigger post-annotation run in background
    def _trigger():
        try:
            new_run_id = trigger_post_annotation_run(run.id)
            logger.info(f"Webhook: triggered post-annotation run {new_run_id} for parent {run.id}")
        except Exception as e:
            logger.error(f"Webhook: failed to trigger post-annotation run: {e}")

    thread = threading.Thread(target=_trigger, daemon=True)
    thread.start()

    return {"status": "triggered", "parent_run_id": run.id}
