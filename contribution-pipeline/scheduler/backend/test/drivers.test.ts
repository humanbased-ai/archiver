// Driver Registry + 内置 driver 单元测试 (P1)
// 跑法: cd scheduler/backend && npx tsx --test test/drivers.test.ts
import "./_assert-test-db.ts";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  registerDriver,
  pickDriver,
  autoNodeKeys,
  toFailedResult,
  toResultBody,
  type Driver,
  type DriverJob,
} from "../src/drivers/registry.ts";

function fakeJob(overrides: Partial<DriverJob> = {}): DriverJob {
  return {
    runId: "run-1",
    itemId: "item-1",
    taskId: "task-1",
    tenantId: "00000000-0000-0000-0000-000000000001",
    stepKey: "ingest",
    nodeKey: "ingest",
    params: {},
    inputs: {},
    envelope: { payload: {}, outputs: {}, tags: {} },
    ctx: { runId: "run-1", attempt: 1, deadline: null },
    ...overrides,
  };
}

describe("V. Driver Registry", () => {
  test("V1. pickDriver 精确匹配 nodeKey", () => {
    const d: Driver = {
      name: "test:exact",
      nodeKey: "translate",
      handle: async () => ({ status: "success", output: { ok: true } }),
    };
    registerDriver(d);
    const job = fakeJob({ nodeKey: "translate" });
    const picked = pickDriver(job);
    assert.equal(picked?.name, "test:exact");
  });

  test("V2. pickDriver 通配 '*' 在精确之后兜底", () => {
    const d: Driver = {
      name: "test:wildcard",
      nodeKey: "*",
      enable: (j) => j.params.useWildcard === true,
      handle: async () => ({ status: "success", output: {} }),
    };
    registerDriver(d);
    // 精确无匹配 + 通配 enable 命中 → 走通配
    const picked = pickDriver(fakeJob({ nodeKey: "unknown-node", params: { useWildcard: true } }));
    assert.equal(picked?.name, "test:wildcard");
    // 通配 enable 不命中 → null
    const miss = pickDriver(fakeJob({ nodeKey: "unknown-node", params: { useWildcard: false } }));
    assert.equal(miss, null);
  });

  test("V3. 同 nodeKey 多 driver 用 enable 二级派发", () => {
    const a: Driver = {
      name: "test:source-a",
      nodeKey: "test-multi",
      enable: (j) => j.params.source === "a",
      handle: async () => ({ status: "success", output: { picked: "a" } }),
    };
    const b: Driver = {
      name: "test:source-b",
      nodeKey: "test-multi",
      enable: (j) => j.params.source === "b",
      handle: async () => ({ status: "success", output: { picked: "b" } }),
    };
    registerDriver(a);
    registerDriver(b);
    assert.equal(pickDriver(fakeJob({ nodeKey: "test-multi", params: { source: "a" } }))?.name, "test:source-a");
    assert.equal(pickDriver(fakeJob({ nodeKey: "test-multi", params: { source: "b" } }))?.name, "test:source-b");
    assert.equal(pickDriver(fakeJob({ nodeKey: "test-multi", params: { source: "c" } })), null);
  });

  test("V4. autoNodeKeys 排除通配, 自动 worker 不会按 '*' 拉队列", () => {
    const keys = autoNodeKeys();
    assert.ok(!keys.includes("*"), "autoNodeKeys 不应含 '*'");
  });

  test("V5. toFailedResult / toResultBody 形态对齐 /result 协议", () => {
    const failed = toFailedResult(new Error("boom"), "TEST_ERR");
    const body = toResultBody("run-x", failed);
    assert.equal(body.runId, "run-x");
    assert.equal(body.status, "failed");
    assert.equal(body.error?.code, "TEST_ERR");
    assert.match(body.error?.message ?? "", /boom/);
  });
});

