"""
Vision Engine 客户端 — 与远程视觉算法引擎通信。

Env vars:
    WORKER_URL  — Vision Engine 地址 (default: http://localhost:8001)
"""

import os
import logging
import httpx
from pathlib import Path

logger = logging.getLogger("vision-client")

WORKER_URL = os.environ.get("WORKER_URL", "http://localhost:8001")


def _make_client(**kwargs) -> httpx.Client:
    """Create an httpx client that bypasses system SOCKS/HTTP proxy."""
    return httpx.Client(trust_env=False, **kwargs)


class VisionClient:
    def __init__(self, base_url: str = WORKER_URL):
        self.base_url = base_url.rstrip("/")

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def health(self) -> dict:
        try:
            with _make_client(timeout=5.0) as c:
                r = c.get(self._url("/health"))
            r.raise_for_status()
            return r.json()
        except Exception:
            return {"status": "unavailable", "ffmpeg": False, "yolo": False}

    def submit_process(self, file_path: str, task_id: str, params: dict, callback_url: str) -> dict:
        """Upload source file + params to Vision Engine for processing."""
        p = Path(file_path)
        form_data = {"task_id": task_id, "callback_url": callback_url}
        for k, v in params.items():
            if isinstance(v, bool):
                form_data[k] = "true" if v else "false"
            else:
                form_data[k] = str(v)
        with _make_client(timeout=httpx.Timeout(10.0, read=600.0, write=600.0)) as c:
            with open(p, "rb") as f:
                r = c.post(
                    self._url("/tasks/process"),
                    files={"file": (p.name, f, "application/octet-stream")},
                    data=form_data,
                )
        r.raise_for_status()
        return r.json()

    def get_progress(self, task_id: str) -> dict | None:
        try:
            with _make_client(timeout=5.0) as c:
                r = c.get(self._url(f"/tasks/{task_id}/progress"))
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.warning("Progress fetch failed for %s: %s", task_id, e)
            return None

    def annotate_frame(self, frame_path: str, detector: str = "yolo",
                       yolo_model: str = "yolov8s.pt",
                       arm_conf_threshold: float = 0.30) -> dict:
        """Upload a single frame image for person detection."""
        with _make_client(timeout=httpx.Timeout(10.0, read=300.0)) as c:
            with open(frame_path, "rb") as f:
                r = c.post(
                    self._url("/tasks/annotate-frame"),
                    files={"file": (Path(frame_path).name, f, "image/jpeg")},
                    data={"detector": detector, "yolo_model": yolo_model,
                          "arm_conf_threshold": str(arm_conf_threshold)},
                )
        r.raise_for_status()
        return r.json()

    def detect_persons(self, frame_paths: list[str], detector: str = "yolo",
                       yolo_model: str = "yolov8s.pt") -> dict:
        """Upload multiple frame images for batch person detection."""
        files = []
        for fp in frame_paths:
            files.append(("files", (Path(fp).name, open(fp, "rb"), "image/jpeg")))
        try:
            with _make_client(timeout=httpx.Timeout(10.0, read=300.0)) as c:
                r = c.post(
                    self._url("/tasks/detect-persons"),
                    files=files,
                    data={"detector": detector, "yolo_model": yolo_model},
                )
            r.raise_for_status()
            return r.json()
        finally:
            for _, (_, fh, _) in files:
                fh.close()


# Singleton
vision = VisionClient()
