"""OpenAI-compatible model backend.

Works with: OpenAI API, Azure OpenAI, vLLM, Ollama (OpenAI-compat mode),
and any server implementing the OpenAI chat completions API.
"""

import base64
import json
import logging
from pathlib import Path

from ..model_backend import ModelBackend

logger = logging.getLogger(__name__)


class OpenAICompatBackend(ModelBackend):
    """Backend for OpenAI-compatible chat completion APIs."""

    def predict(self, inputs: list[dict], params: dict | None = None) -> list[dict]:
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required: pip install openai")

        p = self.get_params(params)
        model = p.pop("model", "gpt-4o")
        temperature = p.pop("temperature", 0.0)
        max_tokens = p.pop("max_tokens", 4096)
        response_format_type = p.pop("response_format", None)

        client = OpenAI(api_key=self.credentials, base_url=self.endpoint or None)

        results = []
        for inp in inputs:
            messages = self._build_messages(inp, p)
            kwargs = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if response_format_type == "json":
                kwargs["response_format"] = {"type": "json_object"}

            try:
                resp = client.chat.completions.create(**kwargs)
                content = resp.choices[0].message.content or ""
                if response_format_type == "json":
                    try:
                        result = json.loads(content)
                    except json.JSONDecodeError:
                        result = {"raw_text": content}
                else:
                    result = {"text": content}
                results.append({
                    "result": result,
                    "confidence": 1.0,
                    "usage": {"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens} if resp.usage else {},
                })
            except Exception as e:
                logger.error(f"OpenAI predict error: {e}")
                results.append({"result": None, "confidence": 0.0, "error": str(e)})
        return results

    def _build_messages(self, inp: dict, params: dict) -> list[dict]:
        prompt = inp.get("prompt", inp.get("text", ""))
        messages = [{"role": "user", "content": []}]
        content_parts = messages[0]["content"]

        # Add text
        if prompt:
            content_parts.append({"type": "text", "text": prompt})

        # Add image if present (vision)
        image_path = inp.get("image_path")
        if image_path and Path(image_path).exists():
            with open(image_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            })

        # Simplify if text-only
        if len(content_parts) == 1 and content_parts[0]["type"] == "text":
            messages[0]["content"] = content_parts[0]["text"]

        return messages

    def health_check(self) -> bool:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.credentials, base_url=self.endpoint or None)
            client.models.list()
            return True
        except Exception:
            return False