describe("X. llm_translate driver", () => {
  // 直接调 driver.handle, 避开 registry 状态污染; 用 __setFetchForTests 拦 Anthropic API
  // 注意: Phase 2+3 之后 job.params 是 lease 服务端 merge 完的形态, job.inputs 是 resolver 解析完的.
  // 这里 helper 模拟"lease 已 merge + 已 resolve"的输入, driver 单测不走 lease.
  const llmJob = (overrides: Partial<DriverJob> = {}): DriverJob =>
    fakeJob({
      nodeKey: "llm_translate",
      nodeVersion: "1.0",
      stepKey: "translate",
      params: {
        targetLang: "zh",
        model:        "claude-haiku-4-5-20251001",
        maxTokens:    2048,
        systemPrompt: "Translate the following text to {{targetLang}}. Output ONLY the translation, no preface, no quotes.",
        timeoutMs:    60_000,
      },
      inputs: { text: "Hello world" },              // Phase 3: text 来自 inputs, 不再从 envelope 直接读
      envelope: { payload: { text: "Hello world" }, outputs: {}, tags: {} },
      ...overrides,
    });

  const ORIG_KEY = process.env.ANTHROPIC_API_KEY;

  function mockFetch(impl: (req: { url: string; init: any }) => Promise<Response> | Response) {
    return (async (url: any, init: any) => impl({ url: String(url), init })) as unknown as typeof fetch;
  }

  function withMock(impl: Parameters<typeof mockFetch>[0], hasKey = true) {
    return async () => {
      if (hasKey) process.env.ANTHROPIC_API_KEY = "test-key";
      else delete process.env.ANTHROPIC_API_KEY;
      const { llmTranslateDriver, __setFetchForTests } = await import("../src/drivers/llm-translate.ts");
      __setFetchForTests(mockFetch(impl));
      try {
        return await llmTranslateDriver.handle(llmJob() as any);
      } finally {
        __setFetchForTests(null);
        if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
        else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
      }
    };
  }

  test("X1. success: 200 + content[text] → success output", async () => {
    const r = await withMock(() =>
      new Response(JSON.stringify({ content: [{ type: "text", text: "你好世界" }] }), { status: 200 }),
    )();
    assert.equal(r.status, "success");
    assert.equal((r as any).output.translated, "你好世界");
    assert.equal((r as any).output.targetLang, "zh");
    assert.equal((r as any).output.model, "claude-haiku-4-5-20251001");
  });

  test("X2. NO_TEXT: inputs.text 缺失 → 非重试失败 (Phase 3 后从 inputs 读, 不再 envelope)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { llmTranslateDriver } = await import("../src/drivers/llm-translate.ts");
    const r = await llmTranslateDriver.handle(llmJob({ inputs: {} }) as any);
    assert.equal(r.status, "failed");
    assert.equal((r as any).error.code, "NO_TEXT");
    assert.equal((r as any).error.retryable, false);
    if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  });

  test("X3. NO_API_KEY: 缺环境变量 → 非重试失败", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { llmTranslateDriver } = await import("../src/drivers/llm-translate.ts");
    const r = await llmTranslateDriver.handle(llmJob() as any);
    assert.equal(r.status, "failed");
    assert.equal((r as any).error.code, "NO_API_KEY");
    assert.equal((r as any).error.retryable, false);
    if (ORIG_KEY !== undefined) process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  });

  test("X4. 429 → LLM_RATE_LIMIT retryable", async () => {
    const r = await withMock(() => new Response("rate limited", { status: 429 }))();
    assert.equal(r.status, "failed");
    assert.equal((r as any).error.code, "LLM_RATE_LIMIT");
    assert.equal((r as any).error.retryable, true);
  });

  test("X5. 500 → LLM_500 retryable", async () => {
    const r = await withMock(() => new Response("boom", { status: 500 }))();
    assert.equal((r as any).error.code, "LLM_500");
    assert.equal((r as any).error.retryable, true);
  });

  test("X6. 400 → LLM_400 non-retryable", async () => {
    const r = await withMock(() => new Response("bad request", { status: 400 }))();
    assert.equal((r as any).error.code, "LLM_400");
    assert.equal((r as any).error.retryable, false);
  });

  test("X7. 网络错误 → LLM_NETWORK retryable", async () => {
    const r = await withMock(() => { throw new Error("ECONNREFUSED"); })();
    assert.equal((r as any).error.code, "LLM_NETWORK");
    assert.equal((r as any).error.retryable, true);
  });

  test("X8. 200 但 content 无 text block → LLM_BAD_RESPONSE", async () => {
    const r = await withMock(() =>
      new Response(JSON.stringify({ content: [{ type: "tool_use" }] }), { status: 200 }),
    )();
    assert.equal((r as any).error.code, "LLM_BAD_RESPONSE");
    assert.equal((r as any).error.retryable, false);
  });

  test("X9. enable: params.driver=http 时返回 false, 让 HTTP driver 接", async () => {
    const { llmTranslateDriver } = await import("../src/drivers/llm-translate.ts");
    assert.equal(llmTranslateDriver.enable!(llmJob({ params: { targetLang: "zh", driver: "http" } }) as any), false);
    assert.equal(llmTranslateDriver.enable!(llmJob() as any), true);
  });

  // ─── 三层配置 merge / pin / secret 验证 ───

  test("X10. merge: step.params 不填 model → 用 presets.defaults.model", async () => {
    const { mergeEffectiveParams } = await import("../src/node-config.ts");
    const eff = mergeEffectiveParams(
      { targetLang: "zh" },
      { defaults: { model: "default-model", timeoutMs: 60000 }, pin: [] },
    );
    assert.equal(eff.model, "default-model");
    assert.equal(eff.targetLang, "zh");
    assert.equal(eff.timeoutMs, 60000);
  });

  test("X11. pin: step.params 试图覆盖 pin 字段 → 仍取 constants 的值", async () => {
    const { mergeEffectiveParams } = await import("../src/node-config.ts");
    const eff = mergeEffectiveParams(
      { targetLang: "zh", systemPrompt: "EVIL OVERRIDE", maxTokens: 999999 },
      {
        constants: { systemPrompt: "SAFE PROMPT {{targetLang}}", maxTokens: 2048 },
        pin: ["systemPrompt", "maxTokens"],
      },
    );
    assert.equal(eff.systemPrompt, "SAFE PROMPT {{targetLang}}", "pin 字段必须来自 constants");
    assert.equal(eff.maxTokens, 2048);
    assert.equal(eff.targetLang, "zh", "非 pin 字段不受影响");
  });

  // X12/X13 (Phase 2 改造后): driver 消费 lease 服务端 merge 完的 job.params, 不再自己 fallback / pin
  // 这两个验证的契约: driver 是 dumb consumer of merged params, 不会再用 nodeDefinition.presets 做二次 merge
  test("X12. handle: 收到 server-side merge 完的 job.params → driver 直接用, 不做二次 fallback", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { llmTranslateDriver, __setFetchForTests } = await import("../src/drivers/llm-translate.ts");
    let captured: any = null;
    __setFetchForTests((async (url: any, init: any) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), { status: 200 });
    }) as unknown as typeof fetch);
    try {
      // 模拟 lease 已经合并好的 params (服务端 merge 后的形态)
      await llmTranslateDriver.handle(llmJob({
        params: {
          targetLang: "zh",
          model:        "custom-server-merged-model",
          maxTokens:    9999,
          systemPrompt: "Translate to {{targetLang}} please.",
          timeoutMs:    60000,
        },
      }) as any);
      assert.equal(captured.model,       "custom-server-merged-model", "driver 必须用 job.params.model, 不能 fallback 到自己的 defaults");
      assert.equal(captured.max_tokens,  9999,                          "driver 必须用 job.params.maxTokens");
      assert.ok(String(captured.messages[0].content).includes("Translate to zh please."),
        "driver 必须用 job.params.systemPrompt + 仅做 {{var}} 替换");
    } finally {
      __setFetchForTests(null);
      if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
    }
  });

  // X13 是个反向"责任边界"锁: 验证 driver 不再做 pin 防御 (那是 lease 服务端的活)
  // 配对的正向 pin 验证在 api.e2e Z1 (跑通真 lease + 真 pin enforcement)
  // 这里看起来"允许 EVIL 通过"很反直觉, 但意图是: 防止有人在 driver 里偷偷加回 pin 检查 — 一旦加了,
  // 服务端 pin 的 bug 就会被 driver 端"善意防御"掩盖, 排查时反而绕路. 一处责任一处验证.
  test("X13. responsibility boundary: driver 不做 pin 防御 (配对正向验证在 api.e2e Z1)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { llmTranslateDriver, __setFetchForTests } = await import("../src/drivers/llm-translate.ts");
    let captured: any = null;
    __setFetchForTests((async (url: any, init: any) => {
      captured = JSON.parse(init.body);
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), { status: 200 });
    }) as unknown as typeof fetch);
    try {
      // 假设 lease 端 merge 出 bug 让 EVIL systemPrompt 漏过来: driver 应当照单全收, 不"善意挡掉"
      await llmTranslateDriver.handle(
        llmJob({ params: { targetLang: "zh", systemPrompt: "EVIL", model: "m", maxTokens: 100, timeoutMs: 60000 } }) as any,
      );
      const userContent = String(captured.messages[0].content);
      assert.ok(userContent.includes("EVIL"),
        "driver 必须 dumb 消费 job.params; pin 防御是 lease 端职责 (Z1 验证). 如果这条挂了, 八成是有人在 driver 里加回了二次 merge");
    } finally {
      __setFetchForTests(null);
      if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
    }
  });

  test("X15. pickDriver 三轮派发: 精确 (nodeKey, nodeVersion) → nodeKey only → 通配", async () => {
    const { registerDriver, pickDriver } = await import("../src/drivers/registry.ts");
    const dV1 = {
      name: "test:multi-v1",
      nodeKey: "test_multi_ver",
      nodeDefinition: { key: "test_multi_ver", version: "1.0", displayName: "v1", paramsSchema: {} },
      handle: async () => ({ status: "success" as const, output: { v: "1.0" } }),
    };
    const dV2 = {
      name: "test:multi-v2",
      nodeKey: "test_multi_ver",
      nodeDefinition: { key: "test_multi_ver", version: "2.0", displayName: "v2", paramsSchema: {} },
      handle: async () => ({ status: "success" as const, output: { v: "2.0" } }),
    };
    registerDriver(dV1);
    registerDriver(dV2);
    // 精确版本派发
    const job1 = fakeJob({ nodeKey: "test_multi_ver", nodeVersion: "1.0" });
    const job2 = fakeJob({ nodeKey: "test_multi_ver", nodeVersion: "2.0" });
    const jobX = fakeJob({ nodeKey: "test_multi_ver", nodeVersion: "3.0" }); // 无版本匹配, fallback nodeKey-only
    const jobN = fakeJob({ nodeKey: "test_multi_ver" }); // 无 nodeVersion, fallback nodeKey-only
    assert.equal(pickDriver(job1)?.name, "test:multi-v1");
    assert.equal(pickDriver(job2)?.name, "test:multi-v2");
    assert.equal(pickDriver(jobX)?.name, "test:multi-v1", "version 不匹配应 fallback nodeKey-only (第一个注册的)");
    assert.equal(pickDriver(jobN)?.name, "test:multi-v1", "未提供 nodeVersion 应 fallback nodeKey-only");
  });

  test("X14a. drift: 注册 + auto-upsert 后, DB node_definitions 行必须与 driver.nodeDefinition 完全一致 (生产 autoworker 启动时跑的就是这条路径)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key"; // 让 llm-translate 也注册
    const { asSystem } = await import("../src/db.ts");
    const { upsertCollectedNodeDefinitions } = await import("../src/drivers/_upsert.ts");
    const { registerDedupDriver }       = await import("../src/drivers/dedup.ts");
    const { registerExportDriver }      = await import("../src/drivers/export.ts");
    const { registerSandboxJsDriver }   = await import("../src/drivers/sandbox-js.ts");
    const { registerLlmTranslateDriver } = await import("../src/drivers/llm-translate.ts");

    registerDedupDriver();
    registerExportDriver();
    registerSandboxJsDriver();
    registerLlmTranslateDriver();
    await upsertCollectedNodeDefinitions();

    type Mod = { nodeDefinition: import("../src/node-config.ts").DriverNodeDefinition };
    const modules = [
      "../src/drivers/llm-translate.ts",
      "../src/drivers/dedup.ts",
      "../src/drivers/export.ts",
      "../src/drivers/sandbox-js.ts",
    ];
    for (const path of modules) {
      const { nodeDefinition: nd } = (await import(path)) as Mod;
      const rows = await asSystem(async (tx) =>
        tx<any[]>`SELECT display_name, params_schema, ui_schema, presets, inputs_schema, idempotent, default_timeout_ms, default_max_attempts, manual FROM node_definitions WHERE key = ${nd.key} AND version = ${nd.version}`,
      );
      assert.equal(rows.length, 1, `${nd.key}@${nd.version} 行必须存在 (跑过 migrate + upsert)`);
      const r = rows[0];
      assert.equal(r.display_name, nd.displayName, `${nd.key}: display_name 漂`);
      assert.deepStrictEqual(r.params_schema, nd.paramsSchema, `${nd.key}: params_schema 漂`);
      assert.deepStrictEqual(r.ui_schema, nd.uiSchema ?? null, `${nd.key}: ui_schema 漂`);
      assert.deepStrictEqual(r.presets, nd.presets ?? null, `${nd.key}: presets 漂`);
      assert.deepStrictEqual(r.inputs_schema, nd.inputsSchema ?? null, `${nd.key}: inputs_schema 漂`);
      assert.equal(r.idempotent, nd.idempotent ?? false, `${nd.key}: idempotent 漂`);
      assert.equal(r.default_timeout_ms, nd.defaultTimeoutMs ?? 30000, `${nd.key}: default_timeout_ms 漂`);
      assert.equal(r.default_max_attempts, nd.defaultMaxAttempts ?? 3, `${nd.key}: default_max_attempts 漂`);
      assert.equal(r.manual, nd.manual ?? false, `${nd.key}: manual 漂`);
    }
    if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
    // 不 sql.end(): module-level 连接池留给跨文件 test runner 管理
  });

  test("X14. secret resolve: x-api-key header 取自 presets.secrets.anthropicKey.envVar 指向的环境变量", async () => {
    process.env.ANTHROPIC_API_KEY = "sentinel-key-xyz";
    const { llmTranslateDriver, __setFetchForTests } = await import("../src/drivers/llm-translate.ts");
    let capturedHeaders: any = null;
    __setFetchForTests((async (url: any, init: any) => {
      capturedHeaders = init.headers;
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), { status: 200 });
    }) as unknown as typeof fetch);
    try {
      await llmTranslateDriver.handle(llmJob() as any);
      assert.equal(capturedHeaders["x-api-key"], "sentinel-key-xyz");
      assert.equal(capturedHeaders["anthropic-version"], "2023-06-01");
    } finally {
      __setFetchForTests(null);
      if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
    }
  });
});

