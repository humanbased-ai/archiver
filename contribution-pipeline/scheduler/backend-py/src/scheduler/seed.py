"""
seed: 一次性把示例数据归零再灌入 (跑 system 模式跳 RLS)。
默认租户专用; 真实租户的数据由产品流程创建。

与 backend/src/seed.ts 1:1.

用法:
    python -m scheduler.seed
    SEED_DEMO=false python -m scheduler.seed    # 跳过 demo 批次 / demo 租户
"""
from __future__ import annotations
import asyncio
import json
import logging
import os
import sys
from typing import Any

import asyncpg
from dotenv import load_dotenv

from .auth import hash_key
from .autoworker import bootstrap_drivers
from .db import init_pool, close_pool, as_system

logger = logging.getLogger(__name__)

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"

# 演示用的额外租户 — 给 web 前端的 "tenant switcher" 用. 真实生产环境通过
# tenants_create / keys_create CLI 配租户和 key, 这里的明文 dev key 只在
# AUTH_REQUIRED=false 或 DEV_TENANT_PICKER=true 时通过 /dev/tenants 暴露.
DEMO_TENANTS: list[dict[str, str]] = [
    {"slug": "acme",   "name": "Acme Corp",  "dev_key": "dev-acme-admin-2026"},
    {"slug": "globex", "name": "Globex Inc", "dev_key": "dev-globex-admin-2026"},
]


async def _amain() -> None:
    await init_pool()
    try:
        # autoworker driver-owned 节点 (dedup/export/script/llm_translate/compute) 由 bootstrap_drivers
        # 走 auto-upsert 写入, 跟 autoworker 启动同一路径 — driver 是唯一真相源, seed 自包含.
        # ANTHROPIC_API_KEY 缺时 llm-translate 不注册 → 行不被 upsert (生产意图: 没 key 别拉队列).
        await bootstrap_drivers()
        print("[seed] autoworker driver-owned node_definitions upserted via auto-upsert")

        await as_system(seed_all)
    finally:
        await close_pool()


