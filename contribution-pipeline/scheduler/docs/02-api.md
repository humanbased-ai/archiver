# 调度中心 - 接口使用说明

> 一份"按生命周期讲怎么调"的接口手册。看完能从零搭起一条 pipeline,投递数据,串接节点 worker 直到产出落库。

- **Base URL**: `http://localhost:4000`
- **Content-Type**: `application/json`(全部接口都是)
- **路径前缀**: `/api/v1/...`(调度核心) · 业务层在 `/api/...`,**不在本文范围**
- 所有错误返回 `{ "error": { "code": "...", "message": "..." } }`,HTTP 状态码 4xx/5xx

---

## 一、一图理解全流程

```
                           ┌──────────────────────────────┐
                           │ ① 注册节点能力 (一次性 seed)  │
                           │   GET    /nodes              │
                           └──────────────────────────────┘
                                          │
                                          ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ② 建/改 pipeline (steps + routes 决定怎么跳)                │
   │   POST   /pipelines/create        创建                      │
   │   POST   /pipelines/:id/save      覆盖                      │
   │   GET    /pipelines               列表 / GET /:id 详情      │
   │   DELETE /pipelines/:id           删除 (item 一并 cascade)  │
   └────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ③ 投递数据 = 创建一个 item, 同时入第一个节点的 outbox      │
   │   POST   /items/create                                     │
   └────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ④ Worker 拉活 → 干活 → 提交 (周而复始, 直到 done/stuck)    │
   │   POST   /queue/:nodeKey/lease   按节点类型批量拉           │
   │   POST   /queue/run/:runId/claim 精准认领指定 run           │
   │   POST   /queue/lease/:runId/heartbeat  续租               │
   │   POST   /queue/lease/:runId/release    放回队列            │
   │   POST   /result                 提交成功/失败              │
   └────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ⑤ 内置工具节点的辅助接口 (按需调)                            │
   │   POST   /dedup/check            字段级原子去重             │
   │   POST   /dataset/records/save   最终产物入库               │
   └────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ⑥ 监控 / 看板 / 卡死重放                                   │
   │   GET    /tasks/:taskId/items                              │
   │   GET    /items/:id                                        │
   │   GET    /tasks/:taskId/kanban                             │
   │   GET    /tasks/:taskId/records                            │
   │   GET    /admin/queue                                      │
   │   GET    /admin/stuck                                      │
   │   POST   /admin/items/:id/replay                           │
   └────────────────────────────────────────────────────────────┘
```

---

## 二、名词 5 秒回忆

| 名词 | 是什么 |
|---|---|
| `taskId` | 一条 pipeline 的 ID(也叫 `pipelines.task_id`) |
| `itemId` | 一条数据实例 ID |
| `runId` | 一次执行的 ID(每次入 outbox 就生成一个新的) |
| `stepKey` | 节点在 pipeline 内的实例 key,**pipeline 内唯一** |
| `nodeKey` | 节点类型 key,**全局**,worker 拉队列就靠它 |
| `envelope` | item 随身行李 `{ payload, outputs[stepKey], tags }` |
| `output` | 这一步执行的结果,会被并入 `envelope.outputs[stepKey]` |
| `routes` | 配置驱动的跳转规则,见 §六 |
| `lease` | 租约——worker 拉到任务后的独占期 |

---

## 二·五 Idempotency-Key (创建/状态推进型 POST)

外部业务系统对接时,网络重试是常态。下列接口支持 `Idempotency-Key` header,
同 (tenantId, scope, key, body hash) 的二次请求会**重放**首次响应,不会重复落库:

- `POST /api/v1/items/create`
- `POST /api/v1/result`
- `POST /api/v1/pipelines/create`
- `POST /api/batches`

约定:

- key 由调用方生成 (建议 UUIDv4),长度 [8, 200],单次业务操作维度唯一
- 同 key + 同 body → 200 + 原响应体
- 同 key + **不同** body → `409 IDEMPOTENCY_HASH_MISMATCH` (典型误用,客户端 bug)
- **并发同 key 同 body** → 仅一个进入 handler,其余 `409 IDEMPOTENCY_IN_PROGRESS`(客户端串行重试 → 看到 `IDEMPOTENCY_IN_PROGRESS` 时退避后重发,等第一个完成后会变成"同 key + 同 body" 重放分支)
- 不同 tenant 同 key 互不影响 (PK 含 tenant_id)
- 缓存 24h 后过期;`pending` 占位 5 分钟未完成视为 stuck,可被新请求覆盖

