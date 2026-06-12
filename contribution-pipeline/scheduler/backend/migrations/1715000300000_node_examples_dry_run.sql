-- node_definitions: 使用示例 + dry-run 安全声明 (06-node-design §13.2 第二阶段增量)
--
-- examples         JSONB   driver 自带的"如何用"示例: 每条含 title/description/step/envelope.
--                          管理后台节点详情展示, 一键填到调试面板.
-- supports_dry_run BOOLEAN driver 是否声明"dry-run 不触发线上副作用". false 时调试面板亮红 badge,
--                          提醒"driver 内部仍可能写库 / 打外网". 默认 false (保守不误导).
--
-- 这两列都是"driver 自描述"列, auto-upsert 写入, 跟 outputs_schema / description 同性质.
-- v2 文档 §13.2 把"调试不影响线上"作为节点管理 MVP 的核心承诺, 这列就是这个承诺的运行期标识.

-- Up Migration

ALTER TABLE node_definitions
  ADD COLUMN IF NOT EXISTS examples         JSONB,
  ADD COLUMN IF NOT EXISTS supports_dry_run BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration
-- ALTER TABLE node_definitions
--   DROP COLUMN IF EXISTS examples,
--   DROP COLUMN IF EXISTS supports_dry_run;