async def seed_all(conn: asyncpg.Connection) -> None:
    # ====== 1. 非 autoworker 节点 (ingest/review/translate/annotate) ======
    nodes: list[dict[str, Any]] = [
        {
            "key": "ingest",
            "version": "1.0",
            "display_name": "采集 Ingest",
            "params_schema": {
                "type": "object",
                "properties": {"source": {"type": "string", "enum": ["manual", "s3", "form"]}},
            },
            "idempotent": True,
            "default_timeout_ms": 10_000,
            "default_max_attempts": 3,
            "manual": False,
        },
        {
            "key": "review",
            "version": "1.0",
            "display_name": "审核 Review (人工)",
            "params_schema": {"type": "object", "properties": {"rubric": {"type": "string", "default": "default"}}},
            "idempotent": False,
            "default_timeout_ms": 30 * 60 * 1000,
            "default_max_attempts": 1,
            "manual": True,
        },
        {
            "key": "translate",
            "version": "1.0",
            "display_name": "翻译 Translate",
            "params_schema": {
                "type": "object",
                "properties": {
                    "model": {"type": "string", "default": "claude-haiku"},
                    "targetLang": {"type": "string", "default": "zh"},
                },
            },
            "idempotent": True,
            "default_timeout_ms": 30_000,
            "default_max_attempts": 3,
            "manual": False,
        },
        {
            "key": "annotate",
            "version": "1.0",
            "display_name": "标注 Annotate (人工)",
            "params_schema": {"type": "object", "properties": {"labelSchema": {"type": "string", "default": "default"}}},
            "idempotent": False,
            "default_timeout_ms": 30 * 60 * 1000,
            "default_max_attempts": 1,
            "manual": True,
        },
    ]
    for n in nodes:
        await conn.execute(
            """INSERT INTO node_definitions
                 (key, version, display_name, params_schema, idempotent,
                  default_timeout_ms, default_max_attempts, manual)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (key, version) DO UPDATE SET
                 display_name         = EXCLUDED.display_name,
                 params_schema        = EXCLUDED.params_schema,
                 idempotent           = EXCLUDED.idempotent,
                 default_timeout_ms   = EXCLUDED.default_timeout_ms,
                 default_max_attempts = EXCLUDED.default_max_attempts,
                 manual               = EXCLUDED.manual""",
            n["key"], n["version"], n["display_name"], n["params_schema"],
            n["idempotent"], n["default_timeout_ms"], n["default_max_attempts"], n["manual"],
        )
    print(f"[seed] {len(nodes)} non-autoworker node_definitions upserted")

    # ====== 2. 清场 ======
    templates = build_templates()
    keep = [t["name"] for t in templates]
    await cleanup_before(conn, keep)

    # ====== 3. 模板 + 项目 ======
    template_ids: dict[str, str] = {}
    for t in templates:
        row = await conn.fetchrow(
            """INSERT INTO pipeline_templates (tenant_id, name, description, steps, layout)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (tenant_id, name) DO UPDATE SET
                 description = EXCLUDED.description,
                 steps       = EXCLUDED.steps,
                 layout      = EXCLUDED.layout,
                 updated_at  = NOW()
               RETURNING id""",
            DEFAULT_TENANT_ID, t["name"], t.get("description"), t["steps"], t.get("layout"),
        )
        template_ids[t["name"]] = row["id"]
    print(f"[seed] {len(templates)} pipeline_templates upserted")

    for t in templates:
        await ensure_project_from_template(conn, t, template_ids[t["name"]])

    # ====== 3.5 backfill: 修历史 review 步骤缺 reviewedStepKey ======
    await backfill_reviewed_step_key(conn)

    # ====== 4. demo 批次 ======
    if os.environ.get("SEED_DEMO", "").lower() != "false":
        for t in templates:
            if t.get("demo_batch"):
                await ensure_demo_batch(conn, t["name"], t["demo_batch"]["name"], t["demo_batch"]["target"])
        # ====== 5. 额外 demo 租户 + admin key ======
        await seed_demo_tenants(conn)
    else:
        print("[seed] SEED_DEMO=false, demo 批次 / demo 租户跳过")


# ─────────────────────────────────────────────────────────────────────
async def seed_demo_tenants(conn: asyncpg.Connection) -> None:
    r = await conn.fetchrow("SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'")
    if not r:
        print("[seed] tenant_admin role 缺失, demo 租户跳过 (需要先跑 rbac migration)")
        return
    tenant_admin_role_id = r["id"]

    user_facing = [t for t in build_templates() if t.get("demo_batch")]

    for t in DEMO_TENANTS:
        tenant = await conn.fetchrow(
            """INSERT INTO tenants (slug, name, plan) VALUES ($1, $2, 'standard')
               ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
               RETURNING id""",
            t["slug"], t["name"],
        )
        tid = tenant["id"]

        h = hash_key(t["dev_key"])
        key = await conn.fetchrow(
            """INSERT INTO api_keys (name, key_hash, scope, tenant_id)
               VALUES ($1, $2, 'admin', $3)
               ON CONFLICT (key_hash) DO UPDATE SET
                 name       = EXCLUDED.name,
                 scope      = EXCLUDED.scope,
                 tenant_id  = EXCLUDED.tenant_id,
                 revoked_at = NULL
               RETURNING id""",
            f"{t['slug']}-admin-demo", h, tid,
        )

        await conn.execute(
            """INSERT INTO api_key_roles (api_key_id, role_id) VALUES ($1, $2)
               ON CONFLICT DO NOTHING""",
            key["id"], tenant_admin_role_id,
        )

        for tpl in user_facing:
            await conn.execute(
                """INSERT INTO pipeline_templates (tenant_id, name, description, steps, layout)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (tenant_id, name) DO UPDATE SET
                     description = EXCLUDED.description,
                     steps       = EXCLUDED.steps,
                     layout      = EXCLUDED.layout,
                     updated_at  = NOW()""",
                tid, tpl["name"], tpl.get("description"), tpl["steps"], tpl.get("layout"),
            )

        print(f"[seed] demo tenant {t['slug']} ({tid}) ready, {len(user_facing)} 模板已注入")


