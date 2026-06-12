# Scheduler — Pipeline 调度中心

最小可用的标注流水线调度系统。先看 [`docs/00-summary.md`](./docs/00-summary.md)(总览),再看 [`docs/01-design.md`](./docs/01-design.md)(设计细节)。
独立于 `prototype/`,可单独运行。

```
scheduler/
├── backend/          Fastify + Postgres,4 组件 (Dispatcher/Receiver/Reconciler/Router) — TypeScript 参考实现
├── backend-py/       同一套接口的 Python/FastAPI 1:1 实现 (推荐 dev/测试入口)
├── worker-example/   通用节点 worker, 演示 ingest/translate/dedup/export 自动节点
├── web/              ReactFlow 可视化编辑器 + 运行监控
└── docker-compose.yml  仅 Postgres
```

两套后端共存:HTTP 接口 / DB schema / SQL 迁移 / e2e 测试同形态;前端 / worker 切哪个无感。
两端的 `ExternalWorkerNode` 基类已对齐(lease/heartbeat/release/submitResult);worker_threads 隔离的 `SandboxWorkerNode` 因为是 Node 原生能力仍仅 Node 端有,Python 端 `sandbox_js` driver 通过 `tsx ../backend/src/sandbox-runner.ts` 一次性子进程跑 JS。详见 [`docs/09-python-backend.md`](./docs/09-python-backend.md) 与 [`backend-py/README.md`](./backend-py/README.md)。

## 一键体验 (4 个终端)

```bash
# 终端 1: Postgres
cd scheduler
docker compose up -d
```

```bash
# 终端 2: 后端 — 任选 Python 或 Node, 两者等价
# A. Python (推荐)
cd scheduler/backend-py
cp .env.example .env
uv sync
uv run scheduler-migrate                  # 建表 (跑 ../backend/migrations/*.sql)
uv run scheduler-seed                     # 注册节点 + 三个示例 pipeline
uv run scheduler-serve                    # uvicorn http://localhost:4000

# B. Node (参考实现, 也可作为 sandbox-runner 子进程提供方)
cd scheduler/backend
cp .env.example .env
pnpm install
pnpm migrate
pnpm seed
pnpm dev
```

```bash
# 终端 3: 自动节点 worker
cd scheduler/worker-example
pnpm install
pnpm dev                       # 处理 ingest / translate / dedup / export
```

```bash
# 终端 4: 前端
cd scheduler/web
pnpm install
pnpm dev                       # 浏览器打开 http://localhost:5173
```

## 玩法

### Pipeline 编辑(ReactFlow)

打开 http://localhost:5173 → 右上选择 **`示例: 翻译流水线`** → 切到 **Pipeline 编辑** Tab:

- 左侧节点面板:**拖拽** `翻译/审核/导出/...` 到画布
- 节点之间**连线** = 默认下一站
- 点击节点 → 右侧编辑 `params` (JSON) 和 `routes` (路由规则)
- 顶部输入名称 → **保存**

### 运行 + 监控

切到 **运行/监控** Tab:

- 左栏:输入 `payload` JSON → 点 **▶ 启动一个 item** → 看队列计数 / item 卡片
- 中间画布:item 当前所在节点会**蓝色脉动**;边线动画
- 右栏:点击 item 看 `envelope` + 历史 + 人工节点(审核 ✓/✗ 按钮)
- 卡住的 item (DLQ) 可一键 **重放到任意阶段**

## 三类有趣的演示

### 1. 自动节点流水

ingest → translate → review → export,review 用前端按钮 ✓ → item 推到 export → done。

### 2. 路由回退 (loopback)

review 点 ✗ → router 命中 `routes.cases.rejected = { goto: "translate", maxLoops: 2 }` → item 回到 translate 重跑。
连续打回 2 次后 → `loopCount > maxLoops` → item 进 `stuck`(DLQ)。

### 3. 失败 + 自动重试

让 worker 抛错(改 worker.ts 的 handler 让 translate 抛 throw)→ Receiver 写 attempt:failed,
schedule_at 退避后重投。3 次失败后 item 进 `stuck`,前端可点 "重放到该阶段" 复活。

## 关键设计验证

实现里能直接看到的几个不变量:

| 不变量 | 体现 | 文件 |
|---|---|---|
| Item 状态 + outbox 必须同事务 | `sql.begin` 包住 update items + insert outbox | `backend/src/api.ts` 的 `/items` 和 `/result` |
| 同一 (item, step) 不能重复在飞 | partial unique index `uniq_outbox_inflight` | `backend/src/schema.sql` |
| 不幂等节点不自动重试 | reconciler 检查 `node.idempotent` | `backend/src/reconciler.ts` |
| 路由优先级:nextHint > routes > 默认 | router 纯函数 | `backend/src/router.ts` |
| 多调度器实例只跑一份 reconcile | `pg_advisory_lock` | `backend/src/reconciler.ts` |
| 人工节点和自动节点协议一致 | review/annotate 走同一 `/lease` `/result` | `web/src/ItemRunner.tsx` |

## 端点速查

| Method | Path | 用途 |
|---|---|---|
| POST | `/api/v1/items/create` | 入数据 |
| GET | `/api/v1/items/:id` | 查单条状态 + 历史 |
| GET | `/api/v1/tasks/:taskId/items` | 列出某 pipeline 的 items |
| POST | `/api/v1/queue/:nodeKey/lease` | worker 拉队列 |
| POST | `/api/v1/queue/lease/:runId/release` | 回滚 lease (人工撤销) |
| POST | `/api/v1/queue/lease/:runId/heartbeat` | 续租 |
| POST | `/api/v1/result` | 上报结果 (Receiver) |
| GET | `/api/v1/pipelines` · `/pipelines/:id` | 列表 / 详情 |
| POST | `/api/v1/pipelines/create` | 新建 pipeline |
| POST | `/api/v1/pipelines/:id/save` | 覆盖 pipeline (替代 PUT) |
| DELETE | `/api/v1/pipelines/:id` | 删除 pipeline |
| GET | `/api/v1/nodes` | 列节点能力 |
| POST | `/api/v1/dedup/check` | 字段级原子去重 |
| POST | `/api/v1/dataset/records/save` | 最终产物 UPSERT |
| GET | `/api/v1/admin/queue` | 队列计数 |
| GET | `/api/v1/admin/stuck` | DLQ 列表 |
| POST | `/api/v1/admin/items/:id/replay` | DLQ 重放 |

## 不在 demo 范围

- 鉴权 / 多租户(MVP 后置)
- Prometheus 指标 / 熔断 / 限流(运维侧后置)
- Worker SDK(用 fetch/curl 即可)
- DAG / fan-out / fan-in
