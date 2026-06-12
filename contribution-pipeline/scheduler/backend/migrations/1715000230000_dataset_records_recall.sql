-- M6: dataset_records 召回支持. 已通过的数据出问题时, 不物理删除, 改成 status='recalled'
-- 留审计痕迹, 同时把 item 钉回指定 step 重跑.

-- Up Migration

ALTER TABLE dataset_records
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','recalled')),
  ADD COLUMN IF NOT EXISTS recalled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recalled_reason  TEXT,
  ADD COLUMN IF NOT EXISTS recalled_by      TEXT;

-- 老的唯一约束 (item_id) 不允许 recall 后重做产生新行. 改成"同 item 同时只能有一条 active".
-- 用 partial unique index 替代 column-level UNIQUE.
ALTER TABLE dataset_records DROP CONSTRAINT IF EXISTS dataset_records_item_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dataset_records_item_active
  ON dataset_records (item_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_dataset_records_status
  ON dataset_records (task_id, status, created_at DESC);

-- Down Migration
-- DROP INDEX IF EXISTS uniq_dataset_records_item_active;
-- DROP INDEX IF EXISTS idx_dataset_records_status;
-- ALTER TABLE dataset_records DROP COLUMN IF EXISTS status;
-- ALTER TABLE dataset_records DROP COLUMN IF EXISTS recalled_at;
-- ALTER TABLE dataset_records DROP COLUMN IF EXISTS recalled_reason;
-- ALTER TABLE dataset_records DROP COLUMN IF EXISTS recalled_by;