# ─────────────────────────────────────────────────────────────────────
async def cleanup_before(conn: asyncpg.Connection, keep_names: list[str]) -> None:
    # 4.0 删非主例模板
    tpl_gone = await conn.fetch(
        """DELETE FROM pipeline_templates
           WHERE tenant_id = $1 AND name <> ALL($2::text[])
           RETURNING name""",
        DEFAULT_TENANT_ID, keep_names,
    )
    if tpl_gone:
        names = ", ".join(r["name"] for r in tpl_gone)
        print(f"[seed] cleaned {len(tpl_gone)} non-demo template(s): {names}")

    # 4.a 删非主例 pipeline
    non_keep = await conn.fetch(
        """SELECT task_id, name FROM pipelines
           WHERE tenant_id = $1 AND name <> ALL($2::text[])""",
        DEFAULT_TENANT_ID, keep_names,
    )
    if non_keep:
        await conn.execute(
            "DELETE FROM pipelines WHERE task_id = ANY($1::uuid[])",
            [r["task_id"] for r in non_keep],
        )
        preview = ", ".join(r["name"] for r in non_keep[:5])
        suffix = "..." if len(non_keep) > 5 else ""
        print(f"[seed] cleaned {len(non_keep)} non-demo pipeline(s): {preview}{suffix}")

    # 4.b 主例 pipeline 保留, 清下面的 batches / items / dedup / records / pv
    keep_rows = await conn.fetch(
        """SELECT task_id FROM pipelines
           WHERE tenant_id = $1 AND name = ANY($2::text[])""",
        DEFAULT_TENANT_ID, keep_names,
    )
    if keep_rows:
        ids = [r["task_id"] for r in keep_rows]
        await conn.execute("DELETE FROM batches         WHERE task_id = ANY($1::uuid[])", ids)
        await conn.execute("DELETE FROM items           WHERE task_id = ANY($1::uuid[])", ids)
        await conn.execute("DELETE FROM dedup_keys      WHERE task_id = ANY($1::uuid[])", ids)
        await conn.execute("DELETE FROM dataset_records WHERE task_id = ANY($1::uuid[])", ids)
        await conn.execute("UPDATE pipelines SET current_version_id = NULL WHERE task_id = ANY($1::uuid[])", ids)
        await conn.execute("DELETE FROM pipeline_versions WHERE task_id = ANY($1::uuid[])", ids)
        print(f"[seed] cleaned demo state for {len(keep_rows)} kept project(s) (pv reset)")


