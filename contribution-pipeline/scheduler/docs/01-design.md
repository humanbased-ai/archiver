# 调度中心 · 设计文档

> 给参与开发 / 评审的工程师看。
> 总览(看图) → [`00-summary.md`](./00-summary.md);接口签名 → [`02-api.md`](./02-api.md)。
> 标 **[规划中]** 的部分尚未落地;其余反映当前代码现状。

---

## 1. 定位与边界

**调度中心 = 一个通用的任务流转引擎。**
只负责"任务在工位之间怎么流转、谁在做、谁超时、谁该重做",**不关心**"任务具体是什么内容、谁有资格做、被拒原因是什么"——这些都归业务层。

这是整套设计的**核心边界**,所有取舍都从这一条派生。

### 1.1 谁管什么

| 关注点 | 调度核心 | 业务层 | 前端 |
|---|:---:|:---:|:---:|
| 队列、租约、超时、路由、重试 | ✅ | | |
| 节点定义、Pipeline CRUD | ✅ | | |
| 历史 attempts、DLQ | ✅ | | |
| output **形状存储** | ✅ | | |
| output **语义解读** | | ✅ | ✅ |
| 用户、配额、批次 | | ✅ | |
| "谁能领下一份" | | ✅ | |
| 拒绝原因、用户反馈 | | ✅ | ✅ |
| 渲染、交互、提示 | | | ✅ |

### 1.2 目标 / 非目标

**目标**
- 一套统一机制调度**机器节点**和**人工节点**
- 数据中途任何环节挂掉都能恢复,不丢不重
- 加新节点 = 加一个 driver,不动调度核心
- 同一节点可挂多条 pipeline,每条 pipeline 自定义参数

**非目标(MVP 阶段不做)**
- 高吞吐(>1k QPS)/ 跨机房 / 多租户隔离
- 复杂权限模型
- 真正的多服务部署(代码层面分清,但单进程跑)
- 复杂工作流语法(子流程、并行 fork-join)

---

## 2. 核心概念

| 概念 | 说明 |
|---|---|
| **Pipeline** | 一张流程图模板。一行 = 一条 pipeline。 |
| **Step** | Pipeline 内的一个节点,含 `key`(pipeline 内唯一)、`nodeKey`(节点类型)、`params`(参数 / ui_schema / routes 等) |
| **Node Definition** | 节点类型的能力声明:`params_schema`、是否幂等、是否人工(`manual=true`)、默认超时与重试上限 |
| **Item** | 一条业务数据,带 `current_step` 和 `envelope`(payload + outputs + tags) |
| **Outbox** | 一张表,既当队列又当"在飞行"记录 |
| **Run** | 一次执行尝试,outbox 表的一行(`run_id` 是主键) |
| **Submission** | 业务层记录:某用户对某 (item, step) 的一次提交 |
| **Driver** | Worker 内具体实现,按 `params.source` 派发(同一节点类型可有多 driver) |

**易混淆**

- `nodeKey` vs `stepKey`:`nodeKey` 是**类型**,全局复用;`stepKey` 是**实例**,pipeline 内唯一(同一类型多次出现可写 `dedup#1`)
- `payload` vs `outputs`:`payload` 是 item 创建时带进来的原始数据,一般不变;`outputs[stepKey]` 是每步处理后写入的结果,下游可读
- **批次余额** vs **队列待领**:前者 `approved < target`(业务层),后者 `outbox.status = 'pending'`(调度层),**两者都满足才允许领新任务**

---

## 3. 总体架构

### 3.1 三层关系

```
┌──────────────────────────────────────────────┐
│  前端 (React)         看板 / 编辑器 / 表单    │
│  把语义翻译给用户(banner / 进度条)           │
└─────────────────────┬────────────────────────┘
                      │ HTTP
┌─────────────────────▼────────────────────────┐
│  业务层 (Business Layer)     /api/*          │
│  批次 / 配额 / 用户 / 资格                    │
│  通过 HTTP 调调度核心,不直读核心表            │
└─────────────────────┬────────────────────────┘
                      │ HTTP (同进程默认 inject;REMOTE 切换为真 fetch)
┌─────────────────────▼────────────────────────┐
│  调度核心 (Sched Layer)      /api/v1/*       │
│  流水线 / 队列 / 租约 / 路由 / 重试 / loopback │
│  不知道用户、批次,不解读 output 语义          │
└─────────────────────┬────────────────────────┘
                      ▼
              PostgreSQL (单库, 不同表分组)
```

