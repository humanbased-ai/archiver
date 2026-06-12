"""IngestStep — extract ZIP or scan directory."""

import os
import zipfile

from ..base_step import BaseStep
from ..context import FrameInfo, PipelineContext

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


class IngestStep(BaseStep):
    name = "ingest"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        source = ctx.source_path

        if zipfile.is_zipfile(source):
            extract_dir = os.path.join(ctx.temp_dir, "frames")
            os.makedirs(extract_dir, exist_ok=True)
            with zipfile.ZipFile(source, "r") as zf:
                zf.extractall(extract_dir)
            scan_dir = extract_dir
        elif os.path.isdir(source):
            scan_dir = source
        else:
            raise FileNotFoundError(f"Source not found: {source}")

        # Collect images
        image_paths = []
        for root, _dirs, files in os.walk(scan_dir):
            for f in files:
                if os.path.splitext(f)[1].lower() in IMAGE_EXTENSIONS:
                    image_paths.append(os.path.join(root, f))
        image_paths.sort()

        ctx.all_frames = [
            FrameInfo(index=i, path=p, filename=os.path.basename(p))
            for i, p in enumerate(image_paths)
        ]
        return ctx

    def _get_stats(self, ctx):
        return {"total_frames": len(ctx.all_frames)}
