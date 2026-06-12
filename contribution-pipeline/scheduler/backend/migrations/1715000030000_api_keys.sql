-- API key 鉴权表 (服务对服务模式)
-- 设计:
--   - 只存 sha256(key), 不存明文
--   - revoked_at 软删, 留审计痕迹
--   - last_used_at 异步更新 (避免每次请求都写一笔)

-- Up Migration
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                       -- 调用方标识 (如 "worker-translate", "business-internal")
  key_hash      TEXT NOT NULL UNIQUE,                -- sha256(key) hex
  scope         TEXT NOT NULL DEFAULT 'admin',       -- 预留: admin / readonly / 具体 user_id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,                         -- NULL = 永不过期
  revoked_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys (key_hash) WHERE revoked_at IS NULL;

-- Down Migration
-- DROP TABLE api_keys;
