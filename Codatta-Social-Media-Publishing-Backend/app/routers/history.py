import json
from fastapi import APIRouter, HTTPException
from app.database import get_history, save_results, get_db, cancel_scheduled_post
from app.models.schemas import HistoryPost
from app.services.publisher import publish_to_accounts

router = APIRouter()


@router.get("/history", response_model=list[HistoryPost])
async def history_endpoint(limit: int = 50):
    rows = await get_history(limit)
    posts = []
    for row in rows:
        cards = row["cards"]
        preview = cards[0]["text"][:80] if cards else ""
        posts.append(HistoryPost(
            id=row["id"],
            status=row["status"],
            preview=preview,
            cards=cards,
            account_ids=row["account_ids"],
            scheduled_at=row.get("scheduled_at"),
            created_at=row["created_at"],
            results=row["results"],
        ))
    return posts


@router.post("/history/{post_id}/retry")
async def retry_failed(post_id: str):
    async with get_db() as db:
        db.row_factory = __import__("aiosqlite").Row
        cur = await db.execute("SELECT * FROM posts WHERE id=?", (post_id,))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    row = dict(row)
    cards = json.loads(row["cards"])
    all_account_ids = json.loads(row["account_ids"])

    # Find failed accounts
    history = await get_history(200)
    post_data = next((p for p in history if p["id"] == post_id), None)
    failed_ids = ([r["account_id"] for r in post_data["results"] if not r["success"]]
                  if post_data else all_account_ids)

    if not failed_ids:
        return {"message": "No failed accounts to retry", "retried": 0}

    results = await publish_to_accounts(cards, failed_ids)
    succeeded = sum(1 for r in results if r["success"])
    new_status = ("published" if succeeded == len(all_account_ids)
                  else "partial_failure" if succeeded > 0 else "failed")
    await save_results(post_id, results, new_status)
    return {"retried": len(failed_ids), "succeeded": succeeded, "results": results}


@router.delete("/history/{post_id}")
async def cancel_scheduled(post_id: str):
    result = await cancel_scheduled_post(post_id)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Post not found")
    if result == "not_scheduled":
        raise HTTPException(status_code=409, detail="Only scheduled posts can be cancelled")
    return {"status": "cancelled", "post_id": post_id}
