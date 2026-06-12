import json
import re
from openai import AsyncOpenAI
from app.config import settings


_client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",
)

_SYSTEM_PROMPT = """You are a professional social media translator specializing in crypto and Web3 content.
Translate the given English tweet into Chinese (Simplified) and Korean.

Rules:
- Preserve hashtags (#tag) exactly as-is
- Preserve mentions (@user) exactly as-is
- Preserve URLs exactly as-is
- Keep the tone: concise, engaging, community-forward
- Preserve technical terms (e.g. DePIN, node, validator) or transliterate naturally
- Return ONLY a JSON object with keys "chinese" and "korean", no markdown fences, no extra text"""


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def translate(english_text: str) -> dict[str, str]:
    """Translate English text into Chinese and Korean. Returns {"chinese": ..., "korean": ...}."""
    response = await _client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"Translate this tweet:\n\n{english_text}"},
        ],
    )
    raw = response.choices[0].message.content or ""
    cleaned = _strip_json_fences(raw)
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        retry = await _client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"Translate this tweet and respond with ONLY valid JSON, nothing else:\n\n{english_text}"},
            ],
        )
        cleaned = _strip_json_fences(retry.choices[0].message.content or "")
        result = json.loads(cleaned)

    return {
        "chinese": result.get("chinese", ""),
        "korean":  result.get("korean", ""),
    }
