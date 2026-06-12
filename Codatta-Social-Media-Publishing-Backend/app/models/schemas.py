from pydantic import BaseModel
from typing import Optional


# ── Accounts ──────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str
    platform: str          # twitter | telegram | discord
    lang: str = "en"
    credentials: dict = {}


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    lang: Optional[str] = None
    credentials: Optional[dict] = None


class Account(BaseModel):
    id: str
    name: str
    platform: str
    lang: str
    enabled: bool
    credentials: dict
    created_at: str


# ── Translation ───────────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str
    target_lang: str  # zh | ko | etc.


class TranslateResponse(BaseModel):
    text: str
    lang: str


# ── Publish ───────────────────────────────────────────────────────────────────

class CardContent(BaseModel):
    text: str
    media_urls: list = []


class PublishRequest(BaseModel):
    cards: list              # list of CardContent dicts
    account_ids: list        # DB account IDs
    scheduled_at: Optional[str] = None


class PlatformResult(BaseModel):
    account_id: str
    account_name: str = ""
    success: bool
    post_id: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None


class PublishResult(BaseModel):
    post_id: str
    mode: str
    scheduled_at: Optional[str] = None
    results: Optional[list] = None
    total: int = 0
    succeeded: int = 0
    failed: int = 0
    status: str


# ── History ───────────────────────────────────────────────────────────────────

class HistoryResult(BaseModel):
    account_id: str
    account_name: Optional[str] = None
    success: bool
    remote_id: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None
    published_at: str


class HistoryPost(BaseModel):
    id: str
    status: str
    preview: str
    cards: list
    account_ids: list
    scheduled_at: Optional[str] = None
    created_at: str
    results: list
