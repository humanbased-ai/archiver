-- node_definitions: 加 ui_schema + presets 两列, 三层配置切分 (方案 2 最小验证, 仅 llm_translate)
--
-- 三层语义:
--   params_schema  worker 运行时收到的 step.params 形态 + 类型校验 (现有列, 行为不变)
--   ui_schema      前端编辑器渲染指示 (widget/分组/敏感字段标记); 调度核心不解读
--   presets        节点作者预设: defaults(兜底)/constants+pin(锁死)/secrets(env 引用)
--
-- 老节点 (ingest/dedup/...) 这两列为 NULL — 前端在 v1 期间对未填的节点退化到老行为 (按 params_schema 渲染),
-- 后续按需补三层 (方案 1 全面铺时一并做).

-- Up Migration

ALTER TABLE node_definitions
  ADD COLUMN IF NOT EXISTS ui_schema JSONB,
  ADD COLUMN IF NOT EXISTS presets   JSONB;

-- 填 llm_translate v1.0 的三层内容
-- 必须与 backend/src/drivers/llm-translate.ts 的 nodeDefinition 常量保持同步;
-- 方案 1 阶段会把 driver 启动时 upsert 这条数据, 消除两处维护漂移.
UPDATE node_definitions SET
  ui_schema = '{
    "groups": [
      { "id": "basic",    "label": "基础", "fields": ["targetLang", "model"] },
      { "id": "advanced", "label": "高级", "fields": ["timeoutMs"] }
    ],
    "fields": {
      "targetLang": { "widget": "select", "options": [["zh","中文"],["en","英文"],["ja","日文"],["ko","韩文"],["fr","法文"],["de","德文"]] },
      "model":      { "widget": "select", "optionsFrom": "anthropic.models" },
      "timeoutMs":  { "widget": "slider", "min": 1000, "max": 120000, "step": 1000, "hint": "driver=http 时单次调用超时" }
    }
  }'::jsonb,
  presets = '{
    "defaults": {
      "model":     "claude-haiku-4-5-20251001",
      "timeoutMs": 60000
    },
    "constants": {
      "systemPrompt": "Translate the following text to {{targetLang}}. Output ONLY the translation, no preface, no quotes.",
      "maxTokens":    2048
    },
    "pin": ["systemPrompt", "maxTokens"],
    "secrets": {
      "anthropicKey": { "envVar": "ANTHROPIC_API_KEY" }
    }
  }'::jsonb
WHERE key = 'llm_translate' AND version = '1.0';

-- Down Migration
-- UPDATE node_definitions SET ui_schema = NULL, presets = NULL WHERE key = 'llm_translate' AND version = '1.0';
-- ALTER TABLE node_definitions DROP COLUMN IF EXISTS ui_schema, DROP COLUMN IF EXISTS presets;
