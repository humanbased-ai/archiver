-- M9: 业务事件流 (最小版)
-- 跟 audit_log 区别:
--   audit_log = "谁做了什么" (actor / action / before / after, 合规视角)
--   events    = "系统发生了什么" (kind / resource / payload, 外部业务系统消费视角)
--   两者会有重叠 (e.g. batch.create 都会记), 但 events 更稳定且语义中立, 给外部 SDK 用.
--
-- 当前接口形态: GET /api/v1/events?since=<id>&limit=200 拉. 后续加 webhook 投递层
-- 时, 投递 worker 也读这张表 (since=last_committed_id 推送).

-- Up Migration

CREATE TABLE IF NOT EXISTS events (
  id            BIGSERIAL PRIMARY KEY,    -- 单调递增, 客户端用 since=<id> 拉
  tenant_id     UUID NOT NULL,
  kind          TEXT NOT NULL,            -- e.g. "batch.created", "item.reviewed"
  resource_kind TEXT,                     -- "batch" / "item" / "pipeline" / null
  resource_id   TEXT,                     -- 关联资源 id (UUID 或自然 id)
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_tenant_id     ON events (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_events_kind          ON events (kind, id);
CREATE INDEX IF NOT EXISTS idx_events_resource      ON events (resource_kind, resource_id, id);

-- RLS: 跟 items 一致, tenant 隔离
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON events;
CREATE POLICY tenant_isolation ON events
  AS PERMISSIVE FOR ALL
  USING (rls_is_system() OR tenant_id = rls_current_tenant())
  WITH CHECK (rls_is_system() OR tenant_id = rls_current_tenant());

-- Down Migration
-- DROP TABLE IF EXISTS events;