> 严格并发去重已落地(preHandler 拿 PG `advisory_xact_lock(hashtext(tenant|key|scope))`,串行同 key)。

---

## 三、Pipeline 管理

### 3.1 列出节点能力

> 让前端编辑器知道有哪些节点类型可以拖。

```
GET /api/v1/nodes
```

**响应**
```json
{
  "nodes": [
    {
      "key": "ingest",
      "version": "1.0",
      "display_name": "采集 Ingest",
      "params_schema": { "type": "object", "properties": { ... } },
      "manual": false,
      "idempotent": true,
      "default_timeout_ms": 10000,
      "default_max_attempts": 3
    }
  ]
}
```

### 3.2 列出 / 查看 pipeline

```
GET /api/v1/pipelines              # 列表(含 step_count)
GET /api/v1/pipelines/:id          # 详情(完整 steps + layout)
```

### 3.3 创建 pipeline

```
POST /api/v1/pipelines/create
```

**Body**
```json
{
  "name": "示例: 翻译流水线",
  "steps": [
    { "key": "ingest",    "nodeKey": "ingest",    "params": { "source": "manual" } },
    { "key": "translate", "nodeKey": "translate", "params": { "model": "claude-haiku", "targetLang": "zh" } },
    {
      "key": "review", "nodeKey": "review",
      "params": { "rubric": "default" },
      "routes": {
        "on": "decision",
        "cases": {
          "approved": "next",
          "rejected": { "goto": "translate", "maxLoops": 2 }
        }
      }
    },
    { "key": "export", "nodeKey": "export", "params": { "format": "json" } }
  ],
  "layout": {
    "positions": {
      "ingest":    { "x": 100, "y": 200 },
      "translate": { "x": 360, "y": 200 },
      "review":    { "x": 620, "y": 200 },
      "export":    { "x": 880, "y": 200 }
    }
  }
}
```

`StepConfig` 字段:
| 字段 | 必填 | 说明 |
|---|---|---|
| `key` | ✓ | pipeline 内唯一(允许同 nodeKey 多次出现, 用 `dedup#1` / `dedup#2`) |
| `nodeKey` | ✓ | 必须存在于 `node_definitions` |
| `nodeVersion` | | 默认取最新版 |
| `label` | | 看板/编辑器显示名 |
| `params` | | 透传给 worker 的 `job.params` |
| `routes` | | 见 §六 |
| `policy` | | `{ timeoutMs, maxAttempts, baseBackoffMs }`,覆盖节点默认值 |

**响应**:整条 pipeline,包括 `task_id`(后续 ingest 用)。

### 3.4 覆盖 pipeline(save)

```
POST /api/v1/pipelines/:id/save
```

Body 字段都是可选的(`name` / `steps` / `layout`)。**如果改 steps,所有 in-flight 的 (stepKey, nodeKey) 必须保留**,否则返回 409:

```json
{
  "error": {
    "code": "INFLIGHT_STEPS_CONFLICT",
    "message": "...",
    "conflicts": [{ "itemId": "...", "stepKey": "translate", "nodeKey": "translate" }]
  }
}
```

要么先等这些 item 跑完,要么 `replay` 把它们挪到不冲突的步骤再改。

### 3.5 删除 pipeline

```
DELETE /api/v1/pipelines/:id
```

级联删除关联的 `items / outbox / attempts / dedup_keys / dataset_records / batches`。

---

## 四、投递数据 / 查询实例

### 4.1 创建 item(ingest)

> 把一条数据放进 pipeline 的入口节点队列。

```
POST /api/v1/items/create
```

**Body**
```json
{
  "taskId": "<pipeline 的 task_id>",
  "envelope": {
    "payload": { "text": "Hello world" },
    "outputs": {},
    "tags": { "source": "manual" }
  },
  "startStep": "ingest"
}
```

- `envelope` 整体可省;`payload` 和 `outputs` / `tags` 都可以漏写
- `startStep` 默认 = `steps[0].key`,用得着的场景:外部已完成"ingest",直接从 `translate` 入队