# ─────────────────────────────────────────────────────────────────────
def build_templates() -> list[dict[str, Any]]:
    collect_form_schema = {
        "type": "object",
        "title": "数据采集",
        "required": ["title", "url"],
        "properties": {
            "title": {"type": "string", "title": "标题"},
            "url":   {"type": "string", "title": "URL", "description": "唯一资源定位 (用作去重 key)"},
            "category": {
                "type": "string", "title": "分类", "default": "news",
                "oneOf": [
                    {"const": "news",  "title": "新闻"},
                    {"const": "blog",  "title": "博客"},
                    {"const": "paper", "title": "论文"},
                    {"const": "other", "title": "其他"},
                ],
            },
            "content":  {"type": "string",  "title": "正文"},
            "verified": {"type": "boolean", "title": "已核验", "default": False},
        },
    }
    collect_form_ui = {
        "content":  {"ui:widget": "textarea", "ui:options": {"rows": 4}},
        "category": {"ui:widget": "radio",    "ui:options": {"inline": True}},
    }

    image_form_schema = {
        "type": "object",
        "title": "图片标注",
        "required": ["image", "label"],
        "properties": {
            "image": {"type": "string", "title": "图片", "description": "建议 < 50 KB (demo 受 step 输出上限 64KiB 约束)"},
            "label": {
                "type": "string", "title": "是否符合",
                "oneOf": [
                    {"const": "yes", "title": "✓ 符合"},
                    {"const": "no",  "title": "✗ 不符合"},
                ],
            },
            "note": {"type": "string", "title": "备注 (可选)"},
        },
    }
    image_form_ui = {
        "image": {"ui:widget": "image-upload", "ui:options": {"placeholder": "点击上传待标注图片"}},
        "label": {"ui:widget": "radio",        "ui:options": {"inline": True}},
        "note":  {"ui:widget": "textarea",     "ui:options": {"rows": 2}},
    }

    script_steps: list[dict[str, Any]] = [
        {
            "key": "ingest", "nodeKey": "script", "label": "脚本预处理",
            "params": {
                "timeoutMs": 2000, "memoryMb": 32,
                "script": "\n".join([
                    "const text = String(inputs.text || '');",
                    "const words = text.trim().split(/\\s+/).filter(Boolean);",
                    "let h = 0; for (let i = 0; i < text.length; i++) h = ((h<<5)-h+text.charCodeAt(i))|0;",
                    "return {",
                    "  normalized: text.toLowerCase(),",
                    "  wordCount: words.length,",
                    "  charCount: text.length,",
                    "  hash: (h>>>0).toString(16),",
                    "};",
                ]),
            },
            "inputs": {"text": "{{payload.text}}"},
        },
        {
            "key": "review", "nodeKey": "review", "label": "人审",
            "params": {"rubric": "default"},
            "routes": {"on": "decision", "cases": {"approved": "next", "rejected": "done"}},
        },
        {"key": "store", "nodeKey": "export", "label": "入库", "params": {"format": "json"}},
    ]

    return [
        {
            "name": "示例: 采集去重审核入库",
            "description": "通用文本采集 + URL 字段去重 + 人工审核 + 入库",
            "demo_batch": {"name": "演示批次", "target": 10},
            "steps": [
                {
                    "key": "ingest", "nodeKey": "ingest", "label": "采集",
                    "params": {
                        "source": "form", "schema": collect_form_schema, "uiSchema": collect_form_ui,
                        "max_concurrent_per_user": 2, "max_total_per_user": 3,
                        "disallowedFromSteps": ["review"],
                    },
                },
                {
                    "key": "dedup", "nodeKey": "dedup", "label": "去重",
                    "params": {"algo": "field-hash", "dedupFields": ["url"]},
                    "routes": {
                        "on": "decision",
                        "cases": {"keep": "next", "duplicate": {"goto": "ingest", "maxLoops": 3}},
                    },
                },
                {
                    "key": "review", "nodeKey": "review", "label": "审核",
                    "params": {
                        "rubric": "default", "schema": collect_form_schema, "uiSchema": collect_form_ui,
                        "reviewedStepKey": "ingest",
                        "disallowedFromSteps": ["ingest"],
                    },
                    "routes": {
                        "on": "decision",
                        "cases": {"approved": "next", "rejected": {"goto": "ingest", "maxLoops": 3}},
                    },
                },
                {"key": "store", "nodeKey": "export", "label": "入库", "params": {"format": "json"}},
            ],
            "layout": {
                "positions": {
                    "ingest": {"x": 100, "y": 200}, "dedup": {"x": 360, "y": 200},
                    "review": {"x": 620, "y": 200}, "store": {"x": 880, "y": 200},
                },
            },
        },
        {
            "name": "示例: 图片标注 yes/no",
            "description": "上传图片 + 二元标注 → 人工审核 → 入库",
            "demo_batch": {"name": "演示批次", "target": 5},
            "steps": [
                {
                    "key": "annotate", "nodeKey": "ingest", "label": "标注",
                    "params": {
                        "source": "form", "schema": image_form_schema, "uiSchema": image_form_ui,
                        "max_concurrent_per_user": 2, "max_total_per_user": 5,
                    },
                },
                {
                    "key": "review", "nodeKey": "review", "label": "审核",
                    "params": {
                        "rubric": "default", "schema": image_form_schema, "uiSchema": image_form_ui,
                        "reviewedStepKey": "annotate",
                    },
                    "routes": {
                        "on": "decision",
                        "cases": {"approved": "next", "rejected": {"goto": "annotate", "maxLoops": 3}},
                    },
                },
                {"key": "store", "nodeKey": "export", "label": "入库", "params": {"format": "json"}},
            ],
            "layout": {
                "positions": {
                    "annotate": {"x": 100, "y": 200}, "review": {"x": 380, "y": 200}, "store": {"x": 660, "y": 200},
                },
            },
        },
        {
            "name": "示例: 脚本预处理",
            "description": "node:vm 沙箱内跑用户脚本预处理 (供 e2e/X1 使用)",
            "steps": script_steps,
            "layout": {
                "positions": {
                    "ingest": {"x": 100, "y": 200}, "review": {"x": 380, "y": 200}, "store": {"x": 660, "y": 200},
                },
            },
        },
    ]


