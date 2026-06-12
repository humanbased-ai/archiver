"""
Core publish logic — uses DB account credentials dynamically.
"""
import asyncio
import logging
import tweepy
import httpx
from pathlib import Path
from app.database import list_accounts
from app.services.translator import translate

logger = logging.getLogger(__name__)

_EMBED_COLOR = 0x6C5CE7
_SEPARATOR_TG = "\n\n"
_SEPARATOR_DC = "\n\n──────────\n\n"

UPLOADS_DIR = Path(__file__).parent.parent.parent / "data" / "uploads"

# ── Unicode → platform-native formatting ──────────────────────────────────────
# Same maps as frontend JS (Mathematical Sans-Serif Bold / Mathematical Italic)
_BOLD_MAP: dict[str, str] = {
    'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵',
    'i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽',
    'q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅',
    'y':'𝘆','z':'𝘇','A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙',
    'G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡',
    'O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩',
    'W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯',
    '4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵',
}
_ITALIC_MAP: dict[str, str] = {
    'a':'𝑎','b':'𝑏','c':'𝑐','d':'𝑑','e':'𝑒','f':'𝑓','g':'𝑔','h':'ℎ',
    'i':'𝑖','j':'𝑗','k':'𝑘','l':'𝑙','m':'𝑚','n':'𝑛','o':'𝑜','p':'𝑝',
    'q':'𝑞','r':'𝑟','s':'𝑠','t':'𝑡','u':'𝑢','v':'𝑣','w':'𝑤','x':'𝑥',
    'y':'𝑦','z':'𝑧','A':'𝐴','B':'𝐵','C':'𝐶','D':'𝐷','E':'𝐸','F':'𝐹',
    'G':'𝐺','H':'𝐻','I':'𝐼','J':'𝐽','K':'𝐾','L':'𝐿','M':'𝑀','N':'𝑁',
    'O':'𝑂','P':'𝑃','Q':'𝑄','R':'𝑅','S':'𝑆','T':'𝑇','U':'𝑈','V':'𝑉',
    'W':'𝑊','X':'𝑋','Y':'𝑌','Z':'𝑍',
}
_BOLD_UNMAP   = {v: k for k, v in _BOLD_MAP.items()}
_ITALIC_UNMAP = {v: k for k, v in _ITALIC_MAP.items()}


def _convert_formatting(text: str, fmt: str) -> str:
    """
    Convert Unicode bold/italic/strikethrough chars to platform-native markup.
    fmt='html'  → Telegram HTML tags  (<b>, <i>, <s>)
    fmt='md'    → Discord Markdown     (**bold**, *italic*, ~~strike~~)
    Plain text is HTML-escaped when fmt='html'.
    """
    if fmt == 'html':
        tags = {'b': ('<b>', '</b>'), 'i': ('<i>', '</i>'), 's': ('<s>', '</s>')}
        def _esc(s: str) -> str:
            return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    else:
        tags = {'b': ('**', '**'), 'i': ('*', '*'), 's': ('~~', '~~')}
        def _esc(s: str) -> str:
            return s

    cps = list(text)
    result: list[str] = []
    i = 0
    while i < len(cps):
        ch = cps[i]
        # Orphan combining char — skip
        if ch == '\u0336':
            i += 1
            continue
        # Strikethrough: char immediately followed by U+0336
        if i + 1 < len(cps) and cps[i + 1] == '\u0336':
            plain = _BOLD_UNMAP.get(ch) or _ITALIC_UNMAP.get(ch) or ch
            o, c = tags['s']
            result.append(f'{o}{_esc(plain)}{c}')
            i += 2
            continue
        # Bold run
        if ch in _BOLD_UNMAP:
            run: list[str] = []
            while i < len(cps) and cps[i] in _BOLD_UNMAP:
                # Stop if this char is actually strikethrough
                if i + 1 < len(cps) and cps[i + 1] == '\u0336':
                    break
                run.append(_BOLD_UNMAP[cps[i]])
                i += 1
            o, c = tags['b']
            result.append(f'{o}{_esc("".join(run))}{c}')
            continue
        # Italic run
        if ch in _ITALIC_UNMAP:
            run = []
            while i < len(cps) and cps[i] in _ITALIC_UNMAP:
                if i + 1 < len(cps) and cps[i + 1] == '\u0336':
                    break
                run.append(_ITALIC_UNMAP[cps[i]])
                i += 1
            o, c = tags['i']
            result.append(f'{o}{_esc("".join(run))}{c}')
            continue
        # Plain character
        result.append(_esc(ch))
        i += 1
    return ''.join(result)


