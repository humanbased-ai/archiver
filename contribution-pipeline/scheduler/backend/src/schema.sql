-- ⚠️  本文件保留仅作参考与 migrate:legacy 兜底.
--    新环境请使用 `npm run migrate` (node-pg-migrate, 见 migrations/);
--    任何 schema 变更只允许通过新增 migrations/<timestamp>_<name>.sql 进行,
--    不要再修改本文件——它会随 baseline 一起冻结.

-- 节点能力注册 (Schema Registry)
CREATE TABLE IF NOT EXISTS node_definitions (
  key                  TEXT NOT NULL,
  version              TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  params_schema        JSONB NOT NULL,
  idempotent           BOOLEAN NOT NULL DEFAULT FALSE,
  default_timeout_ms   INT NOT NULL DEFAULT 30000,
  default_max_attempts INT NOT NULL DEFAULT 3,
  manual               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, version)
);

-- 任务 pipeline (一行一条 pipeline; 多任务复用 = 多行)
CREATE TABLE IF NOT EXISTS pipelines (
  task_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  steps       JSONB NOT NULL,
  layout      JSONB,                      -- ReactFlow 节点位置 (x, y)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 单条数据当前状态
CREATE TABLE IF NOT EXISTS items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES pipelines(task_id) ON DELETE CASCADE,
  current_step  TEXT NOT NULL,
  envelope      JSONB NOT NULL,
  loop_counts   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_task_step ON items (task_id, current_step);

-- Outbox: 队列 + 在飞行
CREATE TABLE IF NOT EXISTS outbox (
  run_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  task_id       UUID NOT NULL,
  step_key      TEXT NOT NULL,             -- StepConfig.key (pipeline 内唯一)
  node_key      TEXT NOT NULL,             -- 节点类型 = topic; worker 按这个 lease
  status        TEXT NOT NULL CHECK (status IN ('pending','leased','done','failed')),
  attempt       INT NOT NULL DEFAULT 1,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_by   TIMESTAMPTZ,
  leased_by     TEXT,
  leased_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outbox_lease    ON outbox (node_key, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_expired  ON outbox (expected_by)             WHERE status = 'leased';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_outbox_inflight ON outbox (item_id, step_key) WHERE status IN ('pending','leased');

-- 历史 / 审计
CREATE TABLE IF NOT EXISTS attempts (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID NOT NULL,
  item_id       UUID NOT NULL,
  task_id       UUID NOT NULL,
  step_key      TEXT NOT NULL,
  node_key      TEXT NOT NULL,
  attempt       INT NOT NULL,
  outcome       TEXT NOT NULL CHECK (outcome IN ('success','failed','timeout','dlq')),
  output        JSONB,
  error         JSONB,
  worker_id     TEXT,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attempts_run       ON attempts (run_id);
CREATE INDEX IF NOT EXISTS idx_attempts_item_step ON attempts (item_id, step_key);

-- 字段级去重:(task_id, dedup_hash) 唯一; 第一次插入成功 = 保留, 冲突 = 重复
CREATE TABLE IF NOT EXISTS dedup_keys (
  task_id    UUID NOT NULL REFERENCES pipelines(task_id) ON DELETE CASCADE,
  dedup_hash TEXT NOT NULL,
  item_id    UUID NOT NULL,
  step_key   TEXT NOT NULL,
  fields     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, dedup_hash)
);
CREATE INDEX IF NOT EXISTS idx_dedup_keys_item ON dedup_keys (item_id);

-- 业务最终产物表:与操作层 (items/outbox/attempts) 分离
-- 由 export/store 节点写入,长期保留,给数据消费方使用
CREATE TABLE IF NOT EXISTS dataset_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES pipelines(task_id) ON DELETE CASCADE,
  item_id         UUID NOT NULL,                  -- M6: 老 UNIQUE 改成 partial active 唯一
  payload         JSONB NOT NULL,                 -- 业务原始内容
  metadata        JSONB,                          -- outputs / 格式 / 完成时间等
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','recalled')),
  recalled_at     TIMESTAMPTZ,
  recalled_reason TEXT,
  recalled_by     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_records_task ON dataset_records (task_id, created_at DESC);
-- 同 item 同时仅一条 active; recalled 行可累积留痕
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dataset_records_item_active
  ON dataset_records (item_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_dataset_records_status
  ON dataset_records (task_id, status, created_at DESC);

-- ================================================================
-- 业务层 (Business Layer) — 调度核心不读这三张表
-- ================================================================

-- 批次:业务方的一次采集任务,包含目标数量
CREATE TABLE IF NOT EXISTS batches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               UUID NOT NULL REFERENCES pipelines(task_id) ON DELETE CASCADE,
  pipeline_version_id   UUID REFERENCES pipeline_versions(id) ON DELETE RESTRICT,
  name                  TEXT NOT NULL,
  target                INT  NOT NULL DEFAULT 5,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batches_task ON batches(task_id);
CREATE INDEX IF NOT EXISTS idx_batches_pipeline_version ON batches(pipeline_version_id);

-- 批次 ↔ item 映射:记录哪些 item 属于哪个批次
CREATE TABLE IF NOT EXISTS batch_items (
  batch_id UUID NOT NULL REFERENCES batches(id)  ON DELETE CASCADE,
  item_id  UUID NOT NULL REFERENCES items(id)    ON DELETE CASCADE,
  PRIMARY KEY (batch_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON batch_items(batch_id);

-- 用户级提交事件流(append-only):每一次"领取-提交"都是一条独立记录
-- submitted/returned 是终态历史; 重做 = 插一条新的 claimed
CREATE TABLE IF NOT EXISTS submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      UUID NOT NULL REFERENCES batches(id)  ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id)    ON DELETE CASCADE,
  step_key      TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  run_id        UUID,                              -- 对应的 outbox run_id
  status        TEXT NOT NULL DEFAULT 'claimed',
  result        TEXT,                              -- 提交后的最终结果(approved/rejected/duplicate); claimed/returned 时为 NULL
  result_reason TEXT,                              -- 被拒原因(审核理由 / 撞重 hash)
  result_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submissions_status_check CHECK (status IN ('claimed','submitted','returned')),
  CONSTRAINT submissions_result_check CHECK (result IS NULL OR result IN ('approved','rejected','duplicate'))
);

-- 兼容已有库:先补字段, 再建索引 (对全新库 IF NOT EXISTS 自动跳过)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS result        TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS result_reason TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS result_at     TIMESTAMPTZ;

-- 同一用户同时只能有一条 claimed (防止重复领取); submitted/returned 不算占用
DROP INDEX IF EXISTS uniq_submissions_active;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_submissions_claiming
  ON submissions (item_id, step_key, user_id) WHERE status = 'claimed';

CREATE INDEX IF NOT EXISTS idx_submissions_batch_user   ON submissions(batch_id, user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_item_step    ON submissions(item_id, step_key);
CREATE INDEX IF NOT EXISTS idx_submissions_batch_result ON submissions(batch_id, result) WHERE result IS NOT NULL;

-- M8: stuck item 用户侧重放申请
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
CREATE UNIQUE INDEX IF NOT EXISTS uniq_replay_requests_pending
  ON replay_requests (item_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_replay_requests_status
  ON replay_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replay_requests_tenant_status
  ON replay_requests (tenant_id, status);

-- M9: 业务事件流 (供外部业务系统轮询;后续 webhook 投递层也读这张表)
CREATE TABLE IF NOT EXISTS events (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  kind          TEXT NOT NULL,
  resource_kind TEXT,
  resource_id   TEXT,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_events_kind      ON events (kind, id);
CREATE INDEX IF NOT EXISTS idx_events_resource  ON events (resource_kind, resource_id, id);