describe("W. sandbox-js driver", () => {
  test("W1. 正常脚本: return 对象 → success", async () => {
    const { default: vm } = await import("node:vm");
    // 间接测 sandbox-js: 直接调它的 driver 已注册,我们在 V 后面 register, 这里简单跑 vm 验证一致
    // 真正 e2e 会通过 autoworker 路径; 单测只验"脚本→输出"映射
    const sandbox: any = { payload: { text: "Hello World" }, outputs: {}, tags: {}, params: {} };
    const ctx = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
    const out = vm.runInContext(
      `(function(){ return { upper: payload.text.toUpperCase() }; })()`,
      ctx,
      { timeout: 1000 },
    );
    // vm 跨 realm 创建对象, prototype 不同, 不能 deepStrictEqual; 用 JSON 比内容
    assert.equal(JSON.stringify(out), JSON.stringify({ upper: "HELLO WORLD" }));
  });

  test("W2. 死循环脚本被 timeout 中断", async () => {
    const { default: vm } = await import("node:vm");
    const ctx = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
    let err: any = null;
    try {
      vm.runInContext(`while(true){}`, ctx, { timeout: 100 });
    } catch (e) { err = e; }
    assert.ok(err, "应抛 timeout");
    assert.match(String(err.message ?? err), /timed out/i);
  });

  test("W3. 沙箱内 process / require 不可达", async () => {
    const { default: vm } = await import("node:vm");
    const ctx = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
    let processInScope: any = null;
    let requireInScope: any = null;
    try { processInScope = vm.runInContext(`typeof process`, ctx, { timeout: 500 }); } catch {}
    try { requireInScope = vm.runInContext(`typeof require`, ctx, { timeout: 500 }); } catch {}
    assert.equal(processInScope, "undefined");
    assert.equal(requireInScope, "undefined");
  });
});