**collect/review 走业务层**(依赖具体用户:谁来填、谁来审);**dedup/export 走调度核心 AutoWorker**(不依赖用户,自己拉队列就行)。

### 3.2 进程拓扑

- **backend**:1 个进程,内含 `business/`(业务)、`sched/`(调度)、`autoworker/`(自动节点) 三个模块
- **数据库**:1 个 PostgreSQL 实例,单 schema(public)

**当前是同进程默认形态**(部署最简、延迟最低、运维最省),但代码留好了拆服务开关——见 §13。

### 3.3 模块边界规则

- `business/` 可以调 `sched/outbox.ts` 完成"推进一步"
- `sched/` **不能** import `business/` 任何东西
- 共用 `db.ts` / `types.ts`,但 `sched/` 不读 `submissions` 表

---

## 4. 数据模型

### 4.1 表分组

```
调度层(纯流转)
  pipelines / node_definitions
       │
       ▼
     items ─── outbox ─── attempts
       │
       ├── dedup_keys
       └── dataset_records (成品)

业务层(配额 / 用户)
  batches / batch_items / submissions / api_keys
```

业务层 `batch_items.item_id` 关联调度层 `items.id`(同库时可强一致 FK;分库时改成软引用)。

### 4.2 关键表

#### `pipelines` — 流程图模板
```sql
task_id  UUID PK
name     TEXT
steps    JSONB  -- [{ key, nodeKey, params: { ui_schema, routes, ... } }]
layout   JSONB  -- ReactFlow 节点位置
```

#### `items` — 一条数据
```sql
id            UUID PK
task_id       UUID
current_step  TEXT          -- 'done' = 完成, 'stuck' = DLQ
envelope      JSONB         -- { payload, outputs, tags }
loop_counts   JSONB         -- 防循环死锁
```

#### `outbox` — 队列 + 在飞行
```sql
run_id       UUID PK
item_id      UUID
step_key     TEXT
node_key     TEXT
status       TEXT  -- pending | leased | done | failed
attempt      INT
scheduled_at TIMESTAMPTZ
expected_by  TIMESTAMPTZ    -- lease 过期时间, reconciler 看这个
leased_by    TEXT
```

**关键索引:**
```sql
-- 同一 (item, step) 同时只允许一个在飞行
UNIQUE (item_id, step_key) WHERE status IN ('pending','leased')

-- worker lease 走这个(部分索引: 体积只跟活跃任务数成正比)
INDEX (node_key, scheduled_at) WHERE status = 'pending'

-- reconciler 扫这个
INDEX (expected_by) WHERE status = 'leased'
```

#### `submissions` — 用户级提交记录
```sql
id          UUID PK
item_id     UUID
step_key    TEXT
user_id     TEXT
run_id      UUID
status      TEXT  -- claimed | submitted | returned
payload     JSONB
started_at  / finished_at  TIMESTAMPTZ

-- 同一用户对同一 (item, step) 只能有一条非 returned 的记录
UNIQUE (item_id, step_key, user_id) WHERE status <> 'returned'
```

#### 其它

- `attempts` — 每次执行结果(审计 / 历史)
- `dataset_records` — 成品库,UPSERT BY item_id
- `dedup_keys` — `(task_id, dedup_hash)` 唯一约束,字段级原子去重
- `batches` / `batch_items` — 业务层批次 / 配额
- `api_keys` — γ 模式 API 鉴权,sha256 入库

---

## 5. 核心机制

### 5.1 Outbox 队列模式

**入队**:每次 `items.current_step` 推进时,往 outbox 插一行 `(item, step, node, pending)`。

