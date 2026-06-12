import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql, withCallerTx, asSystem } from "./db.ts";
import { applyResult, ResultError } from "./result-core.ts";
import { validateNodeOutput } from "./output-validator.ts";
import { audit } from "./audit.ts";
import { expandDisallowedSteps } from "./step-rules.ts";
import { mergeEffectiveParams, resolveBindings, type NodePresets, type InputsSchema } from "./node-config.ts";
import { pickDriver, autoNodeKeys, type DriverJob } from "./drivers/registry.ts";
import type {
  Envelope,
  ItemRow,
  Layout,
  NodeDefinition,
  OutboxRow,
  Pipeline,
} from "./types.ts";

const DEFAULT_NODE_VERSION = "1.0";

// ── pipeline 版本化辅助 ──
// publish 时从 steps 抽 forms (schema + uiSchema), 算 etag, 落到 pipeline_versions
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
function formsEtag(forms: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(forms)).digest("hex");
}

/**
 * 校验 pipeline 引用的所有 (nodeKey, nodeVersion) 都是 status='active'.
 * archived 节点不能进新 pipeline / 不能 publish 新版本 — 已在飞 item 通过 pinned pipeline_versions 不受影响.
 * 找不到 node_definitions 行视为合法 (兼容尚未 auto-upsert 的环境, 或自定义节点先有 step 后注册的场景).
 * archived 行才拒绝.
 *
 * 返回 null = 通过; 否则返回应当响应的 409 error body.
 */
async function checkArchivedNodeRefs(
  tx: import("./db.ts").SQL,
  steps: Pipeline,
): Promise<{ code: string; message: string; archived: { nodeKey: string; nodeVersion: string }[] } | null> {
  const uniq = new Map<string, { nodeKey: string; nodeVersion: string }>();
  for (const s of steps) {
    const v = s.nodeVersion ?? DEFAULT_NODE_VERSION;
    uniq.set(`${s.nodeKey}|${v}`, { nodeKey: s.nodeKey, nodeVersion: v });
  }
  if (uniq.size === 0) return null;
  const keys = [...uniq.values()].map((p) => p.nodeKey);
  const versions = [...uniq.values()].map((p) => p.nodeVersion);
  // 用 parallel unnest 做复合 IN, postgres.js 没有原生复合 tuple IN 语法
  const rows = await tx<{ key: string; version: string; status: string }[]>`
    SELECT nd.key, nd.version, nd.status FROM node_definitions nd
    JOIN unnest(${keys}::text[], ${versions}::text[]) AS t(k, v)
      ON nd.key = t.k AND nd.version = t.v
  `;
  const archived = rows
    .filter((r) => r.status === "archived")
    .map((r) => ({ nodeKey: r.key, nodeVersion: r.version }));
  if (archived.length === 0) return null;
  return {
    code: "ARCHIVED_NODE_REF",
    message: `pipeline 引用了 ${archived.length} 个 archived 节点, 请改用 active 版本或先 activate`,
    archived,
  };
}

// 调度核心所有 handler 都通过 withCallerTx 包一层事务 + 设 GUC,
// 让 RLS (tenant_isolation policy) 能在 caller 漏写 WHERE 时兜底。
//   - 系统级 caller (autoworker / reconciler) → asSystem 跳 RLS
//   - 租户级 caller → withTenant, 行级隔离强制生效
// INSERT 要点:
//   - 顶层创建 (items / pipelines / dataset_records) 的 tenant_id 取自 caller.tenantId
//   - 派生写入 (新 outbox / attempts) 的 tenant_id 取自父行 (outbox.tenant_id, item.tenant_id)
// SELECT/UPDATE 要点:
//   - 性能敏感路径 (列表 / 看板) 显式 WHERE tenant_id 走 (tenant_id, ...) 索引
//   - 单 id 查找 (e.g. pipelines WHERE task_id=?) 走 PK 即可, RLS 自动兜底

const StepConfigZ = z.object({
  key: z.string(),
  nodeKey: z.string(),
  nodeVersion: z.string().optional(),
  label: z.string().optional(),
  params: z.record(z.unknown()).default({}),
  /**
   * Phase 3: 运行时输入绑定. 值是表达式字符串或字面量, lease 服务端 resolver 求值后写入 job.inputs.
   * 不校验内部表达式形态 (resolveBindings 容错: 缺失路径返回 undefined, 不抛).
   */
  inputs: z.record(z.unknown()).optional(),
  routes: z
    .object({
      on: z.string(),
      cases: z.record(z.unknown()),
      default: z.unknown().optional(),
    })
    .optional(),
  policy: z
    .object({
      timeoutMs: z.number().optional(),
      maxAttempts: z.number().optional(),
      baseBackoffMs: z.number().optional(),
    })
    .optional(),
});

