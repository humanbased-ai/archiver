"""AggregateStep — compute statistics for the dashboard."""

import json
import logging
from collections import Counter

from ..base_step import BaseStep
from ..context import PipelineContext

logger = logging.getLogger(__name__)


class AggregateStep(BaseStep):
    name = "aggregate"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        # Confidence distribution
        conf_dist = Counter()
        class_counts = Counter()

        for frame in ctx.all_frames:
            if frame.kept:
                bucket = self._conf_bucket(frame.confidence)
                conf_dist[bucket] += 1
                for cls in frame.detected_classes:
                    class_counts[cls] += 1

        ctx.filter_stats["confidence_distribution"] = dict(sorted(conf_dist.items()))
        ctx.filter_stats["class_counts"] = dict(class_counts.most_common())

        # Pre-annotation summary
        frames_with_preds = sum(1 for f in ctx.kept_frames if f.predictions)
        avg_conf = 0
        avg_objects = 0
        if frames_with_preds > 0:
            total_score = sum(
                sum(p.get("score", 0) for p in f.predictions)
                for f in ctx.kept_frames if f.predictions
            )
            total_preds = sum(len(f.predictions) for f in ctx.kept_frames if f.predictions)
            avg_conf = total_score / total_preds if total_preds > 0 else 0
            avg_objects = total_preds / frames_with_preds

        ctx.filter_stats["preannotation"] = {
            "frames_with_predictions": frames_with_preds,
            "avg_confidence": round(avg_conf, 3),
            "avg_objects_per_frame": round(avg_objects, 1),
        }

        logger.info(
            f"Aggregate: {len(ctx.all_frames)} total, "
            f"{len(ctx.kept_frames)} kept, "
            f"{frames_with_preds} pre-annotated"
        )
        return ctx

    @staticmethod
    def _conf_bucket(conf: float) -> str:
        if conf >= 0.9:
            return "0.9-1.0"
        elif conf >= 0.8:
            return "0.8-0.9"
        elif conf >= 0.7:
            return "0.7-0.8"
        elif conf >= 0.6:
            return "0.6-0.7"
        elif conf >= 0.5:
            return "0.5-0.6"
        else:
            return "0.0-0.5"

    def _get_stats(self, ctx):
        return ctx.filter_stats