# ─────────────────────────────────────────────────────────────────────
async def backfill_reviewed_step_key(conn: asyncpg.Connection) -> None:
    for table in ("pipeline_versions", "pipelines"):
        rows = await conn.fetch(f"SELECT * FROM {table}")
        patched = 0
        pk_col = "id" if table == "pipeline_versions" else "task_id"
        for r in rows:
            steps = r["steps"]
            if not isinstance(steps, list):
                continue
            dirty = False
            new_steps: list[Any] = []
            for idx, step in enumerate(steps):
                if not isinstance(step, dict) or step.get("nodeKey") != "review":
                    new_steps.append(step); continue
                params = step.get("params") or {}
                cur = params.get("reviewedStepKey") if isinstance(params.get("reviewedStepKey"), str) else None
                best_key: str | None = None
                for j in range(idx - 1, -1, -1):
                    p = steps[j].get("params") or {}
                    if p.get("schema") is not None:
                        best_key = steps[j].get("key"); break
                if not best_key and idx > 0:
                    best_key = steps[idx - 1].get("key")
                if not best_key:
                    new_steps.append(step); continue
                if cur == best_key:
                    new_steps.append(step); continue
                # 当前指向的 step 也有 schema → 不动 (尊重 admin 手工指定)
                if cur:
                    cur_step = next((s for s in steps if isinstance(s, dict) and s.get("key") == cur), None)
                    cur_params = (cur_step or {}).get("params") or {}
                    if cur_params.get("schema") is not None:
                        new_steps.append(step); continue
                dirty = True
                new_steps.append({**step, "params": {**params, "reviewedStepKey": best_key}})
            if not dirty:
                continue
            await conn.execute(
                f"UPDATE {table} SET steps = $1 WHERE {pk_col} = $2",
                new_steps, r[pk_col],
            )
            patched += 1
        if patched > 0:
            print(f"[seed] backfilled reviewedStepKey on {patched} rows in {table}")


