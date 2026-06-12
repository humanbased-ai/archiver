import httpx
from app.config import settings
from app.models.schemas import PlatformResult

_SEND_URL = "https://api.telegram.org/bot{token}/sendMessage"

_CHAT_IDS: dict[str, str] = {
    "en": settings.TELEGRAM_CHAT_ID_EN,
    "zh": settings.TELEGRAM_CHAT_ID_ZH,
    "ko": settings.TELEGRAM_CHAT_ID_KO,
}

_SEPARATOR = "\n\n──────────\n\n"


async def publish_thread(texts: list[str], lang: str) -> PlatformResult:
    """Send all thread cards as a single Telegram message."""
    combined = _SEPARATOR.join(texts) if len(texts) > 1 else texts[0]
    return await publish(combined, lang)


async def publish(text: str, lang: str) -> PlatformResult:
    target = f"telegram_{lang}"
    url = _SEND_URL.format(token=settings.TELEGRAM_BOT_TOKEN)
    payload = {
        "chat_id": _CHAT_IDS[lang],
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            message_id = str(data["result"]["message_id"])
            return PlatformResult(target=target, success=True, post_id=message_id)
    except httpx.HTTPStatusError as e:
        return PlatformResult(target=target, success=False,
                              error=f"HTTP {e.response.status_code}: {e.response.text}")
    except Exception as e:
        return PlatformResult(target=target, success=False, error=str(e))


async def check_health(lang: str) -> bool:
    try:
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getMe"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            return resp.status_code == 200
    except Exception:
        return False
