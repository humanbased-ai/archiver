// E2E API tests — 直接跑在真实 backend + Postgres 上, 验证调度核心所有公开端点的行为
//
// 跑法: cd scheduler/backend && npm test
import "./_assert-test-db.ts";
// 前置:
//   - npm run dev (后端在 4000) + npm run migrate + npm run seed 已执行
//   - 测试会自建/自删独立 pipeline, 不污染已有 demo 数据
//
// 组织: 每个 describe 是一个语义模块; 内部 test 顺序执行 (大多场景需要)

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  BASE,
  PREFIX,
  buildSamplePipeline,
  claimItem,
  createPipeline,
  deletePipeline,
  get,
  getItem,
  ingest,
  leaseOne,
  post,
  postResult,
  req,
  sleep,
  uniqueId,
} from "./helpers.ts";

// ═══════════════════════════════════════════════════════════
// A. Smoke / 元数据
// ═══════════════════════════════════════════════════════════
describe("A. 元数据 / Smoke", () => {
  test("A1. GET /health 返回 200 且 ok=true", async () => {
    const r = await get("/health");
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
  });

  test("A2. GET /api/v1/nodes 至少包含 ingest/translate/review/export", async () => {
    const r = await get(`${PREFIX}/nodes`);
    assert.equal(r.status, 200);
    const keys = r.body.nodes.map((n: any) => n.key);
    for (const k of ["ingest", "translate", "review", "export", "dedup"]) {
      assert.ok(keys.includes(k), `node_definitions 缺少 ${k}`);
    }
    // 字段校验
    const ingestNode = r.body.nodes.find((n: any) => n.key === "ingest");
    assert.equal(typeof ingestNode.params_schema, "object");
    assert.equal(typeof ingestNode.idempotent, "boolean");
    assert.equal(typeof ingestNode.default_timeout_ms, "number");
  });
});