export function registerRoutes(app: FastifyInstance) {
  // ============ Caller 自描述 (前端 banner / tenant 标签用) ============
  // 把 caller 上下文里的关键字段映射出来. 不连库 — 纯请求级数据.
  app.get("/api/v1/me", async (req, reply) => {
    if (!req.caller) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
    }
    return {
      id: req.caller.id,
      name: req.caller.name,
      scope: req.caller.scope,
      tenantId: req.caller.tenantId,
      isSystemActor: req.caller.isSystemActor,
      permissions: [...req.caller.permissions],
    };
  });

  // ============ Dev-only: 列出 demo 租户 + 明文 dev key, 给前端 switcher 用 ============
  // 严格 gate: 只在 AUTH_REQUIRED=false 或 DEV_TENANT_PICKER=true 时返回数据;
  //          生产环境 (AUTH_REQUIRED=true 且未显式开 picker) 一律 404.
  // 设计意图: 开发 / 演示态前端能"一键切租户"看 isolation; 上生产时改 env 即关掉,
  //          外部 admin/worker 服务自带 key, 不需要这个端点.
  app.get("/api/v1/dev/tenants", async (req, reply) => {
    const enabled =
      process.env.AUTH_REQUIRED === "false" ||
      process.env.DEV_TENANT_PICKER === "true";
    if (!enabled) {
      return reply.code(404).send({ error: { code: "NOT_FOUND" } });
    }
    // demo key plaintext 与 seed.ts 中 DEMO_TENANTS 一致; 这里硬编码避免循环依赖
    // (seed.ts 是 CLI 入口, registerRoutes 不应该 import 它的内部常量).
    const demos = [
      { slug: "default", name: "Default Tenant", devKey: null as string | null },
      { slug: "acme",    name: "Acme Corp",      devKey: "dev-acme-admin-2026" },
      { slug: "globex",  name: "Globex Inc",     devKey: "dev-globex-admin-2026" },
    ];
    // 跟 DB 校验 tenant 实际存在 (避免用户没跑 seed 显示死链)
    const rows = await asSystem(async (tx) =>
      tx<{ slug: string; id: string }[]>`
        SELECT slug, id FROM tenants
        WHERE slug = ANY(${demos.map((d) => d.slug)})
      `
    );
    const present = new Map(rows.map((r) => [r.slug, r.id]));
    return {
      tenants: demos
        .filter((d) => present.has(d.slug))
        .map((d) => ({ slug: d.slug, name: d.name, tenantId: present.get(d.slug), devKey: d.devKey })),
    };
  });

  // ============ Node definitions (全局, 跨租户共享) ============
  app.get("/api/v1/nodes", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      // node_definitions 没有 tenant_id 列, RLS 不生效, asSystem/withTenant 都能读
      const rows = await tx<NodeDefinition[]>`
        SELECT DISTINCT ON (key) * FROM node_definitions ORDER BY key, version DESC
      `;
      return { nodes: rows };
    }),
  );

  // ============ Pipelines (CRUD for ReactFlow editor) ============
  app.get("/api/v1/pipelines", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      // 显式 tenant_id 利用 idx_pipelines_tenant_updated; 系统模式下 RLS 不限, 看全部
      const rows = await tx`
        SELECT task_id, name, jsonb_array_length(steps) AS step_count, status, updated_at
        FROM pipelines
        ${req.caller!.isSystemActor
          ? tx``
          : tx`WHERE tenant_id = ${req.caller!.tenantId}`}
        ORDER BY updated_at DESC
      `;
      return { pipelines: rows };
    }),
  );

  app.get<{ Params: { id: string } }>("/api/v1/pipelines/:id", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx`
        SELECT * FROM pipelines WHERE task_id = ${req.params.id}
      `;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      return rows[0];
    }),
  );

  app.post<{ Body: { name: string; steps: Pipeline; layout?: Layout } }>(
    "/api/v1/pipelines/create",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z
          .object({
            name: z.string(),
            steps: z.array(StepConfigZ),
            layout: z.object({ positions: z.record(z.object({ x: z.number(), y: z.number() })) }).optional(),
          })
          .parse(req.body);

        const archErr = await checkArchivedNodeRefs(tx, body.steps as Pipeline);
        if (archErr) return reply.code(409).send({ error: archErr });

        // 创建顺序: INSERT pipelines (current_version_id 暂 NULL) → INSERT pipeline_versions v=1
        // → UPDATE pipelines.current_version_id ← v1.id
        // pipelines.current_version_id 必须 NULLable (应用层保证非 NULL),
        // 因为 NOT NULL 不支持 DEFERRABLE, 否则与 pipeline_versions.task_id FK 形成创建期循环依赖。
        const tid = req.caller!.tenantId;
        const layoutJson = body.layout ? tx.json(body.layout) : null;
        const stepsJson = tx.json(body.steps);
        const forms = extractForms(body.steps as Pipeline);
        const etag = formsEtag(forms);

        const [pipe] = await tx<{ task_id: string }[]>`
          INSERT INTO pipelines (tenant_id, name, steps, layout)
          VALUES (${tid}, ${body.name}, ${stepsJson}, ${layoutJson})
          RETURNING task_id
        `;

        const [pv] = await tx<{ id: string }[]>`
          INSERT INTO pipeline_versions (
            task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by
          ) VALUES (
            ${pipe.task_id}, ${tid}, 1, ${stepsJson}, ${layoutJson},
            ${tx.json(forms)}, ${etag}, ${req.caller!.id}
          )
          RETURNING id
        `;

        const [final] = await tx`
          UPDATE pipelines
             SET current_version_id = ${pv.id}, updated_at = NOW()
           WHERE task_id = ${pipe.task_id}
          RETURNING *
        `;
        audit(req, "pipeline.create", { kind: "pipeline", id: pipe.task_id },
              null, { name: body.name, version: 1 });
        return final;
      }),
  );

  app.post<{ Params: { id: string }; Body: { name?: string; steps?: Pipeline; layout?: Layout } }>(
    "/api/v1/pipelines/:id/save",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z
          .object({
            name: z.string().optional(),
            steps: z.array(StepConfigZ).optional(),
            layout: z.object({ positions: z.record(z.object({ x: z.number(), y: z.number() })) }).optional(),
          })
          .parse(req.body);

        if (body.steps) {
          const archErr = await checkArchivedNodeRefs(tx, body.steps as Pipeline);
          if (archErr) return reply.code(409).send({ error: archErr });

          const inflight = await tx<{ step_key: string; node_key: string; item_id: string }[]>`
            SELECT DISTINCT step_key, node_key, item_id FROM outbox
            WHERE task_id = ${req.params.id} AND status IN ('pending', 'leased')
          `;
          if (inflight.length > 0) {
            const newStepMap = new Map(body.steps.map((s) => [s.key, s.nodeKey]));
            const conflicts = inflight.filter((r) => newStepMap.get(r.step_key) !== r.node_key);
            if (conflicts.length > 0) {
              return reply.code(409).send({
                error: {
                  code: "INFLIGHT_STEPS_CONFLICT",
                  message: `${conflicts.length} in-flight run(s) reference steps that would be removed or have their nodeKey changed`,
                  conflicts: conflicts.map((c) => ({
                    itemId: c.item_id,
                    stepKey: c.step_key,
                    nodeKey: c.node_key,
                  })),
                },
              });
            }
          }
        }

        // 如果改了 steps/layout, 创建一个新 pipeline_versions 行 + 切 current_version_id (auto-publish)
        // 旧版本保留, 已在飞行的 item 仍读它们 pinned 的旧版本; 新创建的 item 读新版本
        let newVersionId: string | null = null;
        if (body.steps || body.layout) {
          const [cur] = await tx<{
            tenant_id: string;
            steps: Pipeline;
            layout: Layout | null;
          }[]>`
            SELECT tenant_id, steps, layout FROM pipelines WHERE task_id = ${req.params.id}
          `;
          if (!cur) return reply.code(404).send({ error: { code: "NOT_FOUND" } });

          const newSteps = body.steps ?? cur.steps;
          const newLayout = body.layout ?? cur.layout;
          const newForms = extractForms(newSteps as Pipeline);
          const newEtag = formsEtag(newForms);

          const [maxVer] = await tx<{ v: number }[]>`
            SELECT COALESCE(MAX(version), 0) AS v
              FROM pipeline_versions WHERE task_id = ${req.params.id}
          `;
          const [pv] = await tx<{ id: string }[]>`
            INSERT INTO pipeline_versions (
              task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by
            ) VALUES (
              ${req.params.id}, ${cur.tenant_id}, ${maxVer.v + 1},
              ${tx.json(newSteps)}, ${newLayout ? tx.json(newLayout) : null},
              ${tx.json(newForms)}, ${newEtag}, ${req.caller!.id}
            )
            RETURNING id
          `;
          newVersionId = pv.id;
        }

        const rows = await tx`
          UPDATE pipelines SET
            name = COALESCE(${body.name ?? null}, name),
            steps = COALESCE(${body.steps ? tx.json(body.steps) : null}, steps),
            layout = COALESCE(${body.layout ? tx.json(body.layout) : null}, layout),
            current_version_id = COALESCE(${newVersionId}, current_version_id),
            updated_at = NOW()
          WHERE task_id = ${req.params.id}
          RETURNING *
        `;
        if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        if (newVersionId) {
          audit(req, "pipeline.publish", { kind: "pipeline", id: req.params.id },
                null, { newVersionId, fields: Object.keys(body) });
        }
        return rows[0];
      }),
  );

  app.delete<{ Params: { id: string } }>("/api/v1/pipelines/:id", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const r = await tx`DELETE FROM pipelines WHERE task_id = ${req.params.id} RETURNING name`;
      if (r.length > 0) {
        audit(req, "pipeline.delete", { kind: "pipeline", id: req.params.id },
              { name: r[0].name }, null);
      }
      return { ok: true };
    }),
  );

  // ── pipeline 暂停 / 恢复 (硬停: autoworker lease 跳过, 新认领拒) ──
  // 已 leased 的 run 不动, 仍可 post /result 走完 — 优雅 drain.
  app.post<{ Params: { id: string } }>("/api/v1/pipelines/:id/pause", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx<{ name: string; status: string }[]>`
        UPDATE pipelines SET status = 'paused', updated_at = NOW()
        WHERE task_id = ${req.params.id} AND status = 'active'
        RETURNING name, status
      `;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND_OR_NOT_ACTIVE" } });
      audit(req, "pipeline.pause", { kind: "pipeline", id: req.params.id },
            { status: "active" }, { status: "paused" });
      return { ok: true, status: rows[0].status };
    }),
  );
  app.post<{ Params: { id: string } }>("/api/v1/pipelines/:id/resume", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx<{ status: string }[]>`
        UPDATE pipelines SET status = 'active', updated_at = NOW()
        WHERE task_id = ${req.params.id} AND status = 'paused'
        RETURNING status
      `;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND_OR_NOT_PAUSED" } });
      audit(req, "pipeline.resume", { kind: "pipeline", id: req.params.id },
            { status: "paused" }, { status: "active" });
      return { ok: true, status: rows[0].status };
    }),
  );

  // 前端表单渲染只需要 schema/uiSchema, 无需暴露 routes/policy/layout
  // ETag = pipeline_versions.forms_etag, 客户端 If-None-Match → 304
  app.get<{ Params: { id: string } }>(
    "/api/v1/pipelines/:id/forms",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const [row] = await tx<{ forms: Record<string, unknown>; forms_etag: string; version: number }[]>`
          SELECT pv.forms, pv.forms_etag, pv.version
          FROM pipelines p JOIN pipeline_versions pv ON pv.id = p.current_version_id
          WHERE p.task_id = ${req.params.id}
        `;
        if (!row) return reply.code(404).send({ error: { code: "NOT_FOUND" } });

        const ifNoneMatch = req.headers["if-none-match"];
        const etag = `"${row.forms_etag}"`;
        if (ifNoneMatch === etag) {
          reply.code(304).header("etag", etag).send();
          return reply;
        }
        reply.header("etag", etag).header("cache-control", "private, max-age=300");
        return { version: row.version, forms: row.forms };
      }),
  );

  // ============ Items: ingest ============
  app.post<{
    Body: { taskId: string; envelope?: Partial<Envelope>; startStep?: string };
  }>("/api/v1/items/create", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const body = z
        .object({
          taskId: z.string(),
          envelope: z
            .object({
              payload: z.record(z.unknown()).default({}),
              outputs: z.record(z.unknown()).default({}),
              tags: z.record(z.string()).default({}),
            })
            .partial()
            .default({}),
          startStep: z.string().optional(),
        })
        .parse(req.body);

      // 读 pipeline 的当前版本: items 钉死该版本, save 后新版本不影响存量 item
      const pipeRows = await tx<{ tenant_id: string; current_version_id: string | null }[]>`
        SELECT tenant_id, current_version_id FROM pipelines WHERE task_id = ${body.taskId}
      `;
      if (pipeRows.length === 0 || !pipeRows[0].current_version_id)
        return reply.code(404).send({ error: { code: "PIPELINE_NOT_FOUND" } });

      const { tenant_id: pipeTenant, current_version_id: pvId } = pipeRows[0];
      const [pv] = await tx<{ steps: Pipeline }[]>`
        SELECT steps FROM pipeline_versions WHERE id = ${pvId}
      `;
      const steps = pv?.steps ?? [];
      if (steps.length === 0)
        return reply.code(400).send({ error: { code: "EMPTY_PIPELINE" } });

      const startStep = body.startStep ?? steps[0].key;
      const startNode = steps.find((s) => s.key === startStep);
      if (!startNode)
        return reply.code(400).send({ error: { code: "INVALID_START_STEP" } });

      const envelope: Envelope = {
        payload: body.envelope.payload ?? {},
        outputs: body.envelope.outputs ?? {},
        tags: body.envelope.tags ?? {},
      };

      // items 钉死 pipeline_version_id; outbox.tenant_id 跟随 pipeline
      const it = await tx<{ id: string }[]>`
        INSERT INTO items (tenant_id, task_id, pipeline_version_id, current_step, envelope)
        VALUES (${pipeTenant}, ${body.taskId}, ${pvId}, ${startStep}, ${tx.json(envelope)})
        RETURNING id
      `;
      const itemId = it[0].id;
      const ob = await tx<{ run_id: string }[]>`
        INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
        VALUES (${pipeTenant}, ${itemId}, ${body.taskId}, ${startStep}, ${startNode.nodeKey}, 'pending', 1)
        RETURNING run_id
      `;
      return { itemId, runId: ob[0].run_id };
    }),
  );

  app.get<{ Params: { id: string } }>("/api/v1/items/:id", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx<ItemRow[]>`
        SELECT * FROM items WHERE id = ${req.params.id}
      `;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      const item = rows[0];
      const inflight = await tx<OutboxRow[]>`
        SELECT * FROM outbox
        WHERE item_id = ${req.params.id} AND status IN ('pending','leased')
        ORDER BY created_at DESC
      `;
      const history = await tx`
        SELECT * FROM attempts WHERE item_id = ${req.params.id}
        ORDER BY finished_at ASC LIMIT 100
      `;
      const batchRows = await tx<{ batch_id: string; batch_name: string }[]>`
        SELECT bi.batch_id, b.name AS batch_name
        FROM batch_items bi JOIN batches b ON b.id = bi.batch_id
        WHERE bi.item_id = ${req.params.id}
        LIMIT 1
      `;
      const batch = batchRows[0]
        ? { id: batchRows[0].batch_id, name: batchRows[0].batch_name }
        : null;
      return { item, inflight, history, batch };
    }),
  );

  // 拉 item 钉死版本对应的 pipeline 快照. 跟 GET /pipelines/:id 区别在:
  //   - GET /pipelines/:id 永远返当前 (current_version_id) 版, 给 admin editor 用
  //   - GET /items/:id/pipeline 按 items.pipeline_version_id 取, 给 collect/review 这类
  //     "在飞 item 视图" 用 — admin 改 schema 不污染在飞行
  app.get<{ Params: { id: string } }>("/api/v1/items/:id/pipeline", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx<{
        task_id: string;
        name: string;
        version: number;
        steps: Pipeline;
        layout: Layout | null;
        updated_at: string;
      }[]>`
        SELECT p.task_id, p.name, pv.version, pv.steps, pv.layout, pv.published_at AS updated_at
        FROM items i
        JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
        JOIN pipelines p          ON p.task_id = pv.task_id
        WHERE i.id = ${req.params.id}
      `;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      return rows[0];
    }),
  );

  app.get<{ Params: { taskId: string } }>("/api/v1/tasks/:taskId/items", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      // task_id 已唯一定位; tenant 由 RLS 兜底
      const rows = await tx<ItemRow[]>`
        SELECT * FROM items WHERE task_id = ${req.params.taskId}
        ORDER BY created_at DESC LIMIT 200
      `;
      return { items: rows };
    }),
  );

  // ============ Queue: lease (Pull) ============
  // autoworker 跨租户消费, caller 是 system-actor → asSystem
  // 业务层代行用户的 lease (理论可能, 当前只见 autoworker) → withTenant, 同租户内 lease
  app.post<{
    Params: { nodeKey: string };
    Body: { workerId: string; batchSize?: number; leaseSeconds?: number; perTaskLimit?: number };
  }>("/api/v1/queue/:nodeKey/lease", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const raw = z
        .object({
          workerId: z.string(),
          batchSize: z.number().int().min(1).max(50).default(1),
          leaseSeconds: z.number().int().min(5).max(3600).default(60),
          perTaskLimit: z.number().int().min(1).max(50).optional(),
        })
        .parse(req.body);
      const body = { ...raw, perTaskLimit: raw.perTaskLimit ?? raw.batchSize };

      const nodeKey = req.params.nodeKey;

      // 一条 SQL 完成: lease + join items + join pipeline_versions (item 钉死版本).
      //
      // picked 必须 AS MATERIALIZED — 否则 planner 会把 inner SELECT inline 成
      // nested-loop semi-join, 让 LIMIT/SKIP LOCKED 在 outer 每行循环都重新执行,
      // 累积 lock 整张 outbox. PG 12+ 默认 CTE 是 CAN_INLINE, 必须显式物化.
      // EXPLAIN 验证: 不加 MATERIALIZED 时 outer Seq Scan 全表 + inner loops=outer-rows.
      type LeasedRow = OutboxRow & { envelope: Envelope; steps: Pipeline };
      // pipeline.status='paused' 的 outbox 行直接跳过 (硬停, autoworker 不消费).
      // node_definitions.status!='active' 的节点不再 lease: archive/activate 成为运行期开关.
      // eligible 先按 task_id 做窗口, picked 再锁 outbox, 形成最小公平调度:
      // 单次 lease 每个 pipeline 最多取 perTaskLimit 条, 避免单个 pipeline 独占同一 nodeKey 队列.
      const leased = await tx<LeasedRow[]>`
        WITH eligible AS MATERIALIZED (
          SELECT
            o.run_id,
            ROW_NUMBER() OVER (PARTITION BY o.task_id ORDER BY o.scheduled_at ASC, o.run_id ASC) AS task_rank
          FROM outbox o
          WHERE o.node_key = ${nodeKey}
            AND o.status = 'pending'
            AND o.scheduled_at <= NOW()
            AND EXISTS (
              SELECT 1 FROM pipelines p
               WHERE p.task_id = o.task_id AND p.status = 'active'
            )
            AND EXISTS (
              SELECT 1
              FROM items i
              JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
              JOIN LATERAL jsonb_array_elements(pv.steps) s ON TRUE
              JOIN node_definitions nd
                ON nd.key = o.node_key
               AND nd.version = COALESCE(s->>'nodeVersion', ${DEFAULT_NODE_VERSION})
               AND nd.status = 'active'
              WHERE i.id = o.item_id
                AND s->>'key' = o.step_key
                AND s->>'nodeKey' = o.node_key
            )
        ),
        picked AS MATERIALIZED (
          SELECT o.run_id
          FROM outbox o
          JOIN eligible e ON e.run_id = o.run_id
          WHERE e.task_rank <= ${body.perTaskLimit}
          ORDER BY e.task_rank ASC, o.scheduled_at ASC, o.run_id ASC
          LIMIT ${body.batchSize}
          FOR UPDATE OF o SKIP LOCKED
        ),
        leased AS (
          UPDATE outbox SET
            status = 'leased',
            leased_by = ${body.workerId},
            leased_at = NOW(),
            expected_by = NOW() + ${body.leaseSeconds} * INTERVAL '1 second',
            updated_at = NOW()
          WHERE run_id IN (SELECT run_id FROM picked)
          RETURNING *
        )
        SELECT l.*, i.envelope, pv.steps
        FROM leased l
        JOIN items             i  ON i.id  = l.item_id
        JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
      `;

      if (leased.length === 0) return { jobs: [] };

      // ── Phase 2/3 服务端 merge + bindings 解析 ──
      // 收集 batch 内唯一 (nodeKey, nodeVersion) 对; 单 round-trip 取 presets + inputs_schema;
      // 用 mergeEffectiveParams 把 step.params 与 presets 合并, 用 resolveBindings 把 step.inputs
      // 与 envelope 上下文求值, 写入 job.params + job.inputs, paths A/B/C 一致.
      // 不在 picked CTE 里 JOIN node_definitions — 避免 planner 把 lookup 推进 SKIP LOCKED 循环.
      //
      // 一致性: 下面的 SELECT 复用同一 `tx` (withCallerTx 提供), 跟 picked+leased CTE 在同一事务里,
      // 读到的是事务开始时的 node_definitions 快照. 即使 autoworker 在 lease 期间 upsert, 也不会让本批
      // jobs 拿到混合版本. 维护者注意: 不要把这次 SELECT 改成走 `sql` 全局连接, 那样就破坏快照一致性.
      type RowMeta = {
        nodeKey: string;
        nodeVersion: string;
        stepParams: Record<string, unknown>;
        stepInputs: Record<string, unknown>;
      };
      const rowMetas: RowMeta[] = leased.map((r) => {
        const stepConfig = r.steps.find((s) => s.key === r.step_key);
        return {
          nodeKey: r.node_key,
          nodeVersion: stepConfig?.nodeVersion ?? DEFAULT_NODE_VERSION,
          stepParams: (stepConfig?.params ?? {}) as Record<string, unknown>,
          stepInputs: (stepConfig?.inputs ?? {}) as Record<string, unknown>,
        };
      });
      const uniquePairs = new Set<string>(rowMetas.map((m) => `${m.nodeKey}|${m.nodeVersion}`));
      const ndMap = new Map<string, { presets: NodePresets | null; inputs_schema: InputsSchema | null }>();
      for (const pair of uniquePairs) {
        const [k, v] = pair.split("|");
        const rows = await tx<{ presets: NodePresets | null; inputs_schema: InputsSchema | null }[]>`
          SELECT presets, inputs_schema FROM node_definitions WHERE key = ${k} AND version = ${v}
        `;
        ndMap.set(pair, {
          presets: rows[0]?.presets ?? null,
          inputs_schema: rows[0]?.inputs_schema ?? null,
        });
      }

      const jobs = leased.map((r, i) => {
        const meta = rowMetas[i];
        const nd = ndMap.get(`${meta.nodeKey}|${meta.nodeVersion}`) ?? { presets: null, inputs_schema: null };
        const effectiveParams = mergeEffectiveParams(meta.stepParams, nd.presets);
        const resolvedInputs = resolveBindings(
          meta.stepInputs,
          (nd.inputs_schema?.properties ?? {}) as Record<string, { defaultBinding?: string }>,
          {
            payload: r.envelope.payload,
            outputs: r.envelope.outputs,
            tags: r.envelope.tags,
          },
        );
        return {
          runId: r.run_id,
          itemId: r.item_id,
          taskId: r.task_id,
          tenantId: r.tenant_id, // 让 worker 拿到 tenant_id 用于回调时转发
          stepKey: r.step_key,
          nodeKey: r.node_key,
          nodeVersion: meta.nodeVersion,
          params: effectiveParams,
          inputs: resolvedInputs,
          envelope: r.envelope,
          ctx: {
            runId: r.run_id,
            attempt: r.attempt,
            deadline: r.expected_by,
          },
        };
      });
      return { jobs };
    }),
  );

  // ============ Queue: release ============
  // parkSeconds 可选: 把 scheduled_at 推到 NOW() + parkSeconds, 避免立即被同一 worker 再次 lease。
  // 用于 autoworker 拿到一个 NO_DRIVER 任务 (典型是 ingest source=form/manual, 等用户来 claim) 时,
  // 既不失败也不立刻热循环, 给人工 claim 足够时间。
  app.post<{ Params: { runId: string }; Body: { workerId: string; parkSeconds?: number } }>(
    "/api/v1/queue/lease/:runId/release",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({
          workerId: z.string(),
          parkSeconds: z.number().int().min(0).max(3600).optional(),
        }).parse(req.body);
        const park = body.parkSeconds ?? 0;
        const rows = await tx<OutboxRow[]>`
          UPDATE outbox SET
            status = 'pending',
            leased_by = NULL,
            leased_at = NULL,
            expected_by = NULL,
            scheduled_at = CASE WHEN ${park} > 0
              THEN NOW() + ${park} * INTERVAL '1 second'
              ELSE scheduled_at END,
            updated_at = NOW()
          WHERE run_id = ${req.params.runId}
            AND status = 'leased'
            AND leased_by = ${body.workerId}
          RETURNING *
        `;
        if (rows.length === 0) return reply.code(409).send({ error: { code: "LEASE_LOST" } });
        return { ok: true };
      }),
  );

  // ============ Queue: heartbeat ============
  app.post<{ Params: { runId: string }; Body: { workerId: string; extendSeconds: number } }>(
    "/api/v1/queue/lease/:runId/heartbeat",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z
          .object({ workerId: z.string(), extendSeconds: z.number().int().min(5).max(3600) })
          .parse(req.body);
        const rows = await tx<{ expected_by: string }[]>`
          UPDATE outbox SET
            expected_by = NOW() + ${body.extendSeconds} * INTERVAL '1 second',
            updated_at = NOW()
          WHERE run_id = ${req.params.runId}
            AND status = 'leased'
            AND leased_by = ${body.workerId}
          RETURNING expected_by
        `;
        if (rows.length === 0) return reply.code(409).send({ error: { code: "LEASE_LOST" } });
        return { newExpectedBy: rows[0].expected_by };
      }),
  );

  // ============ Result (Receiver) ============
  // applyResult 自己开 sql.begin; 这里把 caller 信息穿过去, 让其内部决定 system / tenant
  app.post<{
    Body: {
      runId: string;
      status: "success" | "failed";
      output?: Record<string, unknown>;
      error?: { code: string; message: string; retryable?: boolean };
      nextHint?: string;
    };
  }>("/api/v1/result", async (req, reply) => {
    const body = z
      .object({
        runId: z.string(),
        status: z.enum(["success", "failed"]),
        output: z.record(z.unknown()).optional(),
        error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean().optional() }).optional(),
        nextHint: z.string().optional(),
      })
      .parse(req.body);

    try {
      return await withCallerTx(req.caller, (tx) => applyResult(body, tx));
    } catch (e) {
      if (e instanceof ResultError) {
        return reply.code(e.httpStatus).send({ error: { code: e.code, message: e.message } });
      }
      throw e;
    }
  });

  // ============ Admin ============
  app.get("/api/v1/admin/stuck", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx`
        SELECT i.*, (
          SELECT to_jsonb(a.*) FROM attempts a
          WHERE a.item_id = i.id ORDER BY finished_at DESC LIMIT 1
        ) AS last_attempt,
        (
          SELECT to_jsonb(rr.*) FROM replay_requests rr
          WHERE rr.item_id = i.id AND rr.status = 'pending' LIMIT 1
        ) AS replay_request
        FROM items i WHERE i.current_step = 'stuck'
        ${req.caller!.isSystemActor
          ? tx``
          : tx`AND i.tenant_id = ${req.caller!.tenantId}`}
        ORDER BY i.updated_at DESC LIMIT 200
      `;
      return { items: rows };
    }),
  );

  // ============ 节点管理 (Admin: node catalog) ============
  //
  // 全局表, 跨租户共享; 列表/详情走 asSystem 不被 RLS 切.
  // usages 显示"被哪些模板/在飞 item 引用" — 列表本身全局可见, 但具体引用按 caller.tenantId 过滤
  //   (admin caller 是 system 时返回所有租户 aggregate). 这样:
  //   - tenant_admin 只能看到自己租户里谁引用了这个节点 — 防 cross-tenant 信息泄漏
  //   - 系统 admin 看 aggregate, 用于判断"能否真的下线 archived 节点"
  app.get("/api/v1/admin/nodes", async (req) =>
    asSystem(async (tx) => {
      const q = z.object({
        status:   z.enum(["active", "archived", "paused"]).optional(),
        category: z.string().optional(),
        runMode:  z.string().optional(),
        search:   z.string().optional(),
      }).parse(req.query ?? {});

      // 每个 (key) 取所有版本 + 是否有任何 active 版本 + 引用数 (按 caller tenant 过滤)
      const tenantFilter = req.caller?.isSystemActor
        ? tx``
        : tx`AND p.tenant_id = ${req.caller!.tenantId}`;

      type Row = {
        key: string;
        version: string;
        display_name: string;
        status: string;
        category: string | null;
        run_mode: string | null;
        description: string | null;
        idempotent: boolean;
        manual: boolean;
        updated_at: string;
        usage_count: number;
        supports_dry_run: boolean;
        has_examples: boolean;
        pending_count: number;
        inflight_count: number;
      };
      const rows = await tx<Row[]>`
        SELECT
          nd.key, nd.version, nd.display_name, nd.status,
          nd.category, nd.run_mode, nd.description,
          nd.idempotent, nd.manual, nd.updated_at,
          nd.supports_dry_run,
          (nd.examples IS NOT NULL AND jsonb_array_length(nd.examples) > 0) AS has_examples,
          COUNT(DISTINCT pv.task_id) FILTER (WHERE pv.task_id IS NOT NULL)::int AS usage_count,
          COUNT(DISTINCT o_p.run_id)::int AS pending_count,
          COUNT(DISTINCT o_l.run_id)::int AS inflight_count
        FROM node_definitions nd
        LEFT JOIN outbox o_p ON o_p.node_key = nd.key AND o_p.status = 'pending'
        LEFT JOIN outbox o_l ON o_l.node_key = nd.key AND o_l.status = 'leased'
        LEFT JOIN pipeline_versions pv
          ON EXISTS (
            SELECT 1 FROM jsonb_array_elements(pv.steps) s
            WHERE s->>'nodeKey' = nd.key
              AND COALESCE(s->>'nodeVersion', '1.0') = nd.version
          )
        LEFT JOIN pipelines p
          ON p.task_id = pv.task_id AND p.current_version_id = pv.id
          ${tenantFilter}
        WHERE 1=1
          ${q.status   ? tx`AND nd.status   = ${q.status}`     : tx``}
          ${q.category ? tx`AND nd.category = ${q.category}`   : tx``}
          ${q.runMode  ? tx`AND nd.run_mode = ${q.runMode}`    : tx``}
          ${q.search   ? tx`AND (nd.key ILIKE ${'%'+q.search+'%'} OR nd.display_name ILIKE ${'%'+q.search+'%'})` : tx``}
        GROUP BY nd.key, nd.version, nd.display_name, nd.status, nd.category,
                 nd.run_mode, nd.description, nd.idempotent, nd.manual, nd.updated_at,
                 nd.supports_dry_run, nd.examples
        ORDER BY nd.key ASC, nd.version DESC
      `;
      return { nodes: rows };
    }),
  );

  app.post<{
    Body: {
      key: string; version: string; displayName: string;
      paramsSchema: Record<string, unknown>;
      uiSchema?: Record<string, unknown> | null;
      presets?: NodePresets | null;
      inputsSchema?: InputsSchema | null;
      outputsSchema?: Record<string, unknown> | null;
      status?: "active" | "archived";
      category?: string | null; runMode?: string | null; description?: string | null;
      idempotent?: boolean; defaultTimeoutMs?: number; defaultMaxAttempts?: number; manual?: boolean;
    };
  }>(
    "/api/v1/admin/nodes",
    async (req, reply) =>
      asSystem(async (tx) => {
        const body = z.object({
          key:               z.string().min(1).regex(/^[a-zA-Z0-9_.:-]+$/, "key must be alphanumeric/._:-"),
          version:           z.string().min(1),
          displayName:       z.string().min(1),
          paramsSchema:      z.record(z.unknown()),
          uiSchema:          z.record(z.unknown()).nullable().optional(),
          presets:           z.record(z.unknown()).nullable().optional(),
          inputsSchema:      z.record(z.unknown()).nullable().optional(),
          outputsSchema:     z.record(z.unknown()).nullable().optional(),
          status:            z.enum(["active", "archived"]).default("active"),
          category:          z.string().nullable().optional(),
          runMode:           z.string().nullable().optional(),
          description:       z.string().nullable().optional(),
          idempotent:        z.boolean().default(true),
          defaultTimeoutMs:  z.number().int().min(1000).default(30000),
          defaultMaxAttempts:z.number().int().min(1).max(20).default(3),
          manual:            z.boolean().optional(),
        }).parse(req.body);
        const isManual = body.manual ?? body.runMode === "manual";
        try {
          const [node] = await tx<NodeDefinition[]>`
            INSERT INTO node_definitions (
              key, version, display_name, params_schema, ui_schema, presets, inputs_schema,
              outputs_schema, status, category, run_mode, description,
              idempotent, default_timeout_ms, default_max_attempts, manual
            ) VALUES (
              ${body.key}, ${body.version}, ${body.displayName}, ${tx.json(body.paramsSchema)},
              ${body.uiSchema     != null ? tx.json(body.uiSchema)     : null},
              ${body.presets      != null ? tx.json(body.presets)      : null},
              ${body.inputsSchema != null ? tx.json(body.inputsSchema) : null},
              ${body.outputsSchema!= null ? tx.json(body.outputsSchema): null},
              ${body.status}, ${body.category ?? null}, ${body.runMode ?? null}, ${body.description ?? null},
              ${body.idempotent}, ${body.defaultTimeoutMs}, ${body.defaultMaxAttempts}, ${isManual}
            )
            RETURNING *
          `;
          audit(req, "node.create", { kind: "node", id: `${body.key}@${body.version}` },
                null, { status: node.status, runMode: node.run_mode });
          return reply.code(201).send({ node });
        } catch (e: any) {
          if (String(e?.code) === "23505")
            return reply.code(409).send({ error: { code: "NODE_ALREADY_EXISTS", message: `${body.key}@${body.version} already exists` } });
          throw e;
        }
      }),
  );

  app.patch<{
    Params: { key: string; version: string };
    Body: {
      displayName?: string;
      paramsSchema?: Record<string, unknown>;
      uiSchema?: Record<string, unknown> | null;
      presets?: Record<string, unknown> | null;
      inputsSchema?: Record<string, unknown> | null;
      outputsSchema?: Record<string, unknown> | null;
      category?: string | null; runMode?: string | null; description?: string | null;
      idempotent?: boolean; defaultTimeoutMs?: number; defaultMaxAttempts?: number; manual?: boolean;
    };
  }>(
    "/api/v1/admin/nodes/:key/:version",
    async (req, reply) =>
      asSystem(async (tx) => {
        const body = z.object({
          displayName:        z.string().min(1).optional(),
          paramsSchema:       z.record(z.unknown()).optional(),
          uiSchema:           z.record(z.unknown()).nullable().optional(),
          presets:            z.record(z.unknown()).nullable().optional(),
          inputsSchema:       z.record(z.unknown()).nullable().optional(),
          outputsSchema:      z.record(z.unknown()).nullable().optional(),
          category:           z.string().nullable().optional(),
          runMode:            z.string().nullable().optional(),
          description:        z.string().nullable().optional(),
          idempotent:         z.boolean().optional(),
          defaultTimeoutMs:   z.number().int().min(1000).optional(),
          defaultMaxAttempts: z.number().int().min(1).max(20).optional(),
          manual:             z.boolean().optional(),
        }).parse(req.body ?? {});

        const rows = await tx<NodeDefinition[]>`
          UPDATE node_definitions SET
            display_name        = COALESCE(${body.displayName       ?? null}, display_name),
            params_schema       = COALESCE(${body.paramsSchema !== undefined ? tx.json(body.paramsSchema) : null}, params_schema),
            ui_schema           = ${body.uiSchema       === undefined ? tx`ui_schema`       : tx`${body.uiSchema}`},
            presets             = ${body.presets        === undefined ? tx`presets`         : tx`${body.presets}`},
            inputs_schema       = ${body.inputsSchema   === undefined ? tx`inputs_schema`   : tx`${body.inputsSchema}`},
            outputs_schema      = ${body.outputsSchema  === undefined ? tx`outputs_schema`  : tx`${body.outputsSchema}`},
            category            = ${body.category       === undefined ? tx`category`        : tx`${body.category}`},
            run_mode            = ${body.runMode        === undefined ? tx`run_mode`        : tx`${body.runMode}`},
            description         = ${body.description   === undefined ? tx`description`     : tx`${body.description}`},
            idempotent          = COALESCE(${body.idempotent         ?? null}, idempotent),
            default_timeout_ms  = COALESCE(${body.defaultTimeoutMs  ?? null}, default_timeout_ms),
            default_max_attempts= COALESCE(${body.defaultMaxAttempts ?? null}, default_max_attempts),
            manual              = COALESCE(${body.manual             ?? null}, manual),
            updated_at          = NOW()
          WHERE key = ${req.params.key} AND version = ${req.params.version}
          RETURNING *
        `;
        if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        audit(req, "node.update", { kind: "node", id: `${req.params.key}@${req.params.version}` }, null, body);
        return { node: rows[0] };
      }),
  );

  app.get<{ Params: { key: string; version: string } }>(
    "/api/v1/admin/nodes/:key/:version",
    async (req, reply) =>
      asSystem(async (tx) => {
        const rows = await tx<NodeDefinition[]>`
          SELECT * FROM node_definitions WHERE key = ${req.params.key} AND version = ${req.params.version}
        `;
        if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        return { node: rows[0] };
      }),
  );

  app.get<{ Params: { key: string; version: string } }>(
    "/api/v1/admin/nodes/:key/:version/usages",
    async (req) =>
      asSystem(async (tx) => {
        // 引用统计: pipelines (current_version_id) + 在飞 outbox/items 按 caller tenant 过滤
        const tenantFilter = req.caller?.isSystemActor
          ? tx``
          : tx`AND p.tenant_id = ${req.caller!.tenantId}`;
        const inflightTenantFilter = req.caller?.isSystemActor
          ? tx``
          : tx`AND o.tenant_id = ${req.caller!.tenantId}`;

        const pipelines = await tx<{ task_id: string; name: string; tenant_id: string }[]>`
          SELECT DISTINCT p.task_id, p.name, p.tenant_id
          FROM pipelines p
          JOIN pipeline_versions pv ON pv.id = p.current_version_id
          WHERE EXISTS (
            SELECT 1 FROM jsonb_array_elements(pv.steps) s
            WHERE s->>'nodeKey' = ${req.params.key}
              AND COALESCE(s->>'nodeVersion', '1.0') = ${req.params.version}
          )
          ${tenantFilter}
          ORDER BY p.name
        `;

        const [inflight] = await tx<{ c: number }[]>`
          SELECT COUNT(*)::int AS c FROM outbox o
          WHERE o.node_key = ${req.params.key}
            AND o.status IN ('pending', 'leased')
            ${inflightTenantFilter}
        `;

        return {
          pipelines,
          inflightCount: inflight?.c ?? 0,
        };
      }),
  );

  app.post<{ Params: { key: string; version: string } }>(
    "/api/v1/admin/nodes/:key/:version/archive",
    async (req, reply) =>
      asSystem(async (tx) => {
        const rows = await tx<{ status: string }[]>`
          UPDATE node_definitions SET status = 'archived'
          WHERE key = ${req.params.key} AND version = ${req.params.version}
          RETURNING status
        `;
        if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        audit(req, "node.archive",
              { kind: "node", id: `${req.params.key}@${req.params.version}` },
              { status: "active" }, { status: "archived" });
        return { ok: true, status: rows[0].status };
      }),
  );

  app.post<{ Params: { key: string; version: string } }>(
    "/api/v1/admin/nodes/:key/:version/activate",
    async (req, reply) =>
      asSystem(async (tx) => {
        const rows = await tx<{ status: string }[]>`
          UPDATE node_definitions SET status = 'active'
          WHERE key = ${req.params.key} AND version = ${req.params.version}
          RETURNING status
        `;
        if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        audit(req, "node.activate",
              { kind: "node", id: `${req.params.key}@${req.params.version}` },
              { status: "archived" }, { status: "active" });
        return { ok: true, status: rows[0].status };
      }),
  );

  // 节点 runtime 状态: pending/inflight outbox 数 + driver 是否注册
  app.get<{ Params: { key: string; version: string } }>(
    "/api/v1/admin/nodes/:key/:version/runtime",
    async (req) =>
      asSystem(async (tx) => {
        const [counts] = await tx<{ pending: number; inflight: number }[]>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
            COUNT(*) FILTER (WHERE status = 'leased')::int  AS inflight
          FROM outbox
          WHERE node_key = ${req.params.key}
        `;
        return {
          pending:         counts?.pending  ?? 0,
          inflight:        counts?.inflight ?? 0,
          driverRegistered: autoNodeKeys().includes(req.params.key),
        };
      }),
  );

  app.post<{ Params: { key: string; version: string } }>(
    "/api/v1/admin/nodes/:key/:version/pause",
    async (req, reply) =>
      asSystem(async (tx) => {
        const [cur] = await tx<{ status: string }[]>`
          SELECT status FROM node_definitions
          WHERE key = ${req.params.key} AND version = ${req.params.version}
        `;
        if (!cur) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        if (cur.status === "archived") {
          return reply.code(409).send({ error: { code: "ARCHIVED_NODE_CANNOT_PAUSE", message: "archived 节点不能 pause, 请先 activate" } });
        }
        const rows = await tx<{ status: string }[]>`
          UPDATE node_definitions SET status = 'paused'
          WHERE key = ${req.params.key} AND version = ${req.params.version}
          RETURNING status
        `;
        audit(req, "node.pause",
              { kind: "node", id: `${req.params.key}@${req.params.version}` },
              { status: cur.status }, { status: "paused" });
        return { ok: true, status: rows[0].status };
      }),
  );

  app.post<{ Params: { key: string; version: string } }>(
    "/api/v1/admin/nodes/:key/:version/resume",
    async (req, reply) =>
      asSystem(async (tx) => {
        const rows = await tx<{ status: string }[]>`
          UPDATE node_definitions SET status = 'active'
          WHERE key = ${req.params.key} AND version = ${req.params.version}
            AND status = 'paused'
          RETURNING status
        `;
        if (rows.length === 0) {
          // 区分 404 vs 状态不对
          const [cur] = await tx<{ status: string }[]>`
            SELECT status FROM node_definitions
            WHERE key = ${req.params.key} AND version = ${req.params.version}
          `;
          if (!cur) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
          return reply.code(409).send({ error: { code: "NODE_NOT_PAUSED", message: `节点当前状态为 ${cur.status}, 只有 paused 节点才能 resume` } });
        }
        audit(req, "node.resume",
              { kind: "node", id: `${req.params.key}@${req.params.version}` },
              { status: "paused" }, { status: "active" });
        return { ok: true, status: rows[0].status };
      }),
  );

  // dry-run: 同步 invoke driver.handle, 绕过 outbox/attempts/items/result; 仅做配置调试.
  //   - merge effectiveParams (同生产 lease 路径)
  //   - resolveBindings 把 step.inputs 表达式 + inputsSchema.defaultBinding 求值
  //   - pickDriver 派发, 限 5s 总超时 (调试态不应被脚本节点卡死)
  // 不写库: 没有 items/outbox/attempts/audit 流水 (audit 仅记 dry-run 行为本身)
  app.post<{
    Params: { key: string; version: string };
    Body: {
      params?: Record<string, unknown>;
      inputs?: Record<string, unknown>;
      envelope?: { payload?: Record<string, unknown>; outputs?: Record<string, unknown>; tags?: Record<string, unknown> };
    };
  }>(
    "/api/v1/admin/nodes/:key/:version/debug/run",
    async (req, reply) =>
      asSystem(async (tx) => {
        const body = z.object({
          params:   z.record(z.unknown()).optional(),
          inputs:   z.record(z.unknown()).optional(),
          envelope: z.object({
            payload: z.record(z.unknown()).optional(),
            outputs: z.record(z.unknown()).optional(),
            tags:    z.record(z.unknown()).optional(),
          }).optional(),
        }).parse(req.body ?? {});

        const nd = await tx<NodeDefinition[]>`
          SELECT * FROM node_definitions WHERE key = ${req.params.key} AND version = ${req.params.version}
        `;
        if (nd.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        const def = nd[0];
        if (!def.supports_dry_run) {
          return reply.code(400).send({ error: { code: "NODE_NOT_DEBUGGABLE", message: "节点未声明 supportsDryRun, dry-run 不适用" } });
        }

        const envelope = {
          payload: body.envelope?.payload ?? {},
          outputs: body.envelope?.outputs ?? {},
          tags:    body.envelope?.tags ?? {},
        };
        const effectiveParams = mergeEffectiveParams(body.params ?? {}, (def.presets as NodePresets | null) ?? null);
        const inputsSchema = (def.inputs_schema as InputsSchema | null) ?? null;
        const resolvedInputs = resolveBindings(
          body.inputs,
          (inputsSchema?.properties ?? {}) as Record<string, { defaultBinding?: string }>,
          envelope,
        );

        // 构造合成 DriverJob: ids 用真 UUID (driver 可能调回 scheduler 内部 endpoint 做 UUID 校验);
        // 选 driver 时调用方需理解 dry-run 对 stateful driver (dedup/export) 仍会触达 DB —
        // 这是设计选择 (06-node-design §8.4): 绕开 outbox/attempts/items, 但 driver 内部副作用不绕开.
        const runId = randomUUID();
        const job: DriverJob = {
          runId,
          itemId:    randomUUID(),
          taskId:    randomUUID(),
          tenantId:  req.caller!.tenantId ?? "00000000-0000-0000-0000-000000000000",
          stepKey:   "dry-run-step",
          nodeKey:   req.params.key,
          nodeVersion: req.params.version,
          params:    effectiveParams,
          inputs:    resolvedInputs,
          envelope,
          // ctx.dryRun=true: driver 据此跳过持久化/外网调用. 若 driver 没声明 supportsDryRun,
          // 它可以无视这个 flag 继续触发副作用 — 前端按 def.supports_dry_run 显示警告 badge.
          ctx:       { runId, attempt: 1, deadline: null, dryRun: true },
        };

        const driver = pickDriver(job);
        if (!driver) {
          return reply.code(404).send({ error: { code: "NO_DRIVER", message: `没有匹配 ${req.params.key}@${req.params.version} 的 driver (本进程未注册或版本不对)` } });
        }

        const startedAt = Date.now();
        let result: Awaited<ReturnType<typeof driver.handle>>;
        const DRY_RUN_TIMEOUT_MS = 5000;
        try {
          result = await Promise.race([
            driver.handle(job),
            new Promise<never>((_, rj) => setTimeout(() => rj(new Error("DRY_RUN_TIMEOUT")), DRY_RUN_TIMEOUT_MS)),
          ]);
        } catch (e: any) {
          result = { status: "failed", error: { code: "DRY_RUN_ERROR", message: String(e?.message ?? e), retryable: false } };
        }
        const durationMs = Date.now() - startedAt;

        // dry-run 也走 outputsSchema 校验, 让用户在调试时就发现"输出不符契约"问题
        let outputValidation: {
          mode: "strict" | "warn" | "off";
          violations: { path: string; message: string; keyword: string }[];
        } | null = null;
        if (result.status === "success" && def.outputs_schema) {
          const v = validateNodeOutput({
            nodeKey: req.params.key,
            nodeVersion: req.params.version,
            outputsSchema: def.outputs_schema as Record<string, unknown>,
            outputsValidation: (def as any).outputs_validation,
            output: result.output,
          });
          if (v) {
            const mode = ((def as any).outputs_validation ?? "strict") as "strict" | "warn" | "off";
            outputValidation = { mode, violations: v.errors };
            // strict 模式下把 result 翻成 failed, 跟生产路径行为一致
            if (mode === "strict") {
              const sample = v.errors.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join("; ");
              result = {
                status: "failed",
                error: {
                  code: "OUTPUT_SCHEMA_VIOLATION",
                  message: `输出不符 outputsSchema: ${sample}${v.errors.length > 3 ? " ..." : ""}`,
                  retryable: false,
                },
              };
            }
          }
        }

        audit(req, "node.debug_run",
              { kind: "node", id: `${req.params.key}@${req.params.version}` },
              null, { driverName: driver.name, durationMs, status: result.status });

        return {
          effectiveParams,
          resolvedInputs,
          driver: { name: driver.name, nodeKey: driver.nodeKey },
          result,
          durationMs,
          outputValidation,  // null=通过/跳过; { mode, violations }=有违规 (strict 已翻 result)
        };
      }),
  );

  app.post<{ Params: { id: string }; Body: { stepKey: string } }>(
    "/api/v1/admin/items/:id/replay",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({ stepKey: z.string() }).parse(req.body);
        const its = await tx<ItemRow[]>`SELECT * FROM items WHERE id = ${req.params.id}`;
        if (its.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        const it = its[0];
        // 用 item 钉死的版本, 不是当前激活版本 — replay 必须在原 pipeline 语义下
        const pv = await tx<{ steps: Pipeline }[]>`
          SELECT steps FROM pipeline_versions WHERE id = ${it.pipeline_version_id}
        `;
        const step = pv[0]?.steps.find((s) => s.key === body.stepKey);
        if (!step) return reply.code(400).send({ error: { code: "INVALID_STEP" } });

        await tx`UPDATE items SET current_step=${body.stepKey}, updated_at=NOW() WHERE id=${req.params.id}`;
        await tx`
          INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
          VALUES (${it.tenant_id}, ${req.params.id}, ${it.task_id}, ${body.stepKey}, ${step.nodeKey}, 'pending', 1)
        `;
        // M8: replay 完成 → 关闭对应 pending replay_requests
        await tx`
          UPDATE replay_requests
          SET status='resolved', resolved_at=NOW(), resolved_by=${req.caller?.name ?? null}, updated_at=NOW()
          WHERE item_id = ${req.params.id} AND status = 'pending'
        `;
        audit(req, "item.replay", { kind: "item", id: req.params.id },
              { previousStep: it.current_step }, { newStep: body.stepKey });
        return { ok: true };
      }),
  );

  // ── M6: 已通过数据召回 ──────────────────────────
  // 仅 done item 接受. 把对应 dataset_records 标 recalled (留痕), item 钉到指定 step 重跑.
  app.post<{ Params: { id: string }; Body: { reason: string; targetStep: string; operatorId?: string } }>(
    "/api/v1/admin/items/:id/recall",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({
          reason: z.string().trim().min(1),
          targetStep: z.string().min(1),
          operatorId: z.string().trim().optional(),
        }).parse(req.body);

        const its = await tx<ItemRow[]>`SELECT * FROM items WHERE id = ${req.params.id}`;
        if (its.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        const it = its[0];
        if (it.current_step !== "done") {
          return reply.code(409).send({
            error: { code: "ITEM_NOT_RECALLABLE", message: "仅已完成 (done) 的 item 可召回" },
          });
        }

        // targetStep 必须在该 item pinned 版本里存在
        const pv = await tx<{ steps: Pipeline }[]>`
          SELECT steps FROM pipeline_versions WHERE id = ${it.pipeline_version_id}
        `;
        const step = pv[0]?.steps.find((s) => s.key === body.targetStep);
        if (!step) return reply.code(400).send({ error: { code: "INVALID_STEP" } });

        // dataset_records: active → recalled (留 audit reason)
        const recalled = await tx<{ id: string }[]>`
          UPDATE dataset_records
             SET status = 'recalled',
                 recalled_at = NOW(),
                 recalled_reason = ${body.reason},
                 recalled_by = ${body.operatorId ?? req.caller?.name ?? null},
                 updated_at = NOW()
           WHERE item_id = ${req.params.id} AND status = 'active'
           RETURNING id
        `;

        await tx`
          UPDATE items SET current_step = ${body.targetStep}, updated_at = NOW()
          WHERE id = ${req.params.id}
        `;
        await tx`
          INSERT INTO outbox (tenant_id, item_id, task_id, step_key, node_key, status, attempt)
          VALUES (${it.tenant_id}, ${req.params.id}, ${it.task_id},
                  ${body.targetStep}, ${step.nodeKey}, 'pending', 1)
        `;

        audit(req, "item.recall", { kind: "item", id: req.params.id },
              { previousStep: it.current_step },
              {
                newStep: body.targetStep,
                reason: body.reason,
                operatorId: body.operatorId ?? req.caller?.name,
                recalledRecords: recalled.length,
              });
        return {
          ok: true,
          recalledRecords: recalled.length,
          newStep: body.targetStep,
        };
      }),
  );

  // ── 审计日志查询 (admin only — RBAC 走 audit.read 权限) ──
  // 主查询: "某租户在时段内某 actor 的某 action 历史". 不带 cursor 分页 — admin
  // 看的是近期事件, 200 行内 + since 过滤已经够; 真要回溯老分区走离线归档.
  app.get<{
    Querystring: {
      actor?: string;
      action?: string;
      kind?: string;
      id?: string;
      since?: string;     // ISO 时间, 默认 24h 前
      limit?: string;
    }
  }>("/api/v1/admin/audit", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const q = req.query;
      const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? "100", 10) || 100));
      const since = q.since ? new Date(q.since) : new Date(Date.now() - 24 * 3600_000);
      if (Number.isNaN(since.getTime())) {
        return reply.code(400).send({ error: { code: "INVALID_SINCE" } });
      }

      const rows = await tx`
        SELECT id, tenant_id, actor, action, resource, before, after,
               trace_id, request_id, created_at
        FROM audit_log
        WHERE created_at >= ${since}
          ${q.actor  ? tx`AND actor  = ${q.actor}`         : tx``}
          ${q.action ? tx`AND action = ${q.action}`        : tx``}
          ${q.kind   ? tx`AND resource->>'kind' = ${q.kind}` : tx``}
          ${q.id     ? tx`AND resource->>'id'   = ${q.id}`   : tx``}
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit}
      `;
      return { entries: rows };
    }),
  );

  // ============ Dedup (字段级去重原子检查) ============
  // 派生写入: dedup_keys.tenant_id 取自上下文 (caller.tenantId 或 item.tenant_id)
  const DedupCheckBody = z.object({
    taskId: z.string().uuid(),
    itemId: z.string().uuid(),
    stepKey: z.string(),
    hash: z.string().min(1),
    fields: z.record(z.unknown()).optional(),
  });
  app.post("/api/v1/dedup/check", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const body = DedupCheckBody.parse(req.body);

      // 取 item.tenant_id 作为 dedup 行的 tenant; 跨租户去重不应共享命名空间
      const its = await tx<{ tenant_id: string }[]>`
        SELECT tenant_id FROM items WHERE id = ${body.itemId}
      `;
      if (its.length === 0) {
        // 跨租户 (RLS 拦截) 或不存在 - 拒绝 dedup, 避免在错误租户下生成 hash
        return { kept: false, hash: body.hash, error: "ITEM_NOT_FOUND" };
      }
      const tid = its[0].tenant_id;

      // 同 (item, step) 重提先删旧 hash, 让 loopback 后能用新数据再竞争
      await tx`
        DELETE FROM dedup_keys
        WHERE task_id = ${body.taskId}
          AND item_id  = ${body.itemId}
          AND step_key = ${body.stepKey}
      `;

      const inserted = await tx<{ item_id: string }[]>`
        INSERT INTO dedup_keys (tenant_id, task_id, dedup_hash, item_id, step_key, fields)
        VALUES (${tid}, ${body.taskId}, ${body.hash}, ${body.itemId}, ${body.stepKey},
                ${body.fields ? tx.json(body.fields) : null})
        ON CONFLICT (task_id, dedup_hash) DO NOTHING
        RETURNING item_id
      `;
      if (inserted.length > 0) {
        return { kept: true, hash: body.hash };
      }
      const existing = await tx<{ item_id: string }[]>`
        SELECT item_id FROM dedup_keys
        WHERE task_id = ${body.taskId} AND dedup_hash = ${body.hash}
        LIMIT 1
      `;
      return { kept: false, hash: body.hash, firstItemId: existing[0]?.item_id ?? null };
    }),
  );

  // ============ Dataset records (业务最终产物入库) ============
  const DatasetRecordBody = z.object({
    taskId: z.string().uuid(),
    itemId: z.string().uuid(),
    payload: z.record(z.unknown()),
    metadata: z.record(z.unknown()).optional(),
  });
  app.post("/api/v1/dataset/records/save", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const body = DatasetRecordBody.parse(req.body);
      // 派生 tenant_id 来自 item
      const its = await tx<{ tenant_id: string }[]>`
        SELECT tenant_id FROM items WHERE id = ${body.itemId}
      `;
      if (its.length === 0) return reply.code(404).send({ error: { code: "ITEM_NOT_FOUND" } });
      const tid = its[0].tenant_id;
      // M6: 唯一约束改成 partial (status='active'). 重做后老行已 status='recalled', 新 INSERT 不冲突
      const rows = await tx<{ id: string }[]>`
        INSERT INTO dataset_records (tenant_id, task_id, item_id, payload, metadata)
        VALUES (${tid}, ${body.taskId}, ${body.itemId}, ${tx.json(body.payload)},
                ${body.metadata ? tx.json(body.metadata) : null})
        ON CONFLICT (item_id) WHERE status = 'active' DO UPDATE SET
          payload = EXCLUDED.payload,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id
      `;
      return { id: rows[0].id };
    }),
  );

  app.get<{ Params: { taskId: string } }>("/api/v1/tasks/:taskId/records", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      // M6: 默认只返 active; ?status=all 包含 recalled 历史
      const includeRecalled = (req.query as any)?.status === "all";
      const rows = await tx`
        SELECT id, item_id, payload, metadata, status, recalled_at, recalled_reason,
               created_at, updated_at
        FROM dataset_records WHERE task_id = ${req.params.taskId}
        ${includeRecalled ? tx`` : tx`AND status = 'active'`}
        ORDER BY created_at DESC LIMIT 200
      `;
      return { records: rows };
    }),
  );

  app.get("/api/v1/admin/queue", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx`
        SELECT node_key, status, COUNT(*)::int AS n
        FROM outbox WHERE status IN ('pending','leased')
        ${req.caller!.isSystemActor
          ? tx``
          : tx`AND tenant_id = ${req.caller!.tenantId}`}
        GROUP BY node_key, status ORDER BY node_key, status
      `;
      return { queue: rows };
    }),
  );

  // ============ Kanban: 看板聚合快照 ============
  app.get<{ Params: { taskId: string }; Querystring: { batchId?: string } }>(
    "/api/v1/tasks/:taskId/kanban",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const batchId = req.query.batchId;
        if (!/^[0-9a-f-]{36}$/i.test(req.params.taskId))
          return reply.code(400).send({ error: { code: "INVALID_TASK_ID" } });
        if (batchId && !/^[0-9a-f-]{36}$/i.test(batchId))
          return reply.code(400).send({ error: { code: "INVALID_BATCH_ID" } });

        const pipe = await tx<{ steps: Pipeline }[]>`
          SELECT steps FROM pipelines WHERE task_id = ${req.params.taskId}
        `;
        if (pipe.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });

        const items = batchId
          ? await tx<ItemRow[]>`
              SELECT i.* FROM items i
              JOIN batch_items bi ON bi.item_id = i.id
              WHERE i.task_id = ${req.params.taskId}
                AND bi.batch_id = ${batchId}
              ORDER BY i.created_at ASC LIMIT 500
            `
          : await tx<ItemRow[]>`
              SELECT * FROM items
              WHERE task_id = ${req.params.taskId}
              ORDER BY created_at ASC LIMIT 500
            `;

        const inflightItems = items.filter(
          (i) => i.current_step !== "done" && i.current_step !== "stuck",
        );
        const stuckItems = items.filter((i) => i.current_step === "stuck");

        const runsByItem = new Map<string, OutboxRow>();
        if (inflightItems.length > 0) {
          const ids = inflightItems.map((i) => i.id);
          const runs = await tx<OutboxRow[]>`
            SELECT run_id, item_id, step_key, node_key, status, attempt,
                   leased_by, leased_at, expected_by
            FROM outbox
            WHERE item_id IN ${tx(ids)} AND status IN ('pending','leased')
          `;
          for (const r of runs) runsByItem.set(r.item_id, r);
        }

        const byStep = new Map<string, { item: ItemRow; run: OutboxRow | null }[]>();
        for (const s of pipe[0].steps) byStep.set(s.key, []);
        for (const item of inflightItems) {
          byStep.get(item.current_step)?.push({ item, run: runsByItem.get(item.id) ?? null });
        }

        return {
          steps: pipe[0].steps.map((s) => ({
            stepKey: s.key,
            nodeKey: s.nodeKey,
            label: s.label,
            items: byStep.get(s.key) ?? [],
          })),
          stuck: stuckItems.map((i) => ({
            id: i.id,
            envelope: i.envelope,
            loop_counts: i.loop_counts,
            updated_at: i.updated_at,
          })),
        };
      }),
  );

  // ============ Kanban: 精准认领指定 run ============
  app.post<{ Params: { runId: string }; Body: { workerId: string; leaseSeconds?: number } }>(
    "/api/v1/queue/run/:runId/claim",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z
          .object({
            workerId: z.string(),
            leaseSeconds: z.number().int().min(5).max(3600).default(60),
          })
          .parse(req.body);

        // 项目暂停 → 拒新认领 (返 PIPELINE_PAUSED 让前端区分"被抢"和"被停")
        const pausedCheck = await tx<{ status: string }[]>`
          SELECT p.status FROM outbox o
          JOIN pipelines p ON p.task_id = o.task_id
          WHERE o.run_id = ${req.params.runId}
        `;
        if (pausedCheck.length > 0 && pausedCheck[0].status !== "active") {
          return reply.code(409).send({
            error: { code: "PIPELINE_PAUSED", message: "项目已暂停, 不能领取新任务" },
          });
        }

        const rows = await tx<OutboxRow[]>`
          UPDATE outbox SET
            status = 'leased',
            leased_by = ${body.workerId},
            leased_at = NOW(),
            expected_by = NOW() + ${body.leaseSeconds} * INTERVAL '1 second',
            updated_at = NOW()
          WHERE run_id = ${req.params.runId} AND status = 'pending'
          RETURNING *
        `;

        if (rows.length === 0)
          return reply.code(409).send({ error: { code: "ALREADY_CLAIMED", message: "任务已被他人领取或已完成" } });

        const item = await tx<ItemRow[]>`SELECT * FROM items WHERE id = ${rows[0].item_id}`;
        return {
          job: {
            runId: rows[0].run_id,
            itemId: rows[0].item_id,
            stepKey: rows[0].step_key,
            nodeKey: rows[0].node_key,
            envelope: item[0]?.envelope,
          },
        };
      }),
  );

  // ============ Pipeline Templates (admin 模板库) ============
  app.get("/api/v1/templates", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx`
        SELECT id, name, description, jsonb_array_length(steps) AS step_count, updated_at
          FROM pipeline_templates
        ${req.caller!.isSystemActor
          ? tx``
          : tx`WHERE tenant_id = ${req.caller!.tenantId}`}
        ORDER BY updated_at DESC
      `;
      return { templates: rows };
    }),
  );

  app.get<{ Params: { id: string } }>("/api/v1/templates/:id", async (req, reply) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx`SELECT * FROM pipeline_templates WHERE id = ${req.params.id}`;
      if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      return rows[0];
    }),
  );

  app.post<{ Body: { name: string; description?: string; steps: Pipeline; layout?: Layout } }>(
    "/api/v1/templates/create",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          steps: z.array(StepConfigZ),
          layout: z
            .object({ positions: z.record(z.object({ x: z.number(), y: z.number() })) })
            .optional(),
        }).parse(req.body);

        const archErr = await checkArchivedNodeRefs(tx, body.steps as Pipeline);
        if (archErr) return reply.code(409).send({ error: archErr });

        const tid = req.caller!.tenantId;
        try {
          const [row] = await tx`
            INSERT INTO pipeline_templates (tenant_id, name, description, steps, layout)
            VALUES (${tid}, ${body.name}, ${body.description ?? null},
                    ${tx.json(body.steps)}, ${body.layout ? tx.json(body.layout) : null})
            RETURNING *
          `;
          audit(req, "template.create", { kind: "template", id: row.id }, null,
                { name: body.name });
          return row;
        } catch (e: any) {
          if (e?.code === "23505")
            return reply.code(409).send({ error: { code: "TEMPLATE_NAME_TAKEN", message: "同租户下模板名已存在" } });
          throw e;
        }
      }),
  );

  app.post<{ Params: { id: string }; Body: { name?: string; description?: string; steps?: Pipeline; layout?: Layout } }>(
    "/api/v1/templates/:id/save",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          steps: z.array(StepConfigZ).optional(),
          layout: z
            .object({ positions: z.record(z.object({ x: z.number(), y: z.number() })) })
            .optional(),
        }).parse(req.body);
        if (body.steps) {
          const archErr = await checkArchivedNodeRefs(tx, body.steps as Pipeline);
          if (archErr) return reply.code(409).send({ error: archErr });
        }
        const rows = await tx`
          UPDATE pipeline_templates SET
            name        = COALESCE(${body.name ?? null}, name),
            description = COALESCE(${body.description ?? null}, description),
            steps       = COALESCE(${body.steps ? tx.json(body.steps) : null}, steps),
            layout      = COALESCE(${body.layout ? tx.json(body.layout) : null}, layout),
            updated_at  = NOW()
          WHERE id = ${req.params.id}
          RETURNING *
        `;
        if (rows.length === 0) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        audit(req, "template.save", { kind: "template", id: req.params.id },
              null, { fields: Object.keys(body) });
        return rows[0];
      }),
  );

  app.delete<{ Params: { id: string } }>("/api/v1/templates/:id", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const r = await tx`
        DELETE FROM pipeline_templates WHERE id = ${req.params.id} RETURNING name
      `;
      if (r.length > 0) {
        audit(req, "template.delete", { kind: "template", id: req.params.id },
              { name: r[0].name }, null);
      }
      return { ok: true };
    }),
  );

  // 用模板克隆出一个 pipeline 项目实例
  app.post<{ Params: { id: string }; Body: { name: string } }>(
    "/api/v1/templates/:id/instantiate",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const body = z.object({ name: z.string().min(1) }).parse(req.body);
        const tid = req.caller!.tenantId;

        const [tmpl] = await tx<{ steps: Pipeline; layout: Layout | null }[]>`
          SELECT steps, layout FROM pipeline_templates WHERE id = ${req.params.id}
        `;
        if (!tmpl) return reply.code(404).send({ error: { code: "TEMPLATE_NOT_FOUND" } });

        const stepsJson  = tx.json(tmpl.steps);
        const layoutJson = tmpl.layout ? tx.json(tmpl.layout) : null;
        const forms      = extractForms(tmpl.steps);
        const etag       = formsEtag(forms);

        const [pipe] = await tx<{ task_id: string }[]>`
          INSERT INTO pipelines (tenant_id, name, steps, layout, template_id)
          VALUES (${tid}, ${body.name}, ${stepsJson}, ${layoutJson}, ${req.params.id})
          RETURNING task_id
        `;
        const [pv] = await tx<{ id: string }[]>`
          INSERT INTO pipeline_versions
            (task_id, tenant_id, version, steps, layout, forms, forms_etag, published_by)
          VALUES
            (${pipe.task_id}, ${tid}, 1, ${stepsJson}, ${layoutJson},
             ${tx.json(forms)}, ${etag}, ${req.caller!.id})
          RETURNING id
        `;
        await tx`
          UPDATE pipelines SET current_version_id = ${pv.id} WHERE task_id = ${pipe.task_id}
        `;
        audit(req, "pipeline.create", { kind: "pipeline", id: pipe.task_id },
              null, { name: body.name, fromTemplate: req.params.id });
        return { taskId: pipe.task_id, name: body.name };
      }),
  );

  // ============ 项目列表 (= pipelines, 给 admin 控制台用) ============
  app.get("/api/v1/projects", async (req) =>
    withCallerTx(req.caller, async (tx) => {
      const rows = await tx`
        SELECT
          p.task_id,
          p.name,
          p.template_id,
          t.name AS template_name,
          jsonb_array_length(p.steps) AS step_count,
          p.created_at,
          p.updated_at,
          (SELECT COUNT(*)::int FROM batches  b WHERE b.task_id = p.task_id) AS batch_count,
          (SELECT COUNT(*)::int FROM items    i WHERE i.task_id = p.task_id) AS item_count
        FROM pipelines p
        LEFT JOIN pipeline_templates t ON t.id = p.template_id
        ${req.caller!.isSystemActor
          ? tx``
          : tx`WHERE p.tenant_id = ${req.caller!.tenantId}`}
        ORDER BY p.updated_at DESC
      `;
      return { projects: rows };
    }),
  );

  // ============ Review 任务列表 (manual review 步骤的待领取 + 我已领取) ============
  // collect 用 /api/collect/tasks (业务层已实现); review 单独一个对称接口.
  // INNER JOIN batches + pipelines: 只显示在 batch 里的 review, 过滤掉裸建 (e2e 测试 / 调试)
  // 的孤儿 item, 保证前端拿得到 pipeline_name / batch_name。
  app.get<{ Querystring: { batchId?: string; userId: string } }>(
    "/api/v1/review/tasks",
    async (req, reply) =>
      withCallerTx(req.caller, async (tx) => {
        const { batchId, userId } = req.query;
        if (!userId) return reply.code(400).send({ error: { code: "MISSING_PARAMS" } });

        // 注: 这个端点本就以 userId 作 leased_by 过滤, 已是 user-aware. 下面又叠了一层
        // disallowSelfReview 过滤 (剔掉"我提交的、本项目又不允许自审"的 review 任务) — 业务概念
        // 倒灌 core 一例, 不展开. 严格分层走法是把整个端点搬到 business.ts.
        const rows = batchId
          ? await tx`
              SELECT i.id            AS item_id,
                     i.task_id,
                     i.envelope,
                     o.run_id,
                     o.step_key,
                     o.node_key,
                     o.status,
                     o.leased_by,
                     o.expected_by,
                     bi.batch_id,
                     b.name           AS batch_name,
                     p.name           AS pipeline_name
                FROM outbox o
                JOIN items i        ON i.id  = o.item_id
                JOIN batch_items bi ON bi.item_id = i.id AND bi.batch_id = ${batchId}
                JOIN batches b      ON b.id  = bi.batch_id
                JOIN pipelines p    ON p.task_id = i.task_id
               WHERE o.node_key = 'review'
                 AND (o.status = 'pending' OR (o.status = 'leased' AND o.leased_by = ${userId}))
                 AND p.status = 'active'
                 AND b.status = 'active'
               ORDER BY i.created_at ASC
               LIMIT 200
            `
          : await tx`
              SELECT i.id            AS item_id,
                     i.task_id,
                     i.envelope,
                     o.run_id,
                     o.step_key,
                     o.node_key,
                     o.status,
                     o.leased_by,
                     o.expected_by,
                     bi.batch_id,
                     b.name           AS batch_name,
                     p.name           AS pipeline_name
                FROM outbox o
                JOIN items i        ON i.id = o.item_id
                JOIN batch_items bi ON bi.item_id = i.id
                JOIN batches b      ON b.id = bi.batch_id
                JOIN pipelines p    ON p.task_id = i.task_id
               WHERE o.node_key = 'review'
                 AND (o.status = 'pending' OR (o.status = 'leased' AND o.leased_by = ${userId}))
                 AND p.status = 'active'
                 AND b.status = 'active'
               ORDER BY i.created_at ASC
               LIMIT 200
            `;

        // 步骤间互斥过滤: 把"我在该 item 上做过 disallowedFromSteps 之一"的 review 任务剔掉.
        if (rows.length === 0) return { items: rows };
        const itemIds = rows.map((r: any) => r.item_id);
        const pvRows = await tx<{ item_id: string; steps: any }[]>`
          SELECT i.id AS item_id, pv.steps
            FROM items i JOIN pipeline_versions pv ON pv.id = i.pipeline_version_id
           WHERE i.id IN ${tx(itemIds)}
        `;
        const itemSteps = new Map(pvRows.map((r) => [r.item_id, r.steps]));
        // 一次性拉 user 在所有候选 item 上做过的 step 集合, 判断时本地查 set
        const myOpsRows = await tx<{ item_id: string; step_key: string }[]>`
          SELECT DISTINCT item_id, step_key FROM submissions
           WHERE item_id IN ${tx(itemIds)}
             AND user_id = ${userId}
             AND status  = 'submitted'
        `;
        const myOps = new Map<string, Set<string>>();
        for (const r of myOpsRows) {
          const s = myOps.get(r.item_id) ?? new Set<string>();
          s.add(r.step_key);
          myOps.set(r.item_id, s);
        }
        const filtered = rows.filter((r: any) => {
          const steps = (itemSteps.get(r.item_id) ?? []) as any[];
          const reviewStep = steps.find((s) => s.key === r.step_key);
          const disallowed = expandDisallowedSteps(reviewStep);
          if (disallowed.length === 0) return true;
          const mine = myOps.get(r.item_id);
          if (!mine) return true;
          return !disallowed.some((sk) => mine.has(sk));
        });
        return { items: filtered };
      }),
  );
}
