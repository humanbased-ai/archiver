-- audit.read 权限: 把 audit_log 暴露给 admin 看的 RBAC 权限
-- 关联端点: GET /api/v1/admin/audit
-- 默认仅 tenant_admin 持有 (合规审计角色)

-- Up Migration

INSERT INTO permissions (name, description) VALUES
  ('audit.read', '查询审计日志')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE r_admin UUID;
BEGIN
  SELECT id INTO r_admin FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin';
  IF r_admin IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
      SELECT r_admin, p.id FROM permissions p WHERE p.name = 'audit.read'
      ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Down Migration
-- DELETE FROM permissions WHERE name = 'audit.read';
