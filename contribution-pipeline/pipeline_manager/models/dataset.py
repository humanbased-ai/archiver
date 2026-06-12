"""DataSet model — a collection of data records belonging to a task."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class DataSet(SQLModel, table=True):
    __tablename__ = "datasets"

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id")
    name: str = ""
    source: str = ""  # description of data origin
    record_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
