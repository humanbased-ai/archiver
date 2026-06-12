-- Pipeline 模板 (P1-A)
--
-- 模型:
--   pipeline_templates  = 项目无关的可复用流程蓝图 (steps + layout + forms 抽取)
--   pipelines           = 项目级实例; 新增可空 template_id 追溯到来源模板
--
-- 写流程:
--   admin 编辑器保存模板 → INSERT/UPDATE pipeline_templates
--   admin 选模板新建项目 → 克隆 steps/layout 写入 pipelines, 同时 set template_id
--   后续修改"项目 pipeline"不影响模板; 改模板也不会回写到已存在的 pipelines
--
-- RLS: 与其他业务表一致, system 直通 / tenant 匹配

-- Up Migration

CREATE TABLE IF NOT EXISTS pipeline_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  description TEXT,
  steps       JSONB NOT NULL,
  layout      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_tenant_updated
  ON pipeline_templates (tenant_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pipeline_templates_tenant_name
  ON pipeline_templates (tenant_id, name);

ALTER TABLE pipeline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON pipeline_templates;
CREATE POLICY tenant_isolation ON pipeline_templates
  AS PERMISSIVE
  FOR ALL
  USING (rls_is_system() OR tenant_id = rls_current_tenant())
  WITH CHECK (rls_is_system() OR tenant_id = rls_current_tenant());

-- pipelines 上加可空 template_id; 删模板不级联清项目, 只解关联 (SET NULL)
ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS template_id UUID
    REFERENCES pipeline_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pipelines_template
  ON pipelines (template_id) WHERE template_id IS NOT NULL;

-- 新增模板权限
INSERT INTO permissions (name, description) VALUES
  ('template.read',  '读取 pipeline 模板'),
  ('template.write', '创建 / 修改 / 删除 pipeline 模板')
ON CONFLICT (name) DO NOTHING;

-- 把模板权限挂到 tenant_admin / pipeline_editor
DO $$
DECLARE
  r_admin  UUID;
  r_editor UUID;
BEGIN
  SELECT id INTO r_admin  FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin';
  SELECT id INTO r_editor FROM roles WHERE tenant_id IS NULL AND name = 'pipeline_editor';

  IF r_admin IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
      SELECT r_admin, p.id FROM permissions p
       WHERE p.name IN ('template.read','template.write')
      ON CONFLICT DO NOTHING;
  END IF;

  IF r_editor IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
      SELECT r_editor, p.id FROM permissions p
       WHERE p.name IN ('template.read','template.write')
      ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Down Migration
-- DROP TABLE pipeline_templates; ALTER TABLE pipelines DROP COLUMN template_id;
