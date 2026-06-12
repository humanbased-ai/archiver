-- audit_log: append-only 审计日志 (P0-E)
--
-- 设计:
--   - append-only: 角色禁 UPDATE/DELETE; 7 年保留 (合规要求)
--   - 时间分区: 每月一张子分区, 老分区可 detach + S3 export + drop
--   - 写路径: 应用层在 mutating handler 完成后调 auditLog(actor, action, resource, before, after)
--     不阻塞响应 (异步写, 失败 warn 不影响主流程)
--   - 读路径: BI / 安全审计走 read replica, 主库零负担
--
-- 字段语义:
--   actor       — 操作发起方; 'user:<api_key.id>' / 'system:reconciler' / 'system:autoworker'
--   action      — 'pipeline.publish' / 'item.replay' / 'batch.create' / ...
--   resource    — { kind: 'pipeline'|'item'|..., id: '...' }
--   before/after— 改动前/后的状态 (JSONB; 大字段截断到 4KB)
--   trace_id    — OTel traceparent (后续 OTel 接入后填)
--   request_id  — fastify reqId

-- Up Migration

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL,
  tenant_id   UUID NOT NULL,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  resource    JSONB NOT NULL,
  before      JSONB,
  after       JSONB,
  trace_id    TEXT,
  request_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

-- 当月分区 + 来月分区 (后续由 cron 滚动建)
CREATE TABLE IF NOT EXISTS audit_log_2026_05
  PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_06
  PARTITION OF audit_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- 索引: 主查询是 "某租户在时段内某 actor 的某 action 历史"
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time   ON audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_time   ON audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource_kind ON audit_log ((resource->>'kind'), (resource->>'id'));
CREATE INDEX IF NOT EXISTS idx_audit_trace        ON audit_log (trace_id) WHERE trace_id IS NOT NULL;

-- RLS: 跟其他业务表保持一致, system 跳, 租户匹配
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  AS PERMISSIVE
  FOR ALL
  USING (rls_is_system() OR tenant_id = rls_current_tenant())
  WITH CHECK (rls_is_system() OR tenant_id = rls_current_tenant());

-- append-only: 拒绝 UPDATE / DELETE (即使是表所有者也拦)
CREATE OR REPLACE FUNCTION audit_log_no_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only; UPDATE/DELETE forbidden';
END $$;
DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_mutation();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_mutation();

-- 注: 删租户时 audit_log 通过 partition + 7 年保留 + 离线归档处理, 不级联 (合规要求)

-- Down Migration
-- DROP TABLE audit_log CASCADE;
