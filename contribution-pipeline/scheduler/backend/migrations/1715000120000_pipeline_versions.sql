-- Pipeline 版本不可变 (P0-D)
--
-- 模型:
--   pipelines           = 元数据 (name, current_version_id, archived_at)
--   pipeline_versions   = 不可变快照 (steps, layout, forms, forms_etag, published_at, published_by)
--   items               = 钉死自己创建时的 pipeline_version_id, save 不影响在飞行
--
-- 写流程:
--   create  = INSERT pipelines + INSERT pipeline_versions(version=1) + UPDATE current_version_id
--   save    = INSERT pipeline_versions(version=max+1) + UPDATE current_version_id (auto-publish)
--   delete  = CASCADE pipeline_versions, items, ...
--
-- 读流程:
--   item lease/result/reconcile → JOIN pipeline_versions ON pv.id = items.pipeline_version_id
--   获取的是 item 创建时那一版的 steps, 改 schema 永不影响在飞行
--
-- forms 抽取:
--   pipeline_versions.forms = { stepKey: { schema, uiSchema } } 由 publish 时从 steps 抽出
--   forms_etag = sha256(forms) 给前端 If-None-Match 缓存

-- Up Migration

CREATE TABLE IF NOT EXISTS pipeline_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES pipelines(task_id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id)         ON DELETE RESTRICT,
  version       INT NOT NULL,
  steps         JSONB NOT NULL,
  layout        JSONB,
  forms         JSONB NOT NULL DEFAULT '{}'::jsonb,        -- {stepKey: {schema, uiSchema}}
  forms_etag    TEXT NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by  TEXT,                                      -- api_keys.id 或 'system'
  UNIQUE (task_id, version)
);
CREATE INDEX IF NOT EXISTS idx_pv_task_version_desc
  ON pipeline_versions (task_id, version DESC);

-- pipelines 增加 current_version_id (后续指向当前激活版本; 暂允许 NULL)
ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS current_version_id UUID
    REFERENCES pipeline_versions(id) ON DELETE SET NULL;

-- items 钉死创建时的版本 (Phase 1 nullable, backfill 后 SET NOT NULL)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS pipeline_version_id UUID
    REFERENCES pipeline_versions(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_items_version ON items (pipeline_version_id);

-- pipeline_versions 启用 RLS (与其他业务表一致)
ALTER TABLE pipeline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pipeline_versions;
CREATE POLICY tenant_isolation ON pipeline_versions
  AS PERMISSIVE
  FOR ALL
  USING (rls_is_system() OR tenant_id = rls_current_tenant())
  WITH CHECK (rls_is_system() OR tenant_id = rls_current_tenant());

-- Down Migration
-- DROP TABLE pipeline_versions; ALTER TABLE pipelines DROP COLUMN current_version_id;
-- ALTER TABLE items DROP COLUMN pipeline_version_id;
