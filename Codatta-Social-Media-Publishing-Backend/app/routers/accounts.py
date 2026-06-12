from fastapi import APIRouter, HTTPException
from app.models.schemas import AccountCreate, AccountUpdate, Account
from app.database import create_account, get_account, list_accounts, update_account, delete_account, toggle_account

router = APIRouter()


@router.get("/accounts", response_model=list[Account])
async def get_accounts():
    rows = await list_accounts()
    return [Account(**{**r, "enabled": bool(r["enabled"])}) for r in rows]


@router.post("/accounts", response_model=Account)
async def add_account(body: AccountCreate):
    row = await create_account(body.name, body.platform, body.lang, body.credentials)
    return Account(**{**row, "enabled": bool(row["enabled"])})


@router.put("/accounts/{acc_id}", response_model=Account)
async def edit_account(acc_id: str, body: AccountUpdate):
    fields = body.model_dump(exclude_none=True)
    row = await update_account(acc_id, **fields)
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    return Account(**{**row, "enabled": bool(row["enabled"])})


@router.delete("/accounts/{acc_id}")
async def remove_account(acc_id: str):
    await delete_account(acc_id)
    return {"ok": True}


@router.patch("/accounts/{acc_id}/toggle", response_model=Account)
async def toggle(acc_id: str):
    row = await toggle_account(acc_id)
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    return Account(**{**row, "enabled": bool(row["enabled"])})