# ── Translation cache (per request) ──────────────────────────────────────────

async def translate_text(text: str, lang: str) -> str:
    if lang == "en":
        return text
    result = await translate(text)
    return result.get("chinese" if lang == "zh" else "korean", text)


# ── Media upload helper ───────────────────────────────────────────────────────

def _compress_image_if_needed(path: Path) -> Path:
    """
    If image exceeds Twitter's 5 MB limit, compress it and return a temp path.
    Returns the original path if no compression needed.
    """
    TWITTER_IMG_LIMIT = 5 * 1024 * 1024  # 5 MB
    if path.suffix.lower() == ".mp4" or path.stat().st_size <= TWITTER_IMG_LIMIT:
        return path
    try:
        from PIL import Image
        import tempfile, io
        img = Image.open(path)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        quality = 85
        while quality >= 40:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            if buf.tell() <= TWITTER_IMG_LIMIT:
                tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
                tmp.write(buf.getvalue())
                tmp.close()
                logger.info("Compressed %s (%.1fMB → %.1fMB, quality=%d)",
                            path.name, path.stat().st_size / 1e6, buf.tell() / 1e6, quality)
                return Path(tmp.name)
            quality -= 10
        logger.error("Could not compress %s under 5MB even at quality=40", path.name)
        return path
    except Exception as e:
        logger.error("Image compression failed for %s: %r", path.name, e)
        return path


def _upload_media_sync(api_v1: tweepy.API, media_url: str) -> str | None:
    """Upload a local media file via Twitter v1.1 and return media_id string."""
    import tempfile
    filename = media_url.lstrip("/")
    if filename.startswith("uploads/"):
        filename = filename[len("uploads/"):]
    path = UPLOADS_DIR / filename
    if not path.exists():
        logger.error("Twitter media upload: file not found: %s", path)
        return None
    tmp_path = None
    try:
        # Compress oversized images before upload (GIFs are not compressed)
        upload_path = _compress_image_if_needed(path)
        tmp_path = upload_path if upload_path != path else None

        suffix = upload_path.suffix.lower()
        is_gif = suffix == ".gif"
        # Videos, GIFs, and files > 5 MB require chunked upload
        chunked = suffix == ".mp4" or is_gif or upload_path.stat().st_size > 5 * 1024 * 1024
        # GIFs must use media_category="tweet_gif" or Twitter shows only first frame
        kwargs: dict = {"filename": str(upload_path), "chunked": chunked}
        if is_gif:
            kwargs["media_category"] = "tweet_gif"
        logger.info("Twitter media upload: %s (%.1fMB, chunked=%s, category=%s)",
                    path.name, upload_path.stat().st_size / 1e6, chunked,
                    kwargs.get("media_category", "default"))
        media = api_v1.media_upload(**kwargs)
        logger.info("Twitter media upload success: media_id=%s", media.media_id)
        return str(media.media_id)
    except Exception as e:
        logger.error("Twitter media upload failed for %s: %r", path.name, e)
        return None
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


# ── Platform publishers (dynamic credentials) ─────────────────────────────────

