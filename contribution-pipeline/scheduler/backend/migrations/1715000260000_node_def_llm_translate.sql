-- node_definitions: 注册 llm_translate 节点能力
-- 三套参考实现共用这一行:
--   Path A: scheduler/backend/src/drivers/llm-translate.ts (in-process TS driver, autoworker 内置)
--   Path B: scheduler/services/llm-translate/             (HTTP driver, step.params.driver=http)
--   Path C: scheduler/workers/llm-translate-worker/       (独立 worker, 自带 lease/result 循环)
-- 在 pipeline step.params 里通过有无 "driver":"http" + url 字段切换 A/B; C 跟 A 共用步骤配置但靠
-- 独立 worker 进程接活, 不依赖 autoworker.

-- Up Migration

INSERT INTO node_definitions(key, version, display_name, params_schema, idempotent,
                             default_timeout_ms, default_max_attempts, manual)
VALUES (
  'llm_translate',
  '1.0',
  '大模型翻译',
  '{
    "type": "object",
    "required": ["targetLang"],
    "properties": {
      "model":      { "type": "string", "description": "Anthropic model id, e.g. claude-haiku-4-5-20251001" },
      "targetLang": { "type": "string", "description": "target BCP-47 lang code, e.g. zh / en / ja" },
      "driver":     { "type": "string", "enum": ["http"], "description": "走 Path B 时设为 http, 否则留空走 A/C" },
      "url":        { "type": "string", "description": "driver=http 时必填, 必须在 SANDBOX_URL_ALLOWLIST 内" },
      "timeoutMs":  { "type": "number", "minimum": 1000, "maximum": 120000, "description": "driver=http 时单次调用超时" }
    }
  }'::jsonb,
  TRUE,
  60000,
  3,
  FALSE
)
ON CONFLICT (key, version) DO NOTHING;

-- Down Migration
-- DELETE FROM node_definitions WHERE key = 'llm_translate' AND version = '1.0';
