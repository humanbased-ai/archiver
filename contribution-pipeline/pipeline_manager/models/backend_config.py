"""Backend configuration models — model backends and annotation backends."""

from typing import Optional

from sqlmodel import Field, SQLModel


class ModelBackendConfig(SQLModel, table=True):
    __tablename__ = "model_backend_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id")  # None = global
    name: str = ""  # unique within scope, e.g. "gpt4o", "yolo-v8n"
    type: str = ""  # yolo | openai | claude | ollama | vllm | custom
    endpoint: str = ""  # API URL or local model path
    credentials_encrypted: str = ""  # API key (encrypted at rest)
    default_params_json: str = "{}"  # default params like temperature, conf, etc.
    enabled: bool = True


class AnnotationBackendConfig(SQLModel, table=True):
    __tablename__ = "annotation_backend_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id")
    name: str = ""  # e.g. "label-studio-main", "custom-form-tool"
    type: str = ""  # label_studio | custom
    endpoint: str = ""  # service URL
    credentials_encrypted: str = ""
    capabilities_json: str = "[]"  # e.g. ["image", "text", "video", "json", "table"]
    enabled: bool = True
