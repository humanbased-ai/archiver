"""DataRecord model — a single data item in a dataset."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class DataRecord(SQLModel, table=True):
    __tablename__ = "data_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    dataset_id: int = Field(foreign_key="datasets.id")
    record_uid: str = ""  # application-level unique ID (UUID)
    parent_uid: Optional[str] = None  # lineage: expanded from which record
    group_uid: Optional[str] = None  # records in the same group (e.g. tiles of one image)
    data_type: str = "image"  # image | video | text | json | table | audio | document | ...
    content: str = ""  # file path, URL, or inline JSON
    metadata_json: str = "{}"
    predictions_json: str = "{}"
    annotations_json: str = "{}"
    status: str = "raw"  # raw | cleaned | predicted | annotated | reviewed | exported
    external_id: Optional[str] = None  # e.g. Label Studio task_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
