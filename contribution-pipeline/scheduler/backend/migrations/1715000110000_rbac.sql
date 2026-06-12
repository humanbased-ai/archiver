-- RBAC 基础表 (P0-C)
--
-- 模型:
--   permission   = 全局 (pipeline.write / batch.create / queue.lease / ...)
--   role         = 一个权限集合, 可绑定到租户 (custom 角色) 或 NULL (内建系统角色)
--   api_key_role = 一把 key 持有的角色集合
--
-- 鉴权:
--   resolveCaller 时 LEFT JOIN api_key_roles → role_permissions → permissions,
--   把权限名收成 Set<string> 挂在 caller.permissions
--   handler 用 requirePermission('pipeline.publish') 守门
--
-- 内建角色 (tenant_id IS NULL, 跨租户复用):
--   tenant_admin    — 该租户所有权限
--   pipeline_editor — pipeline.* + item.read
--   batch_operator  — batch.* + item.read + collect/review 写
--   worker          — queue.lease / queue.result / dedup / dataset.write (跨租户系统职责)
--
-- ON DELETE: role 删除时, api_key_roles 跟随 (CASCADE);
--           api_key 删除时, api_key_roles 跟随 (CASCADE)

-- Up Migration

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,                    -- e.g. 'pipeline.publish'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,    -- NULL = 内建系统角色
  name        TEXT NOT NULL,
  description TEXT,
  is_builtin  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 同租户内角色名唯一; 系统角色 (tenant_id IS NULL) 单独唯一
CREATE UNIQUE INDEX IF NOT EXISTS uniq_roles_tenant_name
  ON roles (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        UUID NOT NULL REFERENCES roles(id)        ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id)  ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS api_key_roles (
  api_key_id  UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
  PRIMARY KEY (api_key_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_api_key_roles_key ON api_key_roles (api_key_id);

-- ── seed: 内建权限 ──
INSERT INTO permissions (name, description) VALUES
  ('pipeline.read',     '读取 pipeline 列表与详情'),
  ('pipeline.write',    '创建 / 修改 / 删除 pipeline'),
  ('pipeline.publish',  '发布 pipeline 新版本 (改变 current_version_id)'),
  ('item.read',         '读取 item 详情 / 列表 / 看板'),
  ('item.replay',       '管理员重放 stuck item'),
  ('batch.read',        '读取批次列表 / 详情 / 进度'),
  ('batch.create',      '创建批次'),
  ('collect.write',     '采集任务认领 / 提交 / 放弃'),
  ('review.write',      '审核决定'),
  ('queue.lease',       'worker 拉取任务'),
  ('queue.result',      '提交执行结果'),
  ('dedup.check',       '字段级去重原子检查'),
  ('dataset.write',     '成品入库'),
  ('admin.queue',       '查看 admin 队列概览'),
  ('admin.stuck',       '查看 stuck 列表')
ON CONFLICT (name) DO NOTHING;

-- ── seed: 内建系统角色 + 权限映射 ──
DO $$
DECLARE
  r_admin    UUID;
  r_editor   UUID;
  r_operator UUID;
  r_worker   UUID;
BEGIN
  -- tenant_admin: 该租户所有 (除 worker 跨租户类) 权限
  INSERT INTO roles (tenant_id, name, description, is_builtin)
    VALUES (NULL, 'tenant_admin', '租户管理员', TRUE)
    ON CONFLICT DO NOTHING;
  SELECT id INTO r_admin FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin';

  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_admin, p.id FROM permissions p
     WHERE p.name IN (
       'pipeline.read','pipeline.write','pipeline.publish',
       'item.read','item.replay',
       'batch.read','batch.create',
       'collect.write','review.write',
       'admin.queue','admin.stuck'
     )
    ON CONFLICT DO NOTHING;

  -- pipeline_editor
  INSERT INTO roles (tenant_id, name, description, is_builtin)
    VALUES (NULL, 'pipeline_editor', 'pipeline 编辑者', TRUE)
    ON CONFLICT DO NOTHING;
  SELECT id INTO r_editor FROM roles WHERE tenant_id IS NULL AND name = 'pipeline_editor';

  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_editor, p.id FROM permissions p
     WHERE p.name IN ('pipeline.read','pipeline.write','pipeline.publish','item.read')
    ON CONFLICT DO NOTHING;

  -- batch_operator
  INSERT INTO roles (tenant_id, name, description, is_builtin)
    VALUES (NULL, 'batch_operator', '批次运营 / 采集审核', TRUE)
    ON CONFLICT DO NOTHING;
  SELECT id INTO r_operator FROM roles WHERE tenant_id IS NULL AND name = 'batch_operator';

  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_operator, p.id FROM permissions p
     WHERE p.name IN (
       'pipeline.read','item.read',
       'batch.read','batch.create',
       'collect.write','review.write'
     )
    ON CONFLICT DO NOTHING;

  -- worker (跨租户系统职责; 配合 api_keys.scope='system')
  INSERT INTO roles (tenant_id, name, description, is_builtin)
    VALUES (NULL, 'worker', 'AutoWorker / Reconciler 系统角色', TRUE)
    ON CONFLICT DO NOTHING;
  SELECT id INTO r_worker FROM roles WHERE tenant_id IS NULL AND name = 'worker';

  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_worker, p.id FROM permissions p
     WHERE p.name IN (
       'queue.lease','queue.result','dedup.check','dataset.write',
       'admin.queue','admin.stuck'
     )
    ON CONFLICT DO NOTHING;
END $$;

-- Down Migration
-- DROP TABLE api_key_roles, role_permissions, roles, permissions;
