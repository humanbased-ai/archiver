"""FilterStep — YOLO detection to filter frames containing target classes."""

import logging
import os
import time

from ultralytics import YOLO

from ... import config as app_config
from ..base_step import BaseStep
from ..context import PipelineContext

logger = logging.getLogger(__name__)


class FilterStep(BaseStep):
    name = "filter"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        model_name = self.params.get("model", "yolo26n.pt")
        target_classes = set(self.params.get("target_classes", ["person"]))
        conf = self.params.get("confidence", 0.5)
        batch_size = self.params.get("batch_size", 32)

        model_path = app_config.MODELS_DIR / model_name
        model = YOLO(str(model_path))

        total = len(ctx.all_frames)
        t0 = time.time()

        for i in range(0, total, batch_size):
            batch_frames = ctx.all_frames[i : i + batch_size]
            batch_paths = [f.path for f in batch_frames]
            results = model.predict(batch_paths, conf=conf, verbose=False)

            for frame, result in zip(batch_frames, results):
                if result.boxes is not None and len(result.boxes) > 0:
                    classes = [result.names[int(c)] for c in result.boxes.cls]
                    max_conf = float(result.boxes.conf.max())
                    detected = set(classes)
                    frame.detected_classes = list(detected)
                    frame.confidence = max_conf
                    if detected & target_classes:
                        frame.kept = True

            done = min(i + batch_size, total)
            if done % 100 < batch_size or done == total:
                elapsed = time.time() - t0
                fps = done / elapsed if elapsed > 0 else 0
                kept_count = sum(1 for f in ctx.all_frames[:done] if f.kept)
                logger.info(f"Filter: {done}/{total}  kept={kept_count}  ({fps:.1f} fps)")

        ctx.kept_frames = [f for f in ctx.all_frames if f.kept]
        ctx.filter_stats = {
            "total": total,
            "kept": len(ctx.kept_frames),
            "filtered": total - len(ctx.kept_frames),
            "target_classes": list(target_classes),
            "confidence_threshold": conf,
            "duration_sec": round(time.time() - t0, 1),
        }
        return ctx

    def _get_stats(self, ctx):
        return ctx.filter_stats