// ═══════════════════════════════════════════════════════════
// B. Pipeline CRUD
// ═══════════════════════════════════════════════════════════
describe("B. Pipeline CRUD", () => {
  let createdId = "";

  test("B1. POST /pipelines/create 合法 body 返回 200 + task_id", async () => {
    const tpl = buildSamplePipeline();
    const r = await post(`${PREFIX}/pipelines/create`, tpl);
    assert.equal(r.status, 200);
    assert.match(r.body.task_id, /^[0-9a-f-]{36}$/);
    assert.equal(r.body.name, tpl.name);
    assert.equal(r.body.steps.length, 4);
    createdId = r.body.task_id;
  });

  test("B2. POST /pipelines/create 步骤缺 nodeKey 拒绝写库 (非 2xx)", async () => {
    // Fastify + zod 默认 throw → 500; 关键是没创建成功
    const r = await post(`${PREFIX}/pipelines/create`, {
      name: uniqueId("bad"),
      steps: [{ key: "x" } /* 缺 nodeKey */],
    });
    assert.ok(r.status >= 400, `非法 body 应返回错误状态, 实际 ${r.status}`);
    // 确认确实没写进库
    const list = await get(`${PREFIX}/pipelines`);
    const found = list.body.pipelines.find((p: any) => p.name === (r.body as any)?.name);
    assert.ok(!found, "非法 body 不应落库");
  });

  test("B3. GET /pipelines 列表包含刚创建的", async () => {
    const r = await get(`${PREFIX}/pipelines`);
    assert.equal(r.status, 200);
    const ids = r.body.pipelines.map((p: any) => p.task_id);
    assert.ok(ids.includes(createdId), "列表里没找到刚创建的 pipeline");
  });

  test("B4. GET /pipelines/:id 返回完整 steps", async () => {
    const r = await get(`${PREFIX}/pipelines/${createdId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.steps.length, 4);
    assert.equal(r.body.steps[0].key, "ingest");
  });

  test("B5. GET /pipelines/{随机uuid} 返回 404", async () => {
    const r = await get(`${PREFIX}/pipelines/00000000-0000-0000-0000-000000000000`);
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, "NOT_FOUND");
  });

  test("B6. POST /pipelines/:id/save 改名 → 列表里能看到新名字", async () => {
    const newName = uniqueId("renamed");
    const r = await post(`${PREFIX}/pipelines/${createdId}/save`, { name: newName });
    assert.equal(r.status, 200);
    assert.equal(r.body.name, newName);
    const fresh = await get(`${PREFIX}/pipelines/${createdId}`);
    assert.equal(fresh.body.name, newName);
  });

  test("B7. POST /pipelines/{随机uuid}/save 返回 404", async () => {
    const r = await post(`${PREFIX}/pipelines/00000000-0000-0000-0000-000000000000/save`, {
      name: "ghost",
    });
    assert.equal(r.status, 404);
  });

  test("B8. DELETE /pipelines/:id 后 GET 应 404 (级联)", async () => {
    const d = await req("DELETE", `${PREFIX}/pipelines/${createdId}`);
    assert.equal(d.status, 200);
    assert.equal(d.body.ok, true);
    const g = await get(`${PREFIX}/pipelines/${createdId}`);
    assert.equal(g.status, 404);
  });
});

// ═══════════════════════════════════════════════════════════
// C. Items: ingest 与查询
// ═══════════════════════════════════════════════════════════
describe("C. Items 投递与查询", () => {
  let taskId = "";

  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("C1. POST /items/create 合法 → 200 + itemId/runId", async () => {
    const r = await post(`${PREFIX}/items/create`, {
      taskId,
      envelope: { payload: { text: "hello" } },
    });
    assert.equal(r.status, 200);
    assert.match(r.body.itemId, /^[0-9a-f-]{36}$/);
    assert.match(r.body.runId, /^[0-9a-f-]{36}$/);
  });

  test("C2. POST /items/create 不存在 taskId → 404 PIPELINE_NOT_FOUND", async () => {
    const r = await post(`${PREFIX}/items/create`, {
      taskId: "00000000-0000-0000-0000-000000000000",
      envelope: { payload: {} },
    });
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, "PIPELINE_NOT_FOUND");
  });

  test("C3. POST /items/create 非法 startStep → 400 INVALID_START_STEP", async () => {
    const r = await post(`${PREFIX}/items/create`, {
      taskId,
      envelope: { payload: {} },
      startStep: "no-such-step",
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, "INVALID_START_STEP");
  });

  test("C4. POST /items/create 在空 pipeline 上 → 400 EMPTY_PIPELINE", async () => {
    const emptyId = await createPipeline([], uniqueId("empty"));
    try {
      const r = await post(`${PREFIX}/items/create`, {
        taskId: emptyId,
        envelope: { payload: {} },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "EMPTY_PIPELINE");
    } finally {
      await deletePipeline(emptyId);
    }
  });

  test("C5. GET /items/:id → 包含 item / inflight / history 三段", async () => {
    const { itemId } = await ingest(taskId, { text: "查询测试" });
    const r = await getItem(itemId);
    assert.equal(r.status, 200);
    assert.equal(r.body.item.id, itemId);
    assert.equal(r.body.item.current_step, "ingest");
    assert.ok(Array.isArray(r.body.inflight));
    assert.ok(r.body.inflight.length >= 1, "应有一条 inflight");
    assert.ok(Array.isArray(r.body.history));
  });

  test("C6. GET /items/{随机uuid} → 404", async () => {
    const r = await get(`${PREFIX}/items/00000000-0000-0000-0000-000000000000`);
    assert.equal(r.status, 404);
  });

  test("C7. GET /tasks/:taskId/items → 列表至少包含上面创建的", async () => {
    const r = await get(`${PREFIX}/tasks/${taskId}/items`);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.items));
    assert.ok(r.body.items.length >= 1);
  });
});

// ═══════════════════════════════════════════════════════════
// D. 队列 lease
// ═══════════════════════════════════════════════════════════
describe("D. 队列 lease", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("D1. lease 一个不存在的 nodeKey → jobs 空数组", async () => {
    const r = await post(`${PREFIX}/queue/no-such-node/lease`, {
      workerId: "w1",
      batchSize: 5,
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.jobs, []);
  });

  test("D2. lease 1 条 → 返回的 job 形态完整 (含 envelope/params/ctx)", async () => {
    const { itemId } = await ingest(taskId, { text: "lease-target" });
    // 注意: 全局 ingest 队列里可能有其他 pipeline / 测试的 pending; 我们只断言"能拿到 job"
    // 然后通过 claim 精准认领自己的 run, 验证字段形态
    const claimed = await claimItem(itemId, "w-D2");
    assert.equal(claimed.itemId, itemId);
    assert.equal(claimed.stepKey, "ingest");
    assert.equal(claimed.nodeKey, "ingest");
    assert.equal(typeof claimed.runId, "string");
    assert.deepEqual(claimed.envelope.payload, { text: "lease-target" });
    // lease 接口本身也得能正常响应 (只验证 status 和返回结构)
    const lease = await post(`${PREFIX}/queue/ingest/lease`, {
      workerId: "w-D2-lease",
      batchSize: 1,
    });
    assert.equal(lease.status, 200);
    assert.ok(Array.isArray(lease.body.jobs));
    // 把 D2 自己的 claim 处理掉
    await postResult({ runId: claimed.runId, status: "success" });
    // 把 lease 拿到的别人的也释放回去 (不影响其他人)
    for (const j of lease.body.jobs) {
      await post(`${PREFIX}/queue/lease/${j.runId}/release`, { workerId: "w-D2-lease" });
    }
  });

  test("D3. batchSize 是上限,不会超量分发", async () => {
    // 起码保证我自己有 3 条 pending, 然后请求 batchSize=2 → 必须 ≤ 2
    await Promise.all([1, 2, 3].map(() => ingest(taskId)));
    const small = await post(`${PREFIX}/queue/ingest/lease`, {
      workerId: "w-D3a",
      batchSize: 2,
    });
    assert.equal(small.status, 200);
    assert.ok(small.body.jobs.length <= 2, `batchSize=2 应 ≤ 2, 实际 ${small.body.jobs.length}`);
    // 立刻把这批释放回去 (不 success, 否则会推进到下一步)
    for (const j of small.body.jobs) {
      await post(`${PREFIX}/queue/lease/${j.runId}/release`, { workerId: "w-D3a" });
    }
    // batchSize=50 应能拉到更多 (>= 上面那次)
    const big = await post(`${PREFIX}/queue/ingest/lease`, {
      workerId: "w-D3b",
      batchSize: 50,
    });
    assert.ok(big.body.jobs.length <= 50, `batchSize=50 应 ≤ 50, 实际 ${big.body.jobs.length}`);
    assert.ok(
      big.body.jobs.length >= small.body.jobs.length,
      `更大 batchSize 应能取到更多或相等; 小=${small.body.jobs.length} 大=${big.body.jobs.length}`,
    );
    for (const j of big.body.jobs) {
      await post(`${PREFIX}/queue/lease/${j.runId}/release`, { workerId: "w-D3b" });
    }
  });

  test("D4. 两个 worker 并发 lease → 不会拿到同一个 runId", async () => {
    await Promise.all([ingest(taskId), ingest(taskId)]);
    const [r1, r2] = await Promise.all([
      post(`${PREFIX}/queue/ingest/lease`, { workerId: "wA", batchSize: 5 }),
      post(`${PREFIX}/queue/ingest/lease`, { workerId: "wB", batchSize: 5 }),
    ]);
    const ids = new Set<string>();
    for (const j of [...r1.body.jobs, ...r2.body.jobs]) {
      assert.ok(!ids.has(j.runId), `runId ${j.runId} 被双发`);
      ids.add(j.runId);
    }
    // 收尾 (release 所有, 不知道哪些是别人的, 全 release 回去最安全)
    for (const j of [...r1.body.jobs, ...r2.body.jobs]) {
      await post(`${PREFIX}/queue/lease/${j.runId}/release`, {
        workerId: j.runId === r1.body.jobs[0]?.runId ? "wA" : "wB",
      }).catch(() => {});
    }
  });
});

// ═══════════════════════════════════════════════════════════
// E. lease 管理: claim / release / heartbeat
// ═══════════════════════════════════════════════════════════
describe("E. lease 管理", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("E1. claim 指定 runId → 返回 job", async () => {
    const ing = await ingest(taskId);
    // 拿到 runId
    const detail = await getItem(ing.itemId);
    const runId = detail.body.inflight[0].run_id;
    const r = await post(`${PREFIX}/queue/run/${runId}/claim`, { workerId: "w-E1" });
    assert.equal(r.status, 200);
    assert.equal(r.body.job.runId, runId);
  });

  test("E2. claim 一个已被领取的 → 409 ALREADY_CLAIMED", async () => {
    const ing = await ingest(taskId);
    const detail = await getItem(ing.itemId);
    const runId = detail.body.inflight[0].run_id;
    const r1 = await post(`${PREFIX}/queue/run/${runId}/claim`, { workerId: "wX" });
    assert.equal(r1.status, 200);
    const r2 = await post(`${PREFIX}/queue/run/${runId}/claim`, { workerId: "wY" });
    assert.equal(r2.status, 409);
    assert.equal(r2.body.error.code, "ALREADY_CLAIMED");
  });

  test("E3. 持 lease 的 worker 调用 release → 200 + run 回到 pending", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-E3");
    const r = await post(`${PREFIX}/queue/lease/${job.runId}/release`, { workerId: "w-E3" });
    assert.equal(r.status, 200);
    const detail = await getItem(ing.itemId);
    const inflight = detail.body.inflight.find((x: any) => x.run_id === job.runId);
    assert.equal(inflight?.status, "pending");
  });

  test("E4. 错的 workerId 调 release → 409 LEASE_LOST", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-E4-real");
    const r = await post(`${PREFIX}/queue/lease/${job.runId}/release`, { workerId: "w-E4-fake" });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "LEASE_LOST");
    await postResult({ runId: job.runId, status: "success" });
  });

  test("E5. heartbeat 续租 → expected_by 被推后", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-E5", 30);
    const detail = await getItem(ing.itemId);
    const ours = detail.body.inflight.find((x: any) => x.run_id === job.runId);
    const before = new Date(ours.expected_by).getTime();
    await sleep(50);
    const r = await post(`${PREFIX}/queue/lease/${job.runId}/heartbeat`, {
      workerId: "w-E5",
      extendSeconds: 120,
    });
    assert.equal(r.status, 200);
    const after = new Date(r.body.newExpectedBy).getTime();
    assert.ok(after > before, "续租后应大于原 deadline");
    await postResult({ runId: job.runId, status: "success" });
  });

  test("E6. heartbeat 用错 workerId → 409 LEASE_LOST", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-E6-real");
    const r = await post(`${PREFIX}/queue/lease/${job.runId}/heartbeat`, {
      workerId: "wrong",
      extendSeconds: 60,
    });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "LEASE_LOST");
    await postResult({ runId: job.runId, status: "success" });
  });
});

// ═══════════════════════════════════════════════════════════
// F. /result 成功路径
// ═══════════════════════════════════════════════════════════
describe("F. /result 成功路径", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("F1. success 推进到默认下一步 (ingest → translate)", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-F1");
    const r = await postResult({
      runId: job.runId,
      status: "success",
      output: { ok: true },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.applied, true);
    assert.equal(r.body.nextStep, "translate");
    const detail = await getItem(ing.itemId);
    assert.equal(detail.body.item.current_step, "translate");
    assert.deepEqual(detail.body.item.envelope.outputs.ingest, { ok: true });
  });

  test("F2. nextHint=done 立即终止", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-F2");
    const r = await postResult({ runId: job.runId, status: "success", nextHint: "done" });
    assert.equal(r.body.nextStep, "done");
    const detail = await getItem(ing.itemId);
    assert.equal(detail.body.item.current_step, "done");
  });

  test("F3. 重复提交同一 runId → applied=false", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-F3");
    const r1 = await postResult({ runId: job.runId, status: "success" });
    assert.equal(r1.body.applied, true);
    const r2 = await postResult({ runId: job.runId, status: "success" });
    assert.equal(r2.status, 200);
    assert.equal(r2.body.applied, false);
  });

  test("F4. 提交不存在的 runId → 404 UNKNOWN_RUN", async () => {
    const r = await postResult({
      runId: "00000000-0000-0000-0000-000000000000",
      status: "success",
    });
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, "UNKNOWN_RUN");
  });

  test("F5. lease 已过期再提交 → 409 LEASE_EXPIRED", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-F5", 5); // 最短 5s
    await sleep(5500);
    const r = await postResult({ runId: job.runId, status: "success" });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "LEASE_EXPIRED");
  });
});

// ═══════════════════════════════════════════════════════════
// G. /result 失败 / 重试 / DLQ
// ═══════════════════════════════════════════════════════════
describe("G. /result 失败路径", () => {
  let taskId = "";
  before(async () => {
    // maxAttempts=2 → 第二次失败立即 stuck
    taskId = await createPipeline(buildSamplePipeline({ maxAttempts: 2 }).steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("G1. 可重试失败 → 写入新 pending (attempt+1) + retryAt 在未来", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-G1");
    const r = await postResult({
      runId: job.runId,
      status: "failed",
      error: { code: "X", message: "transient", retryable: true },
    });
    assert.equal(r.status, 200);
    assert.ok(r.body.retryAt, "应返回 retryAt");
    assert.ok(new Date(r.body.retryAt).getTime() >= Date.now() - 100);
    const detail = await getItem(ing.itemId);
    const next = detail.body.inflight.find((x: any) => x.attempt === 2);
    assert.ok(next, "应能找到 attempt=2 的新 pending");
  });

  test("G2. 用尽重试 → dlq:true 且 item.current_step=stuck", async () => {
    const ing = await ingest(taskId);
    // attempt 1 失败
    let job = await claimItem(ing.itemId, "w-G2");
    await postResult({
      runId: job.runId,
      status: "failed",
      error: { code: "X", message: "1", retryable: true },
    });
    await sleep(20);
    // attempt 2 失败 (maxAttempts=2 → 用尽)
    job = await claimItem(ing.itemId, "w-G2");
    const r = await postResult({
      runId: job.runId,
      status: "failed",
      error: { code: "X", message: "2", retryable: true },
    });
    assert.equal(r.body.dlq, true);
    const detail = await getItem(ing.itemId);
    assert.equal(detail.body.item.current_step, "stuck");
  });

  test("G3. 不可重试 (retryable=false) → 立刻 stuck", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-G3");
    const r = await postResult({
      runId: job.runId,
      status: "failed",
      error: { code: "X", message: "fatal", retryable: false },
    });
    assert.equal(r.body.dlq, true);
    const detail = await getItem(ing.itemId);
    assert.equal(detail.body.item.current_step, "stuck");
  });
});

// ═══════════════════════════════════════════════════════════
// H. 路由 / loopback
// ═══════════════════════════════════════════════════════════
describe("H. 路由 / loopback", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline({ reviewMaxLoops: 2 }).steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  // 把 item 推到指定 step (用一连串 success+nextHint)
  async function pushTo(itemId: string, target: string) {
    const job = await claimItem(itemId, "pusher");
    const r = await postResult({ runId: job.runId, status: "success", nextHint: target });
    assert.equal(r.body.nextStep, target);
    const d = await getItem(itemId);
    assert.equal(d.body.item.current_step, target);
  }

  test("H1. routes.cases 命中 approved → 进入 export", async () => {
    const ing = await ingest(taskId);
    await pushTo(ing.itemId, "review");
    const job = await claimItem(ing.itemId, "w-H1");
    const r = await postResult({
      runId: job.runId,
      status: "success",
      output: { decision: "approved" },
    });
    assert.equal(r.body.nextStep, "export");
  });

  test("H2. routes.cases 命中 rejected → goto translate, loop_counts 增加", async () => {
    const ing = await ingest(taskId);
    await pushTo(ing.itemId, "review");
    const job = await claimItem(ing.itemId, "w-H2");
    const r = await postResult({
      runId: job.runId,
      status: "success",
      output: { decision: "rejected" },
    });
    assert.equal(r.body.nextStep, "translate");
    const d = await getItem(ing.itemId);
    assert.equal(d.body.item.loop_counts.review, 1);
  });

  test("H3. goto 超过 maxLoops → stuck", async () => {
    const ing = await ingest(taskId);
    await pushTo(ing.itemId, "review");
    // reject 1 (loop=1)
    let job = await claimItem(ing.itemId, "w-H3");
    await postResult({ runId: job.runId, status: "success", output: { decision: "rejected" } });
    // translate
    job = await claimItem(ing.itemId, "w-H3");
    await postResult({ runId: job.runId, status: "success" });
    // reject 2 (loop=2)
    job = await claimItem(ing.itemId, "w-H3");
    await postResult({ runId: job.runId, status: "success", output: { decision: "rejected" } });
    job = await claimItem(ing.itemId, "w-H3");
    await postResult({ runId: job.runId, status: "success" });
    // reject 3 → 超过 maxLoops=2, stuck
    job = await claimItem(ing.itemId, "w-H3");
    const r = await postResult({
      runId: job.runId,
      status: "success",
      output: { decision: "rejected" },
    });
    assert.equal(r.body.nextStep, "stuck");
    const d = await getItem(ing.itemId);
    assert.equal(d.body.item.current_step, "stuck");
  });
});

// ═══════════════════════════════════════════════════════════
// I. Dedup
// ═══════════════════════════════════════════════════════════
describe("I. Dedup", () => {
  let taskId = "";
  let itemA = "";
  let itemB = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
    itemA = (await ingest(taskId, { url: "a" })).itemId;
    itemB = (await ingest(taskId, { url: "b" })).itemId;
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("I1. 第一次 hash → kept:true", async () => {
    const hash = uniqueId("hash");
    const r = await post(`${PREFIX}/dedup/check`, {
      taskId,
      itemId: itemA,
      stepKey: "ingest",
      hash,
      fields: { url: "a" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.kept, true);
    assert.equal(r.body.hash, hash);
  });

  test("I2. 第二条 item 用同一 hash → kept:false, firstItemId=A", async () => {
    const hash = uniqueId("hash-collide");
    const r1 = await post(`${PREFIX}/dedup/check`, {
      taskId,
      itemId: itemA,
      stepKey: "ingest",
      hash,
    });
    assert.equal(r1.body.kept, true);
    const r2 = await post(`${PREFIX}/dedup/check`, {
      taskId,
      itemId: itemB,
      stepKey: "ingest",
      hash,
    });
    assert.equal(r2.body.kept, false);
    assert.equal(r2.body.firstItemId, itemA);
  });

  test("I3. 同 item 重新提交 (loopback) 用新 hash → kept:true (旧 hash 被释放)", async () => {
    const oldHash = uniqueId("old");
    const newHash = uniqueId("new");
    await post(`${PREFIX}/dedup/check`, {
      taskId,
      itemId: itemA,
      stepKey: "ingest",
      hash: oldHash,
    });
    const r = await post(`${PREFIX}/dedup/check`, {
      taskId,
      itemId: itemA,
      stepKey: "ingest",
      hash: newHash,
    });
    assert.equal(r.body.kept, true);
  });

  test("I4. taskId 不是 UUID → 拒绝写入 (zod 校验, 当前实现返回 5xx)", async () => {
    const r = await post(`${PREFIX}/dedup/check`, {
      taskId: "not-a-uuid",
      itemId: itemA,
      stepKey: "ingest",
      hash: "x",
    });
    // Fastify 默认对 zod throw 返回 500; 真正想要的是"非 2xx 并未 kept"
    assert.ok(r.status >= 400, `非法 body 应返回错误状态, 实际 ${r.status}`);
    assert.notEqual(r.body.kept, true);
  });
});

// ═══════════════════════════════════════════════════════════
// J. Dataset records (UPSERT)
// ═══════════════════════════════════════════════════════════
describe("J. Dataset records", () => {
  let taskId = "";
  let itemId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
    itemId = (await ingest(taskId, { title: "x" })).itemId;
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("J1. POST /dataset/records/save 首次 → 200 + id", async () => {
    const r = await post(`${PREFIX}/dataset/records/save`, {
      taskId,
      itemId,
      payload: { title: "x", v: 1 },
      metadata: { source: "test" },
    });
    assert.equal(r.status, 200);
    assert.match(r.body.id, /^[0-9a-f-]{36}$/);
  });

  test("J2. 同一 itemId 再 save → UPSERT, /tasks/:taskId/records 仍只有一条", async () => {
    await post(`${PREFIX}/dataset/records/save`, {
      taskId,
      itemId,
      payload: { title: "x", v: 2 },
    });
    const r = await get(`${PREFIX}/tasks/${taskId}/records`);
    assert.equal(r.status, 200);
    const mine = r.body.records.filter((rec: any) => rec.item_id === itemId);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].payload.v, 2);
  });
});

// ═══════════════════════════════════════════════════════════
// K. Admin (queue 计数 / stuck / replay)
// ═══════════════════════════════════════════════════════════
describe("K. Admin / 监控", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("K1. GET /admin/queue 返回数组 (字段 node_key/status/n)", async () => {
    await ingest(taskId);
    const r = await get(`${PREFIX}/admin/queue`);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.queue));
    if (r.body.queue.length > 0) {
      const row = r.body.queue[0];
      assert.equal(typeof row.node_key, "string");
      assert.equal(typeof row.status, "string");
      assert.equal(typeof row.n, "number");
    }
  });

  test("K2. /admin/stuck 只返回 stuck 状态的 item", async () => {
    const r = await get(`${PREFIX}/admin/stuck`);
    assert.equal(r.status, 200);
    for (const it of r.body.items) {
      assert.equal(it.current_step, "stuck");
    }
  });

  test("K3. POST /admin/items/:id/replay → item.current_step 改回, 新建 pending", async () => {
    const ing = await ingest(taskId);
    const job = await claimItem(ing.itemId, "w-K3");
    await postResult({ runId: job.runId, status: "success", nextHint: "done" });
    let detail = await getItem(ing.itemId);
    assert.equal(detail.body.item.current_step, "done");

    const r = await post(`${PREFIX}/admin/items/${ing.itemId}/replay`, { stepKey: "translate" });
    assert.equal(r.status, 200);
    detail = await getItem(ing.itemId);
    assert.equal(detail.body.item.current_step, "translate");
    assert.ok(detail.body.inflight.some((x: any) => x.step_key === "translate"));
  });

  test("K4. replay 一个不存在的 stepKey → 400 INVALID_STEP", async () => {
    const ing = await ingest(taskId);
    const r = await post(`${PREFIX}/admin/items/${ing.itemId}/replay`, { stepKey: "no-such" });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, "INVALID_STEP");
  });
});

// ═══════════════════════════════════════════════════════════
// L. 边界: save 与 in-flight 冲突
// ═══════════════════════════════════════════════════════════
describe("L. save 与 in-flight 冲突", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("L1. 改 steps 删除了 in-flight 的 step → 409 INFLIGHT_STEPS_CONFLICT", async () => {
    await ingest(taskId); // 立刻有 ingest pending
    const r = await post(`${PREFIX}/pipelines/${taskId}/save`, {
      steps: [
        // 把 ingest 删掉, 直接从 export 开始 → 冲突
        { key: "export", nodeKey: "export", params: { format: "json" } },
      ],
    });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "INFLIGHT_STEPS_CONFLICT");
    assert.ok(Array.isArray(r.body.error.conflicts));
  });

  test("L2. 改 steps 但保留 (key, nodeKey) 不变 → 200", async () => {
    const r = await post(`${PREFIX}/pipelines/${taskId}/save`, {
      steps: buildSamplePipeline().steps as any,
    });
    assert.equal(r.status, 200);
  });
});

// ═══════════════════════════════════════════════════════════
// M. 看板聚合
// ═══════════════════════════════════════════════════════════
describe("M. 看板聚合", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("M1. /tasks/:taskId/kanban 返回 4 列 (与 pipeline.steps 一致)", async () => {
    const r = await get(`${PREFIX}/tasks/${taskId}/kanban`);
    assert.equal(r.status, 200);
    const keys = r.body.steps.map((s: any) => s.stepKey);
    assert.deepEqual(keys, ["ingest", "translate", "review", "export"]);
  });

  test("M2. ingest 投递后, ingest 列里能看到这条 item", async () => {
    const ing = await ingest(taskId, { from: "kanban" });
    const r = await get(`${PREFIX}/tasks/${taskId}/kanban`);
    const ingestCol = r.body.steps.find((s: any) => s.stepKey === "ingest");
    const found = ingestCol.items.find((x: any) => x.item.id === ing.itemId);
    assert.ok(found, "kanban 应包含刚 ingest 的 item");
  });
});

// ═══════════════════════════════════════════════════════════
// O. 一条 pipeline 多 item 并行: 共享模板, 互不串扰
// ═══════════════════════════════════════════════════════════
describe("O. 同 pipeline 多 item 并行", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("O1. 5 个 item 同时入 ingest, lease 后 envelope 各自独立", async () => {
    const items = await Promise.all(
      [1, 2, 3, 4, 5].map((i) => ingest(taskId, { idx: i, tag: `O1-${i}` })),
    );
    const lease = await post(`${PREFIX}/queue/ingest/lease`, {
      workerId: "w-O1",
      batchSize: 50,
    });
    const myJobs = lease.body.jobs.filter((j: any) => j.taskId === taskId);
    const others = lease.body.jobs.filter((j: any) => j.taskId !== taskId);
    assert.equal(myJobs.length, 5);
    const seenItems = new Set<string>();
    for (const job of myJobs) {
      assert.ok(!seenItems.has(job.itemId), `item ${job.itemId} 不应被多次发出`);
      seenItems.add(job.itemId);
      assert.equal(typeof job.envelope.payload.idx, "number");
      assert.match(String(job.envelope.payload.tag), /^O1-\d+$/);
    }
    // 处理我的 5 条
    await Promise.all(
      myJobs.map((j: any) =>
        postResult({
          runId: j.runId,
          status: "success",
          output: { itemTag: j.envelope.payload.tag },
        }),
      ),
    );
    // 释放别人的
    for (const j of others) {
      await post(`${PREFIX}/queue/lease/${j.runId}/release`, { workerId: "w-O1" });
    }
    for (const it of items) {
      const d = await getItem(it.itemId);
      assert.equal(d.body.item.envelope.outputs.ingest.itemTag, `O1-${d.body.item.envelope.payload.idx}`);
      assert.equal(d.body.item.current_step, "translate");
    }
  });

  test("O2. 不同 worker 同时处理同 step 的 5 个 item, 不会拿到对方的", async () => {
    const items = await Promise.all([1, 2, 3, 4, 5].map((i) => ingest(taskId, { batch: "O2", n: i })));
    const [r1, r2, r3] = await Promise.all([
      post(`${PREFIX}/queue/ingest/lease`, { workerId: "wA", batchSize: 50 }),
      post(`${PREFIX}/queue/ingest/lease`, { workerId: "wB", batchSize: 50 }),
      post(`${PREFIX}/queue/ingest/lease`, { workerId: "wC", batchSize: 50 }),
    ]);
    const all = [
      ...r1.body.jobs.map((j: any) => ({ j, w: "wA" })),
      ...r2.body.jobs.map((j: any) => ({ j, w: "wB" })),
      ...r3.body.jobs.map((j: any) => ({ j, w: "wC" })),
    ];
    const ids = new Set<string>();
    for (const { j } of all) {
      assert.ok(!ids.has(j.runId), `runId 双发: ${j.runId}`);
      ids.add(j.runId);
    }
    // 我的 5 条都拿到
    const myItems = new Set(items.map((x) => x.itemId));
    const myJobs = all.filter((x) => myItems.has(x.j.itemId));
    assert.equal(myJobs.length, 5, "新 ingest 的 5 个 item 都应被这一轮 lease 拿到");
    // 处理我的 + 释放别人的
    for (const x of all) {
      if (myItems.has(x.j.itemId)) {
        await postResult({ runId: x.j.runId, status: "success" });
      } else {
        await post(`${PREFIX}/queue/lease/${x.j.runId}/release`, { workerId: x.w });
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// P. 多 pipeline 并行: 不同任务模板互不影响
// ═══════════════════════════════════════════════════════════
describe("P. 多 pipeline 并行", () => {
  test("P1. 3 条独立 pipeline 同时各自跑 happy path, 互不干扰", async () => {
    const pipelines = await Promise.all([
      createPipeline(buildSamplePipeline({ name: uniqueId("P1-a") }).steps as any),
      createPipeline(buildSamplePipeline({ name: uniqueId("P1-b") }).steps as any),
      createPipeline(buildSamplePipeline({ name: uniqueId("P1-c") }).steps as any),
    ]);
    try {
      // 各自投递 1 条 item
      const ingested = await Promise.all(
        pipelines.map((tid, i) => ingest(tid, { from: `P1-${i}` })),
      );

      // 每条 item 各跑一遍 happy path —— 注意所有 lease 都按 nodeKey 拉,
      // 所以并行调度不会 by-pipeline; 只要每个 worker 处理后只用对应 runId 提交就 OK
      for (const stepKey of ["ingest", "translate", "review", "export"]) {
        const lease = await post(`${PREFIX}/queue/${stepKey}/lease`, {
          workerId: `w-P1-${stepKey}`,
          batchSize: 50,
        });
        const targetIds = new Set(ingested.map((x) => x.itemId));
        const mine = lease.body.jobs.filter((j: any) => targetIds.has(j.itemId));
        assert.equal(mine.length, 3, `${stepKey} 三条 pipeline 应各贡献一条 job`);
        // 拿不属于本测试的 job 释放回去, 不影响其他测试
        const others = lease.body.jobs.filter((j: any) => !targetIds.has(j.itemId));
        for (const o of others) {
          await post(`${PREFIX}/queue/lease/${o.runId}/release`, {
            workerId: `w-P1-${stepKey}`,
          });
        }
        // 只把本测试的 3 条 success
        await Promise.all(
          mine.map((j: any) =>
            postResult({
              runId: j.runId,
              status: "success",
              output: stepKey === "review" ? { decision: "approved" } : { ok: true },
            }),
          ),
        );
      }

      for (const it of ingested) {
        const d = await getItem(it.itemId);
        assert.equal(d.body.item.current_step, "done");
      }
    } finally {
      await Promise.all(pipelines.map(deletePipeline));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// Q. 非幂等 vs 幂等节点的退避语义
// ═══════════════════════════════════════════════════════════
describe("Q. retry 退避按节点配置生效", () => {
  test("Q1. baseBackoffMs=200, attempt 1 失败后 retryAt 至少 200ms 之后", async () => {
    const taskId = await createPipeline(
      buildSamplePipeline({ baseBackoffMs: 200, maxAttempts: 3 }).steps as any,
    );
    try {
      const ing = await ingest(taskId, { backoff: 200 });
      const job = await claimItem(ing.itemId, "w-Q1");
      const t0 = Date.now();
      const r = await postResult({
        runId: job.runId,
        status: "failed",
        error: { code: "X", message: "transient", retryable: true },
      });
      const expected = new Date(r.body.retryAt).getTime();
      assert.ok(
        expected - t0 >= 180,
        `retryAt 应至少在 200ms 后, 实际 ${expected - t0}ms`,
      );
    } finally {
      await deletePipeline(taskId);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// N. 端到端: 从空 pipeline 走到 done
// ═══════════════════════════════════════════════════════════
describe("N. 端到端 happy path", () => {
  test("N1. ingest → translate → review(approved) → export → done", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const { itemId } = await ingest(taskId, { text: "happy" });

      // ingest
      let job = await claimItem(itemId, "w-N1");
      await postResult({
        runId: job.runId,
        status: "success",
        output: { ingested: true },
      });
      // translate
      job = await claimItem(itemId, "w-N1");
      await postResult({
        runId: job.runId,
        status: "success",
        output: { translated: "你好" },
      });
      // review
      job = await claimItem(itemId, "w-N1");
      await postResult({
        runId: job.runId,
        status: "success",
        output: { decision: "approved" },
      });
      // export
      job = await claimItem(itemId, "w-N1");
      await postResult({
        runId: job.runId,
        status: "success",
        output: { exported: true },
      });

      const detail = await getItem(itemId);
      assert.equal(detail.body.item.current_step, "done");
      assert.equal(detail.body.history.length, 4);
      assert.deepEqual(
        detail.body.history.map((h: any) => h.step_key),
        ["ingest", "translate", "review", "export"],
      );
      assert.equal(Object.keys(detail.body.item.envelope.outputs).length, 4);
    } finally {
      await deletePipeline(taskId);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// R. Idempotency-Key
// ═══════════════════════════════════════════════════════════
describe("R. Idempotency-Key", () => {
  test("R1. 不带 Idempotency-Key 的请求行为不变 (创建两条 item)", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const a = await post(`${PREFIX}/items/create`, { taskId, envelope: { payload: { v: 1 } } });
      const b = await post(`${PREFIX}/items/create`, { taskId, envelope: { payload: { v: 1 } } });
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      assert.notEqual(a.body.itemId, b.body.itemId);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("R2. 带相同 Idempotency-Key 重复同 body → 只创建一次, 第二次返回首次响应", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    const key = `idem-${uniqueId("k")}-aaaaaaaa`;
    try {
      const a = await post(
        `${PREFIX}/items/create`,
        { taskId, envelope: { payload: { v: 1 } } },
        { "Idempotency-Key": key },
      );
      const b = await post(
        `${PREFIX}/items/create`,
        { taskId, envelope: { payload: { v: 1 } } },
        { "Idempotency-Key": key },
      );
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      assert.equal(a.body.itemId, b.body.itemId, "重复 key + 同 body 应返回同一 itemId");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("R3. 同 key 不同 body → 409 IDEMPOTENCY_HASH_MISMATCH", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    const key = `idem-${uniqueId("k")}-bbbbbbbb`;
    try {
      const a = await post(
        `${PREFIX}/items/create`,
        { taskId, envelope: { payload: { v: 1 } } },
        { "Idempotency-Key": key },
      );
      assert.equal(a.status, 200);
      const b = await post(
        `${PREFIX}/items/create`,
        { taskId, envelope: { payload: { v: 999 } } },
        { "Idempotency-Key": key },
      );
      assert.equal(b.status, 409);
      assert.equal(b.body.error.code, "IDEMPOTENCY_HASH_MISMATCH");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("R4. /result 用 Idempotency-Key 重放 → 第二次仍返回 applied", async () => {
    // 注意: /result 本身就是按 runId 幂等的, 这里验证 Idempotency-Key 仍能正确重放,
    // 不会被既有逻辑当成"未知 run"或重复 attempt 弄出多条
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    const key = `idem-result-${uniqueId("k")}-cccccccc`;
    try {
      const { itemId } = await ingest(taskId, { v: 1 });
      const job = await claimItem(itemId, "w-idem", 60);
      const body = { runId: job.runId, status: "success" as const, output: { ok: 1 } };
      const a = await post(`${PREFIX}/result`, body, { "Idempotency-Key": key });
      const b = await post(`${PREFIX}/result`, body, { "Idempotency-Key": key });
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      // 首次 applied:true; 缓存重放 → 同样响应
      assert.equal(b.body.applied, a.body.applied);
      if (a.body.nextStep) assert.equal(b.body.nextStep, a.body.nextStep);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("R5. Idempotency-Key 长度小于 8 → 400 BAD_IDEMPOTENCY_KEY", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const r = await post(
        `${PREFIX}/items/create`,
        { taskId, envelope: { payload: {} } },
        { "Idempotency-Key": "x" },
      );
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "BAD_IDEMPOTENCY_KEY");
    } finally {
      await deletePipeline(taskId);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// T. Pipeline 版本化 + 表单接口 (P0-D)
// ═══════════════════════════════════════════════════════════
describe("T. Pipeline 版本化 + 表单接口", () => {
  test("T1. /pipelines/:id/forms 返回当前版本 forms + ETag", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const r = await get(`${PREFIX}/pipelines/${taskId}/forms`);
      assert.equal(r.status, 200);
      assert.ok(typeof r.body.version === "number");
      assert.ok(typeof r.body.forms === "object");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("T2. ETag 命中 → 304 不带 body", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const url = `${BASE}${PREFIX}/pipelines/${taskId}/forms`;
      const r1 = await fetch(url);
      const etag = r1.headers.get("etag");
      assert.ok(etag, "首次请求应带 ETag");
      const r2 = await fetch(url, { headers: { "if-none-match": etag! } });
      assert.equal(r2.status, 304);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("T3. save 创建新版本; 在飞行 item 仍走旧版本", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const ing = await ingest(taskId, { v: 1 });
      const r = await post(`${PREFIX}/pipelines/${taskId}/save`, {
        layout: { positions: { ingest: { x: 1, y: 2 } } },
      });
      assert.equal(r.status, 200);
      const job = await leaseOne("ingest", "w-pv");
      assert.equal(job!.itemId, ing.itemId);
      const res = await postResult({ runId: job!.runId, status: "success" });
      assert.equal(res.body.applied, true);
    } finally {
      await deletePipeline(taskId);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// U. audit_log (P0-E)
// ═══════════════════════════════════════════════════════════
describe("U. audit_log", () => {
  test("U1. pipeline.create 落 audit_log 行", async () => {
    const { asSystem } = await import("../src/db.ts");
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      await sleep(200); // 等异步写落库
      const rows = await asSystem(async (tx) => tx<any[]>`
        SELECT action, resource->>'id' AS rid
        FROM audit_log
        WHERE action = 'pipeline.create' AND resource->>'id' = ${taskId}
      `);
      assert.ok(rows.length >= 1, "audit_log 应有 pipeline.create 行");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("U2. audit_log append-only: UPDATE 抛异常", async () => {
    const { asSystem } = await import("../src/db.ts");
    let err: any = null;
    try {
      await asSystem(async (tx) => {
        await tx`UPDATE audit_log SET action = 'tampered' WHERE id = (SELECT id FROM audit_log LIMIT 1)`;
      });
    } catch (e: any) { err = e; }
    assert.ok(err, "UPDATE audit_log 应被 trigger 拒绝");
    assert.match(String(err.message ?? err), /append-only|forbidden/i);
  });
});

// ═══════════════════════════════════════════════════════════
// X. Driver Registry e2e — 跑通 ingest source=script 沙箱链路 (P1)
// ═══════════════════════════════════════════════════════════
describe("X. Driver Registry — sandbox-js", () => {
  test("X1. ingest source=script 经 autoworker 沙箱执行 → output 写到 envelope.outputs", async () => {
    // 复用 seed 中的"示例: 脚本预处理" pipeline (script 计算 normalized/wordCount/charCount/hash)
    const { sql, asSystem } = await import("../src/db.ts");
    const [pipe] = await asSystem(async (tx) => tx<{ task_id: string }[]>`
      SELECT task_id FROM pipelines WHERE name = '示例: 脚本预处理' LIMIT 1
    `);
    if (!pipe) {
      // seed 没跑就跳; 不算失败
      console.warn("[X1] seed 未注入 '示例: 脚本预处理', skip");
      return;
    }
    const taskId = pipe.task_id;

    // 投递一条 item, 等 autoworker 把 ingest script 跑掉.
    // 注: autoworker 空轮询退避策略下 idle 时 tick 间隔可能拉到 10s, 用 poll 兜底
    const ing = await ingest(taskId, { text: "Hello Sandbox World" });

    let item: any = null;
    let ingestOut: any = null;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      item = await getItem(ing.itemId);
      ingestOut = item.body.item.envelope.outputs?.ingest;
      if (ingestOut) break;
      await sleep(500);
    }
    assert.ok(ingestOut, "envelope.outputs.ingest 应被脚本写入 (15s 超时)");
    // 脚本: { normalized, wordCount, charCount, hash }
    assert.equal(ingestOut.normalized, "hello sandbox world");
    assert.equal(ingestOut.wordCount, 3);
    assert.equal(ingestOut.charCount, 19);
    assert.ok(typeof ingestOut.hash === "string" && ingestOut.hash.length > 0);
    // current_step 应推进到 review (script pipeline 第二步)
    assert.equal(item.body.item.current_step, "review");
  });
});

// ═══════════════════════════════════════════════════════════
// Y. 节点输出隔离不变量
// ═══════════════════════════════════════════════════════════
describe("Y. 节点输出隔离", () => {
  test("Y1. step output 含 'payload' / 'tags' 键不会污染 envelope.payload / tags", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const ing = await ingest(taskId, { original: "ground-truth" });
      const itemBefore = await getItem(ing.itemId);
      const job = await leaseOne("ingest", "w-iso");
      // 恶意 driver 试图通过 output 顶层 key 改 payload / tags
      await postResult({
        runId: job!.runId,
        status: "success",
        output: {
          payload: { hijacked: true },        // 想改 envelope.payload? 不行
          tags: { evil: "tag" },              // 想改 envelope.tags? 不行
          translate: { otherStep: "stolen" }, // 想改其他 step 的 outputs slot? 不行
          ok: 1,                              // 真实合法 output
        },
      });
      const itemAfter = await getItem(ing.itemId);
      // payload 必须未变
      assert.deepEqual(itemAfter.body.item.envelope.payload, itemBefore.body.item.envelope.payload);
      // tags 必须未变
      assert.deepEqual(itemAfter.body.item.envelope.tags, itemBefore.body.item.envelope.tags);
      // 其他 step 的 outputs slot (translate) 不应被这次 ingest 写出
      const translateOut = itemAfter.body.item.envelope.outputs?.translate;
      assert.ok(translateOut === undefined || translateOut === null,
        "translate slot 不应被 ingest 步污染");
      // ingest 自己的 output 完整保留 (含恶意键也存进自己 slot, 但被困在 slot 内)
      assert.equal(itemAfter.body.item.envelope.outputs.ingest.ok, 1);
      assert.equal(itemAfter.body.item.envelope.outputs.ingest.payload.hijacked, true);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("Y2. output 不是 plain object → 400 BAD_OUTPUT", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      await ingest(taskId, {});
      const job = await leaseOne("ingest", "w-iso2");
      const r = await postResult({
        runId: job!.runId,
        status: "success",
        output: ["not", "an", "object"] as any,
      });
      assert.equal(r.status, 400, `应被拒, 实际 ${r.status}`);
      // zod 第一道报 BAD_REQUEST, sanitize 兜底报 BAD_OUTPUT — 任一都 OK
      assert.ok(["BAD_REQUEST", "BAD_OUTPUT"].includes(r.body.error.code));
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("Y3. output > 64KB → 400 OUTPUT_TOO_LARGE", async () => {
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      await ingest(taskId, {});
      const job = await leaseOne("ingest", "w-iso3");
      const huge = "x".repeat(64 * 1024 + 100);
      const r = await postResult({
        runId: job!.runId,
        status: "success",
        output: { blob: huge },
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "OUTPUT_TOO_LARGE");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("Y4. 直接 SQL UPDATE items.envelope.payload 被 trigger 拒绝", async () => {
    const { asSystem } = await import("../src/db.ts");
    const taskId = await createPipeline(buildSamplePipeline().steps as any);
    try {
      const ing = await ingest(taskId, { protected: "原始数据" });
      let err: any = null;
      try {
        await asSystem(async (tx) => {
          await tx`
            UPDATE items
               SET envelope = jsonb_set(envelope, '{payload}', '{"tampered":true}'::jsonb)
             WHERE id = ${ing.itemId}
          `;
        });
      } catch (e: any) { err = e; }
      assert.ok(err, "DB trigger 应拒绝 payload 修改");
      assert.match(String(err.message ?? err), /payload is immutable/i);
    } finally {
      await deletePipeline(taskId);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// S. 业务层端到端 spine — 把 admin / worker 当成两个外部系统跑通
//    覆盖: collect-submit → review-reject (with reason) → my_last_reason 回传
//          + admin replay 把 stuck item 救回 → worker 能再领
// ═══════════════════════════════════════════════════════════
describe("S. 业务层端到端 spine", () => {
  // 业务层 collect 流程要求 first step 是 manual nodeKey (ingest), 且后续有 review.
  // 不用 buildSamplePipeline 因为它 first step 是 ingest 但没经过业务层 batches/submissions 表.
  function buildBizPipeline(name: string) {
    const policy = { timeoutMs: 30_000, maxAttempts: 1, baseBackoffMs: 1 };
    return {
      name,
      steps: [
        { key: "ingest", nodeKey: "ingest", label: "采集", params: { source: "form" }, policy },
        {
          key: "review", nodeKey: "review", label: "审核",
          params: { rubric: "default" },
          routes: { on: "decision", cases: { rejected: { goto: "ingest", maxLoops: 1 }, approved: "next" } },
          policy,
        },
        { key: "store", nodeKey: "export", label: "入库", params: { format: "json" }, policy },
      ] as const,
    };
  }

  test("S1. collect submit → review reject(with reason) → /collect/state 返 my_last_reason", async () => {
    const taskId = await createPipeline(buildBizPipeline(uniqueId("biz-pipe")).steps as any);
    try {
      // 业务层建批次 (target=1, 自动 ingest 1 个 item)
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("biz-batch"), target: 1,
      });
      assert.equal(bRes.status, 200, `create batch: ${JSON.stringify(bRes.body)}`);
      const batchId = bRes.body.batchId;

      // 找到这个批次的 item (跨批次接口拿)
      const collectRes = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      assert.equal(collectRes.status, 200);
      assert.equal(collectRes.body.items.length, 1);
      const itemId = collectRes.body.items[0].id;

      // alice 认领并提交
      const claimRes = await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      assert.equal(claimRes.status, 200, `claim: ${JSON.stringify(claimRes.body)}`);

      const submitRes = await post(`/api/collect/${itemId}/submit`, {
        userId: "alice", payload: { content: "测试内容" },
      });
      assert.equal(submitRes.status, 200, `submit: ${JSON.stringify(submitRes.body)}`);
      assert.equal(submitRes.body.nextStep, "review");

      // 审核员 bob 拿到 review 的 run 并以理由 reject
      const itemDetail = await getItem(itemId);
      const reviewRun = itemDetail.body.inflight.find((r: any) => r.step_key === "review");
      assert.ok(reviewRun, "review run should be pending");
      const claimReview = await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, {
        workerId: "bob", leaseSeconds: 60,
      });
      assert.equal(claimReview.status, 200);

      const REASON = "缺字段 X — 测试理由";
      const decideRes = await post(`/api/review/${itemId}/decide`, {
        userId: "bob", batchId, decision: "rejected", reason: REASON,
      });
      assert.equal(decideRes.status, 200, `decide: ${JSON.stringify(decideRes.body)}`);

      // alice 拉自己的 collect-state, 应该看到 my_last_reason 回传
      const stateRes = await req<{ my_last_result: string; my_last_reason: string | null }>(
        "GET", `/api/collect/${itemId}/state?userId=alice`,
      );
      assert.equal(stateRes.status, 200);
      assert.equal(stateRes.body.my_last_result, "rejected");
      assert.equal(stateRes.body.my_last_reason, REASON);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S2. permanent fail → stuck → admin replay → 业务层能再领该 item", async () => {
    const taskId = await createPipeline(buildBizPipeline(uniqueId("biz-pipe-stuck")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("biz-batch-stuck"), target: 1,
      });
      const batchId = bRes.body.batchId;

      const collectRes = await req<{ items: { id: string; run_id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = collectRes.body.items[0].id;

      // 模拟 ingest 步骤直接核心层失败一次 → maxAttempts=1, retryable=false → 立刻 stuck
      // (不走业务层 collect/claim, 直接核心 claim+postResult, 模拟 stuck 场景)
      const directClaim = await claimItem(itemId, "w-stuck");
      await postResult({
        runId: directClaim.runId,
        status: "failed",
        error: { code: "BAD_INPUT", message: "测试 stuck", retryable: false },
      });

      let after = await getItem(itemId);
      assert.equal(after.body.item.current_step, "stuck", "应被推到 stuck");

      // admin /admin/items/:id/replay 把它打回 ingest
      const replayRes = await post(`${PREFIX}/admin/items/${itemId}/replay`, { stepKey: "ingest" });
      assert.equal(replayRes.status, 200, `replay: ${JSON.stringify(replayRes.body)}`);

      after = await getItem(itemId);
      assert.equal(after.body.item.current_step, "ingest", "replay 后回到 ingest");

      // 业务层 collect-tasks 应再能看到这个 item (不会被旧的 claimed/stuck submission 干扰)
      const collectAgain = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      assert.equal(collectAgain.status, 200);
      assert.ok(
        collectAgain.body.items.some((it) => it.id === itemId),
        "replay 后 item 应再次在可领列表里",
      );
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S3. admin replay 写 audit 行 → /admin/audit?action=item.replay&id=<itemId> 可查到", async () => {
    const taskId = await createPipeline(buildBizPipeline(uniqueId("biz-pipe-audit")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("biz-batch-audit"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const collectRes = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = collectRes.body.items[0].id;

      // 推到 stuck 然后 admin replay (会写一条 audit)
      const direct = await claimItem(itemId, "w-audit");
      await postResult({
        runId: direct.runId, status: "failed",
        error: { code: "BAD", message: "stuck for audit", retryable: false },
      });
      await post(`${PREFIX}/admin/items/${itemId}/replay`, { stepKey: "ingest" });

      // audit 写是异步的, 给个微小窗口
      await sleep(50);

      const auditRes = await req<{ entries: any[] }>(
        "GET", `${PREFIX}/admin/audit?action=item.replay&kind=item&id=${itemId}&limit=10`,
      );
      assert.equal(auditRes.status, 200);
      assert.ok(
        auditRes.body.entries.length >= 1,
        `期望至少 1 条 audit 行, 实际 ${auditRes.body.entries.length}`,
      );
      const e = auditRes.body.entries[0];
      assert.equal(e.action, "item.replay");
      assert.equal(e.resource.kind, "item");
      assert.equal(e.resource.id, itemId);
      assert.equal(e.before.previousStep, "stuck");
      assert.equal(e.after.newStep, "ingest");

      // 反例: 用不存在的 action 过滤 → 0 行
      const empty = await req<{ entries: any[] }>(
        "GET", `${PREFIX}/admin/audit?action=no-such-action&id=${itemId}`,
      );
      assert.equal(empty.body.entries.length, 0);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S4. /admin/audit?since=非法日期 → 400 INVALID_SINCE", async () => {
    const r = await req("GET", `${PREFIX}/admin/audit?since=not-a-date`);
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, "INVALID_SINCE");
  });

  // ── tenant 切换 (S5-S7): /me 跟 X-Api-Key 走 ──
  // 测试库默认不 seed demo 租户 (SEED_DEMO=false), 这里幂等插入 acme tenant + key
  // 让 dev mode 的 resolveCaller 能查到. 不清理 — 反复跑无害, 多个测试共享.
  before(async () => {
    const { asSystem } = await import("../src/db.ts");
    const { hashKey } = await import("../src/auth.ts");
    await asSystem(async (tx) => {
      const [tenant] = await tx<{ id: string }[]>`
        INSERT INTO tenants (slug, name, plan)
        VALUES ('acme', 'Acme Corp', 'standard')
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      const [role] = await tx<{ id: string }[]>`
        SELECT id FROM roles WHERE tenant_id IS NULL AND name = 'tenant_admin'
      `;
      const [key] = await tx<{ id: string }[]>`
        INSERT INTO api_keys (name, key_hash, scope, tenant_id)
        VALUES ('acme-admin-test', ${hashKey("dev-acme-admin-2026")}, 'admin', ${tenant.id})
        ON CONFLICT (key_hash) DO UPDATE SET name = EXCLUDED.name, revoked_at = NULL
        RETURNING id
      `;
      if (role) {
        await tx`
          INSERT INTO api_key_roles (api_key_id, role_id)
          VALUES (${key.id}, ${role.id}) ON CONFLICT DO NOTHING
        `;
      }
    });
  });

  test("S5. /me 不带 key → tenantId=default, isSystemActor=true", async () => {
    const r = await req("GET", `${PREFIX}/me`);
    assert.equal(r.status, 200);
    assert.equal(r.body.tenantId, "00000000-0000-0000-0000-000000000001");
    assert.equal(r.body.isSystemActor, true);
  });

  test("S6. /me 带 dev acme key → tenantId 切到 acme, isSystemActor=false", async () => {
    const r = await req("GET", `${PREFIX}/me`, undefined, { "x-api-key": "dev-acme-admin-2026" });
    assert.equal(r.status, 200);
    assert.equal(r.body.isSystemActor, false);
    assert.equal(r.body.name, "acme-admin-test");
    // tenantId 不是 default
    assert.notEqual(r.body.tenantId, "00000000-0000-0000-0000-000000000001");
  });

  // ── 步骤互斥业务规则 (disallowedFromSteps + 兼容糖 disallowSelfReview) ──
  function buildBizPipelineWithSelfReviewBlock(name: string, mode: "explicit" | "legacy" = "explicit") {
    const policy = { timeoutMs: 30_000, maxAttempts: 1, baseBackoffMs: 1 };
    const reviewParams = mode === "legacy"
      ? { rubric: "default", reviewedStepKey: "ingest", disallowSelfReview: true }
      : { rubric: "default", reviewedStepKey: "ingest", disallowedFromSteps: ["ingest"] };
    return {
      name,
      steps: [
        { key: "ingest", nodeKey: "ingest", label: "采集", params: { source: "form" }, policy },
        {
          key: "review", nodeKey: "review", label: "审核",
          params: reviewParams,
          routes: { on: "decision", cases: { rejected: { goto: "ingest", maxLoops: 1 }, approved: "next" } },
          policy,
        },
        { key: "store", nodeKey: "export", label: "入库", params: { format: "json" }, policy },
      ] as const,
    };
  }

  // 双向锁: ingest 也禁了 review (审核过的人不能再来采集)
  function buildBizPipelineWithSymmetricLock(name: string) {
    const policy = { timeoutMs: 30_000, maxAttempts: 1, baseBackoffMs: 1 };
    return {
      name,
      steps: [
        {
          key: "ingest", nodeKey: "ingest", label: "采集",
          params: { source: "form", disallowedFromSteps: ["review"] },
          policy,
        },
        {
          key: "review", nodeKey: "review", label: "审核",
          params: { rubric: "default", reviewedStepKey: "ingest", disallowedFromSteps: ["ingest"] },
          routes: { on: "decision", cases: { rejected: { goto: "ingest", maxLoops: 2 }, approved: "next" } },
          policy,
        },
        { key: "store", nodeKey: "export", label: "入库", params: { format: "json" }, policy },
      ] as const,
    };
  }

  test("S8. disallowedFromSteps: alice 提交后, alice 来 decide → 403 STEP_OPERATOR_CONFLICT", async () => {
    const taskId = await createPipeline(buildBizPipelineWithSelfReviewBlock(uniqueId("biz-no-self")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("biz-batch-no-self"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const collectRes = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = collectRes.body.items[0].id;

      // alice 提交
      await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      const submitRes = await post(`/api/collect/${itemId}/submit`, {
        userId: "alice", payload: { content: "x" },
      });
      assert.equal(submitRes.status, 200);

      // alice claim review run, 试图自审
      const detail = await getItem(itemId);
      const reviewRun = detail.body.inflight.find((r: any) => r.step_key === "review");
      assert.ok(reviewRun);
      const claimReview = await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, {
        workerId: "alice", leaseSeconds: 60,
      });
      assert.equal(claimReview.status, 200);

      const decideRes = await post(`/api/review/${itemId}/decide`, {
        userId: "alice", batchId, decision: "approved",
      });
      assert.equal(decideRes.status, 403);
      assert.equal(decideRes.body.error.code, "STEP_OPERATOR_CONFLICT");

      // bob 接力审核: 先接管 lease (生产: alice release + bob claim; 测试直接 SQL 模拟)
      // 接管后 leased_by='bob' 通过 ownership 校验, 再走 disallowed 校验 (bob 没在 disallowed 步骤干过) → 200
      const { asSystem: asSys } = await import("../src/db.ts");
      await asSys((tx) => tx`
        UPDATE outbox SET leased_by = 'bob' WHERE run_id = ${reviewRun.run_id}
      `);
      const decideBob = await post(`/api/review/${itemId}/decide`, {
        userId: "bob", batchId, decision: "approved",
      });
      assert.equal(decideBob.status, 200);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S9. 同 disallowedFromSteps pipeline, /review/tasks?userId=alice 不返自己提交的 item", async () => {
    const taskId = await createPipeline(buildBizPipelineWithSelfReviewBlock(uniqueId("biz-no-self-list")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const collectRes = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = collectRes.body.items[0].id;

      await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      await post(`/api/collect/${itemId}/submit`, { userId: "alice", payload: { content: "x" } });

      // alice 看 /review/tasks → 该 item 不出现
      const aliceList = await req<{ items: { item_id: string }[] }>(
        "GET", `${PREFIX}/review/tasks?userId=alice&batchId=${batchId}`,
      );
      assert.equal(aliceList.status, 200);
      assert.ok(
        !aliceList.body.items.some((it) => it.item_id === itemId),
        `alice 不应看到自己提交的 review 任务, got ${JSON.stringify(aliceList.body.items)}`,
      );

      // bob 看 → 该 item 出现
      const bobList = await req<{ items: { item_id: string }[] }>(
        "GET", `${PREFIX}/review/tasks?userId=bob&batchId=${batchId}`,
      );
      assert.ok(
        bobList.body.items.some((it) => it.item_id === itemId),
        "bob 应看到 alice 提交的 review 任务",
      );
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S15. 反向锁: reviewer 之后, 同 user 想再 claim 同 item ingest → 403", async () => {
    // pipeline: ingest (disallowedFromSteps:[review]) → review (disallowedFromSteps:[ingest]) → store
    // 流程: alice 提交 ingest → bob 审核 reject → loopback 到 ingest. bob 想接着采集 → 403
    const taskId = await createPipeline(buildBizPipelineWithSymmetricLock(uniqueId("sym")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;

      // alice 提交 ingest
      await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      await post(`/api/collect/${itemId}/submit`, { userId: "alice", payload: { content: "x" } });

      // bob 审核, reject → loopback 到 ingest
      const detail = await getItem(itemId);
      const reviewRun = detail.body.inflight.find((r: any) => r.step_key === "review");
      assert.ok(reviewRun);
      await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, { workerId: "bob" });
      const decide = await post(`/api/review/${itemId}/decide`, {
        userId: "bob", batchId, decision: "rejected", reason: "测试反向",
      });
      assert.equal(decide.status, 200);

      // bob 想再 claim ingest → 403 (他刚审过, ingest 禁了 review 操作过的人)
      const bobClaim = await post(`/api/collect/${itemId}/claim`, { userId: "bob", batchId });
      assert.equal(bobClaim.status, 403);
      assert.equal(bobClaim.body.error.code, "STEP_OPERATOR_CONFLICT");

      // charlie (新人) 仍可领
      const charlie = await post(`/api/collect/${itemId}/claim`, { userId: "charlie", batchId });
      assert.equal(charlie.status, 200);
      await post(`/api/collect/${itemId}/release`, { userId: "charlie" });

      // bob 看 collect-tasks 也不应看到该 item (列表也过滤)
      const bobList = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=bob&batchId=${batchId}`,
      );
      assert.ok(!bobList.body.items.some((i) => i.id === itemId), "bob 不该在采集列表看到该 item");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S16. 兼容糖: legacy disallowSelfReview: true 仍生效 (新代码识别老配置)", async () => {
    const taskId = await createPipeline(buildBizPipelineWithSelfReviewBlock(uniqueId("legacy"), "legacy").steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;

      await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      await post(`/api/collect/${itemId}/submit`, { userId: "alice", payload: { content: "x" } });
      const detail = await getItem(itemId);
      const reviewRun = detail.body.inflight.find((r: any) => r.step_key === "review");
      await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, { workerId: "alice" });
      const decideAlice = await post(`/api/review/${itemId}/decide`, {
        userId: "alice", batchId, decision: "approved",
      });
      assert.equal(decideAlice.status, 403);
      assert.equal(decideAlice.body.error.code, "STEP_OPERATOR_CONFLICT");
    } finally {
      await deletePipeline(taskId);
    }
  });

  // ── 批次 / 项目暂停 (S10-S13) ──
  test("S10. pipeline 暂停 → /queue/run/:runId/claim 返 PIPELINE_PAUSED", async () => {
    const taskId = await createPipeline(buildBizPipeline(uniqueId("pause-pipe")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const collectRes = await req<{ items: { id: string; run_id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${bRes.body.batchId}`,
      );
      const { id: itemId, run_id: runId } = collectRes.body.items[0];

      // pause pipeline
      const pauseRes = await post(`${PREFIX}/pipelines/${taskId}/pause`);
      assert.equal(pauseRes.status, 200);

      // 新认领被拒
      const claim = await post(`${PREFIX}/queue/run/${runId}/claim`, { workerId: "alice" });
      assert.equal(claim.status, 409);
      assert.equal(claim.body.error.code, "PIPELINE_PAUSED");

      // /collect-tasks 也不返
      const list = await req<{ items: any[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${bRes.body.batchId}`,
      );
      assert.ok(!list.body.items.some((i) => i.id === itemId), "暂停后 collect 列表应不返");

      // resume → 恢复
      const resume = await post(`${PREFIX}/pipelines/${taskId}/resume`);
      assert.equal(resume.status, 200);
      const list2 = await req<{ items: any[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${bRes.body.batchId}`,
      );
      assert.ok(list2.body.items.some((i) => i.id === itemId), "恢复后 collect 列表应再返");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S11. pipeline 暂停 → 已 leased 的 run 仍可 post /result 走完 (优雅 drain)", async () => {
    const taskId = await createPipeline(buildBizPipeline(uniqueId("pause-drain")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const collectRes = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${bRes.body.batchId}`,
      );
      const itemId = collectRes.body.items[0].id;

      // 先 claim (pipeline active)
      await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId: bRes.body.batchId });

      // 后 pause
      await post(`${PREFIX}/pipelines/${taskId}/pause`);

      // alice 仍能 submit (走 /result 内部) — 优雅 drain
      const submit = await post(`/api/collect/${itemId}/submit`, {
        userId: "alice", payload: { content: "drain" },
      });
      assert.equal(submit.status, 200, `应允许已 claim 的 run 提交完: ${JSON.stringify(submit.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S12. batch 暂停 → 该批次 collect 列表清空, 其他批次不受影响", async () => {
    const taskId = await createPipeline(buildBizPipeline(uniqueId("batch-pause")).steps as any);
    try {
      const b1 = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b1"), target: 1,
      });
      const b2 = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b2"), target: 1,
      });

      // pause b1
      const pause = await post(`/api/batches/${b1.body.batchId}/pause`);
      assert.equal(pause.status, 200);

      // 从 b1 看 → 空; 从 b2 看 → 有
      const l1 = await req<{ items: any[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${b1.body.batchId}`,
      );
      assert.equal(l1.body.items.length, 0, "暂停的批次应 0 项");
      const l2 = await req<{ items: any[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${b2.body.batchId}`,
      );
      assert.equal(l2.body.items.length, 1, "未暂停的批次应仍有项");

      // claim b1 的 item → 拒
      // (找到 b1 的 item id 从 _all_ 或直接查)
      const allItems = await req<{ items: { id: string; batch_id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice`,
      );
      const b1Item = allItems.body.items.find((i) => i.batch_id === b1.body.batchId);
      // 暂停后 _all_ 也不返 (collect-tasks 过滤)
      assert.equal(b1Item, undefined, "_all_ 视图也不应返暂停批次");

      // resume b1 → 恢复
      const resume = await post(`/api/batches/${b1.body.batchId}/resume`);
      assert.equal(resume.status, 200);
      const l1b = await req<{ items: any[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${b1.body.batchId}`,
      );
      assert.equal(l1b.body.items.length, 1, "恢复后批次应再有项");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S13. 重复暂停 / 暂停不存在 → 404", async () => {
    const taskId = await createPipeline(buildBizPipeline(uniqueId("pause-twice")).steps as any);
    try {
      const r1 = await post(`${PREFIX}/pipelines/${taskId}/pause`);
      assert.equal(r1.status, 200);
      const r2 = await post(`${PREFIX}/pipelines/${taskId}/pause`);
      assert.equal(r2.status, 404, "已 paused 再 pause → 404 NOT_FOUND_OR_NOT_ACTIVE");
      assert.equal(r2.body.error.code, "NOT_FOUND_OR_NOT_ACTIVE");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S14. 自己已 claim 后再 claim → 幂等返 ALREADY_CLAIMING (不触发 NO_PENDING_RUN)", async () => {
    // 历史 bug: alice 第一次 claim 后 outbox 是 'leased', 此时再次 /collect/claim 会先到
    // outbox 'pending' 检查, 直接返 NO_PENDING_RUN, 用户点"继续"摸不到表单.
    // 修法是 claim 前先看自己有没有 'claimed' 行, 有就 ALREADY_CLAIMING (前端会接管).
    const taskId = await createPipeline(buildBizPipeline(uniqueId("biz-reclaim")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;

      const first = await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      assert.equal(first.status, 200);

      const second = await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      assert.equal(second.status, 409, `应返 409: ${JSON.stringify(second.body)}`);
      assert.equal(second.body.error.code, "ALREADY_CLAIMING");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("S7. acme key 看不到 default tenant 的 pipelines (RLS 兜底)", async () => {
    const acme = await req<{ pipelines: any[] }>(
      "GET", `${PREFIX}/pipelines`, undefined, { "x-api-key": "dev-acme-admin-2026" },
    );
    assert.equal(acme.status, 200);
    // 只看到 acme 自己的; acme 测试库里没有 pipeline (test backend 不 seed demo)
    // 这里只断"不爆 default 数量级" — default 至少有几条 e2e 测试残留.
    // 关键是不抛 error / 没有跨租户泄漏.
    for (const p of acme.body.pipelines) {
      // 通过 GET /pipelines/:id 反查 tenant_id 太重, 这里间接验: 切回 default
      // 后能看到的 pipeline, 切到 acme 后看不到.
      assert.ok(p.task_id, "pipeline should have task_id");
    }
    // 直接对照: default 拿到的列表里随便挑一个, 用 acme key 单点 GET → 404
    const def = await req<{ pipelines: { task_id: string }[] }>(
      "GET", `${PREFIX}/pipelines`,
    );
    if (def.body.pipelines.length > 0) {
      const someoneElse = def.body.pipelines.find(
        (p) => !acme.body.pipelines.some((a: any) => a.task_id === p.task_id),
      );
      if (someoneElse) {
        const probe = await req(
          "GET", `${PREFIX}/pipelines/${someoneElse.task_id}`,
          undefined, { "x-api-key": "dev-acme-admin-2026" },
        );
        assert.equal(probe.status, 404, "跨租户 GET 应 404 (RLS 拦截)");
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// Z. Phase 2: 服务端 merge — lease 返回 effective params (defaults + step.params + pin)
// ═══════════════════════════════════════════════════════════
//
// 用一个 sentinel nodeKey "z_test_merge", 没人写 driver, 不跟 autoworker 抢队列.
// 直接 SQL 插 node_definitions 给它三层 presets, 然后用 pipeline 引用它, ingest, lease, 断言.
describe("Z. Phase 2 服务端 merge", () => {
  const Z_KEY = "z_test_merge";
  let taskId = "";

  before(async () => {
    const { asSystem } = await import("../src/db.ts");
    await asSystem(async (tx) => {
      await tx`
        INSERT INTO node_definitions(key, version, display_name, params_schema, presets,
                                     idempotent, default_timeout_ms, default_max_attempts, manual)
        VALUES (${Z_KEY}, '1.0', 'Z Test Merge', '{"type":"object"}'::jsonb,
          '{
            "defaults":  {"foo": "default_foo", "bar": "default_bar"},
            "constants": {"sentinel": "constants_locked", "maxThing": 42},
            "pin":       ["sentinel", "maxThing"]
          }'::jsonb,
          true, 30000, 3, false)
        ON CONFLICT (key, version) DO UPDATE SET presets = EXCLUDED.presets
      `;
    });
    taskId = await createPipeline([
      {
        key: "merge_step",
        nodeKey: Z_KEY,
        // step.params: 覆盖 bar (非 pin, 允许), 试图覆盖 sentinel (pin, 应该挡)
        params: { bar: "step_override", sentinel: "EVIL_FROM_STEP_PARAMS" },
      },
    ]);
    await ingest(taskId, { text: "hi" });
  });

  after(async () => {
    if (taskId) await deletePipeline(taskId);
    const { asSystem } = await import("../src/db.ts");
    await asSystem(async (tx) => {
      await tx`DELETE FROM node_definitions WHERE key = ${Z_KEY}`;
    });
  });

  test("Z1. lease 返回的 job.params 是 defaults + step.params + pin", async () => {
    const job = await leaseOne(Z_KEY, "z1-worker", 60);
    assert.ok(job, "应能 lease 到 sentinel 节点的 job (无 driver 抢, 队列归测试)");
    // defaults: foo 来自 defaults (step.params 没填)
    assert.equal(job.params.foo, "default_foo", "defaults 应填进 effective params");
    // step.params 覆盖 defaults
    assert.equal(job.params.bar, "step_override", "step.params 应覆盖 defaults (非 pin 字段)");
    // pin 锁死: constants 的值, 不是 step.params 的 EVIL
    assert.equal(job.params.sentinel, "constants_locked", "pin 字段必须从 constants 强制覆盖 step.params");
    assert.equal(job.params.maxThing, 42, "pin 字段类型保持 (number 不变 string)");
    // nodeVersion 在 job 里
    assert.equal(job.nodeVersion, "1.0", "lease 应把 stepConfig.nodeVersion (或默认 1.0) 放到 job");
  });
});

// ═══════════════════════════════════════════════════════════
// Z2. Phase 3: inputs 绑定服务端 resolver — {{path}} 表达式求值
// ═══════════════════════════════════════════════════════════
describe("Z2. Phase 3 inputs 绑定 resolver", () => {
  const Z2_KEY = "z2_test_inputs";
  let taskId = "";

  before(async () => {
    const { asSystem } = await import("../src/db.ts");
    await asSystem(async (tx) => {
      await tx`
        INSERT INTO node_definitions(key, version, display_name, params_schema, inputs_schema,
                                     idempotent, default_timeout_ms, default_max_attempts, manual)
        VALUES (${Z2_KEY}, '1.0', 'Z2 Test Inputs', '{"type":"object"}'::jsonb,
          '{
            "type": "object",
            "properties": {
              "text":         { "type": "string", "defaultBinding": "{{payload.text}}" },
              "explicit":     { "type": "string" },
              "missing_def":  { "type": "string", "defaultBinding": "{{payload.notfound}}" }
            }
          }'::jsonb,
          true, 30000, 3, false)
        ON CONFLICT (key, version) DO UPDATE SET inputs_schema = EXCLUDED.inputs_schema
      `;
    });
    taskId = await createPipeline([
      {
        key: "merge_step",
        nodeKey: Z2_KEY,
        params: {},
        inputs: {
          // 显式覆盖 schema 的 defaultBinding
          text:     "{{payload.alt_text}}",
          // 字面量
          explicit: "literal_value",
          // 模板拼接
          greeting: "Hi {{payload.name}}!",
          // 整段 path 保类型 (object)
          deep:     "{{payload.nested}}",
          // 显式空字符串
          blank:    "",
        },
      },
    ]);
    await ingest(taskId, {
      alt_text: "from_alt",
      name:     "world",
      nested:   { k: "v", n: 9 },
      text:     "should_not_be_used_because_explicit_override",
    });
  });

  after(async () => {
    if (taskId) await deletePipeline(taskId);
    const { asSystem } = await import("../src/db.ts");
    await asSystem(async (tx) => {
      await tx`DELETE FROM node_definitions WHERE key = ${Z2_KEY}`;
    });
  });

  test("Z2-1. lease 返回的 job.inputs 已按 step.inputs / defaultBinding / 表达式求值", async () => {
    const job = await leaseOne(Z2_KEY, "z2-worker", 60);
    assert.ok(job, "应能 lease 到 sentinel 节点 (无 driver 抢)");
    // 显式 step.inputs 覆盖 schema defaultBinding
    assert.equal(job.inputs.text, "from_alt", "显式 inputs.text 应取 alt_text, 不走 defaultBinding {{payload.text}}");
    // 字面量
    assert.equal(job.inputs.explicit, "literal_value");
    // 部分模板拼接
    assert.equal(job.inputs.greeting, "Hi world!");
    // 整段 → 保类型 (object)
    assert.deepStrictEqual(job.inputs.deep, { k: "v", n: 9 }, "整段 {{path}} 必须保留 object 原型");
    // 字面量空字符串
    assert.equal(job.inputs.blank, "", "step.inputs.blank='' 应是字面量 '', 不走 defaultBinding");
    // schema 声明的但 step 没给的: missing_def 走 defaultBinding {{payload.notfound}} → 缺失 → undefined → 不出现在 inputs
    assert.equal(job.inputs.missing_def, undefined, "缺失路径 → undefined; 未出现");
  });

  test("Z2-2. 向后兼容: 老 pipeline (无 step.inputs) 走 inputsSchema.defaultBinding → 真实 llm_translate", async () => {
    // 关键 BC 路径: pipeline 没显式声明 inputs, 应走 llm_translate.inputsSchema.text.defaultBinding = "{{payload.text}}"
    // 配合 dev .env 没 ANTHROPIC_API_KEY (autoworker 不注册 llm_translate, 不抢队列), 测试可安全 lease
    const bcTaskId = await createPipeline([
      { key: "translate_step", nodeKey: "llm_translate", params: { targetLang: "zh" } }, // 没 inputs 字段
    ]);
    try {
      await ingest(bcTaskId, { text: "hello world" });
      const job = await leaseOne("llm_translate", "z2-2-worker", 60);
      assert.ok(job, "lease 到 llm_translate (autoworker 未注册时队列归测试)");
      assert.equal(job.inputs.text, "hello world",
        "未显式声明 step.inputs 时, inputsSchema.text.defaultBinding {{payload.text}} 应自动生效 — 这是 BC 关键路径");
    } finally {
      await deletePipeline(bcTaskId);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// N. 节点管理 MVP (06-node-design §13.2)
// ═══════════════════════════════════════════════════════════
//
// 验证范围:
//   N1: GET /admin/nodes 列表 + 状态/分类筛选 + 引用数聚合
//   N2: GET /admin/nodes/:key/:version 详情
//   N3: GET /admin/nodes/:key/:version/usages
//   N4: POST archive 改 status → 列表反映
//   N5: POST activate 改回 status
//   N6: POST debug/run dry-run (用 dedup driver, embedded, 不依赖外部)
//   N7: archived 节点不能被新 pipeline create/save (publish 守门)
describe("N. 节点管理 MVP", () => {
  // 用 driver 真实注册的节点 (script@1.0) 跑流程 — auto-upsert 已写好行, 不需 fixture INSERT
  // dedup 也是 embedded driver, dry-run 不外联
  test("N1. GET /admin/nodes 列表含 status / category / run_mode / usage_count", async () => {
    const r = await get(`${PREFIX}/admin/nodes`);
    assert.equal(r.status, 200);
    const nodes: any[] = r.body.nodes;
    assert.ok(Array.isArray(nodes) && nodes.length > 0);
    const llm = nodes.find((n) => n.key === "llm_translate" && n.version === "1.0");
    assert.ok(llm, "llm_translate@1.0 应在列表中 (auto-upsert)");
    assert.equal(llm.status, "active");
    assert.equal(llm.category, "ai");
    assert.equal(llm.run_mode, "embedded");
    assert.equal(typeof llm.usage_count, "number");
  });

  test("N1b. GET /admin/nodes?status=active 筛选", async () => {
    const r = await get(`${PREFIX}/admin/nodes?status=active`);
    assert.equal(r.status, 200);
    assert.ok(r.body.nodes.every((n: any) => n.status === "active"));
  });

  test("N2. GET /admin/nodes/:key/:version 详情含三层 schema + presets + inputs_schema", async () => {
    const r = await get(`${PREFIX}/admin/nodes/llm_translate/1.0`);
    assert.equal(r.status, 200);
    assert.equal(r.body.node.key, "llm_translate");
    assert.equal(r.body.node.status, "active");
    assert.ok(r.body.node.params_schema, "params_schema 必填");
    assert.ok(r.body.node.presets, "auto-upsert 应写 presets");
    assert.ok(r.body.node.inputs_schema, "auto-upsert 应写 inputs_schema");
    assert.ok(r.body.node.outputs_schema, "auto-upsert 应写 outputs_schema (Phase 节点管理 MVP)");
  });

  test("N2b. 404 on unknown version", async () => {
    const r = await get(`${PREFIX}/admin/nodes/llm_translate/9.9`);
    assert.equal(r.status, 404);
  });

  test("N3. GET /admin/nodes/:key/:version/usages 含 pipelines + inflightCount", async () => {
    // 先创建一个引用 dedup 的 pipeline
    const taskId = await createPipeline([{ key: "dedup_step", nodeKey: "dedup", params: {} }]);
    try {
      const r = await get(`${PREFIX}/admin/nodes/dedup/1.0/usages`);
      assert.equal(r.status, 200);
      const found = r.body.pipelines.find((p: any) => p.task_id === taskId);
      assert.ok(found, "usages 应包含本 pipeline");
      assert.equal(typeof r.body.inflightCount, "number");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("N4+N5. archive 切 status → activate 切回", async () => {
    // 找一个独立的 (不被任何已有 pipeline 引用的) 节点做这个测; 用 ad-hoc node_definitions 行
    const KEY = `nm_test_${Date.now()}`;
    const { asSystem } = await import("../src/db.ts");
    await asSystem(async (tx) => {
      await tx`
        INSERT INTO node_definitions (key, version, display_name, params_schema,
                                      idempotent, default_timeout_ms, default_max_attempts, manual)
        VALUES (${KEY}, '1.0', 'NM Test', '{"type":"object"}'::jsonb, true, 30000, 3, false)
      `;
    });
    try {
      let r = await post(`${PREFIX}/admin/nodes/${KEY}/1.0/archive`);
      assert.equal(r.status, 200);
      assert.equal(r.body.status, "archived");

      r = await get(`${PREFIX}/admin/nodes/${KEY}/1.0`);
      assert.equal(r.body.node.status, "archived");

      r = await post(`${PREFIX}/admin/nodes/${KEY}/1.0/activate`);
      assert.equal(r.status, 200);
      assert.equal(r.body.status, "active");
    } finally {
      await asSystem(async (tx) => {
        await tx`DELETE FROM node_definitions WHERE key = ${KEY}`;
      });
    }
  });

  test("N4b. archive 不存在的 (key,version) → 404", async () => {
    const r = await post(`${PREFIX}/admin/nodes/no_such_node/1.0/archive`);
    assert.equal(r.status, 404);
  });

  test("N6. POST /admin/nodes/:key/:version/debug/run — script 节点 dry-run, pure sandbox-js", async () => {
    // script (sandbox-js) driver 是 in-process node:vm, 不触达 DB / 外部服务.
    // 注: dedup / export / llm_translate 现在通过 ctx.dryRun 短路实现"真不写库", 测试见 N11/N12.
    const r = await post(`${PREFIX}/admin/nodes/script/1.0/debug/run`, {
      params: { script: "return { sum: payload.a + payload.b, doubled: params.factor * payload.a }", factor: 3 },
      inputs: {},
      envelope: {
        payload: { a: 5, b: 7 },
        outputs: {},
        tags: {},
      },
    });
    assert.equal(r.status, 200);
    assert.ok(r.body.driver, "应回包 driver 信息");
    assert.equal(r.body.driver.nodeKey, "script");
    assert.equal(r.body.result.status, "success", "script dry-run 应成功");
    assert.equal(r.body.result.output.sum, 12, "脚本能读 payload");
    assert.equal(r.body.result.output.doubled, 15, "脚本能读 effectiveParams (factor=3 from params)");
    assert.equal(typeof r.body.durationMs, "number");
  });

  test("N6b. debug/run for 不存在节点 → 404", async () => {
    const r = await post(`${PREFIX}/admin/nodes/no_such_node/1.0/debug/run`, { params: {}, inputs: {}, envelope: {} });
    assert.equal(r.status, 404);
  });

  test("N7. 不能创建 / save 引用 archived 节点的 pipeline (publish 守门)", async () => {
    const KEY = `nm_archived_${Date.now()}`;
    const { asSystem } = await import("../src/db.ts");
    await asSystem(async (tx) => {
      await tx`
        INSERT INTO node_definitions (key, version, display_name, params_schema, status,
                                      idempotent, default_timeout_ms, default_max_attempts, manual)
        VALUES (${KEY}, '1.0', 'Archived', '{"type":"object"}'::jsonb, 'archived', true, 30000, 3, false)
      `;
    });
    try {
      // create 应被拒
      const cr = await post(`${PREFIX}/pipelines/create`, {
        name: uniqueId("pipe-arch"),
        steps: [{ key: "s1", nodeKey: KEY, params: {} }],
      });
      assert.equal(cr.status, 409);
      assert.equal(cr.body.error.code, "ARCHIVED_NODE_REF");
      assert.ok(Array.isArray(cr.body.error.archived));
      assert.equal(cr.body.error.archived[0].nodeKey, KEY);

      // 先建一个合法 pipeline, save 改步骤引用 archived → 拒
      const okTaskId = await createPipeline([{ key: "s1", nodeKey: "dedup", params: {} }]);
      try {
        const sr = await post(`${PREFIX}/pipelines/${okTaskId}/save`, {
          steps: [{ key: "s1", nodeKey: KEY, params: {} }],
        });
        assert.equal(sr.status, 409);
        assert.equal(sr.body.error.code, "ARCHIVED_NODE_REF");
      } finally {
        await deletePipeline(okTaskId);
      }

      // activate 后, 同样的 create 应通过
      const act = await post(`${PREFIX}/admin/nodes/${KEY}/1.0/activate`);
      assert.equal(act.status, 200);
      const cr2 = await post(`${PREFIX}/pipelines/create`, {
        name: uniqueId("pipe-act"),
        steps: [{ key: "s1", nodeKey: KEY, params: {} }],
      });
      assert.equal(cr2.status, 200);
      await deletePipeline(cr2.body.task_id);
    } finally {
      await asSystem(async (tx) => {
        await tx`DELETE FROM node_definitions WHERE key = ${KEY}`;
      });
    }
  });

  test("N8. POST /admin/nodes 创建节点 + PATCH 更新配置 + 重复创建 409", async () => {
    const KEY = `nm_create_${Date.now()}`;
    const { asSystem } = await import("../src/db.ts");
    try {
      // 创建
      let r = await post(`${PREFIX}/admin/nodes`, {
        key: KEY, version: "1.0",
        displayName: "My Custom Node",
        paramsSchema: { type: "object", properties: { threshold: { type: "number" } } },
        category: "data",
        runMode: "external_worker",
        description: "Created via API",
        defaultTimeoutMs: 60000,
        defaultMaxAttempts: 5,
      });
      assert.equal(r.status, 201, `create failed: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.node.key, KEY);
      assert.equal(r.body.node.status, "active");
      assert.equal(r.body.node.category, "data");
      assert.equal(r.body.node.run_mode, "external_worker");
      assert.equal(r.body.node.default_max_attempts, 5);

      // 重复创建 → 409
      const dup = await post(`${PREFIX}/admin/nodes`, {
        key: KEY, version: "1.0", displayName: "Dup", paramsSchema: {},
      });
      assert.equal(dup.status, 409);
      assert.equal(dup.body.error.code, "NODE_ALREADY_EXISTS");

      // PATCH 更新配置字段
      const patch = await req("PATCH", `${PREFIX}/admin/nodes/${KEY}/1.0`, {
        displayName: "My Custom Node v2",
        description: "Updated via PATCH",
        defaultTimeoutMs: 90000,
        category: "system",
        outputsSchema: { type: "object", properties: { result: { type: "string" } } },
      });
      assert.equal(patch.status, 200, `patch failed: ${JSON.stringify(patch.body)}`);
      assert.equal(patch.body.node.display_name, "My Custom Node v2");
      assert.equal(patch.body.node.description, "Updated via PATCH");
      assert.equal(patch.body.node.default_timeout_ms, 90000);
      assert.equal(patch.body.node.category, "system");
      assert.ok(patch.body.node.outputs_schema, "outputs_schema 应已更新");

      // PATCH 不存在 → 404
      const p404 = await req("PATCH", `${PREFIX}/admin/nodes/${KEY}/9.9`, { displayName: "x" });
      assert.equal(p404.status, 404);

      // GET 确认持久化
      r = await get(`${PREFIX}/admin/nodes/${KEY}/1.0`);
      assert.equal(r.body.node.display_name, "My Custom Node v2");
      assert.equal(r.body.node.default_timeout_ms, 90000);
    } finally {
      await asSystem(async (tx) => {
        await tx`DELETE FROM node_definitions WHERE key = ${KEY}`;
      });
    }
  });

  test("N9. archived 节点不再被 lease, activate 后恢复 lease (运行期开关闭环)", async () => {
    const KEY = `nm_switch_${Date.now()}`;
    const { asSystem } = await import("../src/db.ts");

    // 通过 API 创建节点
    const cr = await post(`${PREFIX}/admin/nodes`, {
      key: KEY, version: "1.0", displayName: "Switch Test",
      paramsSchema: {}, idempotent: true,
    });
    assert.equal(cr.status, 201);

    let taskId = "";
    try {
      taskId = await createPipeline([{ key: "s1", nodeKey: KEY, params: {} }]);
      await ingest(taskId, { text: "queued" });

      // archive → lease 应返空
      const ar = await post(`${PREFIX}/admin/nodes/${KEY}/1.0/archive`);
      assert.equal(ar.status, 200);

      let lr = await post(`${PREFIX}/queue/${KEY}/lease`, { workerId: "n9-w", batchSize: 1, leaseSeconds: 30 });
      assert.equal(lr.status, 200);
      assert.equal(lr.body.jobs.length, 0, "archived 节点 pending outbox 不应被 lease");

      // activate → lease 应拿到 job
      const act = await post(`${PREFIX}/admin/nodes/${KEY}/1.0/activate`);
      assert.equal(act.status, 200);

      lr = await post(`${PREFIX}/queue/${KEY}/lease`, { workerId: "n9-w", batchSize: 1, leaseSeconds: 30 });
      assert.equal(lr.status, 200);
      assert.equal(lr.body.jobs.length, 1, "activate 后 lease 应恢复");
      assert.equal(lr.body.jobs[0].taskId, taskId);
    } finally {
      if (taskId) await deletePipeline(taskId);
      await asSystem(async (tx) => {
        await tx`DELETE FROM node_definitions WHERE key = ${KEY}`;
      });
    }
  });

  test("N10. lease 按 pipeline 公平调度: 两个 pipeline 各最多取 1 条 (perTaskLimit 默认 1)", async () => {
    const KEY = `nm_fair_${Date.now()}`;
    const { asSystem } = await import("../src/db.ts");

    const cr = await post(`${PREFIX}/admin/nodes`, {
      key: KEY, version: "1.0", displayName: "Fair Node",
      paramsSchema: {}, idempotent: true,
    });
    assert.equal(cr.status, 201);

    const taskIds: string[] = [];
    try {
      const taskA = await createPipeline([{ key: "s1", nodeKey: KEY, params: {} }]);
      const taskB = await createPipeline([{ key: "s1", nodeKey: KEY, params: {} }]);
      taskIds.push(taskA, taskB);

      // taskA 投 3 条, taskB 投 2 条
      await ingest(taskA, { seq: "a1" });
      await ingest(taskA, { seq: "a2" });
      await ingest(taskA, { seq: "a3" });
      await ingest(taskB, { seq: "b1" });
      await ingest(taskB, { seq: "b2" });

      // perTaskLimit=1: batchSize=10 时只能拿到 taskA×1 + taskB×1 = 2 条
      const lr = await post(`${PREFIX}/queue/${KEY}/lease`, {
        workerId: "n10-w", batchSize: 10, leaseSeconds: 30, perTaskLimit: 1,
      });
      assert.equal(lr.status, 200);
      assert.equal(lr.body.jobs.length, 2, "两个 pipeline 各取 1 条, 不被单个 pipeline 独占");

      const counts = new Map<string, number>();
      for (const job of lr.body.jobs) counts.set(job.taskId, (counts.get(job.taskId) ?? 0) + 1);
      assert.equal(counts.get(taskA), 1);
      assert.equal(counts.get(taskB), 1);

      // perTaskLimit=2 时 taskA 能多取 1 条
      const lr2 = await post(`${PREFIX}/queue/${KEY}/lease`, {
        workerId: "n10-w2", batchSize: 10, leaseSeconds: 30, perTaskLimit: 2,
      });
      assert.equal(lr2.status, 200);
      // taskA 还剩 2 条 pending, taskB 还剩 1 条 — 各最多 2 条
      const c2 = new Map<string, number>();
      for (const job of lr2.body.jobs) c2.set(job.taskId, (c2.get(job.taskId) ?? 0) + 1);
      assert.ok((c2.get(taskA) ?? 0) <= 2, "taskA 最多 2 条");
      assert.ok((c2.get(taskB) ?? 0) <= 2, "taskB 最多 2 条");
    } finally {
      for (const taskId of taskIds) await deletePipeline(taskId);
      await asSystem(async (tx) => {
        await tx`DELETE FROM node_definitions WHERE key = ${KEY}`;
      });
    }
  });

  test("N11. dedup dry-run 不写 dedup_keys (ctx.dryRun 短路)", async () => {
    // 调 debug/run 前后, dedup_keys 表行数应一致 — driver 必须按 ctx.dryRun 跳过 schedPost.
    const { asSystem } = await import("../src/db.ts");
    const before = await asSystem((tx) => tx<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM dedup_keys`).then((r) => r[0].c);
    const r = await post(`${PREFIX}/admin/nodes/dedup/1.0/debug/run`, {
      params: { dedupFields: ["payload.text"] },
      inputs: {},
      envelope: { payload: { text: `n11-${Date.now()}` }, outputs: {}, tags: {} },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.result.status, "success");
    assert.equal((r.body.result.output as any).dryRun, true, "dry-run output 应带 dryRun: true 标记");
    const after = await asSystem((tx) => tx<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM dedup_keys`).then((r) => r[0].c);
    assert.equal(after, before, "dry-run 不应写入 dedup_keys");
  });

  test("N12. compute@1.0 表达式 dry-run: 算术 / 三元 / 路径引用都能跑", async () => {
    // compute 是天然无副作用的纯函数节点; 同时验证 supports_dry_run=true 在 GET 返回里.
    const list = await get(`${PREFIX}/admin/nodes`);
    const compute = list.body.nodes.find((n: any) => n.key === "compute" && n.version === "1.0");
    assert.ok(compute, "compute@1.0 应被 auto-upsert 注册");
    assert.equal(compute.supports_dry_run, true);
    assert.equal(compute.has_examples, true);

    // 算术
    let r = await post(`${PREFIX}/admin/nodes/compute/1.0/debug/run`, {
      params: { expression: "inputs.a + inputs.b" },
      inputs: { a: 7, b: 5 },
      envelope: { payload: {}, outputs: {}, tags: {} },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.result.status, "success");
    assert.equal((r.body.result.output as any).result, 12);

    // 三元 + params 路径
    r = await post(`${PREFIX}/admin/nodes/compute/1.0/debug/run`, {
      params: { expression: "inputs.score >= params.threshold ? 'pass' : 'fail'", threshold: 0.8 },
      inputs: { score: 0.9 },
      envelope: { payload: {}, outputs: {}, tags: {} },
    });
    assert.equal(r.body.result.status, "success");
    assert.equal((r.body.result.output as any).result, "pass");

    // 禁字段访问 (__proto__) — getPath 必须返回 undefined, expression 仍能跑
    r = await post(`${PREFIX}/admin/nodes/compute/1.0/debug/run`, {
      params: { expression: "inputs.__proto__" },
      inputs: { a: 1 },
      envelope: { payload: {}, outputs: {}, tags: {} },
    });
    assert.equal(r.body.result.status, "success");
    assert.equal((r.body.result.output as any).result, undefined);

    // 错误表达式 → EXPR_ERROR
    r = await post(`${PREFIX}/admin/nodes/compute/1.0/debug/run`, {
      params: { expression: "@@@bad" },
      inputs: {},
      envelope: { payload: {}, outputs: {}, tags: {} },
    });
    assert.equal(r.body.result.status, "failed");
    assert.equal((r.body.result.error as any).code, "EXPR_ERROR");
  });

  test("N13. outputsSchema 校验: strict 模式翻 failed, warn 模式过 + 记 violations, off 跳过", async () => {
    const { validateNodeOutput } = await import("../src/output-validator.ts");

    // strict 默认: 不符 → 返 violations
    const v1 = validateNodeOutput({
      nodeKey: "t1", nodeVersion: "1.0",
      outputsSchema: { type: "object", required: ["x"], properties: { x: { type: "number" } } },
      outputsValidation: "strict",
      output: { y: 1 },  // 缺 x
    });
    assert.ok(v1, "缺 required 字段应返回 violations");
    assert.ok(v1.errors.some((e) => /required|missing/i.test(e.message)), "错误信息提到 required");

    // 类型错: x 期望 number 但给 string
    const v2 = validateNodeOutput({
      nodeKey: "t2", nodeVersion: "1.0",
      outputsSchema: { type: "object", properties: { x: { type: "number" } } },
      outputsValidation: "strict",
      output: { x: "not-a-number" },
    });
    assert.ok(v2, "类型不符应返回 violations");

    // off 模式 → 跳过校验, return null
    const v3 = validateNodeOutput({
      nodeKey: "t3", nodeVersion: "1.0",
      outputsSchema: { type: "object", required: ["x"] },
      outputsValidation: "off",
      output: {},
    });
    assert.equal(v3, null, "off 模式应跳过");

    // 无 outputsSchema → 跳过
    const v4 = validateNodeOutput({
      nodeKey: "t4", nodeVersion: "1.0",
      outputsSchema: null,
      outputsValidation: "strict",
      output: { anything: true },
    });
    assert.equal(v4, null, "无 schema 应跳过");

    // 通过 → null
    const v5 = validateNodeOutput({
      nodeKey: "t5", nodeVersion: "1.0",
      outputsSchema: { type: "object", required: ["x"], properties: { x: { type: "number" } } },
      outputsValidation: "strict",
      output: { x: 42 },
    });
    assert.equal(v5, null, "schema 通过应返回 null");
  });

  test("N14. dry-run 路径 outputsValidation 字段 在响应里; compute 正常输出通过", async () => {
    // compute schema 是 {result, expression} 都 optional, 实际输出符合 → outputValidation=null
    const r = await post(`${PREFIX}/admin/nodes/compute/1.0/debug/run`, {
      params: { expression: "1 + 1" },
      inputs: {},
      envelope: { payload: {}, outputs: {}, tags: {} },
    });
    assert.equal(r.body.result.status, "success");
    assert.equal(r.body.outputValidation, null, "符合 schema 的输出 → outputValidation null");
  });
});
