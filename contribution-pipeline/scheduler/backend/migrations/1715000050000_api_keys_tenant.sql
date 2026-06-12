-- api_keys 加租户归属
--
-- 阶段 1 (本迁移): ADD COLUMN tenant_id UUID NULL
--   - 现有 demo / 测试 key 不带 tenant_id, 应用层回落到 default tenant
--   - 新建 key 通过 keys:create CLI 必填 --tenant
-- 阶段 2 (下一批):
--   - UPDATE api_keys SET tenant_id = '<default>' WHERE tenant_id IS NULL
--   - ALTER COLUMN tenant_id SET NOT NULL
--   - ADD CONSTRAINT api_keys_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id)
--   - 启用 RLS (api_keys 自身无须 RLS, 但需此列作为身份派生源)

-- Up Migration
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 查询活跃 key 时按租户加速;部分索引体积只跟未吊销的 key 数量成正比
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant
  ON api_keys (tenant_id)
  WHERE revoked_at IS NULL;

-- Down Migration
-- ALTER TABLE api_keys DROP COLUMN IF EXISTS tenant_id;
