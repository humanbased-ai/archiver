-- node_definitions: 节点管理 MVP 所需列 (06-node-design.md §9.2)
--
--   status            生命周期 2 态; 'active' 可被新 pipeline 引用, 'archived' 被阻挡
--   category          UI 分组提示, 不参与调度
--   run_mode          embedded | internal_http | external_worker | manual; 展示用
--   outputs_schema    输出契约 (给编辑器渲染下游可绑字段); 调度核心不解读
--   description       节点说明 (Markdown, 编辑器侧渲染)
--   updated_at        最近一次 auto-upsert 或管理操作; trigger 维护
--
-- 设计要点:
--   - 三个 enum (status / category / run_mode) 在应用层做白名单校验, 不用 PG enum 类型,
--     避免每次扩展枚举都要写 ALTER TYPE migration
--   - status 是"管理后台维护态", auto-upsert 不覆盖 — 见 _upsert.ts
--   - 其它列 (category / run_mode / outputs_schema / description) 是"driver 自描述",
--     auto-upsert 写入. driver 是真相源, DB 是镜像.

-- Up Migration

ALTER TABLE node_definitions
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS category       TEXT,
  ADD COLUMN IF NOT EXISTS run_mode       TEXT,
  ADD COLUMN IF NOT EXISTS outputs_schema JSONB,
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 列表页常用筛选: status / category 组合; 给个轻索引避免全表扫
CREATE INDEX IF NOT EXISTS idx_node_definitions_status_category
  ON node_definitions (status, category);

-- updated_at trigger — 任何 UPDATE 自动刷新; auto-upsert 也走这个
CREATE OR REPLACE FUNCTION node_definitions_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_node_definitions_set_updated_at ON node_definitions;
CREATE TRIGGER trg_node_definitions_set_updated_at
  BEFORE UPDATE ON node_definitions
  FOR EACH ROW EXECUTE FUNCTION node_definitions_set_updated_at();

-- 节点管理后台权限
INSERT INTO permissions (name, description) VALUES
  ('node.read',  '读取节点目录 / 详情 / 引用关系'),
  ('node.admin', '节点 archive / activate / dry-run')
ON CONFLICT (name) DO NOTHING;

-- 内建角色权限映射
DO $$
DECLARE
  r_admin  UUID;
  r_editor UUID;
  r_worker UUID;
BEGIN
  SELECT id INTO r_admin  FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin';
  SELECT id INTO r_editor FROM roles WHERE tenant_id IS NULL AND name = 'pipeline_editor';
  SELECT id INTO r_worker FROM roles WHERE tenant_id IS NULL AND name = 'worker';

  -- tenant_admin: 节点目录读 + 管理
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_admin, p.id FROM permissions p
     WHERE p.name IN ('node.read', 'node.admin')
    ON CONFLICT DO NOTHING;

  -- pipeline_editor: 只读, 编辑器要看节点目录
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_editor, p.id FROM permissions p WHERE p.name IN ('node.read')
    ON CONFLICT DO NOTHING;

  -- worker: 不需要 — autoworker 自带 system scope '*'
END $$;

-- Down Migration
-- ALTER TABLE node_definitions
--   DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS category,
--   DROP COLUMN IF EXISTS run_mode, DROP COLUMN IF EXISTS outputs_schema,
--   DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS updated_at;
-- DROP INDEX IF EXISTS idx_node_definitions_status_category;
-- DROP TRIGGER IF EXISTS trg_node_definitions_set_updated_at ON node_definitions;
-- DROP FUNCTION IF EXISTS node_definitions_set_updated_at();
-- DELETE FROM permissions WHERE name IN ('node.read', 'node.admin');
