"""Pipeline context — shared state passed between steps.

v2: Generalized data slots instead of hardcoded frame lists.
Keeps v1 compat via property accessors.
"""

from dataclasses import dataclass, field
from typing import Any, Optional
import uuid


@dataclass
class RecordInfo:
    """Runtime representation of a data record flowing through the pipeline.

    This is the in-memory working object. Persisted to DataRecord/RunRecord in DB.
    """

    uid: str = ""  # unique ID (UUID)
    parent_uid: Optional[str] = None  # lineage: expanded from which record
    group_id: Optional[str] = None  # same-group (e.g. tiles from one image)
    data_type: str = ""  # image | video | text | json | table | audio | document
    content: Any = None  # file path, URL, dict, text, etc.
    metadata: dict = field(default_factory=dict)
    predictions: dict = field(default_factory=dict)
    annotations: dict = field(default_factory=dict)
    status: str = "raw"  # raw | cleaned | predicted | annotated | reviewed
    external_id: Optional[str] = None  # Label Studio task_id, etc.

    def __post_init__(self):
        if not self.uid:
            self.uid = str(uuid.uuid4())


# --- v1 compat alias ---

@dataclass
class FrameInfo:
    """v1 compatibility: image frame info. Maps to RecordInfo internally."""

    index: int = 0
    path: str = ""
    filename: str = ""
    kept: bool = False
    confidence: float = 0.0
    detected_classes: list = field(default_factory=list)
    predictions: list = field(default_factory=list)
    task_id: Optional[int] = None


@dataclass
class PipelineContext:
    """Shared runtime context passed between pipeline steps.

    v2 design: Steps exchange data via named 'data slots' (ctx.data["slot_name"]).
    v1 compat: all_frames / kept_frames still work via property accessors.
    """

    # --- execution identity ---
    run_id: int = 0
    task_id: int = 0
    project_id: int = 0
    temp_dir: str = ""

    # === v2: generalized data slots ===
    data: dict[str, Any] = field(default_factory=dict)
    # Convention:
    #   data["records"]     → list[RecordInfo]   primary data stream
    #   data["<custom>"]    → Any                free-form per step
    #   data["stats"]       → dict               aggregated statistics

    # --- configuration ---
    step_configs: dict[str, dict] = field(default_factory=dict)
    variables: dict[str, Any] = field(default_factory=dict)  # pipeline variables + control flags

    # --- backend references (populated by runner from DB configs) ---
    model_backends: dict[str, Any] = field(default_factory=dict)
    annotation_backends: dict[str, Any] = field(default_factory=dict)

    # --- v1 compat fields ---
    source_path: str = ""
    mode: str = "frames"  # frames | video
    fps: float = 5.0
    all_frames: list = field(default_factory=list)  # list[FrameInfo]
    kept_frames: list = field(default_factory=list)
    filter_stats: dict = field(default_factory=dict)
    video_path: str = ""
    timeline_predictions: list = field(default_factory=list)
    task_ids: dict = field(default_factory=dict)
    ls_client: Any = None

    # === v2 data slot API ===

    def get_records(self, slot: str = "records") -> list[RecordInfo]:
        return self.data.get(slot, [])

    def set_records(self, records: list[RecordInfo], slot: str = "records"):
        """Replace all records in a slot."""
        self.data[slot] = records

    def append_records(self, records: list[RecordInfo], slot: str = "records"):
        """Append records to a slot (used when multiple steps write to the same slot)."""
        existing = self.data.get(slot, [])
        self.data[slot] = existing + records

    def get_slot(self, slot: str, default: Any = None) -> Any:
        return self.data.get(slot, default)

    def set_slot(self, slot: str, value: Any):
        self.data[slot] = value

    def should_pause(self) -> bool:
        """Check if a step requested the pipeline to pause (e.g. annotate step)."""
        return self.variables.get("__pipeline_should_pause", False)
