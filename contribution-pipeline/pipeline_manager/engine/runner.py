"""Pipeline runner — reads YAML config, executes steps, supports split-run.

v2: Generalized data slots, DAG-aware (route/merge), split-run for annotate steps.
v1 compat: Old YAML configs and FrameInfo-based pipelines still work.
"""

import json
import logging
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import yaml
from sqlmodel import Session, select

from .. import config as app_config
from ..models.db import engine as db_engine, init_db
from ..models.pipeline_run import PipelineRun
from ..models.run_record import RunRecord
from ..models.backend_config import ModelBackendConfig, AnnotationBackendConfig
from ..backends.registry import create_model_backend, create_annotation_backend
from .context import PipelineContext

logger = logging.getLogger(__name__)

# --- Step registry ---
# v1 steps
from .steps.ingest import IngestStep
from .steps.filter import FilterStep
from .steps.preannotate import PreAnnotateStep
from .steps.upload import UploadStep
from .steps.video_synth import VideoSynthStep
from .steps.aggregate import AggregateStep
# v2 steps
from .steps.collect import CollectStep
from .steps.clean import CleanStep
from .steps.transform import TransformStep
from .steps.llm_invoke import LLMInvokeStep
from .steps.route import RouteStep
from .steps.merge import MergeStep
from .steps.annotate import AnnotateStep
from .steps.review import ReviewStep
from .steps.export_step import ExportStep

STEP_REGISTRY = {
    # v1 compat
    "ingest": IngestStep,
    "filter": FilterStep,
    "preannotate": PreAnnotateStep,
    "upload": UploadStep,
    "video_synth": VideoSynthStep,
    "aggregate": AggregateStep,
    # v2
    "collect": CollectStep,
    "clean": CleanStep,
    "transform": TransformStep,
    "llm_invoke": LLMInvokeStep,
    "route": RouteStep,
    "merge": MergeStep,
    "annotate": AnnotateStep,
    "review": ReviewStep,
    "export": ExportStep,
}


def load_pipeline_config(config_name: str) -> dict:
    """Load a YAML pipeline config by name or path."""
    path = app_config.PIPELINE_CONFIGS_DIR / f"{config_name}.yaml"
    if not path.exists():
        path = Path(config_name)
    if not path.exists():
        raise FileNotFoundError(f"Pipeline config not found: {config_name}")
    with open(path) as f:
        return yaml.safe_load(f)


def _load_backends(session: Session, project_id: int | None):
    """Load model and annotation backends from DB."""
    model_backends = {}
    ann_backends = {}

    # Global + project-scoped
    for cfg in session.exec(select(ModelBackendConfig).where(
        (ModelBackendConfig.enabled == True) &
        ((ModelBackendConfig.project_id == None) | (ModelBackendConfig.project_id == project_id))
    )).all():
        try:
            model_backends[cfg.name] = create_model_backend(cfg)
        except Exception as e:
            logger.warning(f"Failed to load model backend '{cfg.name}': {e}")

    for cfg in session.exec(select(AnnotationBackendConfig).where(
        (AnnotationBackendConfig.enabled == True) &
        ((AnnotationBackendConfig.project_id == None) | (AnnotationBackendConfig.project_id == project_id))
    )).all():
        try:
            ann_backends[cfg.name] = create_annotation_backend(cfg)
        except Exception as e:
            logger.warning(f"Failed to load annotation backend '{cfg.name}': {e}")

    # Fallback: always provide a label-studio backend from env config
    if "label-studio" not in ann_backends and app_config.LS_URL and app_config.LS_API_KEY:
        from ..backends.annotations.label_studio import LabelStudioBackend
        ann_backends["label-studio"] = LabelStudioBackend(
            name="label-studio",
            endpoint=app_config.LS_URL,
            credentials=app_config.LS_API_KEY,
        )

    return model_backends, ann_backends


