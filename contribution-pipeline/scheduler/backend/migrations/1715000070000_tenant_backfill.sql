-- 租户列回填 (Phase 2 / contract-1: backfill)
--
-- 把 Phase 1 留下的 NULL tenant_id 全部写为 default 租户 id,
-- 之后再 SET NOT NULL + FK (1715000080000) + RLS (1715000100000)。
--
-- 幂等: 多次执行结果一致, 已有非 NULL 值的行不动。
-- 性能: 现有 dev/staging 体量下走全表扫描即可; 真生产上线前若行数大,
--      应改成批量 (cursor by id LIMIT N) 分批 commit, 避免长事务锁。

-- Up Migration
DO $$
DECLARE
  default_tenant CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  UPDATE api_keys         SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE pipelines        SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE items            SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE outbox           SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE attempts         SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE dedup_keys       SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE dataset_records  SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE batches          SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE batch_items      SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE submissions      SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  UPDATE idempotency_keys SET tenant_id = default_tenant WHERE tenant_id IS NULL;
END $$;

-- Down Migration
-- 不写 down: 回填后回不到 NULL 才是预期, 真要 rollback 应 DROP COLUMN (上一批迁移)
