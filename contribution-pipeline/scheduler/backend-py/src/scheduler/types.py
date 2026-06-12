from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel


class Routes(BaseModel):
    on: str
    cases: dict[str, Any]
    default: Any | None = None


class StepPolicy(BaseModel):
    timeout_ms: int
    max_attempts: int
    base_backoff_ms: int


class StepConfig(BaseModel):
    key: str
    node_key: str
    node_version: str | None = None
    label: str | None = None
    params: dict[str, Any] = {}
    inputs: dict[str, Any] | None = None
    routes: Routes | None = None
    policy: StepPolicy | None = None


class Envelope(BaseModel):
    payload: dict[str, Any] = {}
    outputs: dict[str, Any] = {}
    tags: dict[str, str] = {}


class NodePresets(BaseModel):
    defaults: dict[str, Any] | None = None
    constants: dict[str, Any] | None = None
    pin: list[str] | None = None
    secrets: dict[str, dict[str, str]] | None = None


class NodeDefinition(BaseModel):
    key: str
    version: str
    display_name: str
    params_schema: dict[str, Any]
    ui_schema: dict[str, Any] | None = None
    presets: NodePresets | None = None
    inputs_schema: dict[str, Any] | None = None
    outputs_schema: dict[str, Any] | None = None
    status: Literal["active", "archived", "paused"]
    category: str | None = None
    run_mode: str | None = None
    description: str | None = None
    idempotent: bool
    default_timeout_ms: int
    default_max_attempts: int
    manual: bool
    supports_dry_run: bool = False
    outputs_validation: Literal["strict", "warn", "off"] = "strict"
    updated_at: str


class Layout(BaseModel):
    positions: dict[str, dict[str, float]]


class ItemRow(BaseModel):
    id: str
    tenant_id: str
    task_id: str
    pipeline_version_id: str
    current_step: str
    envelope: Envelope
    loop_counts: dict[str, int]
    created_at: str
    updated_at: str


class PipelineVersion(BaseModel):
    id: str
    task_id: str
    tenant_id: str
    version: int
    steps: list[StepConfig]
    layout: Layout | None = None
    forms: dict[str, Any]
    forms_etag: str
    published_at: str
    published_by: str | None = None


class OutboxRow(BaseModel):
    run_id: str
    tenant_id: str
    item_id: str
    task_id: str
    step_key: str
    node_key: str
    status: Literal["pending", "leased", "done", "failed"]
    attempt: int
    scheduled_at: str
    expected_by: str | None = None
    leased_by: str | None = None
    leased_at: str | None = None
    created_at: str
    updated_at: str