**响应**
```json
{ "itemId": "uuid", "runId": "uuid" }
```

随即 `outbox` 里插一行 `pending`,等 worker 来领。

### 4.2 查 item 全貌

```
GET /api/v1/items/:id
```

**响应**
```json
{
  "item": { "id": "...", "current_step": "translate",
            "envelope": { "payload": {...}, "outputs": { "ingest": {...} }, "tags": {...} },
            "loop_counts": { "translate": 1 } },
  "inflight": [{ "run_id": "...", "node_key": "translate", "status": "pending", "attempt": 1, ... }],
  "history": [{ "id": 1, "step_key": "ingest", "outcome": "success", "output": {...}, "finished_at": "..." }]
}
```

`history` 按 `finished_at` 升序;前端"数据演化时间线"就是用这个重建的。

### 4.3 列出某 pipeline 的 items

```
GET /api/v1/tasks/:taskId/items
```

最近 200 条,按 `created_at DESC`。

### 4.4 看板聚合(per-step 计数 + 实例)

```
GET /api/v1/tasks/:taskId/kanban
```

返回每个 step 下当前停在该 step 的 item(已合并对应 `outbox.run`)。`done / stuck` 不在内。

---

## 五、节点 worker 怎么干活

### 5.1 拉活(批量,按节点类型)

> 自动节点的 autoworker、人工节点的浏览器实例,**走的都是这一条**。

```
POST /api/v1/queue/:nodeKey/lease
```

**Body**
```json
{ "workerId": "auto-worker-1", "batchSize": 5, "leaseSeconds": 60 }
```

| 字段 | 默认 | 范围 |
|---|---|---|
| `workerId` | 必填 | 任意字符串,后续 `release`/`heartbeat`/`result` 都靠它身份核对 |
| `batchSize` | 1 | 1 ~ 50 |
| `leaseSeconds` | 60 | 5 ~ 3600 |

底层 SQL:`UPDATE ... WHERE run_id IN (SELECT ... FOR UPDATE SKIP LOCKED LIMIT N)`,**多 worker 同时调不会拿到同一行**。

**响应**
```json
{
  "jobs": [
    {
      "runId":   "uuid",
      "itemId":  "uuid",
      "taskId":  "uuid",
      "stepKey": "translate",
      "nodeKey": "translate",
      "params":  { "model": "claude-haiku", "targetLang": "zh" },
      "envelope": { "payload": { "text": "Hello" }, "outputs": { "ingest": {...} }, "tags": {...} },
      "ctx": { "runId": "...", "attempt": 1, "deadline": "2026-05-06T08:00:00.000Z" }
    }
  ]
}
```

`jobs: []` = 当前队列为空,过段时间再问。

### 5.2 精准认领指定 run(看板"领取这条"按钮用)

```
POST /api/v1/queue/run/:runId/claim
```

Body `{ workerId, leaseSeconds }`。返回单 job 或 409 `ALREADY_CLAIMED`。

### 5.3 续租(长任务必备)

```
POST /api/v1/queue/lease/:runId/heartbeat
```

**Body** `{ "workerId": "...", "extendSeconds": 60 }`

把 `expected_by` 推到 `NOW() + extendSeconds`。失败返回 409 `LEASE_LOST`(被收回 / runId 不存在 / workerId 不匹配)。

> 经验:`leaseSeconds` 取"最坏情况下完成时长 × 1.5",再每 10s 心跳一次,比一开始就开特别长更稳。

### 5.4 主动放回(关页面、用户后悔)

```
POST /api/v1/queue/lease/:runId/release
```

**Body** `{ "workerId": "..." }`

把 leased → pending,清掉 lease 痕迹。失败返回 409 `LEASE_LOST`。

### 5.5 提交结果(成功 / 失败)

> **唯一**的"汇报"接口。一条事务里写 attempts、改 outbox、推进 envelope、入下一步队列。

```
POST /api/v1/result
```

**Body(成功)**
```json
{
  "runId": "uuid",
  "status": "success",
  "output": { "decision": "approved", "translatedText": "你好世界" },
  "nextHint": "export"
}
```

**Body(失败)**
```json
{
  "runId": "uuid",
  "status": "failed",
  "error": { "code": "MODEL_TIMEOUT", "message": "30s no response", "retryable": true }
}
```

