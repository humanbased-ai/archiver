"""ModelBackend — abstract interface for all AI/ML model backends."""

from abc import ABC, abstractmethod
from typing import Any


class ModelBackend(ABC):
    """Uniform interface for model inference backends.

    Implementations: YOLO (local), OpenAI-compatible API, Claude API, Ollama, vLLM, custom HTTP.
    """

    def __init__(self, name: str, endpoint: str = "", credentials: str = "", default_params: dict = None):
        self.name = name
        self.endpoint = endpoint
        self.credentials = credentials
        self.default_params = default_params or {}

    @abstractmethod
    def predict(self, inputs: list[dict], params: dict | None = None) -> list[dict]:
        """Run inference on a batch of inputs.

        Args:
            inputs: List of dicts, shape depends on modality.
                Image:  {"image_path": "/path/to/img.jpg"}
                Text:   {"text": "...", "prompt": "..."}
                Audio:  {"audio_path": "/path/to/audio.wav"}
                Multi:  {"text": "...", "image_path": "..."}
            params: Override default_params for this call.

        Returns:
            List of result dicts, one per input:
                {"result": ..., "confidence": float, "raw": ...}
        """
        ...

    @abstractmethod
    def health_check(self) -> bool:
        """Check if the backend is available."""
        ...

    def get_params(self, overrides: dict | None = None) -> dict:
        """Merge default params with per-call overrides."""
        merged = {**self.default_params}
        if overrides:
            merged.update(overrides)
        return merged
