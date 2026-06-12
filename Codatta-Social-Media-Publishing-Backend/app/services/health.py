import asyncio
import tweepy
import httpx
from app.database import list_accounts


async def get_config_status() -> list[dict]:
    """Return credential status for all DB accounts (no API calls)."""
    accounts = await list_accounts()
    return [
        {
            "account": a["name"],
            "platform": a["platform"],
            "lang": a["lang"],
            "enabled": bool(a["enabled"]),
            "configured": bool(a.get("credentials")),
        }
        for a in accounts
    ]


async def check_live(platform: str, lang: str) -> dict:
    """Live connectivity test for the first enabled DB account matching platform+lang."""
    accounts = await list_accounts()
    matches = [a for a in accounts if a["platform"] == platform and a["lang"] == lang and a["enabled"]]
    account_key = f"{platform}_{lang}"

    if not matches:
        return {"account": account_key, "configured": False, "healthy": False,
                "error": "No enabled account found"}

    creds = matches[0].get("credentials", {})

    try:
        if platform == "twitter":
            client = tweepy.Client(
                consumer_key=creds.get("api_key", ""),
                consumer_secret=creds.get("api_secret", ""),
                access_token=creds.get("access_token", ""),
                access_token_secret=creds.get("access_secret", ""),
            )
            resp = await asyncio.to_thread(client.get_me)
            healthy = resp.data is not None
        elif platform == "telegram":
            async with httpx.AsyncClient(timeout=10.0) as http:
                r = await http.get(
                    f"https://api.telegram.org/bot{creds.get('bot_token', '')}/getMe"
                )
                healthy = r.status_code == 200
        elif platform == "discord":
            async with httpx.AsyncClient(timeout=10.0) as http:
                r = await http.post(creds.get("webhook_url", ""), json={"content": ""})
                # 400 = connected but empty content rejected — that's fine
                healthy = r.status_code in (200, 204, 400)
        else:
            return {"account": account_key, "configured": True, "healthy": False,
                    "error": f"Unknown platform: {platform}"}

        return {"account": account_key, "configured": True, "healthy": healthy, "error": None}
    except Exception as e:
        return {"account": account_key, "configured": True, "healthy": False, "error": str(e)}
