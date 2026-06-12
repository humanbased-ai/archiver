from fastapi import APIRouter, HTTPException
from app.models.schemas import PublishRequest, PublishResult
from app.services.publisher import publish_to_accounts
from app.database import save_post, save_results

router = APIRouter()


@router.post("/publish", response_model=PublishResult)
async def publish_endpoint(body: PublishRequest):
    if not body.cards:
        raise HTTPException(status_code=422, detail="cards is empty")
    if not body.account_ids:
        raise HTTPException(status_code=422, detail="No accounts selected")

    cards = body.cards if isinstance(body.cards[0], dict) else [c.model_dump() for c in body.cards]

    if body.scheduled_at:
        post_id = await save_post(cards, body.account_ids, body.scheduled_at)
        return PublishResult(post_id=post_id, mode="scheduled",
                             scheduled_at=body.scheduled_at, status="scheduled")

    post_id = await save_post(cards, body.account_ids)
    results = await publish_to_accounts(cards, body.account_ids)

    succeeded = sum(1 for r in results if r["success"])
    failed = len(results) - succeeded
    status = "published" if succeeded == len(results) else ("failed" if succeeded == 0 else "partial_failure")

    await save_results(post_id, results, status)
    return PublishResult(post_id=post_id, mode="immediate", results=results,
                         total=len(results), succeeded=succeeded, failed=failed, status=status)
