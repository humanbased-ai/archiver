-- Pipeline 版本化约束收紧 (P0-D contract)
--
-- 假定 1715000130000 已 backfill 完毕:
--   - 所有 pipelines.current_version_id 非 NULL
--   - 所有 items.pipeline_version_id 非 NULL

-- Up Migration

ALTER TABLE pipelines
  ALTER COLUMN current_version_id SET NOT NULL;

ALTER TABLE items
  ALTER COLUMN pipeline_version_id SET NOT NULL;

-- Down Migration
-- ALTER TABLE pipelines ALTER COLUMN current_version_id DROP NOT NULL;
-- ALTER TABLE items     ALTER COLUMN pipeline_version_id DROP NOT NULL;
