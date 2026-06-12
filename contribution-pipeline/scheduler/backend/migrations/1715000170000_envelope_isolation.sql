-- 节点输出隔离 (P1 加固)
--
-- 不变量:
--   1. items.envelope.payload 创建后不可变 (原始数据保护)
--   2. items.envelope.tags    创建后不可变 (元数据保护; 业务层若要打 tag, 走专门接口而非走 result)
--   3. items.envelope.outputs 只允许追加 / 修改 step 自己的 slot — 应用层在 result-core.ts 强制
--      (DB 层无法判断"哪个 step 在写", 那是 caller 上下文; 这部分由代码 + 测试保证)
--
-- 触发器仅做 1 + 2: payload / tags 直接对比 OLD/NEW JSONB, 不等就拒绝。
-- 副作用: ANY caller 想改 payload (含 admin 的直接 SQL UPDATE / 误写代码) 都会被拦。
--
-- 例外: 走专门的 admin 接口要改 payload 怎么办?
--   - 设计原则: payload 不该改, 数据修订是新建一个 item + 标记关联
--   - 真要支持, 加一个 SET app.allow_envelope_payload_change = 'true' 的 GUC, 触发器放行
--   - 暂时不留逃生口, 真用上再加

-- Up Migration

CREATE OR REPLACE FUNCTION items_envelope_immutable_fields() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.envelope->'payload') IS DISTINCT FROM (OLD.envelope->'payload') THEN
    RAISE EXCEPTION 'items.envelope.payload is immutable after creation (item_id=%)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.envelope->'tags') IS DISTINCT FROM (OLD.envelope->'tags') THEN
    RAISE EXCEPTION 'items.envelope.tags is immutable after creation (item_id=%)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS items_envelope_immutable_fields ON items;
CREATE TRIGGER items_envelope_immutable_fields
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION items_envelope_immutable_fields();

-- Down Migration
-- DROP TRIGGER items_envelope_immutable_fields ON items;
-- DROP FUNCTION items_envelope_immutable_fields();
