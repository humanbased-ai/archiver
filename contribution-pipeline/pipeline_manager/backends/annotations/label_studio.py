"""Label Studio annotation backend."""

import logging
import os

import requests

from ..annotation_backend import AnnotationBackend

logger = logging.getLogger(__name__)


class LabelStudioBackend(AnnotationBackend):
    """Annotation backend powered by Label Studio.

    Wraps label-studio-sdk for project creation, data upload, prediction creation,
    progress tracking, and export.
    """

    _client = None

    def _get_client(self):
        if self._client is None:
            from label_studio_sdk import LabelStudio
            self._client = LabelStudio(base_url=self.endpoint, api_key=self.credentials)
        return self._client

    def create_project(self, config: dict) -> str:
        client = self._get_client()
        title = config.get("title", "Annotation Project")
        label_config = config.get("ui_config", "")
        project = client.projects.create(title=title, label_config=label_config)
        # Enable showing predictions
        client.projects.update(id=project.id, show_collab_predictions=True)
        logger.info(f"Label Studio: created project '{title}' (ID: {project.id})")
        return str(project.id)

    def upload_data(
        self,
        project_id: str,
        records: list[dict],
        predictions: list[dict] | None = None,
    ) -> dict[str, str]:
        client = self._get_client()
        pid = int(project_id)
        base_url = client._client_wrapper.get_base_url()
        auth_header = client._client_wrapper.get_headers()["Authorization"]
        uid_to_filename = {}

        # Upload files
        for i, rec in enumerate(records):
            content = rec.get("content", "")
            uid = rec.get("uid", str(i))
            data_type = rec.get("data_type", "image")

            if data_type in ("image", "video", "audio", "document") and os.path.isfile(str(content)):
                filename = os.path.basename(str(content))
                mime = self._guess_mime(data_type, filename)
                with open(str(content), "rb") as f:
                    resp = requests.post(
                        f"{base_url}/api/projects/{pid}/import",
                        headers={"Authorization": auth_header},
                        files={"file": (filename, f, mime)},
                        timeout=60,
                    )
                    resp.raise_for_status()
                uid_to_filename[uid] = filename
            else:
                # Structured/text data: import as JSON task
                task_data = rec.get("content", {})
                if isinstance(task_data, str):
                    task_data = {"text": task_data}
                resp = requests.post(
                    f"{base_url}/api/projects/{pid}/import",
                    headers={"Authorization": auth_header, "Content-Type": "application/json"},
                    json=[task_data],
                    timeout=30,
                )
                resp.raise_for_status()
                uid_to_filename[uid] = uid

            if (i + 1) % 50 == 0:
                logger.info(f"Label Studio upload: {i + 1}/{len(records)}")

        # Map task IDs back to record UIDs
        tasks = list(client.tasks.list(project=pid))
        mapping = {}
        filename_to_uid = {v: k for k, v in uid_to_filename.items()}
        for t in tasks:
            data = t.data or {}
            # Try to match by filename in image/video/audio URL
            for field in ("image", "video", "audio", "text"):
                url = data.get(field, "")
                if "/" in str(url):
                    basename = str(url).rsplit("/", 1)[-1]
                    original = basename.split("-", 1)[1] if "-" in basename else basename
                    if original in filename_to_uid:
                        mapping[filename_to_uid[original]] = str(t.id)
                        break

        logger.info(f"Label Studio: uploaded {len(records)} records, mapped {len(mapping)} tasks")

        # Create predictions if provided
        if predictions:
            self._create_predictions(client, mapping, predictions, records)

        return mapping

    def _create_predictions(self, client, mapping, predictions, records):
        """Create pre-annotation predictions for uploaded tasks."""
        # predictions is keyed by record_uid
        count = 0
        for rec in records:
            uid = rec.get("uid", "")
            task_id = mapping.get(uid)
            preds = rec.get("predictions", predictions.get(uid, []))
            if not task_id or not preds:
                continue
            pred_list = preds if isinstance(preds, list) else [preds]
            avg_score = sum(p.get("score", 0) for p in pred_list) / len(pred_list) if pred_list else 0
            client.predictions.create(
                task=int(task_id),
                result=pred_list,
                score=avg_score,
                model_version="pipeline-preannotate",
            )
            count += 1
        logger.info(f"Label Studio: created {count} predictions")

    def get_progress(self, project_id: str) -> dict:
        client = self._get_client()
        pid = int(project_id)
        tasks = list(client.tasks.list(project=pid))
        total = len(tasks)
        completed = sum(1 for t in tasks if t.is_labeled)
        return {"total": total, "completed": completed, "reviewed": 0, "pending": total - completed}

    def get_annotations(self, project_id: str, task_ids: list[str] | None = None) -> list[dict]:
        client = self._get_client()
        pid = int(project_id)
        tasks = list(client.tasks.list(project=pid))
        results = []
        for t in tasks:
            if task_ids and str(t.id) not in task_ids:
                continue
            for ann in (t.annotations or []):
                results.append({
                    "task_id": str(t.id),
                    "record_uid": "",  # caller maps this via task_id
                    "result": ann.get("result", []) if isinstance(ann, dict) else getattr(ann, "result", []),
                    "annotator": ann.get("completed_by", "") if isinstance(ann, dict) else getattr(ann, "completed_by", ""),
                    "created_at": ann.get("created_at", "") if isinstance(ann, dict) else getattr(ann, "created_at", ""),
                })
        return results

    def export(self, project_id: str, fmt: str = "json") -> str:
        client = self._get_client()
        pid = int(project_id)
        fmt_map = {"json": "JSON", "csv": "CSV", "yolo": "YOLO", "coco": "COCO", "voc": "VOC"}
        ls_fmt = fmt_map.get(fmt.lower(), fmt.upper())
        result = client.projects.exports.create(id=pid, export_type=ls_fmt)
        return str(result)

    def register_webhook(self, project_id: str, callback_url: str) -> bool:
        """Register a Label Studio webhook for task completion events."""
        try:
            client = self._get_client()
            base_url = client._client_wrapper.get_base_url()
            auth_header = client._client_wrapper.get_headers()["Authorization"]
            resp = requests.post(
                f"{base_url}/api/webhooks",
                headers={"Authorization": auth_header, "Content-Type": "application/json"},
                json={
                    "project": int(project_id),
                    "url": callback_url,
                    "send_payload": True,
                    "send_for_all_actions": False,
                    "actions": ["ANNOTATION_CREATED", "ANNOTATION_UPDATED"],
                },
                timeout=10,
            )
            resp.raise_for_status()
            logger.info(f"Label Studio: registered webhook for project {project_id}")
            return True
        except Exception as e:
            logger.warning(f"Label Studio: webhook registration failed: {e}")
            return False

    def health_check(self) -> bool:
        try:
            resp = requests.get(f"{self.endpoint}/health", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False

    def _guess_mime(self, data_type: str, filename: str) -> str:
        if data_type == "video":
            return "video/mp4"
        if data_type == "audio":
            return "audio/wav"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                "webp": "image/webp", "bmp": "image/bmp", "gif": "image/gif",
                "pdf": "application/pdf"}.get(ext, "application/octet-stream")
