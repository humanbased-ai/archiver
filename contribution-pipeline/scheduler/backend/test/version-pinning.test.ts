// M2: pinned pipeline_version 口径回归
//
// 验证 list / claim / decide 都走 batches.pipeline_version_id (pinned),
// 而不是 pipelines.steps (current). 即使 pipeline 改 schema 后,
// 老 batch 仍按创建时钉死的 version 判 disallowedFromSteps.
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

function buildCollectReview(name: string, reviewParams: Record<string, unknown> = {}) {
  return {
    name,
    steps: [
      { key: "ingest", nodeKey: "ingest", label: "采集", params: { source: "form" }, policy },
      {
        key: "review", nodeKey: "review", label: "审核",
        params: { rubric: "default", ...reviewParams },
        routes: { on: "decision", cases: { rejected: { goto: "ingest", maxLoops: 1 }, approved: "next" } },
        policy,
      },
      { key: "store", nodeKey: "export", label: "入库", params: { format: "json" }, policy },
    ] as const,
  };
}

describe("M2. pipeline version pinned 口径", () => {
  test("M2-1. v1 没 disallowed → 建 batch → save 加 disallowed → 老 batch 仍按 v1 不拒", async () => {
    // 1. v1: review 无 disallowed
    const taskId = await createPipeline(buildCollectReview(uniqueId("pin-v1")).steps as any);
    try {
      // 2. 建 batch (钉 v1)
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b-v1"), target: 1,
      });
      assert.equal(bRes.status, 200);
      const batchId = bRes.body.batchId;

      // 3. alice 走完 ingest 提交
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
      );
      assert.equal(list.body.items.length, 1);
      const itemId = list.body.items[0].id;
      assert.equal((await post(`/api/collect/${itemId}/claim`, { userId: "alice", batchId })).status, 200);
      assert.equal(
        (await post(`/api/collect/${itemId}/submit`, { userId: "alice", payload: { content: "x" } })).status,
        200,
      );

      // 4. save pipeline → 给 review 加 disallowSelfReview, 产生 v2
      const saveRes = await post(`${PREFIX}/pipelines/${taskId}/save`, {
        steps: buildCollectReview(uniqueId("pin-v2"), {
          disallowSelfReview: true, reviewedStepKey: "ingest",
        }).steps as any,
      });
      assert.equal(saveRes.status, 200, `save: ${JSON.stringify(saveRes.body)}`);

      // 5. alice 自审 batch_v1 → 应通过 (pinned 在 v1, v1 没禁); 修复前会 403
      const detail = await getItem(itemId);
      const reviewRun = detail.body.inflight.find((r: any) => r.step_key === "review");
      assert.ok(reviewRun, "review run should be inflight");
      const claimReview = await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, {
        workerId: "alice", leaseSeconds: 60,
      });
      assert.equal(claimReview.status, 200);
      const decide = await post(`/api/review/${itemId}/decide`, {
        userId: "alice", batchId, decision: "approved",
      });
      assert.equal(decide.status, 200,
        `M2 fix: 老 batch 应按 pinned v1 (无 disallowed) 通过, got ${JSON.stringify(decide.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M2-2. v1 配 disallowed → 新 batch_v2 移除 disallowed → batch_v2 不受 v1 影响", async () => {
    // 1. v1: review 配 disallowed
    const taskId = await createPipeline(
      buildCollectReview(uniqueId("pin2-v1"), {
        disallowSelfReview: true, reviewedStepKey: "ingest",
      }).steps as any,
    );
    try {
      // 2. save → 移除 disallowed → v2
      const saveRes = await post(`${PREFIX}/pipelines/${taskId}/save`, {
        steps: buildCollectReview(uniqueId("pin2-v2")).steps as any,
      });
      assert.equal(saveRes.status, 200);

      // 3. 在 v2 下建 batch_v2
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b-v2"), target: 1,
      });
      assert.equal(bRes.status, 200);
      const batchId = bRes.body.batchId;

      // 4. user 走完 ingest 提交 → 自审 → 应通过 (v2 没 disallowed)
      // 用 unique user 避免前测污染.
      const userId = uniqueId("pin2-user");
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${userId}&batchId=${batchId}`,
      );
      assert.equal(list.body.items.length, 1, `list ${JSON.stringify(list.body)}`);
      const itemId = list.body.items[0].id;
      const claimR = await post(`/api/collect/${itemId}/claim`, { userId, batchId });
      assert.equal(claimR.status, 200, `claim: ${JSON.stringify(claimR.body)}`);
      const submitR = await post(`/api/collect/${itemId}/submit`, { userId, payload: { content: "x" } });
      assert.equal(submitR.status, 200, `submit: ${JSON.stringify(submitR.body)}`);

      const detail = await getItem(itemId);
      const reviewRun = detail.body.inflight.find((r: any) => r.step_key === "review");
      assert.ok(reviewRun, `inflight=${JSON.stringify(detail.body.inflight)}`);
      await post(`${PREFIX}/queue/run/${reviewRun.run_id}/claim`, { workerId: userId, leaseSeconds: 60 });
      const decide = await post(`/api/review/${itemId}/decide`, {
        userId, batchId, decision: "approved",
      });
      assert.equal(decide.status, 200,
        `batch_v2 应按 pinned v2 (无 disallowed) 通过, got ${JSON.stringify(decide.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M2-3. 批次创建时 pipeline_version_id 被钉到 batches 表 (契约前提)", async () => {
    // 这一项不绕 list/claim (会和 autoworker 的 lease/release tick 撞), 而是直接验证
    // M2 修复的根: batches.pipeline_version_id 必须有值, 后续 list/claim/decide 才能
    // 通过 LEFT JOIN pipeline_versions 取到 pinned steps. 字段未填 → COALESCE 退到 current,
    // M2 修复就形同虚设.
    const taskId = await createPipeline(buildCollectReview(uniqueId("pin3")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b3"), target: 1,
      });
      assert.equal(bRes.status, 200);
      const batchId = bRes.body.batchId;

      const det = await req<{ pipeline_version_id?: string | null }>(
        "GET", `/api/batches/${batchId}`,
      );
      assert.equal(det.status, 200);
      assert.ok(
        det.body.pipeline_version_id,
        `batch 创建时应钉死 pipeline_version_id, got ${JSON.stringify(det.body)}`,
      );
    } finally {
      await deletePipeline(taskId);
    }
  });
});
