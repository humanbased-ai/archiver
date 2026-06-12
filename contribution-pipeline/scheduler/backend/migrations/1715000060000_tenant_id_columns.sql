-- 租户列扩散 (Phase 1 / expand)
--
-- 给所有租户作用域表加 tenant_id UUID NULL。
-- 索引 / NOT NULL / FK / RLS 一律放到 Phase 2 backfill 之后,本批保持 expand-only,
-- 让上线无锁、可回滚、对存量数据零影响。
--
-- node_definitions 故意不加: 节点类型全局共享 (translate / dedup / export 等)。
-- 租户私有节点未来另建 node_overrides 表承载,不污染主表。

-- Up Migration
ALTER TABLE pipelines        ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE items            ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE outbox           ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE attempts         ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE dedup_keys       ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE dataset_records  ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE batches          ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE batch_items      ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE submissions      ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Down Migration
-- 故意不写: 撤回多个 ALTER TABLE 在生产存在数据丢失风险, 需人工评审单表回滚。