**领取(lease)**:
```sql
UPDATE outbox SET status='leased', leased_by=$worker, leased_at=now(),
       expected_by = now() + $leaseSeconds * interval '1 second'
WHERE run_id IN (
  SELECT run_id FROM outbox
   WHERE node_key = $nodeKey AND status='pending' AND scheduled_at <= now()
   ORDER BY scheduled_at
   FOR UPDATE SKIP LOCKED
   LIMIT $batchSize        -- 默认 1
)
RETURNING *
```

- `leaseSeconds` 由 worker 指定(默认 60s,范围 5~3600s)
- `FOR UPDATE SKIP LOCKED` 保证多 worker 并发**不会有两个领到同一行**

**完成(result)**(单事务):
1. 写 `attempts` 历史
2. outbox 行 status → done(或 failed)
3. 成功:`router.computeNextStep()` → 合并 outputs 到 `item.envelope`,推进 `current_step`,outbox 插下一步
4. 失败:看 `attempt` 是否到上限——没到就重新插 pending(指数退避),到了就 `current_step='stuck'`

### 5.2 故障恢复(Reconciler)

每 30s 扫一次:
```sql
SELECT * FROM outbox WHERE status='leased' AND expected_by < now()
```

在一个事务里:
1. **原 outbox 行 status → failed**,记 `attempts(outcome='timeout')`
2. **幂等节点 + 未超 maxAttempts**:**INSERT 新 outbox 行**(`attempt+1`,指数退避)
3. **非幂等 / 重试已用尽**:`item.current_step='stuck'`,记 `attempts(outcome='dlq')`

多 backend 实例并存时,用 `pg_try_advisory_xact_lock(9527)` 串行化。

### 5.3 路由(Router):output 是黑盒

`computeNextStep(step, output, item)` 决策顺序:

1. **`output._nextHint`**:driver 显式声明,优先级最高
2. **`step.routes`**:看 output 某字段命中 cases 就跳转
3. **`step.defaultNext`**:默认下一步
4. **结尾**:返回 `done`

```jsonc
{
  "on": "decision",
  "cases": {
    "duplicate": { "goto": "ingest", "maxLoops": 3 },
    "rejected":  { "goto": "ingest", "maxLoops": 3 },
    "approved":  "next"
  },
  "default": "next"
}
```

调度核心**不关心** `decision` 是什么意思,只看字符串匹配。所以同一个引擎可以跑「采集→去重→审核→入库」,也可以跑「OCR→翻译→人工校对→打分→入库」——完全靠 routes 配置驱动。

`RouteAction` 三种形式:`"next"` / `"done"` / `{ "goto": "translate", "maxLoops": 2 }`(超 `maxLoops` 走 default)。

### 5.4 loopback:回流到任务池

路由命中 `goto: ingest`:
1. `item.current_step = 'ingest'`,`loop_counts['ingest']++`
2. outbox 插新 pending run(新 runId)
3. **旧 runId 提交一定被拒**(`uniq_outbox_inflight` 唯一索引保证)

这条 item 立即重新进任务池,有资格的人(可能是原作者也可能是别人)再领,等于"新任务"。

### 5.5 dedup:字段级原子去重

- `dedup_keys (task_id, dedup_hash)` 是唯一约束
- AutoWorker 把指定字段拼起来算 SHA-256,`INSERT ON CONFLICT DO NOTHING`
- 命中 → output `{ decision: "duplicate", deduped: true, hash }`
- 未命中 → output `{ decision: "keep", deduped: false }`
- **loopback 时**:同一 item 的旧 hash 先 DELETE,让它能"换数据再竞争"

### 5.6 Driver Registry(P1)

autoworker 是**瘦循环**,只负责 lease + 派发 + 上报;具体节点逻辑封装为 driver。

```
src/drivers/
├── registry.ts      Driver 接口 + register / pickDriver / autoNodeKeys
├── _client.ts       schedPost / notifyBusinessResult (透明 inject vs HTTP)
├── dedup.ts         内置:字段级去重
├── export.ts        内置:成品入库
├── sandbox-js.ts    内置:ingest source=script 的 node:vm 执行 (dev/staging)
└── http.ts          通配 (nodeKey="*"):params.driver=http 转发到外部 worker
```

