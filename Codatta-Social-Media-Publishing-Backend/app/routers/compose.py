from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import translator

router = APIRouter()


class SingleTranslateRequest(BaseModel):
    text: str
    target_lang: str = "zh"   # zh | ko


class ThreadTranslateRequest(BaseModel):
    cards: list   # list of EN strings


@router.post("/translate")
async def translate_single(body: SingleTranslateRequest):
    if not body.text.strip():
        raise HTTPException(status_code=422, detail="text is empty")
    try:
        t = await translator.translate(body.text)
        result = t.get("chinese" if body.target_lang == "zh" else "korean", "")
        return {"text": result, "lang": body.target_lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")


@router.post("/translate-thread")
async def translate_thread(body: ThreadTranslateRequest):
    if not body.cards:
        raise HTTPException(status_code=422, detail="cards is empty")
    try:
        results = []
        for text in body.cards:
            if not str(text).strip():
                results.append({"en": text, "zh": "", "ko": ""})
                continue
            t = await translator.translate(str(text))
            results.append({"en": text, "zh": t.get("chinese", ""), "ko": t.get("korean", "")})
        return {"cards": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")