async def _publish_twitter(texts: list, cards: list, creds: dict, account_id: str, account_name: str):
    try:
        client = tweepy.Client(
            consumer_key=creds.get("api_key", ""),
            consumer_secret=creds.get("api_secret", ""),
            access_token=creds.get("access_token", ""),
            access_token_secret=creds.get("access_secret", ""),
        )
        # v1 API is required for media upload
        auth = tweepy.OAuth1UserHandler(
            creds.get("api_key", ""), creds.get("api_secret", ""),
            creds.get("access_token", ""), creds.get("access_secret", ""),
        )
        api_v1 = tweepy.API(auth)

        reply_to_id = None
        first_url = None
        for i, text in enumerate(texts):
            if not text.strip():
                continue
            kwargs = {"text": text}
            if reply_to_id:
                kwargs["in_reply_to_tweet_id"] = reply_to_id

            # Upload media files and attach (Twitter allows max 4 images per tweet)
            media_urls = cards[i].get("media_urls", []) if i < len(cards) else []
            media_ids = []
            for mu in media_urls[:4]:
                mid = await asyncio.to_thread(_upload_media_sync, api_v1, mu)
                if mid:
                    media_ids.append(mid)
            if media_ids:
                kwargs["media_ids"] = media_ids

            response = await asyncio.to_thread(client.create_tweet, **kwargs)
            tweet_id = response.data["id"]
            reply_to_id = tweet_id
            if i == 0:
                first_url = f"https://twitter.com/i/web/status/{tweet_id}"
        return {"account_id": account_id, "account_name": account_name,
                "success": True, "post_id": str(reply_to_id), "url": first_url}
    except tweepy.errors.TooManyRequests as e:
        return {"account_id": account_id, "account_name": account_name,
                "success": False, "error": f"Rate limited: {e}"}
    except tweepy.errors.Forbidden as e:
        logger.error("Twitter Forbidden [%s]: %r", account_name, e)
        return {"account_id": account_id, "account_name": account_name,
                "success": False, "error": f"Forbidden: {e}"}
    except Exception as e:
        logger.error("Twitter error [%s]: %r", account_name, e)
        return {"account_id": account_id, "account_name": account_name,
                "success": False, "error": str(e)}


