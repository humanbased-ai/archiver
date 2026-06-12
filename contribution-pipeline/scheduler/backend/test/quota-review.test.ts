// M10: review step 配额泛化 — review.decide 命中 max_total_per_user 时 409 USER_QUOTA_FULL
import "./_assert-test-db.ts";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREFIX,
  createPipeline,
  deletePipeline,
  getItem,
  post,
  req,
  uniqueId,
} from "./helpers.ts";

const policy = { timeoutMs: 30_000, maxAttempts: 1, baseBackoffMs: 1 };

// review 步配 max_total_per_user=1: 同一 reviewer 在该 batch 最多审 1 条
function buildPipelineWithReviewQuota(name: string, max: number) {
  return {
    name,
    steps: [
      { key: "ingest", nodeKey: "ingest", label: "采集", params: { source: "form" }, policy },
      {
        key: "review", nodeKey: "review", label: "审核",
        params: { rubric: "default", max_total_per_user: max },
        routes: { on: "decision", cases: { rejected: { goto: "ingest", maxLoops: 1 }, approved: "next" } },
        policy,
      },
      { key: "store", nodeKey: "export", label: "入库", params: { format: "json" }, policy },
    ] as const,
  };
}

describe("M10. review 配额泛化", () => {
  test("M10-1. review max_total_per_user=1, 同 reviewer 第二次 decide → 409 USER_QUOTA_FULL", async () => {
    const taskId = await createPipeline(buildPipelineWithReviewQuota(uniqueId("m10-1"), 1).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 2,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemIds = list.body.items.map((i) => i.id);

      // alice 提交 2 个
      for (const itemId of itemIds) {
        await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
        await post(`/api/collect/${itemId}/submit`, { userId: "alice", payload: { content: "x" } });
      }

      // bob 审第一条 → ok
      const d1 = await getItem(itemIds[0]);
      const r1 = d1.body.inflight.find((r: any) => r.step_key === "review" && r.status === "pending");
      await post(`${PREFIX}/queue/run/${r1.run_id}/claim`, { workerId: "bob" });
      const dec1 = await post(`/api/review/${itemIds[0]}/decide`,
        { userId: "bob", batchId, decision: "approved" });
      assert.equal(dec1.status, 200, JSON.stringify(dec1.body));

      // bob 审第二条 → 409 USER_QUOTA_FULL (max_total_per_user=1)
      const d2 = await getItem(itemIds[1]);
      const r2 = d2.body.inflight.find((r: any) => r.step_key === "review" && r.status === "pending");
      await post(`${PREFIX}/queue/run/${r2.run_id}/claim`, { workerId: "bob" });
      const dec2 = await post(`/api/review/${itemIds[1]}/decide`,
        { userId: "bob", batchId, decision: "approved" });
      assert.equal(dec2.status, 409);
      assert.equal(dec2.body.error.code, "USER_QUOTA_FULL");

      // charlie 接管 itemIds[1] 的 lease (生产路径: bob release + charlie claim;
      // 这里直接 SQL 改 leased_by 模拟接管, 测试焦点是"配额是 per-user 独立"而非 lease 流转).
      // 注: 不接管 lease 直接 decide 会被 ownership 校验 403 NOT_LEASE_OWNER —
      //     review 决策的所有权校验是 PR #3 review fix 的核心改动.
      const { asSystem } = await import("../src/db.ts");
      await asSystem((tx) => tx`
        UPDATE outbox SET leased_by = 'charlie' WHERE run_id = ${r2.run_id}
      `);

      // charlie 审第二条 → 应通过 (各自配额独立)
      const dec3 = await post(`/api/review/${itemIds[1]}/decide`,
        { userId: "charlie", batchId, decision: "approved" });
      assert.equal(dec3.status, 200, `charlie 配额独立, got ${JSON.stringify(dec3.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M10-3. review 决策 ownership 校验: 非 lease 持有者 decide → 403 NOT_LEASE_OWNER", async () => {
    // PR #3 review fix 回归: 之前 /review/.../decide 只校验 status=leased, 不校验 leased_by.
    // 不同 user 能提交别人 lease 的 review 决策, /result 也接受 (只看 runId). 修复后强制 ownership.
    const taskId = await createPipeline(buildPipelineWithReviewQuota(uniqueId("m10-3"), 0).steps as any);
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

      // bob 认领 review run
      const d = await getItem(itemId);
      const r = d.body.inflight.find((x: any) => x.step_key === "review" && x.status === "pending");
      await post(`${PREFIX}/queue/run/${r.run_id}/claim`, { workerId: "bob" });

      // dave 没认领, 直接 decide → 403 NOT_LEASE_OWNER
      const dec = await post(`/api/review/${itemId}/decide`,
        { userId: "dave", batchId, decision: "approved" });
      assert.equal(dec.status, 403, `期望 403, 实际 ${dec.status}: ${JSON.stringify(dec.body)}`);
      assert.equal(dec.body.error.code, "NOT_LEASE_OWNER");

      // bob (lease 持有者) decide → 200
      const decBob = await post(`/api/review/${itemId}/decide`,
        { userId: "bob", batchId, decision: "approved" });
      assert.equal(decBob.status, 200, `bob 是 lease 持有者应通过: ${JSON.stringify(decBob.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M10-2. review 不配 max_total_per_user → 不限制", async () => {
    const taskId = await createPipeline(
      // 不写 max_total_per_user
      buildPipelineWithReviewQuota(uniqueId("m10-2"), 0).steps as any,
    );
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 2,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      const itemIds = list.body.items.map((i) => i.id);
      for (const itemId of itemIds) {
        await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId });
        await post(`/api/collect/${itemId}/submit`, { userId: "alice", payload: { content: "x" } });
      }

      // bob 审 2 条都通过 — max=0 视为未配置
      for (const itemId of itemIds) {
        const d = await getItem(itemId);
        const rr = d.body.inflight.find((r: any) => r.step_key === "review" && r.status === "pending");
        await post(`${PREFIX}/queue/run/${rr.run_id}/claim`, { workerId: "bob" });
        const dec = await post(`/api/review/${itemId}/decide`,
          { userId: "bob", batchId, decision: "approved" });
        assert.equal(dec.status, 200, `${itemId}: ${JSON.stringify(dec.body)}`);
      }
    } finally {
      await deletePipeline(taskId);
    }
  });
});
