-- baseline: 把现有 schema.sql 收编进迁移目录
-- 与 src/schema.sql 内容等价, 先用作新环境初始化;
-- 已存在的环境通过 pgmigrations 表标记为已应用, 避免重跑
-- (用法: npm run migrate -- --fake 或 INSERT pgmigrations 占位)

-- Up Migration
-- ================================================================
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

CREATE TABLE IF NOT EXISTS pipelines (
  task_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  steps       JSONB NOT NULL,
  layout      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS outbox (
  run_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  task_id       UUID NOT NULL,
  step_key      TEXT NOT NULL,
  node_key      TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS dataset_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES pipelines(task_id) ON DELETE CASCADE,
  item_id     UUID NOT NULL UNIQUE,
  payload     JSONB NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_records_task ON dataset_records (task_id, created_at DESC);

-- ── 业务层 ──
CREATE TABLE IF NOT EXISTS batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES pipelines(task_id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  target      INT  NOT NULL DEFAULT 5,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batches_task ON batches(task_id);

CREATE TABLE IF NOT EXISTS batch_items (
  batch_id UUID NOT NULL REFERENCES batches(id)  ON DELETE CASCADE,
  item_id  UUID NOT NULL REFERENCES items(id)    ON DELETE CASCADE,
  PRIMARY KEY (batch_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON batch_items(batch_id);

CREATE TABLE IF NOT EXISTS submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      UUID NOT NULL REFERENCES batches(id)  ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id)    ON DELETE CASCADE,
  step_key      TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  run_id        UUID,
  status        TEXT NOT NULL DEFAULT 'claimed',
  result        TEXT,
  result_reason TEXT,
  result_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submissions_status_check CHECK (status IN ('claimed','submitted','returned')),
  CONSTRAINT submissions_result_check CHECK (result IS NULL OR result IN ('approved','rejected','duplicate'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_submissions_claiming
  ON submissions (item_id, step_key, user_id) WHERE status = 'claimed';
CREATE INDEX IF NOT EXISTS idx_submissions_batch_user   ON submissions(batch_id, user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_item_step    ON submissions(item_id, step_key);
CREATE INDEX IF NOT EXISTS idx_submissions_batch_result ON submissions(batch_id, result) WHERE result IS NOT NULL;

-- Down Migration
-- 不写 DROP, baseline 不向下 (生产实际删表必须人工评审)
