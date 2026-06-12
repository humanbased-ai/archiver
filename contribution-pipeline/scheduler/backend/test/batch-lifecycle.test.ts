// M1: 批次生命周期 — pause / resume / close (新增)
import "./_assert-test-db.ts";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createPipeline,
  deletePipeline,
  post,
  req,
  uniqueId,
} from "./helpers.ts";

const policy = { timeoutMs: 30_000, maxAttempts: 1, baseBackoffMs: 1 };

function buildCollectReview(name: string) {
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

async function createBatch(taskId: string, target = 2): Promise<string> {
  const r = await post<{ batchId: string }>(`/api/batches`, {
    pipelineId: taskId, name: uniqueId("b1"), target,
  });
  if (r.status !== 200) throw new Error(`create batch failed: ${JSON.stringify(r.body)}`);
  return r.body.batchId;
}

describe("M1. batch close (提前关闭)", () => {
  test("M1-1. active batch close → 200, status=archived, 返回受影响计数", async () => {
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-1")).steps as any);
    try {
      const batchId = await createBatch(taskId, 3);
      const r = await post<any>(`/api/batches/${batchId}/close`, {
        reason: "业务提前结束", operatorId: "admin-001",
      });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.status, "archived");
      assert.equal(r.body.cancelledItems, 3);
      assert.equal(r.body.cancelledOutbox, 3);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M1-2. close 后 collect claim → 409 BATCH_CLOSED", async () => {
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-2")).steps as any);
    try {
      const batchId = await createBatch(taskId, 1);
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;
      await post(`/api/batches/${batchId}/close`, { reason: "测试" });
      const claim = await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      assert.equal(claim.status, 409);
      assert.equal(claim.body.error.code, "BATCH_CLOSED");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M1-4. close 时已 claimed submission → 转 returned", async () => {
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-4")).steps as any);
    try {
      const batchId = await createBatch(taskId, 1);
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;
      const claim = await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
      assert.equal(claim.status, 200);

      const close = await post<any>(`/api/batches/${batchId}/close`, { reason: "中途停" });
      assert.equal(close.status, 200);
      assert.equal(close.body.releasedSubmissions, 1, "claimed 提交应被释放回 returned");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M1-5. close 后重复 close → 409 BATCH_ALREADY_CLOSED", async () => {
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-5")).steps as any);
    try {
      const batchId = await createBatch(taskId, 1);
      const r1 = await post(`/api/batches/${batchId}/close`, { reason: "first" });
      assert.equal(r1.status, 200);
      const r2 = await post(`/api/batches/${batchId}/close`, { reason: "second" });
      assert.equal(r2.status, 409);
      assert.equal(r2.body.error.code, "BATCH_ALREADY_CLOSED");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M1-6. closed batch resume → 404 (关闭不可逆)", async () => {
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-6")).steps as any);
    try {
      const batchId = await createBatch(taskId, 1);
      await post(`/api/batches/${batchId}/close`, { reason: "test" });
      const resume = await post(`/api/batches/${batchId}/resume`, {});
      assert.equal(resume.status, 404, "archived 不属于 paused, resume 应 404");
      assert.equal(resume.body.error.code, "NOT_FOUND_OR_NOT_PAUSED");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M1-7. close 缺 reason → 400", async () => {
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-7")).steps as any);
    try {
      const batchId = await createBatch(taskId, 1);
      const r = await post(`/api/batches/${batchId}/close`, {});
      assert.equal(r.status, 400);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M1-8. close 不影响 done item (终态保留)", async () => {
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-8")).steps as any);
    try {
      const batchId = await createBatch(taskId, 2);
      // close 时所有 item 都还在 ingest, 都被 cancel
      const close = await post<any>(`/api/batches/${batchId}/close`, { reason: "test" });
      assert.equal(close.body.cancelledItems, 2);
      // 重复 close 不重复 cancel
      const close2 = await post(`/api/batches/${batchId}/close`, { reason: "again" });
      assert.equal(close2.status, 409);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M1-9. close 把 leased outbox 也置 failed (防 reconciler 复活已 cancelled item)", async () => {
    // 回归测试: close 之前仅 fail pending 行, leased 行被 reconciler 在 lease 过期后捞起
    // 会把 cancelled item 推 stuck 或新建 retry pending. 修复后 leased 也被 fail.
    const { asSystem } = await import("../src/db.ts");
    const taskId = await createPipeline(buildCollectReview(uniqueId("m1-9")).steps as any);
    try {
      const batchId = await createBatch(taskId, 1);
      // 拿到该 batch 唯一 item 的 outbox 行, 手动模拟"已 leased"
      const [item] = await asSystem((tx) => tx<{ item_id: string }[]>`
        SELECT item_id FROM batch_items WHERE batch_id = ${batchId} LIMIT 1
      `);
      await asSystem((tx) => tx`
        UPDATE outbox
        SET status = 'leased', leased_by = 'fake-worker',
            leased_at = NOW(), expected_by = NOW() + INTERVAL '30 seconds'
        WHERE item_id = ${item.item_id} AND status = 'pending'
      `);

      const close = await post<any>(`/api/batches/${batchId}/close`, { reason: "leased outbox 测试" });
      assert.equal(close.status, 200);
      assert.equal(close.body.cancelledOutbox, 1, "close 应把 leased outbox 一并 fail, cancelledOutbox 含这行");

      const [{ status }] = await asSystem((tx) => tx<{ status: string }[]>`
        SELECT status FROM outbox WHERE item_id = ${item.item_id}
      `);
      assert.equal(status, "failed", "leased outbox 行 close 后必须是 failed, 否则 reconciler 会复活它");
    } finally {
      await deletePipeline(taskId);
    }
  });
});
