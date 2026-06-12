"""RunStep model — tracks each step's execution in a pipeline run."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class RunStep(SQLModel, table=True):
    __tablename__ = "run_steps"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="pipeline_runs.id")
    step_name: str = ""
    step_index: int = 0
    status: str = "pending"  # pending | running | completed | failed | skipped
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_sec: Optional[float] = None
    stats_json: str = "{}"
    log: str = ""
    input_summary: str = "{}"
    output_summary: str = "{}"
    retry_count: int = 0
