from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.health import get_config_status, check_live

router = APIRouter()


class AccountHealth(BaseModel):
    account: str
    platform: str
    lang: str
    configured: bool
    healthy: Optional[bool] = None
    error: Optional[str] = None


@router.get("/health")
async def health_status():
    return await get_config_status()


@router.post("/health/{platform}/{lang}")
async def test_connection(platform: str, lang: str):
    return await check_live(platform, lang)
