"""Backend registry — instantiate model and annotation backends from DB config."""

import logging

from .model_backend import ModelBackend
from .annotation_backend import AnnotationBackend
from .models.yolo import YoloBackend
from .models.openai_compat import OpenAICompatBackend
from .models.claude import ClaudeBackend
from .annotations.label_studio import LabelStudioBackend
from .annotations.custom import CustomAnnotationBackend

logger = logging.getLogger(__name__)

MODEL_BACKEND_TYPES: dict[str, type[ModelBackend]] = {
    "yolo": YoloBackend,
    "openai": OpenAICompatBackend,
    "claude": ClaudeBackend,
    "ollama": OpenAICompatBackend,  # Ollama uses OpenAI-compat API
    "vllm": OpenAICompatBackend,  # vLLM uses OpenAI-compat API
}

ANNOTATION_BACKEND_TYPES: dict[str, type[AnnotationBackend]] = {
    "label_studio": LabelStudioBackend,
    "custom": CustomAnnotationBackend,
}


def create_model_backend(config) -> ModelBackend:
    """Create a ModelBackend instance from a ModelBackendConfig DB row."""
    import json
    cls = MODEL_BACKEND_TYPES.get(config.type)
    if cls is None:
        raise ValueError(f"Unknown model backend type: {config.type}")
    default_params = json.loads(config.default_params_json) if config.default_params_json else {}
    return cls(
        name=config.name,
        endpoint=config.endpoint,
        credentials=config.credentials_encrypted,  # TODO: decrypt
        default_params=default_params,
    )


def create_annotation_backend(config) -> AnnotationBackend:
    """Create an AnnotationBackend instance from an AnnotationBackendConfig DB row."""
    import json
    cls = ANNOTATION_BACKEND_TYPES.get(config.type)
    if cls is None:
        raise ValueError(f"Unknown annotation backend type: {config.type}")
    capabilities = json.loads(config.capabilities_json) if config.capabilities_json else []
    return cls(
        name=config.name,
        endpoint=config.endpoint,
        credentials=config.credentials_encrypted,  # TODO: decrypt
        capabilities=capabilities,
    )