| 字段 | 说明 |
|---|---|
| `runId` | 必填 |
| `status` | `success` / `failed` |
| `output` | 成功时附带,任意 JSON。**会作为 `envelope.outputs[stepKey]` 整体写入** |
| `error` | 失败时附带,`retryable` 默认 true |
| `nextHint` | 可选,**优先级最高**的跳转。可填 `done`/`stuck` 或某个 stepKey |

**响应(成功路径)**
```json
{ "ok": true, "applied": true, "nextStep": "export" }
```

**响应(成功但已无效:重复提交 / 非当前 lease)**
```json
{ "ok": true, "applied": false }
```

**响应(租约已过期,409)**
```json
{ "error": { "code": "LEASE_EXPIRED", "message": "租约已过期,请重新领取任务" } }
```

**响应(失败 → 还能重试)**
```json
{ "ok": true, "applied": true, "retryAt": "2026-05-06T08:00:01.234Z" }
```
内部按 `policy.baseBackoffMs * 2^(attempt-1)` 计算 `scheduled_at`。

**响应(失败 → 用尽重试,进入 stuck)**
```json
{ "ok": true, "applied": true, "dlq": true }
```
此时 `items.current_step = 'stuck'`,等管理员手动 `replay`。

---

## 六、路由 / loopback / 终态

调度核心算"下一步去哪"用的优先级:

1. **`nextHint`** 最高:worker 显式说去哪
2. **`routes`** 命中:取 `output[on]` 字符串值,匹配 `cases[value]`,否则用 `default`
3. 默认 = pipeline 顺序中下一个;如果当前是最后一个 → `done`

`RouteAction` 三种形式:
```json
"next"                                  // 顺序下一个
"done"                                  // 终态
{ "goto": "translate", "maxLoops": 2 }  // 跳到指定 step,loop_counts++ 用尽则 → stuck
```

注意:
- `loop_counts` 按"**当前 step**"计数(不是目标 step)
- 跳到不存在的 step → 直接 `stuck`
- `goto` 自己 = 原地重做(允许)
- 终态 `done` 不会再写新 outbox;`stuck` 也不会,等 admin replay

---

## 七、内置工具节点的辅助接口

### 7.1 dedup 字段级原子去重

> dedup 节点 worker 在拿到 `output` 之前先调一次,确认要不要 keep。

```
POST /api/v1/dedup/check
```

**Body**
```json
{
  "taskId": "uuid",
  "itemId": "uuid",
  "stepKey": "dedup",
  "hash": "ab12cd34...",
  "fields": { "url": "https://..." }
}
```

**响应**
```json
{ "kept": true,  "hash": "ab12..." }            // 这条数据是新的
{ "kept": false, "hash": "ab12...", "firstItemId": "<最早占住这个 hash 的 item>" }  // 撞重
```

实现细节:
- 同一条 (`task_id, item_id, step_key`) 重提先删旧 hash —— 支持回流后用新数据再去重
- `dedup_keys` 主键 `(task_id, dedup_hash)`,`ON CONFLICT DO NOTHING` 保证原子性

完成后,worker 一般这样推 result:
```json
{
  "runId": "...",
  "status": "success",
  "output": { "decision": "duplicate", "hash": "ab12...", "deduped": true }
}
```
配合 routes:`{ on: "decision", cases: { keep: "next", duplicate: { goto: "ingest", maxLoops: 3 } } }`。

### 7.2 dataset_records 最终产物入库

> export / store 节点 worker 写最终业务数据(UPSERT BY item_id, 创建/覆盖一体)。

```
POST /api/v1/dataset/records/save
```

**Body**
```json
{
  "taskId": "uuid",
  "itemId": "uuid",
  "payload":  { "title": "...", "content": "..." },
  "metadata": { "outputs": {...}, "stepKey": "store" }
}
```

`UPSERT BY item_id`(同一 item 多次 export 只保留最新)。

```
GET /api/v1/tasks/:taskId/records
```
拉最新 200 条入库结果。

---

## 八、监控与排障

### 8.1 队列概览

```
GET /api/v1/admin/queue
```
```json
{ "queue": [
  { "node_key": "translate", "status": "pending", "n": 3 },
  { "node_key": "translate", "status": "leased",  "n": 1 }
] }
```

