-- Row-Level Security 启用 (Phase 2 / contract-4: RLS as defense-in-depth)
--
-- 设计:
--   - 应用层 SQL 仍要显式 WHERE tenant_id = $caller (快路径, 利用索引)
--   - RLS 是兜底: 应用漏写 WHERE → 行也不会被 SELECT/UPDATE 命中
--   - 系统级 actor (autoworker / reconciler) 设 SET LOCAL app.role='system' 跳过
--   - 租户级请求设 SET LOCAL app.tenant_id=<uuid>; 未设 → 行不可见 (安全默认)
--
-- 不启用 RLS 的表:
--   - tenants, api_keys: auth 路径需在尚未设 GUC 时查 api_keys 解出 tenant_id;
--     这两张是身份的根, 用 grants/role 而非 RLS 控制 (后续 RBAC 阶段细化)
--   - node_definitions: 全局共享, 无租户列
--   - pgmigrations: 迁移基础设施
--
-- 策略表达: 每张表上的 policy 是 PERMISSIVE 的 OR:
--   1) app.role = 'system' (系统级直通)
--   2) tenant_id = current_setting('app.tenant_id')::uuid (租户匹配)
--   两者皆不命中 → 行不可见。

-- Up Migration

-- ── 通用策略函数: 判断当前会话是否系统级 ──
CREATE OR REPLACE FUNCTION rls_is_system() RETURNS boolean
  LANGUAGE sql
  STABLE
AS $$
  SELECT current_setting('app.role', true) = 'system'
$$;

-- ── 通用策略函数: 当前会话租户 (未设返回 NULL, 不抛错) ──
CREATE OR REPLACE FUNCTION rls_current_tenant() RETURNS uuid
  LANGUAGE plpgsql
  STABLE
AS $$
DECLARE
  raw text;
BEGIN
  raw := current_setting('app.tenant_id', true);
  IF raw IS NULL OR raw = '' THEN RETURN NULL; END IF;
  RETURN raw::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END $$;

-- ── 启用 RLS + 标准策略 ──
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'pipelines', 'items', 'outbox', 'attempts', 'dedup_keys',
    'dataset_records', 'batches', 'batch_items', 'submissions',
    'idempotency_keys'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- FORCE 让表所有者也受 RLS 约束 (默认所有者绕过, 生产应 force)
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

    EXECUTE format($p$
      DROP POLICY IF EXISTS tenant_isolation ON %I;
      CREATE POLICY tenant_isolation ON %I
        AS PERMISSIVE
        FOR ALL
        USING (rls_is_system() OR tenant_id = rls_current_tenant())
        WITH CHECK (rls_is_system() OR tenant_id = rls_current_tenant());
    $p$, tbl, tbl);
  END LOOP;
END $$;

-- Down Migration
-- DROP POLICY tenant_isolation ON ...; ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
