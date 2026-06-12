-- Idempotency-Key 缓存表
-- 客户端在 POST 写入接口带 Idempotency-Key header, 同 key 的重复请求直接返回首次的 response
-- 24h 过期; reconciler 顺手清旧行 (或定时清), 避免无限增长

-- Up Migration
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key            TEXT NOT NULL,                       -- 用户提供的 Idempotency-Key
  scope          TEXT NOT NULL,                       -- 接口路径或自定义命名空间, 防 key 跨 endpoint 串
  request_hash   TEXT NOT NULL,                       -- 请求体 sha256, 同 key 不同 body 视为冲突
  status_code    INT  NOT NULL,
  response_body  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (key, scope)
);
CREATE INDEX IF NOT EXISTS idx_idem_expires ON idempotency_keys (expires_at);

-- Down Migration
-- DROP TABLE idempotency_keys;