**接口**:
```ts
interface Driver {
  name: string;
  nodeKey: string;       // 精确匹配; "*" 通配, 在精确匹配后兜底
  enable?(job): boolean; // 二级筛选, 同 nodeKey 多 driver 按 source / driver 字段派发
  handle(job): Promise<DriverResult>;
}
```

**加新自动节点 = registerDriver({...}) 一处**,autoworker 一行不改。

**HTTP driver 让异构 worker 0 改调度**:节点配 `{ driver: "http", url: "https://py-worker:8080/run" }`,Python/Go 等任意语言 expose 一个 endpoint 即可接活。生产开 SSRF allowlist(`SANDBOX_URL_ALLOWLIST` env)。

**沙箱安全分级**:
| 场景 | 实现 | 隔离强度 |
|---|---|---|
| dev / 受信脚本 | `sandbox-js.ts` (node:vm + timeout + 受限 globals) | 仅 CPU 时间;脚本 OOM 会拖垮进程 |
| 生产 / 租户脚本 | HTTP driver → 外置 sidecar(gVisor / Firecracker microVM) | 进程 + 内存 + 文件系统 + 网络 cgroup |

→ 生产**禁用** `sandbox-js`,改走 `http` driver 转发到沙箱服务。

### 5.7 人工节点:走同一套 outbox

人工和机器在 outbox 里**同等对待**,差异只在"谁来 lease"。以采集为例:

1. Item 推进到 `current_step=collect`,outbox 出现 `(item, collect, pending)`
2. 张三打开采集页 → `GET /api/collect/list?userId=zhangsan`
   业务层从 outbox 找 pending,**剔除张三在 submissions 里已 submitted 的**
3. 张三 claim → 业务层在 submissions 写 `(item, collect, zhangsan, claimed)`,同时调 sched 把 outbox 改 leased(`leased_by="user:zhangsan"`)
4. 张三提交 → submissions.status=submitted,sched/result → outbox done,推进下一步

**为什么 manual 也走 outbox?**
统一一套 lease/result,sched 不必为 manual 单独写一份;reconciler 也能自然回收"用户开了页面没提交"的情况。

### 5.8 用户去重(业务规则)

约束:同一用户对同一 (item, step) 不能重复提交。
靠 `submissions` 上的部分唯一索引:claim 时 `INSERT ... ON CONFLICT DO NOTHING`,冲突就告诉前端"你已经做过了"。

**为什么放 business/ 而不是 sched/?**
sched 不应该感知"用户"这个概念。"谁能领、能不能重复"是业务策略。

---

## 6. 拒绝原因的流转

> **业务层要感知"哪个任务因为什么被拒",但调度核心不应该知道"拒绝"这个词。**

### 6.1 通路图

```
                    ┌──────────────────────┐
                    │   output (一坨 JSON)  │   ← 调度核心眼里的黑盒
                    └────────────┬─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        attempts 表       envelope.outputs    /result 返回值
        (审计 / 历史)     (当前快照,给 UI)   (即时,给业务层)
```

### 6.2 两条写入路径

| 拒绝来源 | 写入方 | output 内容示例 |
|---|---|---|
| 自动去重 | AutoWorker → `/result` | `{ decision: "duplicate", deduped: true, hash: "abc123" }` |
| 人工审核 | 业务层 → `/result` | `{ decision: "rejected", reason: "事实有出入" }` |

### 6.3 业务层 / 前端怎么读

- **即时**:业务层调 `/result` 时已经知道 nextStep,同步发通知/记账
- **快照**:前端读 `item.envelope.outputs[*]`,banner 基于此(撞重指纹 / 退回理由)
- **审计**:查 `attempts` 表分析"哪个用户被拒最多"

> 调度核心**不需要**单独的 `/why-rejected` 接口——拒绝原因天然是 output 的一部分。

---

## 7. 被拒后的"任务池"模型

```
被拒 (output.decision = duplicate / rejected)
   │
   ▼
调度核心按 routes.cases.* → goto: ingest
   │
   ▼
item.current_step = ingest, outbox 写新 pending run (新 runId)
   │  ── 此刻 item 已重新进入"任务池" ──
   ▼
业务层 /collect/tasks 查询: 池中所有可领项 ∩ 用户配额 ∩ 批次余额
   │
   ▼
有资格的用户再领, 等于"新任务"
```

