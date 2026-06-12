-- 多租户 root 表
--
-- ADR (Architecture Decision Record):
--   1. 租户隔离采用"列级 denormalization + Row-Level Security"双保险:
--      - tenant_id 落在每张业务表(本迁移负责创建,下游迁移负责加列/RLS)
--      - 应用层 SQL 显式 WHERE tenant_id;RLS 作为兜底
--      原因:目标 QPS(P2 = 10k)下 JOIN 派生租户的查询计划不可接受
--   2. node_definitions 保持全局(跨租户共享),不加 tenant_id;
--      未来若有租户私有节点类型,新建 node_overrides(tenant_id, node_key, ...)。
--   3. 本迁移只建 tenants 表 + 写入"default tenant"占位。
--      后续迁移按以下两阶段推进(expand-contract):
--        Phase 1 (本批 1715000040~060): ADD COLUMN tenant_id UUID NULL
--                                       业务代码读 NULL 时回落到 default tenant
--        Phase 2 (下一批):              backfill default + SET NOT NULL + FK + RLS

-- Up Migration
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,                                  -- url-safe 短标识,日志/路由用
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','suspended','deleted')),
  plan        TEXT NOT NULL DEFAULT 'standard',                      -- 计费层级钩子
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default tenant:
--   - 现有 dev/staging 库存量数据归属此租户(下批 backfill 用)
--   - 系统级 actor (reconciler/autoworker self-call) 在没有显式 tenant 上下文时落这里
--   - 生产环境通过 tenants:create CLI 创建真实租户,default 仅用于过渡 + 系统调用
INSERT INTO tenants (id, slug, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'Default Tenant', 'system')
ON CONFLICT (slug) DO NOTHING;

-- Down Migration
-- DROP TABLE tenants;
