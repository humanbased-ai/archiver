// M5: Idempotency-Key 契约
//
// 现有实现 (`src/idempotency.ts`) 已挂 /api/batches. 本套件锁定行为契约:
//   - 同 key + 同 body → 重放原响应 (同 batchId)
//   - 同 key + 不同 body → 409 IDEMPOTENCY_HASH_MISMATCH
//   - 不同 scope (路径) → 互不影响
//   - key 长度违规 → 400 BAD_IDEMPOTENCY_KEY
//
// 注: 跨租户隔离已在 multitenant 套件覆盖 (idempotency_keys.tenant_id PK).
// 真正"并发同 key 仅一次落库"的 race 严格保证未做, 留为后续 (见 05-final-modification-guide M5-4).
import "./_assert-test-db.ts";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createPipeline,
  deletePipeline,
  post,
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

describe("M5. Idempotency-Key on /api/batches", () => {
  test("M5-1. 同 key + 同 body → 重放, 返回同一 batchId", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("idem-1")).steps as any);
    try {
      const key = uniqueId("k1");
      const body = { pipelineId: taskId, name: uniqueId("b"), target: 2 };
      const r1 = await post<{ batchId: string }>(`/api/batches`, body, { "idempotency-key": key });
      const r2 = await post<{ batchId: string }>(`/api/batches`, body, { "idempotency-key": key });
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r1.body.batchId, r2.body.batchId, "同 key 同 body 必须返回同一 batchId");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M5-2. 同 key + 不同 body → 409 IDEMPOTENCY_HASH_MISMATCH", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("idem-2")).steps as any);
    try {
      const key = uniqueId("k2");
      const r1 = await post(`/api/batches`,
        { pipelineId: taskId, name: uniqueId("b-a"), target: 1 },
        { "idempotency-key": key });
      assert.equal(r1.status, 200);
      const r2 = await post(`/api/batches`,
        { pipelineId: taskId, name: uniqueId("b-b"), target: 1 },
        { "idempotency-key": key });
      assert.equal(r2.status, 409);
      assert.equal(r2.body.error.code, "IDEMPOTENCY_HASH_MISMATCH");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M5-3. 同 key + 不同 scope (路径) → 互不影响", async () => {
    // /api/batches 与 /api/v1/pipelines/create 都受幂等保护, scope 不同
    const taskId = await createPipeline(buildPipeline(uniqueId("idem-3")).steps as any);
    try {
      const key = uniqueId("k3");
      // 在 /api/batches 用一次
      const r1 = await post(`/api/batches`,
        { pipelineId: taskId, name: uniqueId("b"), target: 1 },
        { "idempotency-key": key });
      assert.equal(r1.status, 200);
      // 同 key 用到 /api/v1/pipelines/create — 不同 body, 但因 scope 不同, 不会 hash mismatch
      const r2 = await post(`/api/v1/pipelines/create`,
        { name: uniqueId("p"), steps: buildPipeline(uniqueId("p2")).steps },
        { "idempotency-key": key });
      assert.notEqual(r2.status, 409,
        `不同 scope 用同 key 不应触发 hash mismatch, got ${r2.status} ${JSON.stringify(r2.body)}`);
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M5-4. 长度 <8 → 400 BAD_IDEMPOTENCY_KEY", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("idem-4")).steps as any);
    try {
      const r = await post(`/api/batches`,
        { pipelineId: taskId, name: uniqueId("b"), target: 1 },
        { "idempotency-key": "abc" });
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, "BAD_IDEMPOTENCY_KEY");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M5-5. 不带 Idempotency-Key → 走原 handler (不影响)", async () => {
    const taskId = await createPipeline(buildPipeline(uniqueId("idem-5")).steps as any);
    try {
      const body = { pipelineId: taskId, name: uniqueId("b"), target: 1 };
      const r1 = await post<{ batchId: string }>(`/api/batches`, body);
      const r2 = await post<{ batchId: string }>(`/api/batches`, body);
      assert.notEqual(r1.body.batchId, r2.body.batchId,
        "不带 key 必须每次创建新 batch");
    } finally {
      await deletePipeline(taskId);
    }
  });

  test("M5-6. 并发同 key 同 body → 仅一次落库, 其余重放或返 IN_PROGRESS", async () => {
    // M5 严格并发去重: advisory_xact_lock 在 preHandler 串行同 (tenant, key, scope).
    // 两个并发请求中, 第一个进入 handler 时占位 'pending', 第二个看到 pending 返
    // IDEMPOTENCY_IN_PROGRESS; 等第一个完成后再发同 key 同 body → 重放.
    const taskId = await createPipeline(buildPipeline(uniqueId("idem-6")).steps as any);
    try {
      const key = uniqueId("k6");
      const body = { pipelineId: taskId, name: uniqueId("b"), target: 1 };
      // 并发 5 个同 key 同 body
      const results = await Promise.all(Array.from({ length: 5 }, () =>
        post<{ batchId?: string }>(`/api/batches`, body, { "idempotency-key": key }),
      ));
      const ok = results.filter((r) => r.status === 200);
      const inProgress = results.filter(
        (r) => r.status === 409 && (r.body as any)?.error?.code === "IDEMPOTENCY_IN_PROGRESS",
      );
      assert.ok(ok.length >= 1, `至少 1 个 200, got ${JSON.stringify(results.map((r) => r.status))}`);
      assert.equal(ok.length + inProgress.length, 5,
        "其余必须是 IDEMPOTENCY_IN_PROGRESS, 不能 fall-through 创建");
      // 200 的 batchId 必须一致
      const batchIds = new Set(ok.map((r) => r.body.batchId));
      assert.equal(batchIds.size, 1, `仅一个 batchId, got ${[...batchIds].join(",")}`);
    } finally {
      await deletePipeline(taskId);
    }
  });
});
