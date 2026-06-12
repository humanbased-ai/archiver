import httpx
from app.config import settings
from app.models.schemas import PlatformResult

_WEBHOOK_URLS: dict[str, str] = {
    "en": settings.DISCORD_WEBHOOK_URL_EN,
    "zh": settings.DISCORD_WEBHOOK_URL_ZH,
    "ko": settings.DISCORD_WEBHOOK_URL_KO,
}

_EMBED_COLOR = 0x6C5CE7
_SEPARATOR = "\n\n──────────\n\n"


async def publish_thread(texts: list[str], lang: str) -> PlatformResult:
    """Post all thread cards as a single Discord embed."""
    combined = _SEPARATOR.join(texts) if len(texts) > 1 else texts[0]
    return await publish(combined, lang)


async def publish(text: str, lang: str) -> PlatformResult:
    target = f"discord_{lang}"
    webhook_url = _WEBHOOK_URLS[lang]
    payload = {
        "embeds": [{
            "description": text,
            "color": _EMBED_COLOR,
            "footer": {"text": "Codatta"},
        }]
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code in (200, 204):
                return PlatformResult(target=target, success=True)
            resp.raise_for_status()
            return PlatformResult(target=target, success=True)
    except httpx.HTTPStatusError as e:
        return PlatformResult(target=target, success=False,
                              error=f"HTTP {e.response.status_code}: {e.response.text}")
    except Exception as e:
        return PlatformResult(target=target, success=False, error=str(e))


async def check_health(lang: str) -> bool:
    webhook_url = _WEBHOOK_URLS.get(lang, "")
    if not webhook_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(webhook_url)
            return resp.status_code == 200
    except Exception:
        return False
