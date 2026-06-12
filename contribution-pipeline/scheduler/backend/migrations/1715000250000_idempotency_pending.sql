-- M5 严格并发去重: idempotency_keys 加 status (pending/completed).
-- preHandler 拿 advisory lock 后 INSERT 占位 'pending'; onSend 收尾 UPDATE → 'completed'.
-- 同 key 并发请求第二个会看到 'pending' 行, 返 IDEMPOTENCY_IN_PROGRESS, 让客户端 retry.

-- Up Migration

ALTER TABLE idempotency_keys
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending','completed'));

-- pending 时还没响应; status_code/response_body 改可空 (老完成行保持非 NULL 不变)
ALTER TABLE idempotency_keys ALTER COLUMN status_code DROP NOT NULL;
ALTER TABLE idempotency_keys ALTER COLUMN response_body DROP NOT NULL;

-- pending 行 5 分钟内未完成视为 stuck, 后续请求可覆盖. (无 schema 变化, 仅约定.)

-- Down Migration
-- ALTER TABLE idempotency_keys DROP COLUMN IF EXISTS status;
-- ALTER TABLE idempotency_keys ALTER COLUMN status_code SET NOT NULL;
