"""Claude (Anthropic) model backend."""

import base64
import json
import logging
from pathlib import Path

from ..model_backend import ModelBackend

logger = logging.getLogger(__name__)


class ClaudeBackend(ModelBackend):
    """Backend for Anthropic Claude API."""

    def predict(self, inputs: list[dict], params: dict | None = None) -> list[dict]:
        try:
            import anthropic
        except ImportError:
            raise ImportError("anthropic package required: pip install anthropic")

        p = self.get_params(params)
        model = p.pop("model", "claude-sonnet-4-20250514")
        temperature = p.pop("temperature", 0.0)
        max_tokens = p.pop("max_tokens", 4096)
        response_format_type = p.pop("response_format", None)

        client = anthropic.Anthropic(api_key=self.credentials)

        results = []
        for inp in inputs:
            content_blocks = self._build_content(inp)
            try:
                resp = client.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[{"role": "user", "content": content_blocks}],
                )
                text = resp.content[0].text if resp.content else ""
                if response_format_type == "json":
                    try:
                        result = json.loads(text)
                    except json.JSONDecodeError:
                        result = {"raw_text": text}
                else:
                    result = {"text": text}
                results.append({
                    "result": result,
                    "confidence": 1.0,
                    "usage": {"input_tokens": resp.usage.input_tokens, "output_tokens": resp.usage.output_tokens},
                })
            except Exception as e:
                logger.error(f"Claude predict error: {e}")
                results.append({"result": None, "confidence": 0.0, "error": str(e)})
        return results

    def _build_content(self, inp: dict) -> list[dict]:
        blocks = []
        image_path = inp.get("image_path")
        if image_path and Path(image_path).exists():
            with open(image_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            suffix = Path(image_path).suffix.lower()
            media_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
            media_type = media_map.get(suffix, "image/jpeg")
            blocks.append({
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": b64},
            })
        prompt = inp.get("prompt", inp.get("text", ""))
        if prompt:
            blocks.append({"type": "text", "text": prompt})
        return blocks

    def health_check(self) -> bool:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.credentials)
            # A lightweight check — just see if we can create the client
            return bool(client.api_key)
        except Exception:
            return False
