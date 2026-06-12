"""PipelineRun model."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class PipelineRun(SQLModel, table=True):
    __tablename__ = "pipeline_runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: Optional[int] = Field(default=None, foreign_key="tasks.id")
    project_id: int = 0
    pipeline_config: str = ""
    source_path: str = ""
    mode: str = "frames"  # frames | video (v1 compat)
    status: str = "pending"  # pending | running | waiting_annotation | completed | failed | cancelled
    config_json: str = "{}"
    stats_json: str = "{}"
    total_frames: int = 0  # v1 compat
    kept_frames: int = 0  # v1 compat
    filtered_frames: int = 0  # v1 compat
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    # --- split-run support ---
    parent_run_id: Optional[int] = Field(default=None, foreign_key="pipeline_runs.id")
    resume_from_step: Optional[int] = None
    external_project_id: Optional[str] = None  # annotation backend's project ID
    annotation_backend: Optional[str] = None  # annotation backend name