**关键不变量**

1. 重领即新 runId → 旧 runId 提交一定被拒(`uniq_outbox_inflight` 索引天然保证)
2. 是否还能再做,取决于**两层余额**:
   - 批次余额(业务层):`approved < target`
   - 队列待领(调度层):outbox 有 pending
3. 二者**必须同时满足**才能领新任务

> 当前同一份被拒 item 原作者还能再领;**建议**改成不行(过滤掉 `submissions` 中已 submitted 的 item),提高重做有效性,也更公平。

---

## 8. 接口设计(高层)

完整签名 / 错误码 / curl 示例 → [`02-api.md`](./02-api.md)。

### 8.1 调度核心(给 worker / 业务层)

| 接口 | 用途 |
|---|---|
| `POST /api/v1/queue/:nodeKey/lease` | `{ workerId, batchSize=1, leaseSeconds=60 }` → `{ jobs: [...] }` |
| `POST /api/v1/queue/run/:runId/claim` | 看板"领取这条" |
| `POST /api/v1/queue/lease/:runId/heartbeat` | 续租 |
| `POST /api/v1/queue/lease/:runId/release` | 主动放回 |
| `POST /api/v1/result` | 提交结果(单事务推进) |
| `POST /api/v1/dedup/check` | 字段级原子去重 |
| `POST /api/v1/dataset/records/save` | 成品入库 |
| `GET  /api/v1/admin/queue` / `stuck` / `replay` | 监控与排障 |

### 8.2 业务层(给前端)

```
GET    /api/collect/list?userId=...         # 列表(已剔除 userId 做过的)
POST   /api/collect/:itemId/:stepKey/claim  # 认领
POST   /api/collect/:itemId/:stepKey/submit # 提交
POST   /api/collect/:itemId/:stepKey/release # 放弃 (status=returned)

GET    /api/review/list
POST   /api/review/:itemId/:stepKey/decide  # { decision: 'approve'|'reject' }
```

### 8.3 横切中间件

- **API key 鉴权**(γ 模式):sha256 入库,`X-Api-Key` header,本地默认关 (`AUTH_REQUIRED=false`),inject 时用 `INTERNAL_KEY` 直通
- **Idempotency-Key**:body sha256 比对,24h TTL,带 1% 概率 GC
- **Request-Id**:`@fastify/request-context` (AsyncLocalStorage) 贯穿同步入口和异步副作用,grep 一行复盘整链路

---

## 9. 节点配置形态

```jsonc
{
  "key": "collect",
  "nodeKey": "manual_input",     // 指向 node_definitions
  "params": {
    "ui_schema":     { "type": "object", "properties": { ... } },  // 前端表单
    "output_schema": { "type": "object", "properties": { ... } },  // 这步产出形状
    "routes":        { "on": "decision", "cases": { ... } }
  }
},
{
  "key": "translate",
  "nodeKey": "translate",
  "params": {
    "source": "openai",            // 指定用哪个 driver
    "prompt": "Translate to English: {{outputs.collect.text}}",
    "model": "gpt-4o-mini"
  }
}
```

`ui_schema` / `routes` / `output_schema` 都放 `pipelines.steps[i].params`,不放 `node_definitions`。
- `node_definitions` 只描述能力("接受哪些 params")
- 具体配置一对一跟在 pipeline 上 — 改 pipeline 不污染全局节点表

---

## 10. 失败与边界处理

### 10.1 失败处理表

| 场景 | 处理 |
|---|---|
| Worker 崩了 / 网络断 | lease 过期 → reconciler(每 30s)收回 → 重新 pending |
| Worker 报 retryable=true | attempts 记录,outbox 重新 pending,attempt+1,指数退避 |
| Worker 报 retryable=false / 超 maxAttempts | outbox failed,`item.current_step='stuck'` |
| 同 (item, step) 重复入队 | `uniq_outbox_inflight` 拒绝 |
| Pipeline 修改影响在飞行任务 | save 检测到 (stepKey, nodeKey) 与新 steps 冲突 → 409 `INFLIGHT_STEPS_CONFLICT` |
| 用户重复 claim/submit | submissions 唯一索引拒绝 |
| Item 永远卡在某步 | stuck 流程,前端可视化,人工介入或 replay |
| 路由配置死循环 | `loop_counts` 累计超阈值进 stuck |

