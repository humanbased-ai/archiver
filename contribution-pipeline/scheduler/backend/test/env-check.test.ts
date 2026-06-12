import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateProductionEnv } from "../src/env-check.ts";

// M3 fail-fast 启动校验 (纯函数, 无 DB / 网络依赖)

describe("validateProductionEnv (M3 fail-fast)", () => {
  it("M3-0: 非 production 环境一律放行", () => {
    assert.deepEqual(validateProductionEnv({ NODE_ENV: "development" }), []);
    assert.deepEqual(validateProductionEnv({ NODE_ENV: "test" }), []);
    assert.deepEqual(validateProductionEnv({}), []);
  });

  it("M3-1: production + AUTH_REQUIRED=false → fail", () => {
    const errs = validateProductionEnv({
      NODE_ENV: "production",
      AUTH_REQUIRED: "false",
      SCHEDULER_INPROCESS_OK: "true",
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /AUTH_REQUIRED/);
  });

  it("M3-2: production + 未设 SCHEDULER_BASE_URL 且未声明 INPROCESS_OK → fail", () => {
    const errs = validateProductionEnv({
      NODE_ENV: "production",
      AUTH_REQUIRED: "true",
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /SCHEDULER_BASE_URL/);
    assert.match(errs[0], /SCHEDULER_INPROCESS_OK/);
  });

  it("M3-3: production 同进程模式 + 显式 INPROCESS_OK → 通过", () => {
    const errs = validateProductionEnv({
      NODE_ENV: "production",
      AUTH_REQUIRED: "true",
      SCHEDULER_INPROCESS_OK: "true",
    });
    assert.deepEqual(errs, []);
  });

  it("M3-4: production 拆服务但缺 SCHEDULER_API_KEY → fail", () => {
    const errs = validateProductionEnv({
      NODE_ENV: "production",
      AUTH_REQUIRED: "true",
      SCHEDULER_BASE_URL: "http://scheduler:4000",
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /SCHEDULER_API_KEY/);
  });

  it("M3-5: production 拆服务 + SCHEDULER_API_KEY 过短 → fail", () => {
    const errs = validateProductionEnv({
      NODE_ENV: "production",
      AUTH_REQUIRED: "true",
      SCHEDULER_BASE_URL: "http://scheduler:4000",
      SCHEDULER_API_KEY: "shortkey",
    });
    assert.equal(errs.length, 1);
    assert.match(errs[0], /长度 <16/);
  });

  it("M3-6: production 拆服务 + 完整配置 → 通过", () => {
    const errs = validateProductionEnv({
      NODE_ENV: "production",
      AUTH_REQUIRED: "true",
      SCHEDULER_BASE_URL: "http://scheduler:4000",
      SCHEDULER_API_KEY: "k".repeat(32),
    });
    assert.deepEqual(errs, []);
  });

  it("M3-7: production 多项错误同时报", () => {
    const errs = validateProductionEnv({
      NODE_ENV: "production",
      AUTH_REQUIRED: "false",
      SCHEDULER_BASE_URL: "http://scheduler:4000",
    });
    assert.equal(errs.length, 2);
    assert.ok(errs.some((e) => /AUTH_REQUIRED/.test(e)));
    assert.ok(errs.some((e) => /SCHEDULER_API_KEY/.test(e)));
  });
});
