-- 撤回 pipelines.current_version_id 的 NOT NULL
--
-- 原因 (创建期循环依赖):
--   - pipeline_versions.task_id FK → pipelines.task_id  (版本必须挂在已有 pipeline 上)
--   - pipelines.current_version_id FK → pipeline_versions.id (pipeline 必须指向已有版本)
--   - 在一次 INSERT pipeline 时无法同时满足两端
--   - NOT NULL 不支持 DEFERRABLE (只 FK 支持)
--   - 所以 INSERT pipelines 那一步必须允许 current_version_id 为 NULL,
--     紧接着 INSERT pipeline_versions, 再 UPDATE current_version_id
--
-- 不变量靠应用层保证:
--   /pipelines/create handler 在同一 tx 内三步必须成功, 否则回滚
--   读路径 (lease/result/reconciler) 使用 items.pipeline_version_id (NOT NULL), 不依赖 pipelines.current_version_id

-- Up Migration
ALTER TABLE pipelines ALTER COLUMN current_version_id DROP NOT NULL;

-- Down Migration
-- ALTER TABLE pipelines ALTER COLUMN current_version_id SET NOT NULL;
