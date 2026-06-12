// M9: events 表 + GET /api/v1/events 轮询
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

// 等异步 emit 写入 (asSystem 不阻塞响应)
async function waitForEvents(filter: string, minCount = 1, timeoutMs = 2000): Promise<any[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await get<{ events: any[] }>(`${PREFIX}/events?${filter}`);
    if (r.body.events.length >= minCount) return r.body.events;
    await sleep(50);
  }
  return [];
}

describe("M9. events 流", () => {
  test("M9-1. batch.created 触发 batch.created 事件", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("ev1")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const events = await waitForEvents(`resource_kind=batch&resource_id=${batchId}&kind=batch.created`);
      assert.equal(events.length, 1, JSON.stringify(events));
      assert.equal(events[0].kind, "batch.created");
      assert.equal(events[0].resource_id, batchId);
      assert.equal(events[0].payload.target, 1);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M9-2. pause/resume/close 各触发对应事件", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("ev2")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;

      await post(`/api/batches/${batchId}/pause`, {});
      await post(`/api/batches/${batchId}/resume`, {});
      await post(`/api/batches/${batchId}/close`, { reason: "test-close" });

      const events = await waitForEvents(`resource_kind=batch&resource_id=${batchId}`, 4);
      const kinds = events.map((e) => e.kind);
      assert.ok(kinds.includes("batch.created"));
      assert.ok(kinds.includes("batch.paused"));
      assert.ok(kinds.includes("batch.resumed"));
      assert.ok(kinds.includes("batch.closed"));
      const closeEv = events.find((e) => e.kind === "batch.closed");
      assert.equal(closeEv.payload.reason, "test-close");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M9-3. item.reviewed 事件含 decision/userId", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("ev3")).steps as any);
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
      await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, { workerId: "bob" });
      await post(`/api/review/${itemId}/decide`,
        { userId: "bob", batchId, decision: "approved" });

      const events = await waitForEvents(
        `resource_kind=item&resource_id=${itemId}&kind=item.reviewed`,
      );
      assert.equal(events.length, 1);
      assert.equal(events[0].payload.decision, "approved");
      assert.equal(events[0].payload.userId, "bob");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M9-4. since=<id> 增量拉取, lastId 单调递增", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("ev4")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      // 拿一批
      const evs1 = await waitForEvents(`resource_kind=batch&resource_id=${batchId}`, 1);
      assert.ok(evs1.length >= 1);
      const after1 = evs1[evs1.length - 1].id;

      // 触发新事件
      await post(`/api/batches/${batchId}/pause`, {});

      // 用 since=after1 拉, 只该看到 paused
      await sleep(150);
      const r2 = await get<{ events: any[]; lastId: string }>(
        `${PREFIX}/events?resource_kind=batch&resource_id=${batchId}&since=${after1}`,
      );
      assert.ok(r2.body.events.length >= 1);
      assert.ok(r2.body.events.every((e) => BigInt(e.id) > BigInt(after1)),
        `所有 id 必须 > since=${after1}`);
      assert.equal(r2.body.lastId, r2.body.events[r2.body.events.length - 1].id);
    } finally {
      await deletePipeline(taskId);
    }
  });
});
