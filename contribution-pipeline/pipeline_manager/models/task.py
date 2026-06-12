"""Task model — a unit of work within a project."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id")
    name: str = ""
    description: str = ""
    status: str = "draft"  # draft | active | paused | completed | archived
    pipeline_config: str = ""  # YAML pipeline definition or config name
    annotation_config: str = "{}"  # JSON: guidelines, quality rules
    ui_config: str = ""  # Label Studio XML or custom JSON schema
    data_schema: str = "{}"  # JSON Schema for data structure
    annotation_backend: str = ""  # backend name reference
    priority: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
