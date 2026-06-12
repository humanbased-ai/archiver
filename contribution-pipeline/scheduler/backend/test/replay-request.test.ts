// M8: stuck item 用户侧重放申请
import "./_assert-test-db.ts";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PREFIX,
  claimItem,
  createPipeline,
  deletePipeline,
  get,
  getItem,
  post,
  postResult,
  req,
  uniqueId,
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

async function setupStuckItem(label: string): Promise<{ taskId: string; itemId: string; batchId: string }> {
  const taskId = await createPipeline(buildPipeline(uniqueId(label)).steps as any);
  const bRes = await post<{ batchId: string }>(`/api/batches`, {
    pipelineId: taskId, name: uniqueId("b"), target: 1,
  });
  const batchId = bRes.body.batchId;
  const list = await req<{ items: { id: string }[] }>(
    "GET", `/api/work/collect-tasks?userId=alice&batchId=${batchId}`,
  );
  const itemId = list.body.items[0].id;

  // 直接核心 claim + fail (retryable=false) 推 stuck
  const c = await claimItem(itemId, `w-${label}`);
  await postResult({
    runId: c.runId, status: "failed",
    error: { code: "BAD_INPUT", message: "test stuck", retryable: false },
  });
  const detail = await getItem(itemId);
  assert.equal(detail.body.item.current_step, "stuck", "fixture 应进 stuck");
  return { taskId, itemId, batchId };
}

describe("M8. stuck replay-request", () => {
  test("M8-1. stuck item 申请 replay → 200, 写入 replay_requests", async () => {
    const { taskId, itemId } = await setupStuckItem("m8-1");
    try {
      const r = await post<{ requestId: string; replayed: boolean }>(
        `/api/items/${itemId}/replay-request`,
        { userId: "user-x", reason: "我看 30 分钟了还卡着" },
      );
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.ok(r.body.requestId);
      assert.equal(r.body.replayed, false);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M8-2. 非 stuck item 申请 → 409 ITEM_NOT_STUCK", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("m8-2")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=alice&batchId=${bRes.body.batchId}`,
      );
      const itemId = list.body.items[0].id;

      const r = await post(`/api/items/${itemId}/replay-request`, { userId: "user-x" });
      assert.equal(r.status, 409);
      assert.equal(r.body.error.code, "ITEM_NOT_STUCK");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M8-3. 重复申请 → 幂等返同一 request, replayed=true", async () => {
    const { taskId, itemId } = await setupStuckItem("m8-3");
    try {
      const r1 = await post<{ requestId: string; replayed: boolean }>(
        `/api/items/${itemId}/replay-request`,
        { userId: "user-x", reason: "first" },
      );
      const r2 = await post<{ requestId: string; replayed: boolean }>(
        `/api/items/${itemId}/replay-request`,
        { userId: "user-y", reason: "second (会被忽略)" },
      );
      assert.equal(r1.body.requestId, r2.body.requestId, "幂等返同一 id");
      assert.equal(r1.body.replayed, false);
      assert.equal(r2.body.replayed, true);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M8-4. admin replay 后 request 标 resolved", async () => {
    const { taskId, itemId } = await setupStuckItem("m8-4");
    try {
      await post(`/api/items/${itemId}/replay-request`, { userId: "user-x", reason: "stuck" });

      // admin 把它打回 ingest
      const replay = await post(`${PREFIX}/admin/items/${itemId}/replay`, { stepKey: "ingest" });
      assert.equal(replay.status, 200);

      // 再申请一次 → 因为前一条已 resolved, 这次应是新建
      const r2 = await post<{ replayed: boolean }>(
        `/api/items/${itemId}/replay-request`,
        { userId: "user-y" },
      );
      // 但此时 item 已不是 stuck 了 (回到 ingest), 所以应 409
      assert.equal(r2.status, 409, "replay 后 item=ingest, 不能再申请");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M8-5. /admin/stuck 返回 stuck item 时附上 pending replay_request", async () => {
    const { taskId, itemId } = await setupStuckItem("m8-5");
    try {
      await post(`/api/items/${itemId}/replay-request`,
        { userId: "user-x", reason: "user-reason-X" });
      const r = await get<{ items: any[] }>(`${PREFIX}/admin/stuck`);
      const found = r.body.items.find((it) => it.id === itemId);
      assert.ok(found, `/admin/stuck 应含 ${itemId}`);
      assert.ok(found.replay_request, "应附 replay_request 字段");
      assert.equal(found.replay_request.status, "pending");
      assert.equal(found.replay_request.requester, "user-x");
    } finally {
      await deletePipeline(taskId);
    }
  });
});
