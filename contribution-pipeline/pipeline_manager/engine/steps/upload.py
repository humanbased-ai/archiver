"""UploadStep — upload frames/video to Label Studio and create predictions."""

import logging
import os

import requests

from ..base_step import BaseStep
from ..context import PipelineContext

logger = logging.getLogger(__name__)

# Default label configs
FRAMES_CONFIG = """<View>
  <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="true"/>
  <PolygonLabels name="label" toName="image" strokeWidth="2" pointSize="small" opacity="0.5" showLabels="true">
    <Label value="folding" background="#FF0000"/>
    <Label value="packing" background="#00FF00"/>
    <Label value="cutting" background="#0000FF"/>
    <Label value="other" background="#888888"/>
  </PolygonLabels>
</View>"""

VIDEO_CONFIG = """<View>
  <Video name="video" value="$video" frameRate="{fps}"/>
  <VideoRectangle name="box" toName="video" showLabels="true"/>
  <Labels name="label" toName="video" allowEmpty="true">
    <Label value="folding" background="#FF0000"/>
    <Label value="packing" background="#00FF00"/>
    <Label value="cutting" background="#0000FF"/>
    <Label value="other" background="#888888"/>
  </Labels>
</View>"""

VIDEO_TIMELINE_CONFIG = """<View>
  <Video name="video" value="$video" frameRate="{fps}"/>
  <Header value="Mark valid/invalid segments"/>
  <TimelineLabels name="segments" toName="video">
    <Label value="valid_folding" background="#4CAF50"/>
    <Label value="valid_packing" background="#2196F3"/>
    <Label value="valid_cutting" background="#9C27B0"/>
    <Label value="invalid_setup" background="#FF5722"/>
    <Label value="invalid_transition" background="#FF9800"/>
    <Label value="invalid_idle" background="#795548"/>
  </TimelineLabels>
  <Header value="Spatial annotation (optional)"/>
  <VideoRectangle name="box" toName="video" showLabels="true"/>
  <Labels name="label" toName="video" allowEmpty="true">
    <Label value="person" background="#FF0000"/>
  </Labels>
</View>"""


class UploadStep(BaseStep):
    name = "upload"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        client = ctx.ls_client

        # Auto-create project if needed
        if ctx.project_id <= 0:
            ctx.project_id = self._create_project(ctx)

        if ctx.mode == "video" and ctx.video_path:
            self._upload_video(ctx)
        else:
            self._upload_frames(ctx)
            self._create_predictions(ctx)

        return ctx

    def _create_project(self, ctx: PipelineContext) -> int:
        client = ctx.ls_client
        if ctx.mode == "video":
            config_template = self.params.get("config_template", "video_timeline")
            if config_template == "video_timeline":
                config = VIDEO_TIMELINE_CONFIG.format(fps=ctx.fps)
            else:
                config = VIDEO_CONFIG.format(fps=ctx.fps)
            title = "Video Timeline Annotation"
        else:
            config = FRAMES_CONFIG
            title = "Frame Segmentation Annotation"

        project = client.projects.create(title=title, label_config=config)
        client.projects.update(id=project.id, show_collab_predictions=True)
        logger.info(f"Created project: {project.title} (ID: {project.id})")
        return project.id

    def _upload_frames(self, ctx: PipelineContext):
        client = ctx.ls_client
        base_url = client._client_wrapper.get_base_url()
        total = len(ctx.kept_frames)

        filenames = {f.filename: f for f in ctx.kept_frames}

        for i, frame in enumerate(ctx.kept_frames):
            auth_header = client._client_wrapper.get_headers()["Authorization"]
            with open(frame.path, "rb") as fobj:
                resp = requests.post(
                    f"{base_url}/api/projects/{ctx.project_id}/import",
                    headers={"Authorization": auth_header},
                    files={"file": (frame.filename, fobj, "image/jpeg")},
                    timeout=30,
                )
                resp.raise_for_status()

            if (i + 1) % 50 == 0 or i + 1 == total:
                logger.info(f"Upload: {i+1}/{total}")

        # Match task IDs
        tasks = list(client.tasks.list(project=ctx.project_id))
        for t in tasks:
            image_url = (t.data or {}).get("image", "")
            basename = image_url.rsplit("/", 1)[-1] if "/" in image_url else image_url
            original_name = basename.split("-", 1)[1] if "-" in basename else basename
            if original_name in filenames:
                filenames[original_name].task_id = t.id

        logger.info(f"Uploaded {total} frames, matched {sum(1 for f in ctx.kept_frames if f.task_id)} tasks")

    def _upload_video(self, ctx: PipelineContext):
        client = ctx.ls_client
        base_url = client._client_wrapper.get_base_url()
        auth_header = client._client_wrapper.get_headers()["Authorization"]

        with open(ctx.video_path, "rb") as f:
            resp = requests.post(
                f"{base_url}/api/projects/{ctx.project_id}/import",
                headers={"Authorization": auth_header},
                files={"file": (os.path.basename(ctx.video_path), f, "video/mp4")},
                timeout=120,
            )
            resp.raise_for_status()

        # Create timeline predictions if available
        if ctx.timeline_predictions:
            tasks = list(client.tasks.list(project=ctx.project_id))
            if tasks:
                task = tasks[0]
                client.predictions.create(
                    task=task.id,
                    result=ctx.timeline_predictions,
                    score=1.0,
                    model_version="pipeline-filter",
                )
                logger.info(f"Created timeline predictions for video task {task.id}")

        logger.info("Video uploaded")

    def _create_predictions(self, ctx: PipelineContext):
        client = ctx.ls_client
        count = 0
        total = len(ctx.kept_frames)

        for i, frame in enumerate(ctx.kept_frames):
            if not frame.task_id or not frame.predictions:
                continue
            avg_score = (
                sum(p.get("score", 0) for p in frame.predictions) / len(frame.predictions)
                if frame.predictions else 0
            )
            client.predictions.create(
                task=frame.task_id,
                result=frame.predictions,
                score=avg_score,
                model_version="pipeline-preannotate",
            )
            count += 1

            if (i + 1) % 50 == 0 or i + 1 == total:
                logger.info(f"Predictions: {i+1}/{total}")

        logger.info(f"Created {count} predictions")

    def _get_stats(self, ctx):
        return {
            "project_id": ctx.project_id,
            "uploaded_frames": len(ctx.kept_frames),
            "predictions_created": sum(1 for f in ctx.kept_frames if f.task_id and f.predictions),
        }
