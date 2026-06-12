-- 租户化索引 (Phase 2 / contract-3: indexes for tenant-prefixed queries)
--
-- 原则:
--   - 业务读路径 (按租户列表 / 按租户 + 时间) 加 (tenant_id, ...) 复合索引
--   - 系统读路径 (autoworker lease / reconciler scan / 单 PK 查找) 不动:
--     这些走 BYPASSRLS, 用 nodeKey/expected_by/run_id 直接定位
--   - 已存在的部分索引 (idx_outbox_lease 等) 保留, 因为 lease 路径仍是 system 模式
--
-- 仅添加明显有 ROI 的索引, 不预先 over-index; 后续按 pg_stat_statements 再补。

-- Up Migration

-- 列表 / 看板按租户聚合
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_updated
  ON pipelines (tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_tenant_created
  ON items (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_batches_tenant_created
  ON batches (tenant_id, created_at DESC);

-- 业务层 stuck / DLQ 视图按租户过滤
CREATE INDEX IF NOT EXISTS idx_items_tenant_stuck
  ON items (tenant_id, updated_at DESC)
  WHERE current_step = 'stuck';

-- dataset_records: 成品库列表按租户分页
CREATE INDEX IF NOT EXISTS idx_records_tenant_created
  ON dataset_records (tenant_id, created_at DESC);

-- submissions: "某用户在某租户" 跨批次查询 (成绩单)
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_user
  ON submissions (tenant_id, user_id, created_at DESC);

-- attempts: 审计 / 监控按租户聚合
CREATE INDEX IF NOT EXISTS idx_attempts_tenant_finished
  ON attempts (tenant_id, finished_at DESC);

-- Down Migration
-- DROP INDEX 各索引; CONCURRENTLY 视情况
