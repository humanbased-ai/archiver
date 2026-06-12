"""AnnotationBackend — abstract interface for annotation tool backends."""

from abc import ABC, abstractmethod
from typing import Any


class AnnotationBackend(ABC):
    """Uniform interface for annotation tool backends.

    Implementations: Label Studio, custom HTTP annotation tools.
    """

    def __init__(self, name: str, endpoint: str = "", credentials: str = "", capabilities: list[str] = None):
        self.name = name
        self.endpoint = endpoint
        self.credentials = credentials
        self.capabilities = capabilities or []

    @abstractmethod
    def create_project(self, config: dict) -> str:
        """Create an annotation project on the backend.

        Args:
            config: {"title": str, "ui_config": str, "instructions": str, ...}

        Returns:
            External project ID (string).
        """
        ...

    @abstractmethod
    def upload_data(
        self,
        project_id: str,
        records: list[dict],
        predictions: list[dict] | None = None,
    ) -> dict[str, str]:
        """Upload data records to an annotation project.

        Args:
            project_id: External project ID.
            records: List of {"uid": str, "content": ..., "metadata": ...}.
            predictions: Optional pre-annotations to display.

        Returns:
            Mapping {record_uid: external_task_id}.
        """
        ...

    @abstractmethod
    def get_progress(self, project_id: str) -> dict:
        """Get annotation progress.

        Returns:
            {"total": int, "completed": int, "reviewed": int, "pending": int}
        """
        ...

    @abstractmethod
    def get_annotations(
        self,
        project_id: str,
        task_ids: list[str] | None = None,
    ) -> list[dict]:
        """Pull completed annotations.

        Returns:
            [{"task_id": str, "record_uid": str, "result": ..., "annotator": str, "created_at": str}]
        """
        ...

    @abstractmethod
    def export(self, project_id: str, fmt: str = "json") -> str:
        """Export project data. Returns file path or download URL."""
        ...

    def register_webhook(self, project_id: str, callback_url: str) -> bool:
        """Register a webhook for completion notifications. Optional — returns False if unsupported."""
        return False

    @abstractmethod
    def health_check(self) -> bool:
        ...
