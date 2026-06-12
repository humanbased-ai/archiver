"""Auto-upsert: 启动时把 drivers 携带的 nodeDefinition UPSERT 到 node_definitions 表."""
from __future__ import annotations
import json

from ..db import as_system
from .registry import collected_node_definitions


async def upsert_collected_node_definitions() -> None:
    defs = collected_node_definitions()
    if not defs:
        return
    await as_system(_upsert_all(defs))


def _upsert_all(defs: list[dict]) -> ...:  # type: ignore[return]
    async def _run(conn):  # type: ignore[no-untyped-def]
        for d in defs:
            await _upsert_one(conn, d)
    return _run


async def _upsert_one(conn, d: dict) -> None:  # type: ignore[no-untyped-def]
    # status 故意不在 UPDATE 列 — admin archive/activate 写入的状态不能被重启覆盖
    await conn.execute(
        """
        INSERT INTO node_definitions
          (key, version, display_name, params_schema, ui_schema, presets,
           inputs_schema, outputs_schema, category, run_mode, description,
           idempotent, default_timeout_ms, default_max_attempts, manual,
           examples, supports_dry_run, outputs_validation)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (key, version) DO UPDATE SET
          display_name         = EXCLUDED.display_name,
          params_schema        = EXCLUDED.params_schema,
          ui_schema            = EXCLUDED.ui_schema,
          presets              = EXCLUDED.presets,
          inputs_schema        = EXCLUDED.inputs_schema,
          outputs_schema       = EXCLUDED.outputs_schema,
          category             = EXCLUDED.category,
          run_mode             = EXCLUDED.run_mode,
          description          = EXCLUDED.description,
          idempotent           = EXCLUDED.idempotent,
          default_timeout_ms   = EXCLUDED.default_timeout_ms,
          default_max_attempts = EXCLUDED.default_max_attempts,
          manual               = EXCLUDED.manual,
          examples             = EXCLUDED.examples,
          supports_dry_run     = EXCLUDED.supports_dry_run,
          outputs_validation   = EXCLUDED.outputs_validation
        """,
        d.get("key"),
        d.get("version"),
        d.get("displayName"),
        json.dumps(d.get("paramsSchema", {})),
        json.dumps(d["uiSchema"]) if d.get("uiSchema") else None,
        json.dumps(d["presets"]) if d.get("presets") else None,
        json.dumps(d["inputsSchema"]) if d.get("inputsSchema") else None,
        json.dumps(d["outputsSchema"]) if d.get("outputsSchema") else None,
        d.get("category"),
        d.get("runMode"),
        d.get("description"),
        bool(d.get("idempotent", False)),
        int(d.get("defaultTimeoutMs", 30000)),
        int(d.get("defaultMaxAttempts", 3)),
        bool(d.get("manual", False)),
        json.dumps(d["examples"]) if d.get("examples") else None,
        bool(d.get("supportsDryRun", False)),
        d.get("outputsValidation", "strict"),
    )
