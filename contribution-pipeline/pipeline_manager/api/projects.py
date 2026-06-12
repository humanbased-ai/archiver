"""Project REST API endpoints."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..models.db import get_session
from ..models.project import Project
from ..models.task import Task

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    config: dict = {}


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    config: dict | None = None


@router.get("/")
def list_projects(session: Session = Depends(get_session)):
    projects = session.exec(select(Project).order_by(Project.id.desc())).all()
    return [
        {
            "id": p.id, "name": p.name, "description": p.description,
            "config": json.loads(p.config_json),
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]


@router.post("/")
def create_project(req: ProjectCreate, session: Session = Depends(get_session)):
    project = Project(
        name=req.name,
        description=req.description,
        config_json=json.dumps(req.config, default=str),
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return {"id": project.id, "name": project.name}


@router.get("/{project_id}")
def get_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    tasks = session.exec(select(Task).where(Task.project_id == project_id)).all()
    return {
        "id": project.id, "name": project.name, "description": project.description,
        "config": json.loads(project.config_json),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "tasks": [
            {"id": t.id, "name": t.name, "status": t.status, "annotation_backend": t.annotation_backend}
            for t in tasks
        ],
    }


@router.put("/{project_id}")
def update_project(project_id: int, req: ProjectUpdate, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if req.name is not None:
        project.name = req.name
    if req.description is not None:
        project.description = req.description
    if req.config is not None:
        project.config_json = json.dumps(req.config, default=str)
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()
    return {"id": project.id, "name": project.name}


@router.delete("/{project_id}")
def delete_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    session.delete(project)
    session.commit()
    return {"deleted": project_id}


# --- Task endpoints under project ---

@router.get("/{project_id}/tasks")
def list_tasks(project_id: int, session: Session = Depends(get_session)):
    tasks = session.exec(select(Task).where(Task.project_id == project_id).order_by(Task.id.desc())).all()
    return [
        {
            "id": t.id, "name": t.name, "status": t.status,
            "pipeline_config": t.pipeline_config,
            "annotation_backend": t.annotation_backend,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tasks
    ]


class TaskCreate(BaseModel):
    name: str
    description: str = ""
    pipeline_config: str = ""
    annotation_config: dict = {}
    ui_config: str = ""
    data_schema: dict = {}
    annotation_backend: str = ""
    priority: int = 0


@router.post("/{project_id}/tasks")
def create_task(project_id: int, req: TaskCreate, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    task = Task(
        project_id=project_id,
        name=req.name,
        description=req.description,
        pipeline_config=req.pipeline_config,
        annotation_config=json.dumps(req.annotation_config, default=str),
        ui_config=req.ui_config,
        data_schema=json.dumps(req.data_schema, default=str),
        annotation_backend=req.annotation_backend,
        priority=req.priority,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return {"id": task.id, "name": task.name, "project_id": project_id}
