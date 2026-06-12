-- batches.pipeline_version_id (M2): 把 batch 创建时的 pipeline 版本钉到批次上.
-- 同 batch 所有 item 共享同一 pinned version (创建时统一钉), 把这个事实显式化.
--
-- 修复的口径漂移:
--   - 旧: /api/collect/tasks 与 /api/collect/:id/claim 走 pipelines.steps (current)
--         /api/review/:id/decide 与 result-core 走 items.pipeline_version_id (pinned)
--         pipeline 改 schema 后, 列表能看到的 item 点 claim 可能 403, 反之亦然.
--   - 新: 全部路径走 batches.pipeline_version_id (pinned).

-- Up Migration

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS pipeline_version_id UUID
    REFERENCES pipeline_versions(id) ON DELETE RESTRICT;

-- 老数据 backfill: 取 batch 任意一个 item 的 pipeline_version_id (同 batch 共享)
UPDATE batches b
   SET pipeline_version_id = sub.pvid
  FROM (
    SELECT bi.batch_id, MIN(i.pipeline_version_id::text)::uuid AS pvid
      FROM batch_items bi JOIN items i ON i.id = bi.item_id
     GROUP BY bi.batch_id
  ) sub
 WHERE sub.batch_id = b.id AND b.pipeline_version_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_batches_pipeline_version
  ON batches (pipeline_version_id);

-- Down Migration
-- DROP INDEX IF EXISTS idx_batches_pipeline_version;
-- ALTER TABLE batches DROP COLUMN IF EXISTS pipeline_version_id;
