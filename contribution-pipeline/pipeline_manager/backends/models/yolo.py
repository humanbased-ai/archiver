"""YOLO model backend — local inference via ultralytics."""

import logging

from ..model_backend import ModelBackend

logger = logging.getLogger(__name__)


class YoloBackend(ModelBackend):
    """Backend for YOLO models (detection, segmentation, pose, classification).

    endpoint = path to .pt model file (local)
    """

    _model = None

    def _get_model(self):
        if self._model is None:
            from ultralytics import YOLO
            self._model = YOLO(self.endpoint)
        return self._model

    def predict(self, inputs: list[dict], params: dict | None = None) -> list[dict]:
        model = self._get_model()
        p = self.get_params(params)
        conf = p.get("confidence", 0.5)
        task_type = p.get("task_type", "detect")  # detect | segment | pose | classify

        results = []
        for inp in inputs:
            image_path = inp.get("image_path", inp.get("content", ""))
            try:
                preds = model.predict(image_path, conf=conf, verbose=False)
                if preds:
                    result = self._format_result(preds[0], task_type, conf)
                    results.append({"result": result, "confidence": self._avg_conf(result), "raw_count": len(result)})
                else:
                    results.append({"result": [], "confidence": 0.0, "raw_count": 0})
            except Exception as e:
                logger.error(f"YOLO predict error: {e}")
                results.append({"result": [], "confidence": 0.0, "error": str(e)})
        return results

    def _format_result(self, pred, task_type: str, conf: float) -> list[dict]:
        """Convert ultralytics result to Label Studio prediction format."""
        img_h, img_w = pred.orig_shape
        items = []

        if task_type == "detect" and pred.boxes is not None:
            for box in pred.boxes:
                score = float(box.conf[0])
                if score < conf:
                    continue
                label = pred.names[int(box.cls[0])]
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                items.append({
                    "type": "rectanglelabels",
                    "value": {
                        "x": x1 / img_w * 100, "y": y1 / img_h * 100,
                        "width": (x2 - x1) / img_w * 100, "height": (y2 - y1) / img_h * 100,
                        "rotation": 0, "rectanglelabels": [label],
                    },
                    "score": score,
                })

        elif task_type == "segment" and pred.masks is not None and pred.boxes is not None:
            for box, mask in zip(pred.boxes, pred.masks):
                score = float(box.conf[0])
                if score < conf:
                    continue
                label = pred.names[int(box.cls[0])]
                xy = mask.xy[0]
                if len(xy) < 3:
                    continue
                points = [[float(x) / img_w * 100, float(y) / img_h * 100] for x, y in xy]
                items.append({
                    "type": "polygonlabels",
                    "value": {"points": points, "polygonlabels": [label]},
                    "score": score,
                })

        elif task_type == "pose" and pred.boxes is not None:
            COCO_KP = [
                "nose", "left_eye", "right_eye", "left_ear", "right_ear",
                "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
                "left_wrist", "right_wrist", "left_hip", "right_hip",
                "left_knee", "right_knee", "left_ankle", "right_ankle",
            ]
            for i, box in enumerate(pred.boxes):
                score = float(box.conf[0])
                if score < conf:
                    continue
                label = pred.names[int(box.cls[0])]
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                items.append({
                    "type": "rectanglelabels",
                    "value": {
                        "x": x1 / img_w * 100, "y": y1 / img_h * 100,
                        "width": (x2 - x1) / img_w * 100, "height": (y2 - y1) / img_h * 100,
                        "rotation": 0, "rectanglelabels": [label],
                    },
                    "score": score,
                })
                if pred.keypoints is not None and i < len(pred.keypoints):
                    for ki, kpt in enumerate(pred.keypoints[i].data[0]):
                        kx, ky, kconf = float(kpt[0]), float(kpt[1]), float(kpt[2])
                        if kconf < conf:
                            continue
                        kp_label = COCO_KP[ki] if ki < len(COCO_KP) else f"kp_{ki}"
                        items.append({
                            "type": "keypointlabels",
                            "value": {"x": kx / img_w * 100, "y": ky / img_h * 100,
                                      "width": 0.4, "keypointlabels": [kp_label]},
                            "score": kconf,
                        })

        return items

    def _avg_conf(self, items: list[dict]) -> float:
        scores = [it.get("score", 0) for it in items if "score" in it]
        return sum(scores) / len(scores) if scores else 0.0

    def health_check(self) -> bool:
        try:
            self._get_model()
            return True
        except Exception:
            return False