### 10.2 一致性

| 类型 | 接口 |
|---|---|
| **强一致**(决策用) | `/queue/:node/lease` / `/result` / `/collect/:id/claim` |
| **最终一致**(展示用) | 看板轮询(1.5s) / `/admin/queue` 快照 |

`/result` 是事务性的:`sql.begin` 包住 写 attempts → 改 outbox → 改 items → 写下一步 outbox。**全成功或全回滚**。

---

## 11. 关键设计决策

| 决策 | 选择 | 备选 | 理由 |
|---|---|---|---|
| **队列实现** | DB 表(outbox) | Kafka / Redis | 单库事务即可保证一致性,运维简单 |
| **领活机制** | Pull(worker 主动 lease) | Push | Pull 天然支持反压,worker 慢了不会被淹 |
| **领取粒度** | 单条 lease(默认 1) | 批量 | 见 §11.1 |
| **进程拓扑** | 单进程模块化 | 三服务拆分 | MVP 需要的是代码隔离,不是部署隔离;预留拆服务开关,见 §13 |
| **manual 节点** | 走 outbox | 走并行表 | 统一一套接口,reconciler 自动覆盖"用户开页面没提交" |
| **节点配置** | `pipelines.steps[i].params` | `node_definitions` 加列 | 同一节点类型可被多 pipeline 复用且配置不同 |
| **业务去重** | 部分唯一索引 | 应用层 SELECT-then-INSERT | 索引兜底强一致,并发下不会被绕过 |
| **路由优先级** | nextHint > routes > defaultNext | 全靠静态 routes | nextHint 让 driver 在运行时判断分支,灵活性更高 |
| **拒绝原因记录** | 当 output 字段存 attempts/envelope | 单独 rejections 表 | 拒绝是 output 的一种,不破坏黑盒原则 |

### 11.1 单条 lease vs 批量 lease

MVP 选**单条**。批量(一次拉 N 个,内存队列消费)虽然吞吐更高,但成本不匹配。

| 维度 | 单条 | 批量 |
|---|---|---|
| DB 压力 | 每 job 一次 SELECT FOR UPDATE | QPS 降为 1/N |
| 吞吐上限 | 受 round-trip 限制(数百/秒) | 数千/秒可达 |
| 公平性 | 多 worker 间天然均衡 | 一把抓 N 条,其他 worker 易空转 |
| 故障爆炸半径 | 挂掉回收 1 个 | 挂掉一批都得等过期 |
| lease 续约 | 单 job 预估即可 | 必须按整批耗时算,通常需 heartbeat |
| 关停语义 | 干完当前 job 优雅退出 | 要么放弃整批,要么排空 |

**接口已支持 `batchSize` 参数,默认 1**。三条同时满足才值得真上批量:**单 job < 50ms** + **DB QPS 已是瓶颈** + **团队愿意加 heartbeat**。切换时只动 `outbox.ts` 一个文件。

---

## 12. 可观测性

MVP 阶段:
- **结构化日志**(JSON):每个 lease / result / 推进 / 失败一条
- **Request-Id 贯穿**:同步入口和 AutoWorker 异步副作用同 ID,排障能 grep 一行看完
- **关键 SQL 视图**(后续加):每 nodeKey 的 pending / leased 数,各 pipeline 的 stuck 列表,平均处理时长(从 attempts 算)

短期不接 Prometheus / OpenTelemetry,先用日志看清楚。

---

## 13. 演进路径

### 13.1 拆服务开关(已留)

代码里 `business/autoworker` 调度核心都通过 `schedPost(...)`:

```ts
const REMOTE = process.env.SCHEDULER_BASE_URL?.replace(/\/$/, "");
async function schedPost(path, body) {
  if (REMOTE) return fetch(`${REMOTE}/api/v1${path}`, { ... }); // 真 HTTP
  return appRef.inject({ url: `/api/v1${path}`, ... });          // 进程内 inject
}
```

切换步骤:
1. 同一份代码两个部署单元,启动入口不同
2. 业务实例:`SCHEDULER_BASE_URL=http://sched:4000`
3. 调度实例:`BUSINESS_BASE_URL=http://biz:4001`(autoworker 通知回调用)
4. 各发一把 API key,设 `AUTH_REQUIRED=true`
5. **代码一行不改**

### 13.2 拆服务后需要单独留意

| 事项 | 处理 |
|---|---|
| 没有跨服务事务 | 设计已是 idempotent;业务重试 `schedPost` 返回 `applied: false` 时仍会 UPDATE submissions,状态收敛 |
| 数据库怎么分 | 同库分 schema 最省事;同库时 `batch_items.item_id` 还能 FK 引用 `items.id` |
| API 协议向后兼容 | 给 `/api/v1/...` 加 `/v2/...`,保留 v1 一段时间 |
| 认证 | `X-Api-Key` 加在 fetch 上,γ 模式天然支持 |
| autoworker 跟谁 | 跟**调度**一起更合理:消费调度队列,只在 dedup→duplicate 时回调业务 |

### 13.3 什么时候真的要拆

- 业务团队和调度团队**人**分开了
- 调度核心需要独立扩容(别的产品线也要用)
- 业务跑 GC 影响调度延迟稳定性
- 监控/告警维度需要分开(SLO 不同)

**以下情况都不用拆**,继续单进程更香:只为"看起来更微服务"、想用代码层面已经分了的耦合"换一种隔离手段"、想用不同语言写两端(那时再拆,顺便重写)。

### 13.4 未来扩展信号

- AutoWorker 多开实例(SKIP LOCKED 天然支持)
- outbox 拆库 / 按 task_id 分区
- 轮询换 LISTEN/NOTIFY(接口形状不变)
- attempts 历史归档(按 finished_at 分区)
- 多租户隔离、流程图版本钉死、限流、Prometheus 监控

---

## 14. 设计原则

| 原则 | 在本项目里的具体体现 |
|---|---|
| **高内聚** | 调度核心只做流转,业务层只做配额,前端只做交互 |
| **低耦合** | 业务层用 HTTP 调调度核心,不读核心表;调度核心不知道用户、批次 |
| **配置驱动** | routes / params_schema 让同一引擎跑不同流程,不改代码扩流水线 |
| **黑盒输出** | output 是 JSON,调度只看路由命中,不解读语义 |
| **失败优先** | lease 超时 → reconciler 收回,重试有上限,兜底进 DLQ |
| **幂等优先** | 自动节点必须幂等(`node_definitions.idempotent=true`),才允许超时重试 |
| **状态显式** | items / outbox / attempts 三张表把"现在/排队/历史"分得清清楚楚 |

### 反模式(不要做)

| 反模式 | 为啥不要 |
|---|---|
| 调度核心新增 `rejections` 表 | 拒绝是 output 的一种,attempts 已经存了 |
| 调度核心暴露 `/why-rejected` | 语义解读属于业务层 |
| 业务层直读 outbox/attempts | 破坏分层,必须走 HTTP |
| "退回任务池"做成单独动作 | 它是 routes 的副产品 |
| 把"用户重做次数"塞进调度核心 | maxLoops 已有,用户层面策略归业务 |

---

## 附录:文档索引

- [00-summary.md](./00-summary.md) — 总览(图解 + 比喻,给非工程读者)
- **01-design.md** — 本文件
- [02-api.md](./02-api.md) — 接口使用说明 + curl 示例
- [03-testing.md](./03-testing.md) — 测试用法
- [06-node-design.md](./06-node-design.md) — 功能节点协议 / 版本 / 运行方式 / 管理后台设计
- [openapi.yaml](./openapi.yaml) — OpenAPI 3.1 spec
- [api-tester.html](./api-tester.html) — Swagger UI 调试器