### 8.2 卡死(stuck)清单

```
GET /api/v1/admin/stuck
```
返回 `current_step='stuck'` 的 item,带最后一次 attempt 摘要。

### 8.3 重放到指定 step

```
POST /api/v1/admin/items/:id/replay
```
**Body** `{ "stepKey": "translate" }`

把 item 的 `current_step` 改回去,并写一条新的 `outbox pending`。常用于:
- stuck item 排查清楚后重做
- 改完 pipeline 想强制让某条 item 走新版本

---

## 九、错误码一览

外部业务系统接入时务必依赖 `error.code` 而不是 `error.message`. message 仅人类可读, code 是契约。
返回形态统一为 `{ "error": { "code": "<STABLE_STRING>", "message": "<可读文案>", ...extras } }`.

### 9.1 通用 / 鉴权 / 参数

| HTTP | code | 触发场景 |
|---|---|---|
| 400 | `BAD_REQUEST` | zod 校验失败 (统一翻译) |
| 400 | `MISSING_PARAMS` | 必填 querystring / body 字段缺失 |
| 400 | `BAD_IDEMPOTENCY_KEY` | `Idempotency-Key` 长度不在 [8, 200] |
| 401 | `UNAUTHORIZED` | 缺 / 错 / revoked / 过期 api key |
| 403 | `FORBIDDEN` | RBAC 权限不足 (含 message 指明缺哪个权限) |
| 404 | `NOT_FOUND` | 资源不存在或跨租户 (404 不暴露存在性) |
| 409 | `IDEMPOTENCY_HASH_MISMATCH` | 同 `Idempotency-Key` 但 body hash 不一致 |
| 409 | `IDEMPOTENCY_IN_PROGRESS` | 同 `Idempotency-Key` 同 body 的请求正在处理 (并发) |

### 9.2 调度核心 (`/api/v1/*`)

| HTTP | code | 触发场景 |
|---|---|---|
| 404 | `PIPELINE_NOT_FOUND` | ingest 时 taskId 找不到 / 无 current_version |
| 400 | `EMPTY_PIPELINE` | pipeline 没 steps |
| 400 | `INVALID_START_STEP` | startStep 不在 pipeline 里 |
| 400 | `INVALID_STEP` | replay 的 stepKey 找不到 |
| 404 | `UNKNOWN_RUN` | result 给的 runId 不存在 |
| 404 | `RUN_NOT_FOUND` | 跨租户调用 outbox 接口 (RLS 隐式过滤) |
| 409 | `INFLIGHT_STEPS_CONFLICT` | save pipeline 影响在飞 runs (含 `conflicts[]`) |
| 409 | `LEASE_EXPIRED` | result / heartbeat 时 lease 已过期 |
| 409 | `LEASE_LOST` | release / heartbeat 但 runId 已回收或 workerId 不匹配 |
| 409 | `ALREADY_CLAIMED` | 调度核心 `/queue/run/:runId/claim` 被他人抢先 |

> `/api/v1/result` 软返回:`{ ok: true, applied: false }` — 重复提交或租约已回收但未到过期窗口,业务层应当忽略而不视为失败。

### 9.3 业务层 (`/api/*`)

#### 批次生命周期

| HTTP | code | 触发场景 |
|---|---|---|
| 404 | `BATCH_NOT_FOUND` | claim 时 batchId 不存在 |
| 404 | `NOT_FOUND_OR_NOT_ACTIVE` | pause 但批次非 active |
| 404 | `NOT_FOUND_OR_NOT_PAUSED` | resume 但批次非 paused |
| 409 | `PIPELINE_PAUSED` | 项目级硬停, 不能新认领 |
| 409 | `BATCH_PAUSED` | 批次级软停, 不能新认领 (在飞继续) |
| 409 | `BATCH_CLOSED` | 批次已关闭 (M1, archived 终态) |
| 409 | `BATCH_ALREADY_CLOSED` | 重复 close (M1, 关闭不可逆) |
| 409 | `QUOTA_FULL` | batch.approved >= target |

#### 认领 / 提交 / 重做