async def _publish_telegram(texts: list, cards: list, creds: dict, account_id: str, account_name: str):
    import json as _json

    def _tg_text(t: str) -> tuple[str, str | None]:
        """Return (text, parse_mode). Only use HTML mode when formatting tags exist."""
        converted = _convert_formatting(t, 'html')
        if any(tag in converted for tag in ('<b>', '<i>', '<s>')):
            return converted, 'HTML'
        # No formatting — send raw text to avoid &amp; / &lt; display issues
        return t, None

    parts = [_tg_text(t) for t in texts if t.strip()]
    # Build combined text; use HTML if ANY part needs it
    use_html = any(pm == 'HTML' for _, pm in parts)
    if use_html:
        combined = _SEPARATOR_TG.join(p for p, _ in parts)
        parse_mode: str | None = 'HTML'
    else:
        combined = _SEPARATOR_TG.join(t for t in texts if t.strip())
        parse_mode = None

    bot_token = creds.get("bot_token", "")
    chat_id   = creds.get("chat_id", "")
    thread_id = creds.get("thread_id", "").strip() or None   # optional topic ID
    base      = f"https://api.telegram.org/bot{bot_token}"

    def _base_payload() -> dict:
        """Common fields for every Telegram API call."""
        p: dict = {"chat_id": chat_id}
        if thread_id:
            p["message_thread_id"] = int(thread_id)
        return p

    def _base_data() -> dict:
        """Same but as plain dict for multipart form data (values must be str)."""
        p: dict = {"chat_id": chat_id}
        if thread_id:
            p["message_thread_id"] = str(int(thread_id))
        return p

    # Collect local media paths from all cards
    media_paths: list[Path] = []
    for card in cards:
        for mu in card.get("media_urls", []):
            filename = mu.lstrip("/")
            if filename.startswith("uploads/"):
                filename = filename[len("uploads/"):]
            p = UPLOADS_DIR / filename
            if p.exists():
                media_paths.append(p)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if not media_paths:
                # ── Text only ────────────────────────────────────────────────
                msg_payload = {
                    **_base_payload(),
                    "text": combined,
                    "disable_web_page_preview": False,
                }
                if parse_mode:
                    msg_payload["parse_mode"] = parse_mode
                resp = await client.post(f"{base}/sendMessage", json=msg_payload)
                resp.raise_for_status()
                msg_id = str(resp.json()["result"]["message_id"])

            elif len(media_paths) == 1:
                # ── Single photo / video / GIF ───────────────────────────────
                p = media_paths[0]
                caption  = combined[:1024]
                is_video = p.suffix.lower() == ".mp4"
                is_gif   = p.suffix.lower() == ".gif"
                if is_video:
                    method, field, mime = "sendVideo",    "video",    "video/mp4"
                elif is_gif:
                    method, field, mime = "sendDocument", "document", "image/gif"
                else:
                    method, field, mime = "sendPhoto",    "photo",    "image/jpeg"
                cap_data = {**_base_data(), "caption": caption}
                if parse_mode:
                    cap_data["parse_mode"] = parse_mode
                with open(p, "rb") as fh:
                    resp = await client.post(
                        f"{base}/{method}",
                        data=cap_data,
                        files={field: (p.name, fh, mime)},
                    )
                resp.raise_for_status()
                msg_id = str(resp.json()["result"]["message_id"])
                # Send overflow text as a follow-up reply
                if len(combined) > 1024:
                    overflow: dict = {
                        **_base_payload(),
                        "text": combined[1024:],
                        "reply_to_message_id": int(msg_id),
                    }
                    if parse_mode:
                        overflow["parse_mode"] = parse_mode
                    await client.post(f"{base}/sendMessage", json=overflow)

            else:
                # ── Multiple files → sendMediaGroup (max 10) ─────────────────
                media_group = []
                open_files  = []
                for i, p in enumerate(media_paths[:10]):
                    is_video = p.suffix.lower() == ".mp4"
                    is_gif   = p.suffix.lower() == ".gif"
                    attach_key = f"file{i}"
                    # sendMediaGroup does not support 'document'; send GIFs as video
                    item: dict = {
                        "type":  "video" if (is_video or is_gif) else "photo",
                        "media": f"attach://{attach_key}",
                    }
                    if i == 0:
                        item["caption"] = combined[:1024]
                        if parse_mode:
                            item["parse_mode"] = parse_mode
                    media_group.append(item)
                    fh = open(p, "rb")
                    mime = "video/mp4" if is_video else ("image/gif" if is_gif else "image/jpeg")
                    open_files.append((attach_key, p.name, fh, mime))

                files_param = {key: (name, fh, mime)
                               for key, name, fh, mime in open_files}
                resp = await client.post(
                    f"{base}/sendMediaGroup",
                    data={**_base_data(), "media": _json.dumps(media_group)},
                    files=files_param,
                )
                for _, _, fh, _ in open_files:
                    fh.close()
                resp.raise_for_status()
                msg_id = str(resp.json()["result"][0]["message_id"])
                if len(combined) > 1024:
                    await client.post(f"{base}/sendMessage", json={
                        **_base_payload(), "text": combined[1024:],
                    })

        return {"account_id": account_id, "account_name": account_name,
                "success": True, "post_id": msg_id}
    except Exception as e:
        logger.error("Telegram error [%s]: %r", account_name, e)
        return {"account_id": account_id, "account_name": account_name,
                "success": False, "error": str(e)}


