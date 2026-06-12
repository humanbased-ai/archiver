-- 租户列收紧 (Phase 2 / contract-2: NOT NULL + FK)
--
-- 假定 1715000070000 已 backfill 完毕, 所有 tenant_id 非 NULL。
-- 本迁移把列变为 NOT NULL + 加 FK 引用 tenants(id)。
--
-- ON DELETE 策略:
--   - 业务表 ON DELETE RESTRICT: 删租户必须先清空数据 (硬要求, 避免误删)
--   - api_keys ON DELETE CASCADE: 删租户时随其 key 一起销毁 (合规要求)

-- Up Migration

-- api_keys: 租户随之销毁
ALTER TABLE api_keys
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT api_keys_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 业务表统一 RESTRICT: 删租户必须先清干净
ALTER TABLE pipelines
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT pipelines_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE items
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT items_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE outbox
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT outbox_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE attempts
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT attempts_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE dedup_keys
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT dedup_keys_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE dataset_records
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT dataset_records_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE batches
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT batches_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE batch_items
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT batch_items_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

ALTER TABLE submissions
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT submissions_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- idempotency_keys: 租户级幂等; 删租户时一并清理
ALTER TABLE idempotency_keys
  ALTER COLUMN tenant_id SET NOT NULL,
  ADD CONSTRAINT idempotency_keys_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 同 (key, scope) 在不同租户应允许并存 → 主键改为含 tenant_id
ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_pkey;
ALTER TABLE idempotency_keys ADD PRIMARY KEY (tenant_id, key, scope);

-- Down Migration
-- 不写: 回退 NOT NULL 不安全 (期间可能新增了依赖此约束的代码)
