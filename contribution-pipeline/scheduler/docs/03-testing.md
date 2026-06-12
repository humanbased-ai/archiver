# 调度中心 - 接口测试指南

> 一份"开箱即跑、覆盖全行为"的测试方案。
> 包括交互式 API 调试器 + 自动化 e2e 测试套件。

---

## 一、两种测试方式

| 场景 | 工具 | 路径 |
|---|---|---|
| 手动调单个接口、看 schema、试参数 | **Swagger UI 网页** | `scheduler/docs/api-tester.html` |
| 自动跑全量行为校验、CI / 上线前回归 | **Node 内置 e2e 套件** | `scheduler/backend/test/api.e2e.test.ts` |

---

## 二、Swagger UI 调试器

### 启动

后端跑起来 (`cd scheduler/backend && npm run dev`),然后用任意静态 server 在 `scheduler/docs/` 跑一下:

```bash
cd scheduler/docs
python3 -m http.server 5180   # 或 npx http-server -p 5180
```

打开 <http://localhost:5180/api-tester.html>。

> 直接 file:// 打开会被 CORS 拦,必须走 http server。

### 用法

1. 找到要测的端点(按 tag 分组:Pipeline / Item / Queue / Lease / Result / …)
2. 点 **Try it out** → 改参数 → **Execute**
3. 下方面板看 status / response / curl 命令
4. 翻到 Schemas 区 → 看到 `Pipeline / StepConfig / Envelope / Job / Attempt` 的字段定义

### 数据来源

`scheduler/docs/openapi.yaml` —— 完整 OpenAPI 3.1 spec。也可导入 Postman / Insomnia / Bruno。

---

## 三、自动化 e2e 套件

### 启动

```bash
cd scheduler/backend
npm run dev    # 终端 1: 后端跑起来
npm test       # 终端 2: 跑测试
```

或者要更详细的 spec 风格输出:

```bash
npm run test:reporter
```

### 它做了什么

直接打 HTTP 到 `http://127.0.0.1:4000`,不绕中间件,不 mock 数据库。每条测试自建独立 pipeline,跑完 `DELETE /pipelines/:id` 级联清理,**不污染**已有 demo 数据。

### 测试矩阵

按调用栈从浅到深分 17 个场景组,共 **50+ 个用例**。下表是用 QA 视角列的覆盖清单:

| 组 | 主题 | 关键用例 |
|---|---|---|
| **A** | 元数据 / Smoke | health 200 · /nodes 含 ingest/translate/review/export |
| **B** | Pipeline CRUD | create 200 · 缺字段 4xx · 列表含创建项 · save 改名 · 不存在 id 404 · delete 级联 |
| **C** | Item ingest & 查询 | create 200 · 不存在 taskId 404 · 非法 startStep 400 · 空 pipeline 400 · 详情含 inflight/history · /tasks/:id/items 列表 |
| **D** | 队列 lease | 不存在 nodeKey 返回空 jobs · lease 一条 · batchSize > pending 取实际数 · 并发 lease 不双发 |
| **E** | lease 管理 | claim 200 · 重复 claim 409 · release 持有者 200 · release 错 worker 409 · heartbeat 续约 · 错 worker heartbeat 409 |
| **F** | /result 成功路径 | 推进默认下一步 · nextHint=done 终止 · 重复提交 applied=false · 不存在 runId 404 · lease 过期 409 |
| **G** | /result 失败 / 重试 / DLQ | retryable 创建新 attempt+1 · 用尽 → stuck · 不可重试立即 stuck |
| **H** | 路由 / loopback | routes.cases 命中 approved → 跳 export · rejected → goto translate, loop_counts 增加 · 超 maxLoops → stuck |
| **I** | Dedup | 第一次 kept · 同 hash 第二次 kept=false · 同 item 换 hash 重新 kept · 非 UUID 4xx |
| **J** | Dataset records | 首次 save · 同 itemId 再 save 仍只一条 (UPSERT) |
| **K** | Admin | /admin/queue 计数 · /admin/stuck 只返回 stuck · replay 重置 step + 新 outbox · 非法 step 400 |
| **L** | save 与 in-flight 冲突 | 删除 in-flight step 409 · 保留 (key, nodeKey) 200 |
| **M** | 看板聚合 | 列数 = pipeline.steps · ingest 列含刚投递 item |
| **N** | 端到端 happy path | ingest → translate → review(approved) → export → done · envelope 累积 4 个 outputs |
| **O** | 同 pipeline 多 item 并行 | 5 条同时 lease 互不串扰 · 多 worker 抢同一 step 不双发 |
| **P** | 多 pipeline 并行 | 3 条独立 pipeline 同时 happy path,互不干扰 |
| **Q** | retry 退避按节点配置生效 | baseBackoffMs=200, retryAt 至少 200ms 之后 |