async def _publish_discord(texts: list, cards: list, creds: dict, account_id: str, account_name: str):
    import json as _json
    combined    = _SEPARATOR_DC.join(
        _convert_formatting(t, 'md') for t in texts if t.strip()
    )
    webhook_url = creds.get("webhook_url", "")

    # Collect local media paths
    media_paths: list[Path] = []
    for card in cards:
        for mu in card.get("media_urls", []):
            filename = mu.lstrip("/")
            if filename.startswith("uploads/"):
                filename = filename[len("uploads/"):]
            p = UPLOADS_DIR / filename
            if p.exists():
                media_paths.append(p)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if not media_paths:
                # ── Text only ────────────────────────────────────────────────
                payload = {"embeds": [{"description": combined, "color": _EMBED_COLOR,
                                       "footer": {"text": "Codatta"}}]}
                resp = await client.post(webhook_url, json=payload)
            else:
                # ── With attachments ─────────────────────────────────────────
                embed: dict = {"description": combined, "color": _EMBED_COLOR,
                               "footer": {"text": "Codatta"}}
                # Attach first non-video as embed image so it renders inline
                first = media_paths[0]
                if first.suffix.lower() != ".mp4":
                    embed["image"] = {"url": f"attachment://{first.name}"}

                DISCORD_FILE_LIMIT = 8 * 1024 * 1024  # 8 MB per file
                open_files = []
                files_param: dict = {}
                skipped = 0
                for i, p in enumerate(media_paths[:10]):
                    if p.stat().st_size > DISCORD_FILE_LIMIT:
                        logger.warning("Discord: skipping %s (%.1fMB > 8MB limit)",
                                       p.name, p.stat().st_size / 1e6)
                        skipped += 1
                        continue
                    is_video = p.suffix.lower() == ".mp4"
                    is_gif   = p.suffix.lower() == ".gif"
                    mime = "video/mp4" if is_video else ("image/gif" if is_gif else "image/jpeg")
                    fh = open(p, "rb")
                    open_files.append(fh)
                    files_param[f"files[{len(files_param)}]"] = (p.name, fh, mime)
                if skipped and not files_param:
                    # All files were too large — fall back to text only
                    embed.pop("image", None)

                resp = await client.post(
                    webhook_url,
                    data={"payload_json": _json.dumps({"embeds": [embed]})},
                    files=files_param,
                )
                for fh in open_files:
                    fh.close()

            if resp.status_code not in (200, 204):
                resp.raise_for_status()
        return {"account_id": account_id, "account_name": account_name, "success": True}
    except Exception as e:
        logger.error("Discord error [%s]: %r", account_name, e)
        return {"account_id": account_id, "account_name": account_name,
                "success": False, "error": str(e)}


# ── Main publish entry point ──────────────────────────────────────────────────

async def publish_to_accounts(cards: list, account_ids: list) -> list:
    """
    cards: list of {"text": str (EN), "media_urls": [...]}
    account_ids: list of DB account IDs
    Returns list of result dicts.
    """
    # Fetch accounts
    all_accounts = await list_accounts()
    accounts = [a for a in all_accounts if a["id"] in account_ids and a["enabled"]]

    # Build translation cache
    lang_cache: dict = {}

    async def _translate_for_lang(lang: str) -> list:
        if lang not in lang_cache:
            translated = []
            for card in cards:
                t = await translate_text(card["text"], lang)
                translated.append(t)
            lang_cache[lang] = translated
        return lang_cache[lang]

    async def _run_account(acc: dict):
        lang = acc["lang"]
        texts = await _translate_for_lang(lang)
        platform = acc["platform"]
        if platform == "twitter":
            return await _publish_twitter(texts, cards, acc["credentials"], acc["id"], acc["name"])
        elif platform == "telegram":
            return await _publish_telegram(texts, cards, acc["credentials"], acc["id"], acc["name"])
        elif platform == "discord":
            return await _publish_discord(texts, cards, acc["credentials"], acc["id"], acc["name"])
        else:
            return {"account_id": acc["id"], "account_name": acc["name"],
                    "success": False, "error": f"Unknown platform: {platform}"}

    raw = await asyncio.gather(*[_run_account(a) for a in accounts], return_exceptions=True)
    results = []
    for i, r in enumerate(raw):
        if isinstance(r, BaseException):
            results.append({"account_id": accounts[i]["id"], "account_name": accounts[i]["name"],
                             "success": False, "error": str(r)})
        else:
            results.append(r)
    return results
