"""Custom HTTP annotation backend — for self-built annotation tools.

Expects the custom tool to implement the API protocol defined in docs/system-design.md §10.
"""

import logging

import requests

from ..annotation_backend import AnnotationBackend

logger = logging.getLogger(__name__)


class CustomAnnotationBackend(AnnotationBackend):
    """Backend for custom-built annotation tools that implement the standard HTTP API."""

    def create_project(self, config: dict) -> str:
        resp = requests.post(
            f"{self.endpoint}/api/v1/projects",
            json=config,
            headers=self._auth_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        project_id = str(data.get("project_id", data.get("id", "")))
        logger.info(f"Custom backend '{self.name}': created project {project_id}")
        return project_id

    def upload_data(
        self,
        project_id: str,
        records: list[dict],
        predictions: list[dict] | None = None,
    ) -> dict[str, str]:
        payload = {"records": records}
        if predictions:
            payload["predictions"] = predictions
        resp = requests.post(
            f"{self.endpoint}/api/v1/projects/{project_id}/data",
            json=payload,
            headers=self._auth_headers(),
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        mapping = data.get("task_mapping", {})
        logger.info(f"Custom backend '{self.name}': uploaded {data.get('imported', len(records))} records")
        return {str(k): str(v) for k, v in mapping.items()}

    def get_progress(self, project_id: str) -> dict:
        resp = requests.get(
            f"{self.endpoint}/api/v1/projects/{project_id}/progress",
            headers=self._auth_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    def get_annotations(self, project_id: str, task_ids: list[str] | None = None) -> list[dict]:
        params = {}
        if task_ids:
            params["task_ids"] = ",".join(task_ids)
        resp = requests.get(
            f"{self.endpoint}/api/v1/projects/{project_id}/annotations",
            params=params,
            headers=self._auth_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("annotations", data if isinstance(data, list) else [])

    def export(self, project_id: str, fmt: str = "json") -> str:
        resp = requests.post(
            f"{self.endpoint}/api/v1/projects/{project_id}/export",
            json={"format": fmt},
            headers=self._auth_headers(),
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("download_url", "")

    def register_webhook(self, project_id: str, callback_url: str) -> bool:
        try:
            resp = requests.post(
                f"{self.endpoint}/api/v1/projects/{project_id}/webhooks",
                json={"url": callback_url, "events": ["annotation_complete"]},
                headers=self._auth_headers(),
                timeout=10,
            )
            resp.raise_for_status()
            return True
        except Exception as e:
            logger.warning(f"Custom backend '{self.name}': webhook registration failed: {e}")
            return False

    def health_check(self) -> bool:
        try:
            resp = requests.get(
                f"{self.endpoint}/api/v1/health",
                headers=self._auth_headers(),
                timeout=5,
            )
            return resp.status_code == 200
        except Exception:
            return False

    def _auth_headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if self.credentials:
            headers["Authorization"] = f"Bearer {self.credentials}"
        return headers