### 跑某一组

```bash
# 只跑 H 组 (路由 / loopback)
npx tsx --test --test-name-pattern="^H" test/api.e2e.test.ts

# 只跑 happy path
npx tsx --test --test-name-pattern="^N1" test/api.e2e.test.ts
```

### 添加新测试

`backend/test/helpers.ts` 已经准备好常用工具:

```ts
import {
  createPipeline, deletePipeline,
  ingest, leaseOne, postResult,
  buildSamplePipeline, uniqueId,
} from "./helpers.ts";

describe("R. 你的新主题", () => {
  let taskId = "";
  before(async () => {
    taskId = await createPipeline(buildSamplePipeline().steps as any);
  });
  after(async () => {
    await deletePipeline(taskId);
  });

  test("R1. 你的新场景", async () => {
    const ing = await ingest(taskId, { foo: "bar" });
    const job = await leaseOne("ingest", "test-worker");
    const r = await postResult({ runId: job!.runId, status: "success" });
    assert.equal(r.body.applied, true);
  });
});
```

约定:
- 描述用 **`<组字母><序号>. <中文场景>`**,这样 `--test-name-pattern` 可以精准筛
- 每个 describe 自带 `before/after` 隔离 fixture
- 不要 sleep 太久(>1s 仅在确实需要的地方,如 lease 过期)

### 已知慢点

- **F5 lease 过期** 必须等 5.5s(后端 `leaseSeconds` 最小值是 5)。整套 ~ 30~50s。
- **G2 用尽重试** 跑 attempt 1 + attempt 2 的退避;helpers 默认 `baseBackoffMs=1`,可控。

### CI 集成

```yaml
# .github/workflows/test.yml (示例)
- run: docker compose up -d postgres
- run: cd scheduler/backend && npm ci && npm run migrate && npm run seed && npm run dev &
- run: cd scheduler/backend && npx wait-on http://127.0.0.1:4000/health
- run: cd scheduler/backend && npm test
```

---

## 四、调试小贴士

### 测试失败怎么排查?

1. **看 stderr 错误信息** —— 测试断言失败会指出具体期望值
2. **打开看板** —— 浏览器开 <http://localhost:5173>,看 item 卡在哪
3. **API 流水浮窗** —— 之前给前端加的右下角"API 调用流水"也会记录测试发起的请求 (因为都是同一个 backend),配合时间线可以看到全过程
4. **直接查表** ——
    ```bash
    psql $DATABASE_URL -c "SELECT * FROM outbox WHERE status='pending' ORDER BY scheduled_at;"
    psql $DATABASE_URL -c "SELECT step_key, outcome, count(*) FROM attempts GROUP BY 1,2;"
    ```

### 测试残留怎么清?

正常情况下 `after` 钩子会 `DELETE /pipelines/:id`,级联删除 items / outbox / dedup_keys / dataset_records。如果测试中途崩掉留下脏数据,可手动:

```sql
-- 清掉所有 e2e 命名前缀的 pipeline
DELETE FROM pipelines WHERE name LIKE 'e2e-%';
```

`attempts` 表没 FK,会保留历史,正常。

---

## 文档索引

| 文件 | 内容 |
|---|---|
| [00-summary.md](./00-summary.md) | 总览(图解 + 比喻) |
| [01-design.md](./01-design.md) | 设计细节(分层 / 数据模型 / 机制 / 决策) |
| [02-api.md](./02-api.md) | 接口使用说明 |
| **03-testing.md** | **本文件: 接口测试指南** |
| [openapi.yaml](./openapi.yaml) | OpenAPI 3.1 spec |
| [api-tester.html](./api-tester.html) | Swagger UI 调试器 |
