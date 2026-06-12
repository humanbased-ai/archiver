-- node_definitions: 第四层 inputs_schema — 声明 driver 在运行时期望的输入字段
--
-- 三层 (ui_schema/paramsSchema/presets) 描述"节点是怎样的", inputs_schema 描述"节点要吃什么数据".
-- pipeline step 的 inputs 块写表达式 ({{payload.x}} / {{outputs.stepKey.y}} / {{tags.z}}),
-- lease 时服务端 resolver 把表达式按 envelope 求值, 喂给 driver 的 job.inputs.
--
-- inputsSchema.properties.<k>.defaultBinding (可选) 在 step.inputs 没给该 key 时的兜底表达式.

-- Up Migration

ALTER TABLE node_definitions
  ADD COLUMN IF NOT EXISTS inputs_schema JSONB;

-- Down Migration
-- ALTER TABLE node_definitions DROP COLUMN IF EXISTS inputs_schema;