// ═══════════════════════════════════════════════════════════
// R. Bindings resolver (Phase 3) — {{path}} 表达式求值
// ═══════════════════════════════════════════════════════════
describe("R. resolveBindings", () => {
  const ctx = {
    payload: { text: "hello", num: 42, nested: { a: "A", b: { c: 7 } } },
    outputs: { collect: { result: "from_upstream", arr: [1, 2, 3] } },
    tags:    { batch: "b-001" },
  };

  test("R1. 字面量字符串透传 (含 '')", async () => {
    const { resolveBindings } = await import("../src/node-config.ts");
    const r = resolveBindings({ a: "literal", b: "", c: 123 }, {}, ctx);
    assert.equal(r.a, "literal");
    assert.equal(r.b, "");
    assert.equal(r.c, 123, "非字符串值透传");
  });

  test("R2. 整段 {{path}} 保留原值类型", async () => {
    const { resolveBindings } = await import("../src/node-config.ts");
    const r = resolveBindings({
      text: "{{payload.text}}",
      num:  "{{payload.num}}",
      arr:  "{{outputs.collect.arr}}",
      obj:  "{{payload.nested}}",
    }, {}, ctx);
    assert.equal(r.text, "hello");
    assert.equal(r.num, 42, "number 保留");
    assert.deepStrictEqual(r.arr, [1, 2, 3], "array 保留");
    assert.deepStrictEqual(r.obj, { a: "A", b: { c: 7 } }, "object 保留");
  });

  test("R3. 部分模板拼接 → 字符串", async () => {
    const { resolveBindings } = await import("../src/node-config.ts");
    const r = resolveBindings({
      g: "Hello {{payload.text}}!",
      nested: "[{{payload.nested.b.c}}]",
    }, {}, ctx);
    assert.equal(r.g, "Hello hello!");
    assert.equal(r.nested, "[7]", "深度路径解析");
  });

  test("R4. 缺失路径: 整段 → undefined; 部分模板 → 片段 ''", async () => {
    const { resolveBindings } = await import("../src/node-config.ts");
    const r = resolveBindings({
      gone:    "{{payload.notfound}}",
      partial: "x={{payload.notfound}};y",
    }, {}, ctx);
    assert.equal(r.gone, undefined);
    assert.equal(r.partial, "x=;y");
  });

  test("R5. inputsSchema.defaultBinding 兜底 (step.inputs 没该 key)", async () => {
    const { resolveBindings } = await import("../src/node-config.ts");
    const r = resolveBindings(
      { other: "{{payload.text}}" },
      { text: { defaultBinding: "{{payload.text}}" } },
      ctx,
    );
    assert.equal(r.text, "hello", "schema 默认绑定应触发");
    assert.equal(r.other, "hello", "step 显式 + schema 未声明 → 也解析");
  });

  test("R6. step.inputs 空字符串 = 字面量空字符串, 不走 defaultBinding", async () => {
    const { resolveBindings } = await import("../src/node-config.ts");
    const r = resolveBindings(
      { text: "" },
      { text: { defaultBinding: "{{payload.text}}" } },
      ctx,
    );
    assert.equal(r.text, "", "显式空 = 字面量 '', 不应回退到 defaultBinding (避免编辑器'是否清空了'歧义)");
  });

  test("R7. 安全: __proto__ / constructor / prototype 路径屏蔽", async () => {
    const { resolveBindings, getPath } = await import("../src/node-config.ts");
    const r = resolveBindings({
      proto:       "{{payload.__proto__}}",
      ctor:        "{{payload.constructor}}",
      prototype:   "{{payload.nested.prototype}}",
    }, {}, ctx);
    assert.equal(r.proto, undefined, "__proto__ 应被屏蔽");
    assert.equal(r.ctor, undefined, "constructor 应被屏蔽");
    assert.equal(r.prototype, undefined, "prototype 应被屏蔽");
    // 直接验 getPath 也屏蔽
    assert.equal(getPath({ a: 1 }, "__proto__"), undefined);
  });

  test("R8. outputs 命名空间: 上游 step 输出可被引用", async () => {
    const { resolveBindings } = await import("../src/node-config.ts");
    const r = resolveBindings({
      fromUpstream: "{{outputs.collect.result}}",
      fromTag:      "{{tags.batch}}",
    }, {}, ctx);
    assert.equal(r.fromUpstream, "from_upstream");
    assert.equal(r.fromTag, "b-001");
  });
});