| HTTP | code | 触发场景 |
|---|---|---|
| 404 | `ITEM_NOT_FOUND` | claim 时 itemId 不存在 |
| 409 | `ITEM_INACTIVE` | item 已 stuck / done / cancelled |
| 409 | `ALREADY_CLAIMING` | 自己已 claim (幂等返同样结果) |
| 409 | `NOT_CLAIMED` | submit / release 但当前 user 没 claimed 行 |
| 409 | `NO_PENDING_RUN` | outbox 无 pending 行可领 (一般跟着 race) |
| 409 | `NO_LEASED_RUN` | review.decide 时未找到 leased outbox |
| 404 | `NO_FAILED_SUBMISSION` | redo 但当前 user 在该 item 上无失败可重做 |
| 409 | `SCHED_ERROR` | 业务层 → 调度核心调用失败 (含原 code/message) |
| 409 | `ITEM_NOT_STUCK` | replay-request 仅 stuck 状态可申请 (M8) |
| 409 | `ITEM_NOT_RECALLABLE` | recall 仅 done 状态可召回 (M6) |

#### 配额

| HTTP | code | 触发场景 |
|---|---|---|
| 409 | `TOO_MANY_ACTIVE` | 超出 step.params.max_concurrent_per_user |
| 409 | `USER_QUOTA_FULL` | 超出 step.params.max_total_per_user |

#### 步骤互斥 (disallowedFromSteps)

| HTTP | code | 触发场景 |
|---|---|---|
| 403 | `STEP_OPERATOR_CONFLICT` | claim / decide 命中操作人互斥规则 (含 `conflictStep`) |

### 9.4 错误码 SLA

- 已发布的 code **不可重命名 / 不可改变 HTTP 语义**;新增 code 走小版本。
- 同一语义错误在不同接口必须用同一 code (如 batch 不存在统一 `BATCH_NOT_FOUND`)。
- 404 不暴露跨租户存在性 — `NOT_FOUND` / `*_NOT_FOUND` 优先于 403。
- 409 仅用于业务状态冲突,不用于参数校验失败 (那是 400 `BAD_REQUEST`)。
- 401 / 403 区分清晰:401 = 没身份, 403 = 有身份但缺权限。

---

## 十、端到端 curl 示例

### 1. 看节点能力 + 拿一个 pipeline 的 task_id

```bash
curl -s localhost:4000/api/v1/nodes | jq '.nodes[].key'

TASK_ID=$(curl -s localhost:4000/api/v1/pipelines | jq -r '.pipelines[0].task_id')
```

### 2. 投递一条数据

```bash
ITEM=$(curl -s -X POST localhost:4000/api/v1/items/create \
  -H 'content-type: application/json' \
  -d "{\"taskId\":\"$TASK_ID\",\"envelope\":{\"payload\":{\"text\":\"Hello\"}}}")
ITEM_ID=$(echo "$ITEM" | jq -r .itemId)
echo "Created item $ITEM_ID"
```

### 3. 模拟一个 worker 干 translate

```bash
# 拉活
JOB=$(curl -s -X POST localhost:4000/api/v1/queue/translate/lease \
  -H 'content-type: application/json' \
  -d '{"workerId":"demo-worker","batchSize":1,"leaseSeconds":300}' \
  | jq '.jobs[0]')
RUN_ID=$(echo "$JOB" | jq -r .runId)

# 提交结果
curl -s -X POST localhost:4000/api/v1/result \
  -H 'content-type: application/json' \
  -d "{\"runId\":\"$RUN_ID\",\"status\":\"success\",
       \"output\":{\"translatedText\":\"你好\",\"decision\":\"approved\"}}" \
  | jq
```

### 4. 看 item 走到哪了

```bash
curl -s localhost:4000/api/v1/items/$ITEM_ID | jq '{step:.item.current_step, history:[.history[] | {step_key, outcome, output}]}'
```

---

## 文档索引

| 文件 | 内容 |
|---|---|
| [00-summary.md](./00-summary.md) | 总览(图解 + 比喻) |
| [01-design.md](./01-design.md) | 设计细节(分层 / 数据模型 / 机制 / 决策) |
| **02-api.md** | **本文件: 接口使用说明** |
| [03-testing.md](./03-testing.md) | 测试用法 |
| [06-node-design.md](./06-node-design.md) | 功能节点协议 / 版本 / 运行方式 / 管理后台设计 |
