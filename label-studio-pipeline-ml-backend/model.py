"""YOLO 目标检测 ML Backend for Label Studio.

支持:
- 图像目标检测预标注 (bounding box)
- 自动匹配项目标签配置
- 自定义模型 (放入 /app/models/ 目录)
"""

import os
import logging
from typing import Dict, List, Optional

from label_studio_ml.model import LabelStudioMLBase
from ultralytics import YOLO

logger = logging.getLogger(__name__)


class YOLODetector(LabelStudioMLBase):
    """YOLO object detection backend for Label Studio pre-annotation."""

    def setup(self):
        """Load YOLO model on startup."""
        model_path = os.environ.get("MODEL_PATH", "yolov8n.pt")

        # Check for custom model in mounted volume
        custom_path = os.path.join("/app/models", os.path.basename(model_path))
        if os.path.exists(custom_path):
            model_path = custom_path

        self.model = YOLO(model_path)
        self.model_name = model_path
        self.conf_threshold = float(os.environ.get("CONF_THRESHOLD", "0.25"))
        self.iou_threshold = float(os.environ.get("IOU_THRESHOLD", "0.45"))

        self._parse_label_config()
        logger.info(
            "YOLO loaded: model=%s, conf=%.2f, iou=%.2f, labels=%s",
            model_path,
            self.conf_threshold,
            self.iou_threshold,
            self.project_labels or "all",
        )

    def _parse_label_config(self):
        """Extract from_name, to_name, and valid labels from project config."""
        self.from_name = "label"
        self.to_name = "image"
        self.project_labels = set()

        if not self.parsed_label_config:
            return

        for name, info in self.parsed_label_config.items():
            tag_type = info.get("type", "")
            if "rectangle" in tag_type.lower():
                self.from_name = name
                to_names = info.get("to_name", [])
                if to_names:
                    self.to_name = (
                        to_names[0] if isinstance(to_names, list) else to_names
                    )
                self.project_labels = set(info.get("labels", []))
                break

    def predict(
        self,
        tasks: List[Dict],
        context: Optional[Dict] = None,
        **kwargs,
    ) -> List[Dict]:
        """Run YOLO inference and return predictions in Label Studio format."""
        predictions = []

        for task in tasks:
            image_url = task["data"].get(self.to_name) or task["data"].get("image")
            if not image_url:
                predictions.append({"result": [], "score": 0})
                continue

            try:
                image_path = self.get_local_path(
                    image_url, task_id=task.get("id")
                )
                results = self.model(
                    image_path,
                    conf=self.conf_threshold,
                    iou=self.iou_threshold,
                    verbose=False,
                )

                pred_results = []
                for result in results:
                    img_h, img_w = result.orig_shape

                    if result.boxes is None:
                        continue

                    for box in result.boxes:
                        cls_id = int(box.cls[0])
                        label = result.names[cls_id]

                        # Only return labels that match project config
                        if self.project_labels and label not in self.project_labels:
                            continue

                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        score = float(box.conf[0])

                        pred_results.append(
                            {
                                "from_name": self.from_name,
                                "to_name": self.to_name,
                                "type": "rectanglelabels",
                                "value": {
                                    "x": x1 / img_w * 100,
                                    "y": y1 / img_h * 100,
                                    "width": (x2 - x1) / img_w * 100,
                                    "height": (y2 - y1) / img_h * 100,
                                    "rotation": 0,
                                    "rectanglelabels": [label],
                                },
                                "score": score,
                            }
                        )

                avg_score = (
                    sum(r["score"] for r in pred_results) / len(pred_results)
                    if pred_results
                    else 0
                )
                predictions.append(
                    {
                        "result": pred_results,
                        "score": avg_score,
                        "model_version": self.model_name,
                    }
                )

            except Exception:
                logger.exception("Prediction failed for task %s", task.get("id"))
                predictions.append({"result": [], "score": 0})

        return predictions
