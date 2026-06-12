-- 给 outbox.task_id 显式加 FK
-- 之前: outbox.task_id 是裸 UUID, 无外键; pipeline 删除时只能靠 item 的 cascade 间接清理
-- 现在: 显式约束, 保证 outbox 不会引用不存在的 pipeline
-- (item_id 已经 ON DELETE CASCADE, 所以 outbox 实际数据是安全的, 这条仅是约束补强)

-- Up Migration
ALTER TABLE outbox
  ADD CONSTRAINT outbox_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES pipelines(task_id) ON DELETE CASCADE;

-- Down Migration
-- ALTER TABLE outbox DROP CONSTRAINT outbox_task_id_fkey;
