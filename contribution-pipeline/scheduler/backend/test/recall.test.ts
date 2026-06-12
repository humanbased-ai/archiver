// M6: 已通过数据召回 (POST /api/v1/admin/items/:id/recall)
import "./_assert-test-db.ts";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREFIX,
  createPipeline,
  deletePipeline,
  get,
  getItem,
  post,
  req,
  uniqueId,
  sleep,
} from "./helpers.ts";

const policy = { timeoutMs: 30_000, maxAttempts: 1, baseBackoffMs: 1 };

function buildPipeline(name: string) {
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

async function setupDoneItem(label: string): Promise<{ taskId: string; itemId: string; batchId: string }> {
  // 用 unique user 避免前测污染 (alice/bob 在 api.e2e/quota-review 等套件被反复用过)
  const collector = uniqueId(`${label}-c`);
  const reviewer = uniqueId(`${label}-r`);
  const taskId = await createPipeline(buildPipeline(uniqueId(label)).steps as any);
  const bRes = await post<{ batchId: string }>(`/api/batches`, {
    pipelineId: taskId, name: uniqueId("b"), target: 1,
  });
  const batchId = bRes.body.batchId;
  const list = await req<{ items: { id: string }[] }>(
    "GET", `/api/work/collect-tasks?userId=${collector}&batchId=${batchId}`,
  );
  const itemId = list.body.items[0].id;
  const claimR = await post(`/api/collect/${itemId}/claim`, { userId: collector, batchId });
  if (claimR.status !== 200) throw new Error(`setupDoneItem claim: ${JSON.stringify(claimR.body)}`);
  const submitR = await post(`/api/collect/${itemId}/submit`, { userId: collector, payload: { content: "x" } });
  if (submitR.status !== 200) throw new Error(`setupDoneItem submit: ${JSON.stringify(submitR.body)}`);

  // reviewer 审核 approved → store driver 跑完 → done
  const detail = await getItem(itemId);
  const reviewRun = detail.body.inflight.find((r: any) => r.step_key === "review");
  if (!reviewRun) throw new Error(`setupDoneItem no review run: ${JSON.stringify(detail.body.inflight)}`);
  await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, { workerId: reviewer });
  const decideR = await post(`/api/review/${itemId}/decide`, { userId: reviewer, batchId, decision: "approved" });
  if (decideR.status !== 200) throw new Error(`setupDoneItem decide: ${JSON.stringify(decideR.body)}`);

  // 等 store 跑完
  for (let i = 0; i < 30; i++) {
    const d = await getItem(itemId);
    if (d.body.item.current_step === "done") return { taskId, itemId, batchId };
    await sleep(500);
  }
  throw new Error(`item ${itemId} 未在 15s 内进 done 态`);
}

describe("M6. dataset 召回", () => {
  test("M6-1. done item recall → 200, dataset 标 recalled, item 回到 targetStep", async () => {
    const { taskId, itemId } = await setupDoneItem("m6-1");
    try {
      // 召回前: dataset_records 1 条 active
      const ds1 = await get<{ records: any[] }>(`${PREFIX}/tasks/${taskId}/records`);
      assert.equal(ds1.body.records.length, 1);

      const r = await post<{ recalledRecords: number; newStep: string }>(
        `${PREFIX}/admin/items/${itemId}/recall`,
        { reason: "字段错位需要重做", targetStep: "ingest", operatorId: "ops-001" },
      );
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.recalledRecords, 1);
      assert.equal(r.body.newStep, "ingest");

      // item 回到 ingest
      const detail = await getItem(itemId);
      assert.equal(detail.body.item.current_step, "ingest");

      // outbox 多了一条 pending ingest
      const pending = detail.body.inflight.filter((x: any) => x.status === "pending" && x.step_key === "ingest");
      assert.ok(pending.length >= 1, "应有新 pending ingest run");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M6-2. recall 后重做 → dataset 多一条 active, 老的仍为 recalled", async () => {
    const { taskId, itemId, batchId } = await setupDoneItem("m6-2");
    const redoer = uniqueId("m6-2-redo");
    const reviewer = uniqueId("m6-2-rv2");
    try {
      await post(`${PREFIX}/admin/items/${itemId}/recall`,
        { reason: "重做", targetStep: "ingest" });

      const c = await post(`/api/collect/${itemId}/claim`, { userId: redoer, batchId });
      assert.equal(c.status, 200, `claim: ${JSON.stringify(c.body)}`);
      await post(`/api/collect/${itemId}/submit`, { userId: redoer, payload: { content: "redo" } });

      const d = await getItem(itemId);
      const reviewRun = d.body.inflight.find((r: any) => r.step_key === "review" && r.status === "pending");
      assert.ok(reviewRun, "review 重新就绪");
      await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, { workerId: reviewer });
      await post(`/api/review/${itemId}/decide`, { userId: reviewer, batchId, decision: "approved" });

      // 等再次 done
      for (let i = 0; i < 30; i++) {
        const dd = await getItem(itemId);
        if (dd.body.item.current_step === "done") break;
        await sleep(500);
      }
      // dataset 应 1 active + 1 recalled (?status=all 包含全部)
      const ds = await get<{ records: { status?: string }[] }>(
        `${PREFIX}/tasks/${taskId}/records?status=all`,
      );
      const active = ds.body.records.filter((r) => r.status === "active").length;
      const recalled = ds.body.records.filter((r) => r.status === "recalled").length;
      assert.equal(active, 1, `应仅 1 条 active, got ${JSON.stringify(ds.body.records)}`);
      assert.equal(recalled, 1, `应有 1 条 recalled`);

      // 默认接口 (不带 ?status=all) 应只返 active
      const dsDefault = await get<{ records: any[] }>(`${PREFIX}/tasks/${taskId}/records`);
      assert.equal(dsDefault.body.records.length, 1, "默认只返 active");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M6-3. 非 done item recall → 409 ITEM_NOT_RECALLABLE", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("m6-3")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${uniqueId("m6-3-c")}&batchId=${bRes.body.batchId}`,
      );
      const itemId = list.body.items[0].id;

      const r = await post(`${PREFIX}/admin/items/${itemId}/recall`,
        { reason: "test", targetStep: "ingest" });
      assert.equal(r.status, 409);
      assert.equal(r.body.error.code, "ITEM_NOT_RECALLABLE");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M6-4. 缺 reason → 400", async () => {
    const { taskId, itemId } = await setupDoneItem("m6-4");
    try {
      const r = await post(`${PREFIX}/admin/items/${itemId}/recall`,
        { targetStep: "ingest" });
      assert.equal(r.status, 400);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M6-5. 非法 targetStep → 400 INVALID_STEP", async () => {
    const { taskId, itemId } = await setupDoneItem("m6-5");
    try {
      const r = await post(`${PREFIX}/admin/items/${itemId}/recall`,
        { reason: "test", targetStep: "no-such-step" });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "INVALID_STEP");
    } finally {
      await deletePipeline(taskId);
    }
  });
});
