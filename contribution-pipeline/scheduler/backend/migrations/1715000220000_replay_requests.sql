-- M8: stuck item 用户侧重放申请 (replay_requests)
-- 让外部业务客户端在卡住的 item 上提交"请求人工介入"信号, admin 端能集中看到.
-- /admin/stuck 列表上挂红点; admin 调 /api/v1/admin/items/:id/replay 完成时
-- 把对应 pending request 标 resolved.

-- Up Migration

CREATE TABLE IF NOT EXISTS replay_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  item_id      UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  requester    TEXT NOT NULL,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','resolved','cancelled')),
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同一 item 同时只允许一条 pending — 重复申请幂等到同一行
CREATE UNIQUE INDEX IF NOT EXISTS uniq_replay_requests_pending
  ON replay_requests (item_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_replay_requests_status
  ON replay_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_replay_requests_tenant_status
  ON replay_requests (tenant_id, status);

-- RLS: 跟 items 一致, tenant 隔离
ALTER TABLE replay_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE replay_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON replay_requests;
CREATE POLICY tenant_isolation ON replay_requests
  AS PERMISSIVE FOR ALL
  USING (rls_is_system() OR tenant_id = rls_current_tenant())
  WITH CHECK (rls_is_system() OR tenant_id = rls_current_tenant());

-- Down Migration
-- DROP TABLE IF EXISTS replay_requests;
