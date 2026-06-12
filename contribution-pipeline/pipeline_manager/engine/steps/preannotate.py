"""PreAnnotateStep — run YOLO segmentation/detection/pose on kept frames."""

import logging
import os
import time

from ultralytics import YOLO

from ... import config as app_config
from ..base_step import BaseStep
from ..context import PipelineContext

logger = logging.getLogger(__name__)


def format_detect(result, from_name="label", to_name="image", conf=0.5):
    preds = []
    img_h, img_w = result.orig_shape
    if result.boxes is None:
        return preds
    for box in result.boxes:
        score = float(box.conf[0])
        if score < conf:
            continue
        label = result.names[int(box.cls[0])]
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        preds.append({
            "from_name": from_name, "to_name": to_name,
            "type": "rectanglelabels",
            "value": {
                "x": x1 / img_w * 100, "y": y1 / img_h * 100,
                "width": (x2 - x1) / img_w * 100, "height": (y2 - y1) / img_h * 100,
                "rotation": 0, "rectanglelabels": [label],
            },
            "score": score,
        })
    return preds


def format_segment(result, from_name="label", to_name="image", conf=0.5,
                    label_override=None):
    preds = []
    img_h, img_w = result.orig_shape
    if result.masks is None or result.boxes is None:
        return preds
    for box, mask in zip(result.boxes, result.masks):
        score = float(box.conf[0])
        if score < conf:
            continue
        label = label_override or result.names[int(box.cls[0])]
        xy = mask.xy[0]
        if len(xy) < 3:
            continue
        points = [[float(x) / img_w * 100, float(y) / img_h * 100] for x, y in xy]
        preds.append({
            "from_name": from_name, "to_name": to_name,
            "type": "polygonlabels",
            "value": {"points": points, "polygonlabels": [label]},
            "score": score,
        })
    return preds


def format_pose(result, from_name="label", to_name="image", conf=0.5):
    COCO_KP = [
        "nose", "left_eye", "right_eye", "left_ear", "right_ear",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle",
    ]
    preds = []
    img_h, img_w = result.orig_shape
    if result.boxes is None:
        return preds
    for i, box in enumerate(result.boxes):
        score = float(box.conf[0])
        if score < conf:
            continue
        label = result.names[int(box.cls[0])]
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        preds.append({
            "from_name": from_name, "to_name": to_name,
            "type": "rectanglelabels",
            "value": {
                "x": x1 / img_w * 100, "y": y1 / img_h * 100,
                "width": (x2 - x1) / img_w * 100, "height": (y2 - y1) / img_h * 100,
                "rotation": 0, "rectanglelabels": [label],
            },
            "score": score,
        })
        if result.keypoints is not None and i < len(result.keypoints):
            for ki, kpt in enumerate(result.keypoints[i].data[0]):
                kx, ky, kconf = float(kpt[0]), float(kpt[1]), float(kpt[2])
                if kconf < conf:
                    continue
                kp_label = COCO_KP[ki] if ki < len(COCO_KP) else f"kp_{ki}"
                preds.append({
                    "from_name": from_name, "to_name": to_name,
                    "type": "keypointlabels",
                    "value": {"x": kx / img_w * 100, "y": ky / img_h * 100,
                              "width": 0.4, "keypointlabels": [kp_label]},
                    "score": kconf,
                })
    return preds


FORMATTERS = {
    "detect": format_detect,
    "segment": format_segment,
    "pose": format_pose,
}


class PreAnnotateStep(BaseStep):
    name = "preannotate"

    def execute(self, ctx: PipelineContext) -> PipelineContext:
        models_config = self.params.get("models", [])
        if not models_config or not ctx.kept_frames:
            return ctx

        total = len(ctx.kept_frames)
        annotated = 0

        for model_cfg in models_config:
            model_name = model_cfg.get("model", "yolo26n-seg.pt")
            task_type = model_cfg.get("task_type", "segment")
            from_name = model_cfg.get("from_name", "label")
            to_name = model_cfg.get("to_name", "image")
            conf = model_cfg.get("confidence", 0.5)
            label_override = model_cfg.get("label_override")

            model_path = app_config.MODELS_DIR / model_name
            model = YOLO(str(model_path))
            formatter = FORMATTERS.get(task_type, format_segment)

            t0 = time.time()
            for i, frame in enumerate(ctx.kept_frames):
                results = model.predict(frame.path, conf=conf, verbose=False)
                if results:
                    kwargs = {"from_name": from_name, "to_name": to_name, "conf": conf}
                    if label_override and task_type == "segment":
                        kwargs["label_override"] = label_override
                    preds = formatter(results[0], **kwargs)
                    frame.predictions.extend(preds)
                    if preds:
                        annotated += 1

                if (i + 1) % 50 == 0 or i + 1 == total:
                    elapsed = time.time() - t0
                    fps = (i + 1) / elapsed if elapsed > 0 else 0
                    logger.info(f"PreAnnotate ({model_name}): {i+1}/{total} ({fps:.1f} fps)")

        return ctx

    def _get_stats(self, ctx):
        annotated = sum(1 for f in ctx.kept_frames if f.predictions)
        return {"annotated_frames": annotated, "total_kept": len(ctx.kept_frames)}