def run_pipeline(
    source_path: str = "",
    pipeline_config: str = "frames_segment",
    project_id: int = 0,
    task_id: int = 0,
    mode: str = "frames",
    fps: float = 5.0,
    overrides: dict = None,
    parent_run_id: int | None = None,
    resume_from_step: int | None = None,
) -> int:
    """Execute a pipeline. Returns the run ID.

    For split-run (post-annotation), pass parent_run_id and resume_from_step.
    """
    config_data = load_pipeline_config(pipeline_config)

    # Resolve variables
    variables = config_data.get("variables", {})
    if overrides:
        for key, value in overrides.items():
            if key.startswith("variables."):
                variables[key[10:]] = value

    # Ensure DB tables exist
    app_config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    init_db()

    # Create run record
    with Session(db_engine) as session:
        run = PipelineRun(
            task_id=task_id or None,
            project_id=project_id,
            pipeline_config=pipeline_config,
            source_path=source_path,
            mode=mode,
            status="running",
            config_json=json.dumps(config_data, default=str),
            parent_run_id=parent_run_id,
            resume_from_step=resume_from_step,
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    # Build context
    temp_dir = tempfile.mkdtemp(prefix=f"ls_run_{run_id}_")

    with Session(db_engine) as session:
        model_backends, ann_backends = _load_backends(session, project_id)

    # v1 compat: create ls_client if Label Studio is configured
    ls_client = None
    if app_config.LS_URL and app_config.LS_API_KEY:
        try:
            from label_studio_sdk import LabelStudio
            ls_client = LabelStudio(base_url=app_config.LS_URL, api_key=app_config.LS_API_KEY)
        except Exception:
            pass

    ctx = PipelineContext(
        run_id=run_id,
        task_id=task_id,
        project_id=project_id,
        source_path=source_path,
        mode=mode,
        temp_dir=temp_dir,
        fps=fps,
        ls_client=ls_client,
        variables=variables,
        model_backends=model_backends,
        annotation_backends=ann_backends,
    )

    # Parse step configs
    for step_def in config_data.get("steps", []):
        ctx.step_configs[step_def["name"]] = step_def.get("params", {})

    # Build step instances
    all_step_defs = config_data.get("steps", [])
    start_index = resume_from_step or 0
    steps_to_run = []
    for i, step_def in enumerate(all_step_defs):
        if i < start_index:
            continue
        step_type = step_def["type"]
        step_cls = STEP_REGISTRY.get(step_type)
        if not step_cls:
            raise ValueError(f"Unknown step type: {step_type}")
        step = step_cls(params=step_def.get("params", {}))
        step.name = step_def.get("name", step_type)
        steps_to_run.append((i, step))

    # If resuming, load context from parent run
    if parent_run_id and resume_from_step:
        ctx = _restore_context_from_parent(ctx, parent_run_id, session)

    try:
        with Session(db_engine) as session:
            for step_index, step in steps_to_run:
                logger.info(f"Run {run_id}: executing step '{step.name}' (index {step_index})")
                ctx = step.run(ctx, session, step_index=step_index)

                # Check if step requested pipeline pause (annotate step)
                if ctx.should_pause():
                    run = session.get(PipelineRun, run_id)
                    run.status = "waiting_annotation"
                    run.resume_from_step = step_index + 1
                    run.external_project_id = ctx.variables.get("__annotate_project_id")
                    run.annotation_backend = ctx.variables.get("__annotate_backend")
                    run.project_id = ctx.project_id
                    session.add(run)
                    session.commit()
                    logger.info(f"Run {run_id}: paused at step '{step.name}', waiting for annotation")
                    return run_id

            # Update run record — completed
            run = session.get(PipelineRun, run_id)
            run.status = "completed"
            run.project_id = ctx.project_id
            run.completed_at = datetime.now(timezone.utc)
            # v1 compat stats
            run.total_frames = len(ctx.all_frames) if ctx.all_frames else 0
            run.kept_frames = len(ctx.kept_frames) if ctx.kept_frames else 0
            run.filtered_frames = run.total_frames - run.kept_frames
            # v2 stats
            records = ctx.get_records()
            run.stats_json = json.dumps({
                "total_records": len(records),
                "data_slots": list(ctx.data.keys()),
            }, default=str)
            session.add(run)

            # Save per-frame records (v1 compat)
            if ctx.all_frames:
                from ..models.run_frame import RunFrame
                for frame in ctx.all_frames:
                    rf = RunFrame(
                        run_id=run_id,
                        frame_index=frame.index,
                        filename=frame.filename,
                        kept=frame.kept,
                        filter_confidence=frame.confidence,
                        detected_classes=json.dumps(frame.detected_classes),
                        predictions_json=json.dumps(frame.predictions, default=str),
                        task_id=frame.task_id,
                    )
                    session.add(rf)

            session.commit()

    except Exception as e:
        logger.exception(f"Run {run_id} failed")
        with Session(db_engine) as session:
            run = session.get(PipelineRun, run_id)
            run.status = "failed"
            run.error_message = str(e)
            run.completed_at = datetime.now(timezone.utc)
            session.add(run)
            session.commit()
        raise
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    return run_id


def trigger_post_annotation_run(parent_run_id: int) -> int:
    """Trigger the second segment of a split pipeline after annotation completes.

    Called by the webhook handler or the polling job.
    """
    with Session(db_engine) as session:
        parent = session.get(PipelineRun, parent_run_id)
        if not parent or parent.status != "waiting_annotation":
            raise ValueError(f"Run {parent_run_id} is not in waiting_annotation state")

        return run_pipeline(
            source_path=parent.source_path,
            pipeline_config=parent.pipeline_config,
            project_id=parent.project_id,
            task_id=parent.task_id or 0,
            mode=parent.mode,
            parent_run_id=parent_run_id,
            resume_from_step=parent.resume_from_step,
        )


def _restore_context_from_parent(ctx: PipelineContext, parent_run_id: int, session) -> PipelineContext:
    """Restore pipeline context from the parent run's saved state.

    For post-annotation runs: pull annotations from the annotation backend
    and populate ctx.data["records"] with annotated data.
    """
    parent = session.get(PipelineRun, parent_run_id)
    if not parent:
        return ctx

    # Pull annotations from the annotation backend
    backend_name = parent.annotation_backend
    project_id = parent.external_project_id
    if backend_name and project_id and backend_name in ctx.annotation_backends:
        backend = ctx.annotation_backends[backend_name]
        annotations = backend.get_annotations(project_id)
        ctx.data["annotations"] = annotations
        ctx.variables["__parent_external_project_id"] = project_id
        ctx.variables["__parent_annotation_backend"] = backend_name
        logger.info(f"Restored {len(annotations)} annotations from parent run {parent_run_id}")

    return ctx
