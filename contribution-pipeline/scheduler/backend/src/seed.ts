import { sql as rootSql, asSystem, type SQL } from "./db.ts";
import { hashKey } from "./auth.ts";
import type { Pipeline } from "./types.ts";

// seed = 一次性把示例数据归零再灌入 (跑 system 模式跳 RLS)。
// 默认租户专用; 真实租户的数据由产品流程创建。
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// 演示用的额外租户 — 给 web 前端的 "tenant switcher" 用. 真实生产环境通过
// tenants:create / keys:create CLI 配租户和 key, 这里的明文 dev key 只在
// AUTH_REQUIRED=false 或 DEV_TENANT_PICKER=true 时通过 /dev/tenants 暴露.
const DEMO_TENANTS = [
  { slug: "acme",   name: "Acme Corp",  devKey: "dev-acme-admin-2026" },
  { slug: "globex", name: "Globex Inc", devKey: "dev-globex-admin-2026" },
] as const;

async function main() {
  await asSystem(async (sql) => { await seedAll(sql); });
  await rootSql.end();
}

async function seedAll(sql: SQL) {
  // ====== 1. 非 autoworker 节点 (ingest/review/translate/annotate) ======
  // autoworker driver-owned 节点 (dedup/export/script/llm_translate) 在下面 1.5 通过 auto-upsert 写入,
  // 跟 autoworker 启动走同一条路径 — driver 是唯一真相源, seed 自包含.
  const nodes = [
    {
      // 纯人工/外部数据进件; autoworker 不再为 ingest 注册 driver, 完全由 /api/collect/* 流转
      key: "ingest",
      version: "1.0",
      display_name: "采集 Ingest",
      params_schema: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["manual", "s3", "form"] },
        },
      },
      idempotent: true,
      default_timeout_ms: 10_000,
      default_max_attempts: 3,
      manual: false,
    },
    {
      key: "review",
      version: "1.0",
      display_name: "审核 Review (人工)",
      params_schema: { type: "object", properties: { rubric: { type: "string", default: "default" } } },
      idempotent: false,
      default_timeout_ms: 30 * 60 * 1000,
      default_max_attempts: 1,
      manual: true,
    },
    // 历史保留 (老 e2e 测试可能引用 translate/annotate; 不在主 demo 里露出)
    // translate 是 worker-example 模拟翻译节点, 不是 autoworker 内置 llm_translate
    {
      key: "translate",
      version: "1.0",
      display_name: "翻译 Translate",
      params_schema: {
        type: "object",
        properties: {
          model: { type: "string", default: "claude-haiku" },
          targetLang: { type: "string", default: "zh" },
        },
      },
      idempotent: true,
      default_timeout_ms: 30_000,
      default_max_attempts: 3,
      manual: false,
    },
    {
      key: "annotate",
      version: "1.0",
      display_name: "标注 Annotate (人工)",
      params_schema: { type: "object", properties: { labelSchema: { type: "string", default: "default" } } },
      idempotent: false,
      default_timeout_ms: 30 * 60 * 1000,
      default_max_attempts: 1,
      manual: true,
    },
  ];
  for (const n of nodes) {
    await sql`
      INSERT INTO node_definitions
        (key, version, display_name, params_schema, idempotent, default_timeout_ms, default_max_attempts, manual)
      VALUES (
        ${n.key}, ${n.version}, ${n.display_name}, ${sql.json(n.params_schema)},
        ${n.idempotent}, ${n.default_timeout_ms}, ${n.default_max_attempts}, ${n.manual}
      )
      ON CONFLICT (key, version) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        params_schema = EXCLUDED.params_schema,
        idempotent = EXCLUDED.idempotent,
        default_timeout_ms = EXCLUDED.default_timeout_ms,
        default_max_attempts = EXCLUDED.default_max_attempts,
        manual = EXCLUDED.manual
    `;
  }
  console.log(`[seed] ${nodes.length} non-autoworker node_definitions upserted`);

  // ====== 1.5 autoworker driver-owned 行: 注册 driver + 调 auto-upsert ======
  // 跟 autoworker bootstrap 走同一条路径; seed 自包含, 不依赖后端启动.
  // ANTHROPIC_API_KEY 缺时 llm-translate 不注册 → 其行不被 upsert (生产意图: 没 key 别拉队列);
  // 测试场景下 .env.test 设 key 才能让 llm-translate 行存在.
  const { registerDedupDriver }        = await import("./drivers/dedup.ts");
  const { registerExportDriver }       = await import("./drivers/export.ts");
  const { registerSandboxJsDriver }    = await import("./drivers/sandbox-js.ts");
  const { registerLlmTranslateDriver } = await import("./drivers/llm-translate.ts");
  const { registerComputeDriver }      = await import("./drivers/compute.ts");
  const { upsertCollectedNodeDefinitions } = await import("./drivers/_upsert.ts");
  registerDedupDriver();
  registerExportDriver();
  registerSandboxJsDriver();
  registerComputeDriver();
  registerLlmTranslateDriver();
  await upsertCollectedNodeDefinitions();
  console.log("[seed] autoworker driver-owned node_definitions upserted via auto-upsert");

  // ====== 2. 清场 (主 demo 数据归零) ======
  const templates = buildTemplates();
  const keep = templates.map((t) => t.name);
  await cleanupBefore(sql, keep);

  // ====== 3. 模板 + 项目 ======
  const templateIds: Record<string, string> = {};
  for (const t of templates) {
    const layoutJson = t.layout ? sql.json(t.layout) : null;
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO pipeline_templates (tenant_id, name, description, steps, layout)
      VALUES (${DEFAULT_TENANT_ID}, ${t.name}, ${t.description ?? null},
              ${sql.json(t.steps as any)}, ${layoutJson})
      ON CONFLICT (tenant_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        steps = EXCLUDED.steps,
        layout = EXCLUDED.layout,
        updated_at = NOW()
      RETURNING id
    `;
    templateIds[t.name] = row.id;
  }
  console.log(`[seed] ${templates.length} pipeline_templates upserted`);

  for (const t of templates) {
    await ensureProjectFromTemplate(sql, t, templateIds[t.name]);
  }

  // ====== 3.5 backfill: 修历史 pipeline_versions 里 review 步骤缺 reviewedStepKey 的 ======
  // 设计原则上 pipeline_versions 不可变 (在飞 item 不被 schema 变动影响), 但这是补一个
  // 本来 v1 就该有的字段 — 不是真正的 schema 变更, 是 bug-fix 性质的数据补全.
  // 跨所有租户跑, 一次性. 已有 reviewedStepKey 的不动.
  await backfillReviewedStepKey(sql);

  // ====== 4. demo 批次 ======
  // 测试库不投 demo 批次 — 测试用例自行 ingest 自己的 fixture, 多余 outbox 行
  // 会让"全局 lease 看到几条"这类断言失稳 (T/Y 套件之前因此挂过).
  if (process.env.SEED_DEMO !== "false") {
    for (const t of templates) {
      if (t.demoBatch) {
        await ensureDemoBatch(sql, t.name, t.demoBatch.name, t.demoBatch.target);
      }
    }
    // ====== 5. 额外 demo 租户 + admin key (前端 tenant switcher 用) ======
    await seedDemoTenants(sql);
  } else {
    console.log("[seed] SEED_DEMO=false, demo 批次 / demo 租户跳过");
  }
}

// 给每个 demo 租户 upsert 一行 tenant + 一把 admin key + 绑 tenant_admin role +
// 同 default 一样的两个用户面 pipeline 模板 (脚本预处理仅在 default, e2e 专用).
// idempotent: 跑多次安全; 模板按 (tenant_id, name) 唯一, ON CONFLICT 更新 steps.
//
// pipeline 实例 / batch 不灌 — 让 switch 到 acme 后 "项目空白", 用户从模板新建,
// 这样能直观演示"管理端从模板克隆出项目"那一段的多租户隔离.
async function seedDemoTenants(sql: SQL) {
  // 取内建 tenant_admin role
  const [r] = await sql<{ id: string }[]>`
    SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'
  `;
  if (!r) {
    console.warn("[seed] tenant_admin role 缺失, demo 租户跳过 (需要先跑 rbac migration)");
    return;
  }
  const tenantAdminRoleId = r.id;

  for (const t of DEMO_TENANTS) {
    const [tenant] = await sql<{ id: string }[]>`
      INSERT INTO tenants (slug, name, plan)
      VALUES (${t.slug}, ${t.name}, 'standard')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const tid = tenant.id;

    const hash = hashKey(t.devKey);
    const [key] = await sql<{ id: string }[]>`
      INSERT INTO api_keys (name, key_hash, scope, tenant_id)
      VALUES (${`${t.slug}-admin-demo`}, ${hash}, 'admin', ${tid})
      ON CONFLICT (key_hash) DO UPDATE SET
        name       = EXCLUDED.name,
        scope      = EXCLUDED.scope,
        tenant_id  = EXCLUDED.tenant_id,
        revoked_at = NULL
      RETURNING id
    `;

    await sql`
      INSERT INTO api_key_roles (api_key_id, role_id)
      VALUES (${key.id}, ${tenantAdminRoleId})
      ON CONFLICT DO NOTHING
    `;

    // 给 demo 租户也灌用户面模板 (只灌带 demoBatch 的, 即采集/图片标注;
    // 脚本预处理供 e2e 用, 不进 demo 租户)
    const userFacingTemplates = buildTemplates().filter((t) => t.demoBatch);
    for (const tpl of userFacingTemplates) {
      await sql`
        INSERT INTO pipeline_templates (tenant_id, name, description, steps, layout)
        VALUES (${tid}, ${tpl.name}, ${tpl.description ?? null},
                ${sql.json(tpl.steps as any)}, ${tpl.layout ? sql.json(tpl.layout) : null})
        ON CONFLICT (tenant_id, name) DO UPDATE SET
          description = EXCLUDED.description,
          steps       = EXCLUDED.steps,
          layout      = EXCLUDED.layout,
          updated_at  = NOW()
      `;
    }

    console.log(`[seed] demo tenant ${t.slug} (${tid}) ready, ${userFacingTemplates.length} 模板已注入`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 清场: 把"非主例"的 pipeline 全删 (级联 items / batches / dedup / records),
//      主例 pipeline 保留, 但清掉它们的 batches / items / dedup / records,
//      让 seed 重新灌干净的 demo 数据。
// ─────────────────────────────────────────────────────────────────────
async function cleanupBefore(sql: SQL, keepNames: string[]) {
  // 4.0. 删非主例模板 (pipelines.template_id ON DELETE SET NULL, 解关联即可)
  const tplGone = await sql<{ name: string }[]>`
    DELETE FROM pipeline_templates
    WHERE tenant_id = ${DEFAULT_TENANT_ID}
      AND name <> ALL(${keepNames})
    RETURNING name
  `;
  if (tplGone.length > 0) {
    console.log(`[seed] cleaned ${tplGone.length} non-demo template(s): ${tplGone.map((r) => r.name).join(", ")}`);
  }

  // 4.a. 删非主例 pipeline (默认租户内). 注意:tenant_id 固定 default,
  //       不动 e2e 测试在其他租户产生的数据
  const nonKeep = await sql<{ task_id: string; name: string }[]>`
    SELECT task_id, name FROM pipelines
    WHERE tenant_id = ${DEFAULT_TENANT_ID}
      AND name <> ALL(${keepNames})
  `;
  if (nonKeep.length > 0) {
    // pipelines DELETE 级联: items, dataset_records, dedup_keys, batches.
    // items DELETE 级联: outbox, batch_items, submissions
    // attempts 没 FK, 留作历史 (体量小, 不影响 demo)
    await sql`
      DELETE FROM pipelines
      WHERE task_id IN ${sql(nonKeep.map((r) => r.task_id))}
    `;
    console.log(`[seed] cleaned ${nonKeep.length} non-demo pipeline(s): ${nonKeep.slice(0, 5).map((r) => r.name).join(", ")}${nonKeep.length > 5 ? "..." : ""}`);
  }

  // 4.b. 主例 pipeline 保留, 但清空它们下面的 batches / items / dedup / records
  // RLS 在 system 模式跳过, 这里能扫到默认租户的全部
  const keepRows = await sql<{ task_id: string }[]>`
    SELECT task_id FROM pipelines
    WHERE tenant_id = ${DEFAULT_TENANT_ID} AND name = ANY(${keepNames})
  `;
  if (keepRows.length > 0) {
    const ids = keepRows.map((r) => r.task_id);
    await sql`DELETE FROM batches         WHERE task_id IN ${sql(ids)}`;
    await sql`DELETE FROM items           WHERE task_id IN ${sql(ids)}`; // 顺带级联 outbox/submissions
    await sql`DELETE FROM dedup_keys      WHERE task_id IN ${sql(ids)}`;
    await sql`DELETE FROM dataset_records WHERE task_id IN ${sql(ids)}`;
    // 解掉 current_version_id 的 FK 后清空 pipeline_versions, 让 ensureProjectFromTemplate 重新发 v1.
    // 这样改 schema (e.g. 把 nodeKey 从 ingest 切到 script) 重跑 seed 即生效, 不需要手工干预。
    await sql`UPDATE pipelines SET current_version_id = NULL WHERE task_id IN ${sql(ids)}`;
    await sql`DELETE FROM pipeline_versions WHERE task_id IN ${sql(ids)}`;
    console.log(`[seed] cleaned demo state for ${keepRows.length} kept project(s) (pv reset)`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 模板定义 (主 demo)
// ─────────────────────────────────────────────────────────────────────
type TemplateSpec = {
  name: string;
  description?: string;
  steps: Pipeline;
  layout: { positions: Record<string, { x: number; y: number }> };
  demoBatch?: { name: string; target: number };
};

function buildTemplates(): TemplateSpec[] {
  // ── 例 1: 通用文本采集 (采集 → 去重 → 审核 → 入库) ──
  const collectFormSchema = {
    type: "object",
    title: "数据采集",
    required: ["title", "url"],
    properties: {
      title: { type: "string", title: "标题" },
      url: { type: "string", title: "URL", description: "唯一资源定位 (用作去重 key)" },
      category: {
        type: "string", title: "分类", default: "news",
        oneOf: [
          { const: "news",  title: "新闻" },
          { const: "blog",  title: "博客" },
          { const: "paper", title: "论文" },
          { const: "other", title: "其他" },
        ],
      },
      content:  { type: "string",  title: "正文" },
      verified: { type: "boolean", title: "已核验", default: false },
    },
  };
  const collectFormUi = {
    content:  { "ui:widget": "textarea", "ui:options": { rows: 4 } },
    category: { "ui:widget": "radio",    "ui:options": { inline: true } },
  };

  // ── 例 2: 图片标注 yes/no (上传图片 + Yes/No → 审核 → 入库) ──
  // schema 里把"图片"放在第一行, 标签紧随其后, 备注收尾;
  // image-upload widget 把 file 转 base64 写入 string 字段 (注意 64 KiB step 输出上限,
  // demo 用小图就够; 真实生产应换成 URL 存 oss + presign)
  const imageFormSchema = {
    type: "object",
    title: "图片标注",
    required: ["image", "label"],
    properties: {
      image: { type: "string", title: "图片", description: "建议 < 50 KB (demo 受 step 输出上限 64KiB 约束)" },
      label: {
        type: "string", title: "是否符合",
        oneOf: [
          { const: "yes", title: "✓ 符合" },
          { const: "no",  title: "✗ 不符合" },
        ],
      },
      note: { type: "string", title: "备注 (可选)" },
    },
  };
  const imageFormUi = {
    image: { "ui:widget": "image-upload", "ui:options": { placeholder: "点击上传待标注图片" } },
    label: { "ui:widget": "radio",        "ui:options": { inline: true } },
    note:  { "ui:widget": "textarea",     "ui:options": { rows: 2 } },
  };

  // ── 例 3: 脚本预处理 (autoworker 沙箱, 保留供 e2e 测试 X1 引用) ──
  // step.key 仍叫 "ingest" 是因为 X1 测试断言 envelope.outputs.ingest;
  // 但 nodeKey 改成 "script" 让 sandbox-js 接管, 且 autoworker 不再误碰 ingest 队列。
  const scriptSteps: Pipeline = [
    {
      key: "ingest", nodeKey: "script", label: "脚本预处理",
      params: {
        timeoutMs: 2000, memoryMb: 32,
        script: [
          "const text = String(inputs.text || '');",
          "const words = text.trim().split(/\\s+/).filter(Boolean);",
          "let h = 0; for (let i = 0; i < text.length; i++) h = ((h<<5)-h+text.charCodeAt(i))|0;",
          "return {",
          "  normalized: text.toLowerCase(),",
          "  wordCount: words.length,",
          "  charCount: text.length,",
          "  hash: (h>>>0).toString(16),",
          "};",
        ].join("\n"),
      },
      inputs: { text: "{{payload.text}}" },
    },
    {
      key: "review", nodeKey: "review", label: "人审",
      params: { rubric: "default" },
      routes: { on: "decision", cases: { approved: "next", rejected: "done" } },
    },
    { key: "store", nodeKey: "export", label: "入库", params: { format: "json" } },
  ];

  return [
    {
      name: "示例: 采集去重审核入库",
      description: "通用文本采集 + URL 字段去重 + 人工审核 + 入库",
      demoBatch: { name: "演示批次", target: 10 },
      steps: [
        {
          key: "ingest", nodeKey: "ingest", label: "采集",
          params: {
            source: "form", schema: collectFormSchema, uiSchema: collectFormUi,
            max_concurrent_per_user: 2, max_total_per_user: 3,
            // 步骤互斥 (双人合规): 审核过这个 item 的人不能再回头来采集
            disallowedFromSteps: ["review"],
          },
        },
        {
          key: "dedup", nodeKey: "dedup", label: "去重",
          params: { algo: "field-hash", dedupFields: ["url"] },
          routes: {
            on: "decision",
            cases: { keep: "next", duplicate: { goto: "ingest", maxLoops: 3 } },
          },
        },
        {
          key: "review", nodeKey: "review", label: "审核",
          // disallowedFromSteps: 采集人不能审自己 (反向: ingest 也禁了 review, 双向锁)
          // reviewedStepKey: 审核员看的是 ingest 步骤填的表单内容
          params: {
            rubric: "default", schema: collectFormSchema, uiSchema: collectFormUi,
            reviewedStepKey: "ingest",
            disallowedFromSteps: ["ingest"],
          },
          routes: {
            on: "decision",
            cases: { approved: "next", rejected: { goto: "ingest", maxLoops: 3 } },
          },
        },
        { key: "store", nodeKey: "export", label: "入库", params: { format: "json" } },
      ],
      layout: {
        positions: {
          ingest: { x: 100, y: 200 }, dedup: { x: 360, y: 200 },
          review: { x: 620, y: 200 }, store: { x: 880, y: 200 },
        },
      },
    },
    {
      name: "示例: 图片标注 yes/no",
      description: "上传图片 + 二元标注 → 人工审核 → 入库",
      demoBatch: { name: "演示批次", target: 5 },
      steps: [
        {
          key: "annotate", nodeKey: "ingest", label: "标注",
          params: {
            source: "form", schema: imageFormSchema, uiSchema: imageFormUi,
            max_concurrent_per_user: 2, max_total_per_user: 5,
          },
        },
        {
          key: "review", nodeKey: "review", label: "审核",
          // 审核员看的是 annotate 步骤填的图片+标签
          params: {
            rubric: "default", schema: imageFormSchema, uiSchema: imageFormUi,
            reviewedStepKey: "annotate",
          },
          routes: {
            on: "decision",
            cases: { approved: "next", rejected: { goto: "annotate", maxLoops: 3 } },
          },
        },
        { key: "store", nodeKey: "export", label: "入库", params: { format: "json" } },
      ],
      layout: {
        positions: { annotate: { x: 100, y: 200 }, review: { x: 380, y: 200 }, store: { x: 660, y: 200 } },
      },
    },
    {
      name: "示例: 脚本预处理",
      description: "node:vm 沙箱内跑用户脚本预处理 (供 e2e/X1 使用)",
      steps: scriptSteps,
      layout: {
        positions: { ingest: { x: 100, y: 200 }, review: { x: 380, y: 200 }, store: { x: 660, y: 200 } },
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────
// 一次性 backfill: 给老 pipeline_versions / pipelines 的 review 步骤补 reviewedStepKey
//
// 推断: 在 review step 之前的 steps 里, 倒序找第一个"有 form schema"的(即采集/标注那种
// 用户填表的步骤). 兜底取 i-1. 不假设 step.key 命名.
// ─────────────────────────────────────────────────────────────────────
async function backfillReviewedStepKey(sql: SQL) {
  for (const tableName of ["pipeline_versions", "pipelines"] as const) {
    // 全表扫. 自愈: 缺失 OR 指向非 form step (含老版被错误推到 dedup 这种) 的都修.
    const rows = await sql<{ id?: string; task_id?: string; steps: any[] }[]>`
      SELECT * FROM ${sql(tableName)}
    `;
    let patched = 0;
    for (const r of rows) {
      let dirty = false;
      const newSteps = r.steps.map((step: any, idx: number) => {
        if (step?.nodeKey !== "review") return step;
        const params = (step.params ?? {}) as Record<string, unknown>;
        const cur = typeof params.reviewedStepKey === "string" ? params.reviewedStepKey : null;
        // 倒序找前置的 form step (params.schema 存在)
        let bestKey: string | null = null;
        for (let j = idx - 1; j >= 0; j--) {
          const p = (r.steps[j].params ?? {}) as Record<string, unknown>;
          if (p.schema) { bestKey = r.steps[j].key; break; }
        }
        if (!bestKey && idx > 0) bestKey = r.steps[idx - 1].key;
        if (!bestKey) return step;
        // 已经指向 form step → 不动
        if (cur === bestKey) return step;
        // 当前指向的 step 也有 schema → 也不动 (尊重 admin 手工指定)
        if (cur) {
          const curStep = r.steps.find((s: any) => s.key === cur);
          const curParams = (curStep?.params ?? {}) as Record<string, unknown>;
          if (curParams.schema) return step;
        }
        dirty = true;
        return { ...step, params: { ...params, reviewedStepKey: bestKey } };
      });
      if (!dirty) continue;
      const pkCol = tableName === "pipeline_versions" ? "id" : "task_id";
      const pkVal = (r as any)[pkCol];
      await sql`UPDATE ${sql(tableName)} SET steps = ${sql.json(newSteps)} WHERE ${sql(pkCol)} = ${pkVal}`;
      patched += 1;
    }
    if (patched > 0) console.log(`[seed] backfilled reviewedStepKey on ${patched} rows in ${tableName}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 项目实例化 (pipelines + pipeline_versions v1)
// ─────────────────────────────────────────────────────────────────────
async function ensureProjectFromTemplate(sql: SQL, t: TemplateSpec, templateId: string) {
  const existing = await sql<{ task_id: string; current_version_id: string | null }[]>`
    SELECT task_id, current_version_id FROM pipelines
    WHERE name = ${t.name} AND tenant_id = ${DEFAULT_TENANT_ID}
  `;
  const stepsJson  = sql.json(t.steps as any);
  const layoutJson = t.layout ? sql.json(t.layout) : null;
  const forms      = extractForms(t.steps);
  const formsEtag  = jsonHash(forms);

  let taskId: string;
  if (existing.length === 0) {
    const [pipe] = await sql<{ task_id: string }[]>`
      INSERT INTO pipelines (tenant_id, name, steps, layout, template_id)
      VALUES (${DEFAULT_TENANT_ID}, ${t.name}, ${stepsJson}, ${layoutJson}, ${templateId})
      RETURNING task_id
    `;
    taskId = pipe.task_id;
  } else {
    taskId = existing[0].task_id;
    await sql`
      UPDATE pipelines
         SET steps       = ${stepsJson},
             layout      = ${layoutJson},
             template_id = ${templateId},
             updated_at  = NOW()
       WHERE task_id = ${taskId}
    `;
  }

  // 始终保证有一条 pipeline_versions 行 + current_version_id 指向它. cleanupBefore 已清空 keep 项目的 pv,
  // 所以这里基本是 INSERT v1; 真在已运行系统上要追加版本就 (max+1) 的逻辑也能 work。
  const [maxV] = await sql<{ v: number }[]>`
    SELECT COALESCE(MAX(version), 0) AS v FROM pipeline_versions WHERE task_id = ${taskId}
  `;
  const [pv] = await sql<{ id: string }[]>`
    INSERT INTO pipeline_versions
      (task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by)
    VALUES
      (${taskId}, ${DEFAULT_TENANT_ID}, ${maxV.v + 1}, ${stepsJson}, ${layoutJson},
       ${sql.json(forms as any)}, ${formsEtag}, 'system:seed')
    RETURNING id
  `;
  await sql`UPDATE pipelines SET current_version_id = ${pv.id} WHERE task_id = ${taskId}`;
  console.log(`[seed] project "${t.name}" ${existing.length === 0 ? "inserted" : "updated"} (v${maxV.v + 1})`);
}

async function ensureDemoBatch(sql: SQL, projectName: string, batchName: string, target: number) {
  const [pipe] = await sql<{ task_id: string; current_version_id: string | null }[]>`
    SELECT task_id, current_version_id FROM pipelines
    WHERE name = ${projectName} AND tenant_id = ${DEFAULT_TENANT_ID} LIMIT 1
  `;
  if (!pipe || !pipe.current_version_id) {
    console.log(`[seed] demo batch skipped (project "${projectName}" not ready)`);
    return;
  }

  const [pv] = await sql<{ steps: Pipeline }[]>`
    SELECT steps FROM pipeline_versions WHERE id = ${pipe.current_version_id}
  `;
  const firstStep = pv?.steps?.[0];
  if (!firstStep) return;

  const [batch] = await sql<{ id: string }[]>`
    INSERT INTO batches (tenant_id, task_id, name, target)
    VALUES (${DEFAULT_TENANT_ID}, ${pipe.task_id}, ${batchName}, ${target})
    RETURNING id
  `;
  for (let i = 0; i < target; i++) {
    const [it] = await sql<{ id: string }[]>`
      INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope)
      VALUES (${DEFAULT_TENANT_ID}, ${pipe.task_id}, ${pipe.current_version_id},
              ${firstStep.key}, ${sql.json({ payload: {}, outputs: {}, tags: {} })})
      RETURNING id
    `;
    await sql`
      INSERT INTO batch_items (tenant_id, batch_id, item_id)
      VALUES (${DEFAULT_TENANT_ID}, ${batch.id}, ${it.id})
    `;
    await sql`
      INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
      VALUES (${DEFAULT_TENANT_ID}, ${it.id}, ${pipe.task_id}, ${firstStep.key},
              ${firstStep.nodeKey}, 'pending', 1)
    `;
  }
  console.log(`[seed] demo batch "${batchName}" created for "${projectName}" (target=${target})`);
}

// ─── helpers ───────────────────────────────────────────────────────
function extractForms(steps: Pipeline): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of steps) {
    const params = (s.params ?? {}) as Record<string, unknown>;
    const schema = params.schema;
    const uiSchema = params.uiSchema;
    if (schema !== undefined || uiSchema !== undefined) {
      out[s.key] = { schema, uiSchema };
    }
  }
  return out;
}

function jsonHash(v: unknown): string {
  const s = JSON.stringify(v);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
