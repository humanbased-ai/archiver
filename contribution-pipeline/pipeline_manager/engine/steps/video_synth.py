"""VideoSynthStep — convert kept frames to MP4 + generate timeline predictions."""

import logging
import os
import shutil
import subprocess
import tempfile

from ..base_step import BaseStep
from ..context import PipelineContext

logger = logging.getLogger(__name__)


class VideoSynthStep(BaseStep):
    name = "video_synth"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.mode != "video" or not ctx.kept_frames:
            return ctx

        fps = ctx.fps
        frames = ctx.kept_frames
        output_path = os.path.join(ctx.temp_dir, "output.mp4")

        # Create symlinked directory with sequential names for ffmpeg
        link_dir = tempfile.mkdtemp(prefix="ls_ffmpeg_", dir=ctx.temp_dir)
        ext = os.path.splitext(frames[0].path)[1]
        for i, frame in enumerate(frames):
            os.symlink(frame.path, os.path.join(link_dir, f"frame_{i:06d}{ext}"))

        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", os.path.join(link_dir, f"frame_%06d{ext}"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        shutil.rmtree(link_dir, ignore_errors=True)

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {result.stderr[-500:]}")

        ctx.video_path = output_path
        size_mb = os.path.getsize(output_path) / 1024 / 1024
        logger.info(f"Video: {len(frames)} frames → {size_mb:.1f} MB, {len(frames)/fps:.1f}s")

        # Generate timeline predictions from filter results
        ctx.timeline_predictions = self._generate_timeline(ctx)
        return ctx

    def _generate_timeline(self, ctx: PipelineContext) -> list:
        """Convert per-frame kept/filtered info into timeline segment predictions."""
        if not ctx.all_frames:
            return []

        fps = ctx.fps
        segments = []
        current_label = None
        segment_start = 0

        for frame in ctx.all_frames:
            label = "valid_folding" if frame.kept else "invalid_transition"
            if label != current_label:
                if current_label is not None:
                    segments.append({
                        "from_name": "segments",
                        "to_name": "video",
                        "type": "timelinelabels",
                        "value": {
                            "ranges": [{"start": segment_start / fps, "end": frame.index / fps}],
                            "timelinelabels": [current_label],
                        },
                    })
                current_label = label
                segment_start = frame.index

        # Close last segment
        if current_label is not None:
            end = (ctx.all_frames[-1].index + 1) / fps
            segments.append({
                "from_name": "segments",
                "to_name": "video",
                "type": "timelinelabels",
                "value": {
                    "ranges": [{"start": segment_start / fps, "end": end}],
                    "timelinelabels": [current_label],
                },
            })

        logger.info(f"Timeline: {len(segments)} segments generated")
        return segments

    def _get_stats(self, ctx):
        return {
            "video_duration_sec": round(len(ctx.kept_frames) / ctx.fps, 1) if ctx.kept_frames else 0,
            "timeline_segments": len(ctx.timeline_predictions),
        }
