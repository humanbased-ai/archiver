-- pipelines.status / batches.status: 暂停/恢复支持
--
-- 语义:
--   pipelines.status='paused' → 硬停 (autoworker 不再 lease 该 pipeline 的 outbox,
--     新 claim 拒, review 决定也拒; 已 leased 的 run 仍可 post /result 优雅走完)
--   batches.status='paused'   → 软停 (业务层不让新认领该批次的 collect 任务,
--     已在飞行的 item 继续被 autoworker 处理 — outbox 没 batch_id, 拦不住中间步)
--
-- 都是可恢复 (active <-> paused). archived 留给未来 "永久关闭" 用, 本批不实现.

-- Up Migration

ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','archived'));

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','archived'));

-- lease 热路径过滤索引: pipelines.status='active' 才参与
CREATE INDEX IF NOT EXISTS idx_pipelines_active
  ON pipelines (task_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_batches_active
  ON batches (id) WHERE status = 'active';

-- Down Migration
-- ALTER TABLE pipelines DROP COLUMN IF EXISTS status;
-- ALTER TABLE batches   DROP COLUMN IF EXISTS status;
