"""Dashboard HTML routes."""

import json

import jinja2
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from .. import config
from ..models.db import get_session
from ..models.pipeline_run import PipelineRun
from ..models.run_step import RunStep
from ..models.run_frame import RunFrame

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(str(config.BASE_DIR / "dashboard" / "templates")),
    autoescape=True,
)


def _render(template_name: str, **ctx) -> HTMLResponse:
    tmpl = _env.get_template(template_name)
    return HTMLResponse(tmpl.render(**ctx))


@router.get("/showcase", response_class=HTMLResponse)
def showcase(request: Request):
    return _render("showcase.html")


@router.get("/", response_class=HTMLResponse)
def runs_list(request: Request, session: Session = Depends(get_session)):
    runs = session.exec(
        select(PipelineRun).order_by(PipelineRun.id.desc()).limit(50)
    ).all()
    return _render("runs_list.html", runs=runs, ls_url=config.LS_URL)


@router.get("/runs/{run_id}", response_class=HTMLResponse)
def run_detail(request: Request, run_id: int, session: Session = Depends(get_session)):
    run = session.get(PipelineRun, run_id)
    if not run:
        return HTMLResponse("Run not found", status_code=404)

    steps = session.exec(
        select(RunStep).where(RunStep.run_id == run_id).order_by(RunStep.step_index)
    ).all()

    agg_step = next((s for s in steps if s.step_name == "aggregate"), None)
    stats = json.loads(agg_step.stats_json) if agg_step and agg_step.stats_json else {}

    return _render("run_detail.html", run=run, steps=steps, stats=stats, ls_url=config.LS_URL)


@router.get("/runs/{run_id}/preview", response_class=HTMLResponse)
def run_preview(
    request: Request,
    run_id: int,
    page: int = 1,
    session: Session = Depends(get_session),
):
    run = session.get(PipelineRun, run_id)
    if not run:
        return HTMLResponse("Run not found", status_code=404)

    page_size = 60
    query = (
        select(RunFrame)
        .where(RunFrame.run_id == run_id, RunFrame.kept == True)
        .order_by(RunFrame.frame_index)
    )
    all_frames = session.exec(query).all()
    total = len(all_frames)
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    frames = all_frames[offset : offset + page_size]

    return _render(
        "run_preview.html",
        run=run, frames=frames, page=page,
        total_pages=total_pages, total=total, ls_url=config.LS_URL,
    )
