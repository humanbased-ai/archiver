"""Backend management REST API endpoints."""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..models.db import get_session
from ..models.backend_config import ModelBackendConfig, AnnotationBackendConfig
from ..backends.registry import create_model_backend, create_annotation_backend

router = APIRouter(prefix="/api/v1/backends", tags=["backends"])


# --- Model Backends ---

class ModelBackendCreate(BaseModel):
    name: str
    type: str  # yolo | openai | claude | ollama | vllm
    endpoint: str = ""
    credentials: str = ""
    default_params: dict = {}
    project_id: int | None = None


@router.get("/models")
def list_model_backends(session: Session = Depends(get_session)):
    configs = session.exec(select(ModelBackendConfig).order_by(ModelBackendConfig.id)).all()
    return [
        {"id": c.id, "name": c.name, "type": c.type, "endpoint": c.endpoint,
         "project_id": c.project_id, "enabled": c.enabled}
        for c in configs
    ]


@router.post("/models")
def create_model_backend_config(req: ModelBackendCreate, session: Session = Depends(get_session)):
    cfg = ModelBackendConfig(
        name=req.name, type=req.type, endpoint=req.endpoint,
        credentials_encrypted=req.credentials,
        default_params_json=json.dumps(req.default_params),
        project_id=req.project_id,
    )
    session.add(cfg)
    session.commit()
    session.refresh(cfg)
    return {"id": cfg.id, "name": cfg.name}


@router.delete("/models/{name}")
def delete_model_backend_config(name: str, session: Session = Depends(get_session)):
    cfg = session.exec(select(ModelBackendConfig).where(ModelBackendConfig.name == name)).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Model backend not found")
    session.delete(cfg)
    session.commit()
    return {"deleted": name}


@router.post("/models/{name}/test")
def test_model_backend(name: str, session: Session = Depends(get_session)):
    cfg = session.exec(select(ModelBackendConfig).where(ModelBackendConfig.name == name)).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Model backend not found")
    backend = create_model_backend(cfg)
    ok = backend.health_check()
    return {"name": name, "healthy": ok}


# --- Annotation Backends ---

class AnnotationBackendCreate(BaseModel):
    name: str
    type: str  # label_studio | custom
    endpoint: str = ""
    credentials: str = ""
    capabilities: list[str] = []
    project_id: int | None = None


@router.get("/annotations")
def list_annotation_backends(session: Session = Depends(get_session)):
    configs = session.exec(select(AnnotationBackendConfig).order_by(AnnotationBackendConfig.id)).all()
    return [
        {"id": c.id, "name": c.name, "type": c.type, "endpoint": c.endpoint,
         "capabilities": json.loads(c.capabilities_json),
         "project_id": c.project_id, "enabled": c.enabled}
        for c in configs
    ]


@router.post("/annotations")
def create_annotation_backend_config(req: AnnotationBackendCreate, session: Session = Depends(get_session)):
    cfg = AnnotationBackendConfig(
        name=req.name, type=req.type, endpoint=req.endpoint,
        credentials_encrypted=req.credentials,
        capabilities_json=json.dumps(req.capabilities),
        project_id=req.project_id,
    )
    session.add(cfg)
    session.commit()
    session.refresh(cfg)
    return {"id": cfg.id, "name": cfg.name}


@router.delete("/annotations/{name}")
def delete_annotation_backend_config(name: str, session: Session = Depends(get_session)):
    cfg = session.exec(select(AnnotationBackendConfig).where(AnnotationBackendConfig.name == name)).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Annotation backend not found")
    session.delete(cfg)
    session.commit()
    return {"deleted": name}


@router.post("/annotations/{name}/test")
def test_annotation_backend(name: str, session: Session = Depends(get_session)):
    cfg = session.exec(select(AnnotationBackendConfig).where(AnnotationBackendConfig.name == name)).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Annotation backend not found")
    backend = create_annotation_backend(cfg)
    ok = backend.health_check()
    return {"name": name, "healthy": ok}
