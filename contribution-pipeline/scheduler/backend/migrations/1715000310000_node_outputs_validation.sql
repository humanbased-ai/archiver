-- node_definitions: 输出强校验模式 (06-node-design §4.4 落地)
--
-- outputs_validation: 'strict' | 'warn' | 'off'
--   - strict (默认): 节点输出不符 outputsSchema → result 转 failed, retryable=false, 不写下游
--   - warn:           记 audit_log warning, 但仍 apply (生产兼容用)
--   - off:            完全跳过 (meta 节点 / 没声明 outputsSchema 时由 driver 显式关闭)
--
-- 为什么默认 strict:
--   节点输出污染会沿 pipeline 扩散, 下游 driver 拿到错误结构 → 一直重试 → DLQ.
--   strict 在源头拦下, 归因到具体 step.runId, 比下游报错好排查百倍.
--
-- 为什么允许 warn / off:
--   - dedup / export 这种 meta 节点对整个 envelope 操作, outputsSchema 是"建议"而非"契约", 走 off
--   - 老 driver 升级期, schema 跟实现可能短暂错配, 临时 warn 不阻断业务

-- Up Migration

ALTER TABLE node_definitions
  ADD COLUMN IF NOT EXISTS outputs_validation TEXT NOT NULL DEFAULT 'strict';

-- 既存行已 default strict; meta 节点用 driver 端 outputsValidation='off' 在下次 auto-upsert 修正

-- Down Migration
-- ALTER TABLE node_definitions DROP COLUMN IF EXISTS outputs_validation;
