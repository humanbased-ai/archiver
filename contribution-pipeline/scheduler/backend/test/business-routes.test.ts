// 主流程薄弱点回归: release / redo / collect/state / review-tasks / my-submissions (含自愈)
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

async function setupClaimedItem(label: string): Promise<{
  taskId: string; batchId: string; itemId: string; userId: string;
}> {
  const userId = uniqueId(`${label}-u`);
  const taskId = await createPipeline(buildPipeline(uniqueId(label)).steps as any);
  const bRes = await post<{ batchId: string }>(`/api/batches`, {
    pipelineId: taskId, name: uniqueId("b"), target: 1,
  });
  const batchId = bRes.body.batchId;
  const list = await req<{ items: { id: string }[] }>(
    "GET", `/api/work/collect-tasks?userId=${userId}&batchId=${batchId}`,
  );
  const itemId = list.body.items[0].id;
  const c = await post(`/api/collect/${itemId}/claim`, { userId, batchId });
  if (c.status !== 200) throw new Error(`setup claim: ${JSON.stringify(c.body)}`);
  return { taskId, batchId, itemId, userId };
}

describe("BR. business 主流程薄弱点", () => {
  // ── release ────────────────────────────────────
  test("BR-1. release 已 claim 的 item → 200, submission 转 returned, 他人可再 claim", async () => {
    const { taskId, batchId, itemId, userId } = await setupClaimedItem("br-1");
    try {
      const r = await post(`/api/collect/${itemId}/release`, { userId });
      assert.equal(r.status, 200, JSON.stringify(r.body));

      const other = uniqueId("br-1-other");
      const c2 = await post(`/api/collect/${itemId}/claim`, { userId: other, batchId });
      assert.equal(c2.status, 200, `release 后他人应能 claim, got ${JSON.stringify(c2.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("BR-2. release 但本人未 claim → 404", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("br-2")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${uniqueId("br-2-c")}&batchId=${bRes.body.batchId}`,
      );
      const itemId = list.body.items[0].id;
      const r = await post(`/api/collect/${itemId}/release`, { userId: uniqueId("br-2-other") });
      assert.equal(r.status, 404);
    } finally {
      await deletePipeline(taskId);
    }
  });

  // ── redo ───────────────────────────────────────
  test("BR-3. redo: 删自己 status=submitted 且 result IN (rejected,duplicate) 的行", async () => {
    // 构造 alice 在 ingest 上有一条 result='rejected' 的 submission, 然后 redo 应删它.
    const taskId = await createPipeline(buildPipeline(uniqueId("br-3")).steps as any);
    const userId = uniqueId("br-3-u");
    const reviewer = uniqueId("br-3-r");
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${userId}&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;
      await post(`/api/collect/${itemId}/claim`, { userId, batchId });
      await post(`/api/collect/${itemId}/submit`, { userId, payload: { content: "x" } });

      // reviewer reject → submission.result 写 'rejected'
      const detail = await getItem(itemId);
      const rr = detail.body.inflight.find((r: any) => r.step_key === "review" && r.status === "pending");
      await post(`${PREFIX}/queue/run/${rr.run_id}/claim`, { workerId: reviewer });
      await post(`/api/review/${itemId}/decide`,
        { userId: reviewer, batchId, decision: "rejected", reason: "测试退回" });

      // redo 应删一条
      const redo = await post<{ removed: number }>(`/api/collect/${itemId}/redo`, { userId });
      assert.equal(redo.status, 200, JSON.stringify(redo.body));
      assert.equal(redo.body.removed, 1);

      // 再 redo → 404 NO_FAILED_SUBMISSION
      const redo2 = await post(`/api/collect/${itemId}/redo`, { userId });
      assert.equal(redo2.status, 404);
      assert.equal(redo2.body.error.code, "NO_FAILED_SUBMISSION");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("BR-4. redo 不动当前 status=claimed 的活动行", async () => {
    const { taskId, itemId, userId } = await setupClaimedItem("br-4");
    try {
      // 没有失败行, redo → 404
      const redo = await post(`/api/collect/${itemId}/redo`, { userId });
      assert.equal(redo.status, 404);
      // 现在 claimed 行还在, submit 应继续工作
      const s = await post(`/api/collect/${itemId}/submit`, {
        userId, payload: { content: "still claimed" },
      });
      assert.equal(s.status, 200, `redo 不该影响 claimed, got ${JSON.stringify(s.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  // ── collect/state ──────────────────────────────
  test("BR-5. /collect/:id/state 默认全 null; reject 后返 my_last_result=rejected", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("br-5")).steps as any);
    const userId = uniqueId("br-5-u");
    const reviewer = uniqueId("br-5-r");
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${userId}&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;

      // 任何提交前 → null
      const s0 = await get<{ my_last_result: string | null; my_last_reason: string | null }>(
        `/api/collect/${itemId}/state?userId=${userId}`,
      );
      assert.equal(s0.body.my_last_result, null);
      assert.equal(s0.body.my_last_reason, null);

      // 走 claim+submit+reject
      await post(`/api/collect/${itemId}/claim`, { userId, batchId });
      await post(`/api/collect/${itemId}/submit`, { userId, payload: { content: "x" } });
      const detail = await getItem(itemId);
      const rr = detail.body.inflight.find((r: any) => r.step_key === "review" && r.status === "pending");
      await post(`${PREFIX}/queue/run/${rr.run_id}/claim`, { workerId: reviewer });
      await post(`/api/review/${itemId}/decide`,
        { userId: reviewer, batchId, decision: "rejected", reason: "缺细节" });

      const s1 = await get<{ my_last_result: string; my_last_reason: string }>(
        `/api/collect/${itemId}/state?userId=${userId}`,
      );
      assert.equal(s1.body.my_last_result, "rejected");
      assert.equal(s1.body.my_last_reason, "缺细节");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("BR-6. /collect/:id/state 缺 userId → 400 MISSING_USER", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("br-6")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${uniqueId("u")}&batchId=${bRes.body.batchId}`,
      );
      const itemId = list.body.items[0].id;
      const r = await get(`/api/collect/${itemId}/state`);
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "MISSING_USER");
    } finally {
      await deletePipeline(taskId);
    }
  });

  // ── review/tasks ───────────────────────────────
  test("BR-7. /review/tasks 列出待审 item, alice submit 后 bob 看得到", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("br-7")).steps as any);
    const collector = uniqueId("br-7-c");
    const reviewer = uniqueId("br-7-r");
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 2,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${collector}&batchId=${batchId}`,
      );
      // 只 submit 第 1 条, 第 2 条留 ingest
      await post(`/api/collect/${list.body.items[0].id}/claim`, { userId: collector, batchId });
      await post(`/api/collect/${list.body.items[0].id}/submit`,
        { userId: collector, payload: { content: "x" } });

      const r = await req<{ items: { item_id: string; node_key: string }[] }>(
        "GET", `${PREFIX}/review/tasks?userId=${reviewer}&batchId=${batchId}`,
      );
      assert.equal(r.status, 200);
      const ids = r.body.items.map((x) => x.item_id);
      assert.ok(ids.includes(list.body.items[0].id),
        `应见到 submitted 的 item; got ${JSON.stringify(ids)}`);
      assert.ok(!ids.includes(list.body.items[1].id),
        "未 submit 的 item 不该在 review 列表");
      assert.ok(r.body.items.every((x) => x.node_key === "review"),
        "review 列表只该包含 review step");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("BR-8. /review/tasks 缺 userId → 400 MISSING_PARAMS", async () => {
    const r = await get(`${PREFIX}/review/tasks?batchId=${uniqueId("br-8-b")}`);
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, "MISSING_PARAMS");
  });

  // ── my-submissions (含读侧自愈) ─────────────────
  test("BR-9. /work/my-submissions 列出当前 user 全部 submission, 跨 batch", async () => {
    const userId = uniqueId("br-9-u");
    const taskId = await createPipeline(buildPipeline(uniqueId("br-9")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${userId}&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;
      await post(`/api/collect/${itemId}/claim`, { userId, batchId });
      await post(`/api/collect/${itemId}/submit`, { userId, payload: { content: "x" } });

      const r = await get<{ submissions: { user_id: string; item_id: string; status: string }[] }>(
        `/api/work/my-submissions?userId=${userId}`,
      );
      assert.equal(r.status, 200);
      assert.ok(r.body.submissions.length >= 1);
      assert.ok(r.body.submissions.every((s) => s.user_id === userId));
      assert.ok(r.body.submissions.some((s) => s.item_id === itemId && s.status === "submitted"));
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("BR-11. ALREADY_CLAIMING 优先于配额: 已 claim 的 item 即便配额满也能 re-claim 继续", async () => {
    // 防回归: "我的记录"显示"正在做" + 点继续被 USER_QUOTA_FULL 拦的 UX 矛盾.
    // fixture 走法:
    //   1. user claim item1 + claim item2 (max_concurrent 默认 99, 都拿到 claimed)
    //   2. user submit item1 → submitted=1, 达 maxTotal=1
    //   3. user re-claim item2 → 修复前: USER_QUOTA_FULL (submitted=1 >= max=1) 抢先拒;
    //      修复后: ALREADY_CLAIMING (item2 上自己已有 claimed 行) 优先
    const userId = uniqueId("br-11-u");
    const taskId = await createPipeline([
      { key: "ingest", nodeKey: "ingest", label: "采集",
        params: { source: "form", max_total_per_user: 1 }, policy },
      {
        key: "review", nodeKey: "review", label: "审核",
        params: { rubric: "default" },
        routes: { on: "decision", cases: { rejected: { goto: "ingest", maxLoops: 1 }, approved: "next" } },
        policy,
      },
      { key: "store", nodeKey: "export", label: "入库", params: { format: "json" }, policy },
    ] as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 2,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${userId}&batchId=${batchId}`,
      );
      assert.equal(list.body.items.length, 2);
      const [it1, it2] = list.body.items.map((i) => i.id);

      // 1. user claim item1 + item2 (max_concurrent 默认 99 不挡)
      assert.equal((await post(`/api/collect/${it1}/claim`, { userId, batchId })).status, 200);
      assert.equal((await post(`/api/collect/${it2}/claim`, { userId, batchId })).status, 200);

      // 2. submit item1 → submitted=1, 达 max_total_per_user
      assert.equal(
        (await post(`/api/collect/${it1}/submit`, { userId, payload: { content: "x" } })).status,
        200,
      );

      // 3. re-claim item2 (已有 claimed 行) → 应 ALREADY_CLAIMING, 不能被 USER_QUOTA_FULL 抢先拒
      const reclaim = await post(`/api/collect/${it2}/claim`, { userId, batchId });
      assert.equal(reclaim.status, 409);
      assert.equal(reclaim.body.error.code, "ALREADY_CLAIMING",
        `已 claim 的 item re-claim 必须返 ALREADY_CLAIMING, got ${JSON.stringify(reclaim.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("BR-10. /work/my-submissions 读侧自愈: claimed + item.stuck → 转 returned", async () => {
    // 构造: user claim 了一个 item, 然后 item 在调度核心被推到 stuck (绕 business 层),
    // 此时 submission 还停在 claimed. 调 my-submissions → 自愈应把它改 returned.
    const userId = uniqueId("br-10-u");
    const taskId = await createPipeline(buildPipeline(uniqueId("br-10")).steps as any);
    try {
      const bRes = await post<{ batchId: string }>(`/api/batches`, {
        pipelineId: taskId, name: uniqueId("b"), target: 1,
      });
      const batchId = bRes.body.batchId;
      const list = await req<{ items: { id: string }[] }>(
        "GET", `/api/work/collect-tasks?userId=${userId}&batchId=${batchId}`,
      );
      const itemId = list.body.items[0].id;
      await post(`/api/collect/${itemId}/claim`, { userId, batchId });

      // 绕开业务层, 直接核心 release 后 fail (retryable=false) → item stuck;
      // submissions.status 仍是 claimed (没人改).
      // 先 release 业务层 lease, 然后核心重新 claim 同 run + 直接 fail.
      const detail = await getItem(itemId);
      const ingestRun = detail.body.inflight.find((r: any) => r.step_key === "ingest");
      // 业务层 claim 已经把它 leased; 我们得用 same workerId release 才能再 claim 给自己
      // 简化: 直接 postResult 失败, runId 是当前 leased 的, leased_by=userId.
      // 但 postResult 的 lease 检查会按 leased_by; 我们用 helper claimItem 重新 claim 不行
      // (已被 leased). 先核心 release (workerId=userId 业务层就是用 userId), 再 claim+fail.
      await post(`${PREFIX}/queue/lease/${ingestRun.run_id}/release`, { workerId: userId });
      const reclaim = await claimItem(itemId, "w-br10");
      await postResult({
        runId: reclaim.runId, status: "failed",
        error: { code: "BAD", message: "force stuck", retryable: false },
      });
      const dd = await getItem(itemId);
      assert.equal(dd.body.item.current_step, "stuck", "fixture 应进 stuck");

      // submission 当前应仍是 claimed (业务层从没收到过结果)
      // 调 my-submissions, 自愈应触发
      const before = await get<{ submissions: any[] }>(`/api/work/my-submissions?userId=${userId}`);
      const found = before.body.submissions.find((s) => s.item_id === itemId);
      assert.ok(found, "应能看到该 submission");
      assert.equal(found.status, "returned", "自愈后应转 returned");
      assert.match(found.result_reason ?? "", /系统超时|租约/);
    } finally {
      await deletePipeline(taskId);
    }
  });
});
