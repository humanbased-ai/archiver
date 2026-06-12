"""RunFrame model — per-frame tracking in a pipeline run."""

from typing import Optional

from sqlmodel import Field, SQLModel


class RunFrame(SQLModel, table=True):
    __tablename__ = "run_frames"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="pipeline_runs.id")
    frame_index: int = 0
    filename: str = ""
    kept: bool = False
    filter_confidence: Optional[float] = None
    detected_classes: str = "[]"
    predictions_json: str = "[]"
    task_id: Optional[int] = None
    thumbnail_path: Optional[str] = None
