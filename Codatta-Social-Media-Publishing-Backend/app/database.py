import json
import uuid
import aiosqlite
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "codatta.db"


async def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS accounts (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                platform    TEXT NOT NULL,
                lang        TEXT NOT NULL DEFAULT 'en',
                enabled     INTEGER NOT NULL DEFAULT 1,
                credentials TEXT NOT NULL DEFAULT '{}',
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS posts (
                id          TEXT PRIMARY KEY,
                status      TEXT NOT NULL DEFAULT 'pending',
                cards       TEXT NOT NULL,
                account_ids TEXT NOT NULL,
                scheduled_at TEXT,
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS publish_results (
                id           TEXT PRIMARY KEY,
                post_id      TEXT NOT NULL,
                account_id   TEXT NOT NULL,
                account_name TEXT,
                success      INTEGER NOT NULL,
                remote_id    TEXT,
                url          TEXT,
                error        TEXT,
                published_at TEXT NOT NULL
            );
        """)
        await db.commit()

        # ── Migration: rebuild posts table if schema is outdated ────────────────
        cur = await db.execute("PRAGMA table_info(posts)")
        cols = {row[1] for row in await cur.fetchall()}
        if "cards" not in cols or "account_ids" not in cols:
            await db.executescript("""
                DROP TABLE IF EXISTS posts;
                DROP TABLE IF EXISTS publish_results;
                CREATE TABLE posts (
                    id           TEXT PRIMARY KEY,
                    status       TEXT NOT NULL DEFAULT 'pending',
                    cards        TEXT NOT NULL,
                    account_ids  TEXT NOT NULL,
                    scheduled_at TEXT,
                    created_at   TEXT NOT NULL
                );
                CREATE TABLE publish_results (
                    id           TEXT PRIMARY KEY,
                    post_id      TEXT NOT NULL,
                    account_id   TEXT NOT NULL,
                    account_name TEXT,
                    success      INTEGER NOT NULL,
                    remote_id    TEXT,
                    url          TEXT,
                    error        TEXT,
                    published_at TEXT NOT NULL
                );
            """)
            await db.commit()


def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return aiosqlite.connect(DB_PATH)


# ── Accounts ──────────────────────────────────────────────────────────────────

async def create_account(name: str, platform: str, lang: str, credentials: dict) -> dict:
    acc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO accounts (id, name, platform, lang, enabled, credentials, created_at) "
            "VALUES (?,?,?,?,1,?,?)",
            (acc_id, name, platform, lang, json.dumps(credentials), now),
        )
        await db.commit()
    return await get_account(acc_id)


async def get_account(acc_id: str) -> Optional[dict]:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM accounts WHERE id=?", (acc_id,))
        row = await cur.fetchone()
    if not row:
        return None
    r = dict(row)
    r["credentials"] = json.loads(r["credentials"])
    return r


async def list_accounts() -> list:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM accounts ORDER BY created_at ASC")
        rows = [dict(r) for r in await cur.fetchall()]
    for r in rows:
        r["credentials"] = json.loads(r["credentials"])
    return rows


async def update_account(acc_id: str, **fields) -> Optional[dict]:
    if not fields:
        return await get_account(acc_id)
    if "credentials" in fields and isinstance(fields["credentials"], dict):
        fields["credentials"] = json.dumps(fields["credentials"])
    cols = ", ".join(f"{k}=?" for k in fields)
    vals = list(fields.values()) + [acc_id]
    async with get_db() as db:
        await db.execute(f"UPDATE accounts SET {cols} WHERE id=?", vals)
        await db.commit()
    return await get_account(acc_id)


async def delete_account(acc_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM accounts WHERE id=?", (acc_id,))
        await db.commit()


async def toggle_account(acc_id: str) -> Optional[dict]:
    async with get_db() as db:
        await db.execute(
            "UPDATE accounts SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE id=?",
            (acc_id,),
        )
        await db.commit()
    return await get_account(acc_id)


# ── Posts & results ───────────────────────────────────────────────────────────

async def save_post(cards: list, account_ids: list, scheduled_at: Optional[str] = None) -> str:
    post_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    status = "scheduled" if scheduled_at else "pending"
    async with get_db() as db:
        await db.execute(
            "INSERT INTO posts (id, status, cards, account_ids, scheduled_at, created_at) "
            "VALUES (?,?,?,?,?,?)",
            (post_id, status, json.dumps(cards), json.dumps(account_ids), scheduled_at, now),
        )
        await db.commit()
    return post_id


async def save_results(post_id: str, results: list, final_status: str):
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        for r in results:
            await db.execute(
                "INSERT INTO publish_results "
                "(id, post_id, account_id, account_name, success, remote_id, url, error, published_at) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), post_id, r.get("account_id", ""),
                 r.get("account_name", ""), int(r["success"]),
                 r.get("post_id"), r.get("url"), r.get("error"), now),
            )
        await db.execute("UPDATE posts SET status=? WHERE id=?", (final_status, post_id))
        await db.commit()


async def get_history(limit: int = 50) -> list:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM posts ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        posts = [dict(r) for r in await cur.fetchall()]
        for post in posts:
            post["cards"] = json.loads(post["cards"])
            post["account_ids"] = json.loads(post["account_ids"])
            cur2 = await db.execute(
                """SELECT pr.* FROM publish_results pr
                   INNER JOIN (
                     SELECT account_id, MAX(published_at) mp
                     FROM publish_results WHERE post_id=? GROUP BY account_id
                   ) l ON pr.account_id=l.account_id AND pr.published_at=l.mp
                   WHERE pr.post_id=?""",
                (post["id"], post["id"]),
            )
            post["results"] = [dict(r) for r in await cur2.fetchall()]
    return posts


async def cancel_scheduled_post(post_id: str) -> str:
    """Delete a scheduled post. Returns 'deleted' on success, 'not_found' if missing,
    or 'not_scheduled' if it's already past the scheduled state."""
    async with get_db() as db:
        cur = await db.execute("SELECT status FROM posts WHERE id=?", (post_id,))
        row = await cur.fetchone()
        if not row:
            return "not_found"
        if row[0] != "scheduled":
            return "not_scheduled"
        await db.execute("DELETE FROM posts WHERE id=?", (post_id,))
        await db.commit()
    return "deleted"


async def get_scheduled_posts() -> list:
    async with get_db() as db:
        db.row_factory = aiosqlite.Row
        now = datetime.now(timezone.utc).isoformat()
        cur = await db.execute(
            "SELECT * FROM posts WHERE status='scheduled' AND scheduled_at <= ? "
            "ORDER BY scheduled_at ASC",
            (now,),
        )
        posts = [dict(r) for r in await cur.fetchall()]
        for p in posts:
            p["cards"] = json.loads(p["cards"])
            p["account_ids"] = json.loads(p["account_ids"])
    return posts
