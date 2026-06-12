// 测试启动 assert: DATABASE_URL 必须指向独立测试库, 防止误连 dev/prod.
//
// 历史教训: dev 和 test 共用同一个 DB 时, 测试 worker (e.g. w-D3a) 会通过
// SKIP LOCKED 抢走真实 dev outbox 行, 把 dev item 推到 stuck. 本断言把这种
// 误用挡在测试启动的第一行.
//
// 约定: 测试 DB 名必须以 _test / _e2e 结尾 (e.g. scheduler_test).
// 4 个 test 文件 (api.e2e / auth / drivers / multitenant) 顶部都要 import 此文件.

const url = process.env.DATABASE_URL ?? "";
const m = url.match(/\/([A-Za-z0-9_-]+)(?:\?|$)/);
const dbName = m?.[1] ?? "(unknown)";

if (!/_test$|_e2e$/i.test(dbName)) {
  console.error(
    `\n[FATAL] 测试库名校验失败: DATABASE_URL=${url}\n` +
    `        库名 "${dbName}" 不以 _test / _e2e 结尾, 拒绝执行测试.\n` +
    `        请在 .env.test 里把 DATABASE_URL 指向独立测试库 (e.g. scheduler_test),\n` +
    `        然后 npm run migrate:test 完成迁移.\n`,
  );
  process.exit(1);
}
