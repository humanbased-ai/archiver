-- Pipeline 版本化回填 (P0-D backfill)
--
-- 1) 为每条 pipelines 创建 v1 行 (steps + layout + forms 抽取)
-- 2) UPDATE pipelines.current_version_id ← v1.id
-- 3) UPDATE items.pipeline_version_id ← 该 pipeline 的 v1
--
-- 幂等: 已有 current_version_id 的 pipelines 跳过。

-- Up Migration

DO $$
DECLARE
  p RECORD;
  v1_id UUID;
  forms_blob JSONB;
  etag TEXT;
BEGIN
  -- 切 system 模式: FORCE RLS 不设 GUC 时 SELECT pipelines 会被 policy 过滤
  PERFORM set_config('app.role', 'system', true);
  FOR p IN
    SELECT task_id, tenant_id, steps, layout
      FROM pipelines
     WHERE current_version_id IS NULL
  LOOP
    -- 抽 forms: 走每个 step.params.{schema, uiSchema}
    SELECT COALESCE(jsonb_object_agg(
                      s->>'key',
                      jsonb_build_object(
                        'schema',   s->'params'->'schema',
                        'uiSchema', s->'params'->'uiSchema'
                      )
                    ) FILTER (
                      WHERE (s->'params'->'schema') IS NOT NULL
                         OR (s->'params'->'uiSchema') IS NOT NULL
                    ), '{}'::jsonb)
      INTO forms_blob
      FROM jsonb_array_elements(p.steps) AS s;

    etag := encode(sha256(forms_blob::text::bytea), 'hex');

    INSERT INTO pipeline_versions (
      task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by
    ) VALUES (
      p.task_id, p.tenant_id, 1, p.steps, p.layout, forms_blob, etag, 'system:backfill'
    )
    RETURNING id INTO v1_id;

    UPDATE pipelines SET current_version_id = v1_id, updated_at = NOW()
     WHERE task_id = p.task_id;

    UPDATE items SET pipeline_version_id = v1_id
     WHERE task_id = p.task_id AND pipeline_version_id IS NULL;
  END LOOP;
END $$;

-- Down Migration
-- 不写: 删 pipeline_versions 行需要先把 items.pipeline_version_id / pipelines.current_version_id 清空