# ─────────────────────────────────────────────────────────────────────
async def ensure_project_from_template(conn: asyncpg.Connection, t: dict[str, Any], template_id: str) -> None:
    existing = await conn.fetch(
        "SELECT task_id, current_version_id FROM pipelines WHERE name = $1 AND tenant_id = $2",
        t["name"], DEFAULT_TENANT_ID,
    )
    steps  = t["steps"]
    layout = t.get("layout")
    forms  = extract_forms(steps)
    forms_etag = json_hash(forms)

    if not existing:
        row = await conn.fetchrow(
            """INSERT INTO pipelines (tenant_id, name, steps, layout, template_id)
               VALUES ($1, $2, $3, $4, $5) RETURNING task_id""",
            DEFAULT_TENANT_ID, t["name"], steps, layout, template_id,
        )
        task_id = row["task_id"]
        inserted = True
    else:
        task_id = existing[0]["task_id"]
        await conn.execute(
            """UPDATE pipelines
               SET steps       = $1,
                   layout      = $2,
                   template_id = $3,
                   updated_at  = NOW()
               WHERE task_id   = $4""",
            steps, layout, template_id, task_id,
        )
        inserted = False

    max_v_row = await conn.fetchrow(
        "SELECT COALESCE(MAX(version), 0) AS v FROM pipeline_versions WHERE task_id = $1",
        task_id,
    )
    max_v = max_v_row["v"]
    pv = await conn.fetchrow(
        """INSERT INTO pipeline_versions
             (task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'system:seed')
           RETURNING id""",
        task_id, DEFAULT_TENANT_ID, max_v + 1, steps, layout, forms, forms_etag,
    )
    await conn.execute("UPDATE pipelines SET current_version_id = $1 WHERE task_id = $2", pv["id"], task_id)
    print(f"[seed] project \"{t['name']}\" {'inserted' if inserted else 'updated'} (v{max_v + 1})")


async def ensure_demo_batch(conn: asyncpg.Connection, project_name: str, batch_name: str, target: int) -> None:
    pipe = await conn.fetchrow(
        """SELECT task_id, current_version_id FROM pipelines
           WHERE name = $1 AND tenant_id = $2 LIMIT 1""",
        project_name, DEFAULT_TENANT_ID,
    )
    if not pipe or not pipe["current_version_id"]:
        print(f"[seed] demo batch skipped (project \"{project_name}\" not ready)")
        return

    pv = await conn.fetchrow(
        "SELECT steps FROM pipeline_versions WHERE id = $1",
        pipe["current_version_id"],
    )
    if not pv or not pv["steps"]:
        return
    first_step = pv["steps"][0]

    batch = await conn.fetchrow(
        """INSERT INTO batches (tenant_id, task_id, name, target)
           VALUES ($1, $2, $3, $4) RETURNING id""",
        DEFAULT_TENANT_ID, pipe["task_id"], batch_name, target,
    )
    for _ in range(target):
        it = await conn.fetchrow(
            """INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope)
               VALUES ($1, $2, $3, $4, $5) RETURNING id""",
            DEFAULT_TENANT_ID, pipe["task_id"], pipe["current_version_id"], first_step["key"],
            {"payload": {}, "outputs": {}, "tags": {}},
        )
        await conn.execute(
            """INSERT INTO batch_items (tenant_id, batch_id, item_id)
               VALUES ($1, $2, $3)""",
            DEFAULT_TENANT_ID, batch["id"], it["id"],
        )
        await conn.execute(
            """INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
               VALUES ($1, $2, $3, $4, $5, 'pending', 1)""",
            DEFAULT_TENANT_ID, it["id"], pipe["task_id"], first_step["key"], first_step["nodeKey"],
        )
    print(f"[seed] demo batch \"{batch_name}\" created for \"{project_name}\" (target={target})")


# ─── helpers ───────────────────────────────────────────────────────
def extract_forms(steps: list[Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for s in steps:
        if not isinstance(s, dict):
            continue
        params = s.get("params") or {}
        schema = params.get("schema")
        ui_schema = params.get("uiSchema")
        if schema is not None or ui_schema is not None:
            out[s["key"]] = {"schema": schema, "uiSchema": ui_schema}
    return out


def json_hash(v: Any) -> str:
    """DJB2-ish 32-bit hash. 仅做 etag 用, 不要求和 Node 端字节一致."""
    s = json.dumps(v, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    h = 5381
    for c in s:
        h = (((h << 5) + h) ^ ord(c)) & 0xFFFFFFFF
    return f"{h:08x}"


def main() -> None:
    load_dotenv()
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
    try:
        asyncio.run(_amain())
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
