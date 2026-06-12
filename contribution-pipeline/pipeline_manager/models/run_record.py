"""RunRecord model — per-record tracking in a pipeline run.

Replaces RunFrame (v1) with a generalized record that supports any data type,
lineage tracking (parent_record_id), and group association (group_id).
"""

from typing import Optional

from sqlmodel import Field, SQLModel


class RunRecord(SQLModel, table=True):
    __tablename__ = "run_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="pipeline_runs.id")
    record_uid: str = ""  # matches DataRecord.record_uid
    parent_record_uid: Optional[str] = None  # lineage: expanded from which record
    group_id: Optional[str] = None  # same-group records (e.g. tiles of one image)
    step_name: str = ""  # which step produced/modified this
    status: str = "passed"  # passed | filtered | error | expanded | merged
    result_json: str = "{}"  # step-specific result payload
