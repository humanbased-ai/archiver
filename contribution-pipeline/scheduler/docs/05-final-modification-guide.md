# 调度中心 · 最终修改指导文档

> **版本**：v1.0  
> **日期**：2026-05-10  
> **适用范围**：`scheduler` 核心、业务层参考实现、端到端验证、上线前质量门禁

---

## 一、文档目的

本文承接 [`04-pm-qa-review.md`](./04-pm-qa-review.md)，将 PM/QA 审查结论转化为可执行的修改指导。

目标不是重新描述 scheduler 的设计，而是明确：

1. 哪些问题必须先修。
2. 哪些接口和测试必须补齐。
3. 如何分阶段完成端到端打通验证。
4. 上线前以什么标准判断可以放行。

`scheduler` 是本项目主体和核心，必须优先保证它作为底层调度 PaaS 的稳定性、可恢复性、可审计性和可接入性。

---

## 二、总体修改原则

### 2.1 分层原则

修改时必须严格区分三层：

| 层级 | 路径 / 接口 | 职责 | 修改原则 |
|---|---|---|---|
| scheduler 核心 | `/api/v1/...`、`backend/src/api.ts`、`result-core.ts`、queue/reconciler | 调度、状态流转、租约、结果、重试、DLQ、多租户 | 契约稳定、状态闭环、错误码稳定 |
| 业务层参考实现 | `/api/...`、`backend/src/business.ts` | batch、submission、collect/review、dataset 交付 | 作为外部业务团队接入样板 |
| web demo | `web/` | 最小流程演示 | 只做冒烟，不作为核心验收依据 |

任何修改都不得把业务语义下沉到 scheduler 核心，除非它属于通用调度契约。

### 2.2 优先级原则

优先处理会导致以下问题的缺陷：

1. 批次无法结束。
2. 状态机不可恢复。
3. 多租户或权限越界。
4. 版本钉死失效。
5. 外部系统重试导致重复副作用。
6. 生产部署配置错误但未 fail-fast。

### 2.3 测试先行原则

所有 P0/P1 修改必须先定义验收用例，再实现代码。

推荐顺序：

1. 补测试 fixture。
2. 写失败用例。
3. 修实现。
4. 跑相关分组。
5. 跑全量回归。

---

## 三、修改优先级总览

| 优先级 | 编号 | 修改项 | 所属层 | 上线影响 | 建议状态 |
|---|---|---|---|---|---|
| P0 | M1 | 批次提前关闭 `close` | 业务层 + scheduler 状态 | 不修会导致 batch 永久 in-flight | 必须修 |
| P0 | M2 | claim/decide/list 统一使用 pinned pipeline version | scheduler + business | 不修会导致接口口径漂移 | 必须修 |
| P0 | M3 | 生产环境 INTERNAL_KEY / REMOTE_SCHED 配置 fail-fast | auth/deploy | 不修有跨进程鉴权风险 | 必须修 |
| P0 | M4 | V1 端到端主线自动化 | test | 不修无法证明打通 | 必须补 |
| P1 | M5 | 批次创建幂等键 | business + scheduler 契约 | 不修会产生重复 batch | 强烈建议 |
| P1 | M6 | approved 数据召回 / recall | scheduler + dataset | 不修会导致审计割裂 | 强烈建议 |
| P1 | M7 | 错误码字典与统一返回 | docs + api | 不修影响外部接入 SLA | 强烈建议 |
| P1 | M8 | stuck item 重放申请 | business + admin | 不修依赖运维主动发现 | 建议 |
| P2 | M9 | webhook / events 出站事件 | scheduler | 大规模接入需要 | 后续迭代 |
| P2 | M10 | review 配额执行点泛化 | business | 精细化管控需要 | 后续迭代 |

---

## 四、P0 修改指导

## M1：增加批次提前关闭能力

### 问题

当前 `POST /api/batches` 创建后会生成 `target` 个 item，完成条件依赖 `approved >= target`。如果 target 设置过大、业务提前结束、或部分 item 永久无法完成，batch 会长期处于非完成态。

### 目标

增加不可逆的批次关闭能力，让外部业务系统可以明确表达“本批次结束，不再等待未完成任务”。

### 建议接口

```http
POST /api/batches/:batchId/close
```

### 建议请求体

```json
{
  "reason": "业务提前结束",
  "operatorId": "admin-001"
}
```

### 状态处理要求

关闭时应处理：

1. batch 状态改为 `closed`。
2. 未完成 item 标记为 `cancelled` 或等价终态。
3. pending outbox 取消或标记为 terminal 状态。
4. leased outbox 不应继续产生有效结果；若 result 晚到，应返回明确错误或幂等忽略。
5. submissions 中 active claimed 需要转为 `cancelled` 或 `returned_by_close`。
6. audit 记录 `batch.close`，包含 reason、operator、cancelled_count。

### 验收用例

| 用例 | 场景 | 预期 |
|---|---|---|
| M1-1 | active batch close | 200，batch.status=closed |
| M1-2 | close 后 collect claim | 409 `BATCH_CLOSED` |
| M1-3 | close 后 pending outbox | 不再被 lease |
| M1-4 | close 时已有 claimed submission | 状态被终止或释放，审计完整 |
| M1-5 | close 后重复 close | 幂等返回 200 或 409 `BATCH_ALREADY_CLOSED`，需固定契约 |
| M1-6 | closed batch resume | 409 `BATCH_CLOSED`，关闭不可逆 |

---

## M2：统一 pipeline version 钉死口径

### 问题

部分路径按 `items.pipeline_version_id` 读取 pinned version，部分路径可能读取当前 pipeline。pipeline 变更后，列表、claim、decide 之间会出现口径漂移。

### 目标

所有与 item 流转、领取、审核、冲突校验有关的逻辑必须使用 item 创建时钉死的 pipeline version。

### 必查路径

重点检查并修正：

1. `/api/work/collect-tasks`
2. `/api/collect/:itemId/claim`
3. `/api/collect/:itemId/submit`
4. `/api/review/:itemId/decide`
5. disallowedFromSteps 校验
6. review task list
7. redo/replay 后重新入队

### 修改要求

1. 查询 item 时必须 join `pipeline_versions`。
2. step config 必须来自 `items.pipeline_version_id` 对应版本。
3. 不允许在 item 级别校验中读取 pipeline 当前 `steps`。
4. 新 batch 可以使用 current version；旧 batch 不受影响。

### 验收用例

| 用例 | 场景 | 预期 |
|---|---|---|
| M2-1 | v1 创建 batch，保存 pipeline 为 v2 | 老 item 仍按 v1 claim |
| M2-2 | v1 disallowedFromSteps 与 v2 不同 | 老 item 按 v1 判断 |
| M2-3 | review step 在 v2 被删除 | 老 item review 仍正常 |
| M2-4 | 新 batch 创建于 v2 | 新 item 按 v2 |
| M2-5 | list 可见但 claim 不可进 | 不允许出现，二者口径一致 |

---

## M3：生产部署鉴权配置 fail-fast

### 问题

`INTERNAL_KEY` 为进程级随机值。单进程 inject 模式可用，但拆分 business 与 scheduler 后，如果配置不完整，会出现 401、误用内部 key 或测试环境掩盖生产问题。

### 目标

生产环境必须明确服务间调用方式，不允许隐式依赖进程内随机 key。

### 修改要求

启动时检查：

1. `NODE_ENV=production` 时必须 `AUTH_REQUIRED=true`。
2. 若 business 与 scheduler 拆进程，必须设置 `SCHEDULER_BASE_URL` 和服务间 API key。
3. 未设置远端 scheduler 但以拆服务模式启动时必须 fail-fast。
4. INTERNAL_KEY 仅允许进程内 inject 或本机可信路径使用。
5. 日志中不得打印完整 key。

### 验收用例

| 用例 | 场景 | 预期 |
|---|---|---|
| M3-1 | production + AUTH_REQUIRED=false | 启动失败 |
| M3-2 | 拆服务但缺 SCHEDULER_BASE_URL | 启动失败 |
| M3-3 | 服务间 key 错误 | scheduler 返回 401 |
| M3-4 | dev 模式无 key | 允许，但 caller 必须可追踪 |
| M3-5 | 日志检查 | 不出现完整 secret |

---

## M4：补齐 V1 端到端主线自动化

### 目标

新增端到端测试，证明外部业务系统可以通过业务层参考实现完整跑通 scheduler。

### 建议文件

```text
backend/test/e2e-mixed.test.ts
```

### 主线流程

1. 创建 tenant 和 apiKey。
2. 创建 collect + review pipeline。
3. 创建 batch，`target=5`。
4. collector alice 领取并提交 5 条。
5. reviewer bob 审核：3 条 approved，2 条 rejected。
6. rejected 回流 collect。
7. alice 因 disallowedFromSteps 不可重做自己处理过的 item。
8. charlie 重做 2 条并提交。
9. bob 再次审核 approved。
10. batch 完成。
11. dataset records 数量为 5。
12. audit 记录完整。

### 验收标准

| 检查点 | 标准 |
|---|---|
| 成功率 | 连续跑 10 次通过 |
| 数据结果 | approved=target，dataset records=target |
| 状态结果 | batch.status=done |
| 审计结果 | claim/submit/review/rejected/retry 均可追溯 |
| 隔离性 | 测试数据可清理，不污染 demo 数据 |

---

## 五、P1 修改指导

## M5：批次创建支持幂等键

### 问题

外部业务调用 `POST /api/batches` 时，如果网络超时后重试，可能重复创建 batch 和 items。

### 建议契约

Header：

```http
Idempotency-Key: <client-generated-key>
```

### 处理规则

1. 同 tenant、同 endpoint、同 key、同 body hash：返回第一次创建的 batch。
2. 同 tenant、同 endpoint、同 key、不同 body hash：409 `IDEMPOTENCY_CONFLICT`。
3. 幂等记录应有过期策略。
4. response 中建议返回 `idempotentReplay: true/false`。

### 验收用例

| 用例 | 场景 | 预期 |
|---|---|---|
| M5-1 | 同 key 重试同 body | 返回同一 batchId |
| M5-2 | 同 key 不同 body | 409 |
| M5-3 | 不同 tenant 同 key | 互不影响 |
| M5-4 | 并发同 key 创建 | 仅一个 batch 落库 |

---

## M6：增加 approved 数据召回能力

### 问题

数据一旦 approved 并写入 dataset_records，后续发现误审或违规时只能直接改库，破坏状态机和审计闭环。

### 建议接口

```http
POST /api/admin/items/:itemId/recall
```

### 建议请求体

```json
{
  "reason": "误审，需要重新采集",
  "targetStep": "collect",
  "operatorId": "admin-001"
}
```

### 处理规则

1. dataset record 标记为 `recalled`，不建议物理删除。
2. item current_step 回到 targetStep。
3. 生成新的 outbox。
4. 已完成 attempts 保留。
5. audit 记录 recall reason。

### 验收用例

| 用例 | 场景 | 预期 |
|---|---|---|
| M6-1 | approved item recall | dataset 标记 recalled，item 回到指定 step |
| M6-2 | recall 后重新处理 approved | dataset 产生新有效版本或覆盖策略明确 |
| M6-3 | 非 done item recall | 409 `ITEM_NOT_RECALLABLE` |
| M6-4 | 缺 reason | 400 |

---

## M7：补齐错误码字典

### 目标

外部系统接入时不能依赖自然语言 message，必须依赖稳定错误码。

### 建议更新位置

```text
scheduler/docs/02-api.md
```

### 至少覆盖

| 类别 | 错误码示例 |
|---|---|
| 鉴权 | `UNAUTHORIZED`、`FORBIDDEN` |
| 租户隔离 | `NOT_FOUND`、`RUN_NOT_FOUND` |
| 状态冲突 | `BATCH_PAUSED`、`BATCH_CLOSED`、`PIPELINE_PAUSED` |
| 领取冲突 | `ALREADY_CLAIMED`、`ALREADY_CLAIMING`、`NOT_CLAIMED` |
| 配额 | `TOO_MANY_ACTIVE`、`USER_QUOTA_FULL` |
| 租约 | `LEASE_LOST`、`LEASE_EXPIRED` |
| 幂等 | `IDEMPOTENCY_CONFLICT` |
| 回滚 | `ITEM_NOT_RECALLABLE` |
| 调度 | `SCHED_ERROR`、`UNKNOWN_RUN` |

### 验收要求

1. 同一错误场景在不同接口中 code 一致。
2. 404 不暴露跨租户资源是否存在。
3. 409 专用于业务状态冲突。
4. 403 专用于权限不足。
5. 400 专用于参数校验失败。

---

## M8：增加 stuck item 重放申请

### 问题

stuck item 当前主要依赖运维查看 `/admin/stuck`。普通业务用户无法表达“这个任务卡住了，请处理”。

### 建议接口

```http
POST /api/items/:itemId/replay-request
```

### 处理规则

1. 写入 `replay_requests`。
2. 同一 item 未处理请求应幂等。
3. `/api/admin/stuck` 展示 replay request 标记。
4. admin replay 后关闭 request。

### 验收用例

| 用例 | 场景 | 预期 |
|---|---|---|
| M8-1 | stuck item 申请 replay | 200，生成 replay_request |
| M8-2 | 非 stuck item 申请 | 409 |
| M8-3 | 重复申请 | 幂等返回同一 request |
| M8-4 | admin replay 后 | request 状态变 resolved |

---

## 六、P2 修改指导

## M9：增加事件推送能力

### 建议事件源

事件必须由 scheduler 产生，而不是只由业务层拼装。

### 建议事件

| 事件 | 触发时机 |
|---|---|
| `batch.created` | batch 创建 |
| `batch.paused` | batch 暂停 |
| `batch.resumed` | batch 恢复 |
| `batch.closed` | batch 关闭 |
| `item.claimed` | item 被领取 |
| `item.submitted` | item 提交 |
| `item.reviewed` | 审核完成 |
| `item.stuck` | item 进入 stuck |
| `item.replayed` | admin replay |
| `dataset.record.created` | 数据交付 |

### 实现建议

1. 新增 `events` 表。
2. 新增 `webhook_subscriptions` 表。
3. 事件写入与主事务同提交。
4. 出站投递异步重试。
5. webhook 必须签名。

---

## M10：泛化配额执行点

### 目标

配额不应只对 first step 生效，应能在 collect、review、redo 等环节统一表达。

### 建议抽象

```text
enforceUserCapacity(stepConfig, userId, context)
```

### 应覆盖

1. collect claim。
2. review claim 或 decide。
3. redo 后重新 claim。
4. replay 后重新 claim。

---

## 七、测试落地计划

## 7.1 新增测试文件

| 文件 | 覆盖范围 | 优先级 |
|---|---|---|
| `backend/test/business.e2e.test.ts` | R 组业务契约 | P0 |
| `backend/test/e2e-mixed.test.ts` | V1-V16 端到端混合 | P0 |
| `backend/test/batch-lifecycle.test.ts` | close/pause/resume/幂等 | P0/P1 |
| `backend/test/version-pinning.test.ts` | pinned version 口径 | P0 |
| `backend/test/failure-recovery.test.ts` | scheduler 不可达、重启、replay | P1 |

## 7.2 必须先落地的测试

| 顺序 | 用例组 | 说明 |
|---|---|---|
| 1 | V1 | 证明主线端到端打通 |
| 2 | M2-1 至 M2-5 | 防止版本口径漂移 |
| 3 | M1-1 至 M1-6 | 批次生命周期闭环 |
| 4 | U1-U14 | 鉴权和租户隔离 |
| 5 | M5-1 至 M5-4 | 外部重试安全 |

## 7.3 CI 门禁

CI 至少执行：

```bash
cd scheduler/backend
npm test
```

新增测试后，推荐增加分组命令：

```bash
npx tsx --test test/api.e2e.test.ts
npx tsx --test test/multitenant.test.ts
npx tsx --test test/business.e2e.test.ts
npx tsx --test test/e2e-mixed.test.ts
```

---

## 八、上线验收标准

## 8.1 允许进入预生产的最低标准

必须满足：

1. A-Q 核心 API 回归通过。
2. V1 主线连续 10 次通过。
3. U1-U14 多租户和权限测试通过。
4. batch pause/resume/close 生命周期测试通过。
5. pipeline version pinned 测试通过。
6. dataset records 数量与 approved 数一致。
7. audit 可以追踪关键用户动作。
8. 生产配置 fail-fast 测试通过。

## 8.2 允许生产上线的推荐标准

除预生产标准外，还应满足：

1. 批次创建幂等键完成。
2. 错误码字典完成并与实现一致。
3. approved recall 至少有管理端接口或后台脚本。
4. 故障演练 W1-W7 至少在预生产执行一次。
5. outbox 积压压测通过。
6. 关键 SQL 有索引与 explain 记录。

---

## 九、推荐实施顺序

## 阶段 1：端到端主线闭环

目标：证明系统能从 batch 创建跑到 dataset 交付。

任务：

1. 新增 `e2e-mixed.test.ts`。
2. 实现 V1 主线。
3. 修复主线中暴露的问题。
4. 确认 audit 和 dataset 完整。

交付物：

- V1 自动化测试。
- 主线通过截图或 CI 记录。

## 阶段 2：修 P0 契约缺口

任务：

1. 实现 batch close。
2. 修 pinned version 口径。
3. 增加生产配置 fail-fast。
4. 补对应测试。

交付物：

- `batch-lifecycle.test.ts`
- `version-pinning.test.ts`
- 配置启动测试

## 阶段 3：补外部接入可靠性

任务：

1. 增加 Idempotency-Key。
2. 补错误码字典。
3. 增加 schedPost 失败重试/对账策略。
4. 增加 stuck replay-request。

交付物：

- 外部接入说明。
- 错误码 SLA。
- 幂等测试。

## 阶段 4：增强可运维性

任务：

1. approved recall。
2. webhook/events。
3. 故障演练。
4. 性能压测。

交付物：

- 故障演练报告。
- 压测报告。
- 运维 Runbook。

---

## 十、修改完成后的自查清单

每完成一个修改项，必须检查：

- [ ] 是否明确属于 scheduler 核心还是业务层参考实现。
- [ ] 是否有对应自动化测试。
- [ ] 是否影响多租户隔离。
- [ ] 是否影响 pipeline version pinned 语义。
- [ ] 是否有 audit。
- [ ] 是否有稳定错误码。
- [ ] 是否处理重复请求。
- [ ] 是否处理并发竞争。
- [ ] 是否处理服务重启或请求超时。
- [ ] 是否更新相关文档。

---

## 十一、变更记录

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-05-10 | 初始版本，基于 PM/QA 审查生成最终修改指导 |
| v1.1 | 2026-05-10 | 阶段 1 / 2 / 3 部分落地: M3 / M2 / M1 / M4 / M7 已完成 (见 11.1) |
| v1.2 | 2026-05-10 | 阶段 3 完成: M5 / M8 / M6 已落地 (见 11.4) |
| v1.3 | 2026-05-10 | 阶段 4 完成: M10 / M9 (events 最小版) 已落地 (见 11.6) |
| v1.4 | 2026-05-10 | M5 严格并发去重落地 + 测试串行化稳定 (见 11.8) |

### 11.1 v1.1 已落地清单

| 项 | 文件 | 测试 |
|---|---|---|
| **M3** fail-fast | `src/env-check.ts` + `src/server.ts` 顶层校验 | `test/env-check.test.ts` (8 用例) |
| **M2** pinned version | `migrations/1715000210000_batches_pipeline_version.sql` 加字段 + backfill;`src/business.ts` 中 list/claim/decide/详情 4 处 SQL 改 `LEFT JOIN pipeline_versions` 走 `batches.pipeline_version_id` | `test/version-pinning.test.ts` (3 用例) |
| **M1** batch close | `src/business.ts` 新 `POST /api/batches/:batchId/close` (archived 终态);`src/auth.ts` 加路由权限;claim 区分 BATCH_PAUSED / BATCH_CLOSED | `test/batch-lifecycle.test.ts` (7 用例) |
| **M4** V1 主线 | — | `test/e2e-mixed.test.ts` 一段贯穿 batch→claim→submit→review→loopback→互斥→重做→approved→dataset=5→audit |
| **M7** 错误码字典 | `docs/02-api.md` 第九节扩成 9.1/9.2/9.3/9.4 (鉴权 / 调度核心 / 业务层 / SLA),业务层全套补齐 | (文档) |

测试规模:**119 → 138** (npm test 全套绿)。

### 11.2 v1.1 未做 (留给后续迭代)

| 项 | 优先级 | 状态 |
|---|---|---|
| M5 批次创建 Idempotency-Key | P1 | 未启动 |
| M6 approved recall | P1 | 未启动 |
| M8 stuck replay-request | P1 | 未启动 |
| M9 webhook / events | P2 | 未启动 |
| M10 配额执行点泛化 | P2 | 未启动 |
| 故障演练 W1-W7 | — | 未在预生产执行 |

### 11.3 与 v1.0 推荐顺序的偏差

- v1.0 推荐"阶段 1 V1 先行 → 阶段 2 修 P0"。v1.1 实际:**先 M3 → M2 → M1 → 再 V1**。理由:V1 主线测试依赖 M1/M2 的代码修复才能稳定通过(否则会被 disallowedFromSteps 漂移和缺 close 接口拌住),先修后测一次跑通,V1 成为可进 CI 的稳定回归用例。
- 测试先行的精神不变:每项修改都有专属用例 (M1-1~M1-8 / M2-1~M2-3 / M3-0~M3-7)。

### 11.4 v1.2 已落地清单

| 项 | 文件 | 测试 |
|---|---|---|
| **M5** Idempotency-Key | (实现已存在 `src/idempotency.ts`,挂 `/api/batches`);`docs/02-api.md` 加二·五节用法 + 错误码 (`BAD_IDEMPOTENCY_KEY`/`IDEMPOTENCY_HASH_MISMATCH`) | `test/idempotency.test.ts` (5 用例: 同 key 重放 / hash mismatch / 跨 scope / 长度校验 / 不带 key) |
| **M8** stuck replay-request | `migrations/1715000220000_replay_requests.sql` 建表 + RLS;`src/business.ts` 新 `POST /api/items/:itemId/replay-request`;`src/api.ts` `/admin/stuck` 增加 `replay_request` 字段,`/admin/items/:id/replay` 完成时自动 resolve | `test/replay-request.test.ts` (5 用例) |
| **M6** approved 数据召回 | `migrations/1715000230000_dataset_records_recall.sql` 加 `status/recalled_*` 字段 + partial unique;`src/api.ts` 新 `POST /api/v1/admin/items/:id/recall`;`/dataset/records/save` ON CONFLICT 适配;`/tasks/:taskId/records` 默认只返 active,`?status=all` 包含 recalled | `test/recall.test.ts` (5 用例) |

测试规模:**138 → 153** (npm test 全套绿)。

### 11.5 v1.2 仍未做

| 项 | 优先级 | 状态 |
|---|---|---|
| M9 webhook / events | P2 | 未启动 (大改,需新表 + 后台投递 + 签名) |
| M10 配额执行点泛化 | P2 | 未启动 |
| 故障演练 W1-W7 | — | 未在预生产执行 |
| **M5 严格并发去重** | — | preHandler advisory lock 未做,race window 极小但存在 (见 02-api.md 二·五节 ⚠️) |

### 11.6 v1.3 已落地清单

| 项 | 文件 | 测试 |
|---|---|---|
| **M10** review 配额泛化 | `src/business.ts` review.decide 入口加 `max_total_per_user` 校验 (review 没 claim 阶段, 故只读 max_total, 不读 max_concurrent);命中 → 409 USER_QUOTA_FULL + audit `quota.denied` | `test/quota-review.test.ts` (2 用例) |
| **M9** events 最小版 | `migrations/1715000240000_events.sql` 新表 + RLS;`src/events.ts` 暴露 `emit()` (异步写, 跟 audit 同语义) + `GET /api/v1/events?since=&kind=&resource_kind=&resource_id=&limit=`;`business.ts` 5 处关键点 emit (batch.created/paused/resumed/closed, item.reviewed) | `test/events.test.ts` (4 用例) |

测试规模:**153 → 159** (npm test 全套绿)。

### 11.7 v1.3 仍未做

| 项 | 优先级 | 状态 | 备注 |
|---|---|---|---|
| M9 webhook 投递层 | P2 | 未启动 | 当前是"被动轮询",外部业务系统每 1-5s 调 GET /events?since=. 完整 webhook 需:`webhook_subscriptions` 表 + 后台投递 worker + HMAC 签名 + 重试退避 + 死信. 升级时 emit 也要从异步独立写改成 transactional outbox (主 tx 同提交) |
| 故障演练 W1-W7 | — | 未在预生产执行 | 注入式演练,最好人工执行后记录 runbook |
| M5 严格并发去重 | — | 暂时接受 race | preHandler advisory lock 未做,见 02-api.md 二·五节 ⚠️ |

### 11.8 v1.4 已落地

| 项 | 文件 | 测试 |
|---|---|---|
| **M5 严格并发去重** | `migrations/1715000250000_idempotency_pending.sql` 加 `status` 字段;`src/idempotency.ts` 重写为"preHandler 拿 `pg_advisory_xact_lock(hashtext(tenant\|key\|scope))` + INSERT pending 占位 → onSend UPDATE → completed";新 `IDEMPOTENCY_IN_PROGRESS` 错误码;02-api.md 二·五节 + 错误码字典同步 | `idempotency.test.ts` 新增 M5-6 并发用例 (5 个并发同 key 同 body → 1 个 200 + 4 个 IN_PROGRESS,batchId 必相同) |
| **测试串行化稳定** | `package.json` `npm test` 加 `--test-concurrency=1` — 跨文件并行下 api.e2e D3 测试调 `/queue/ingest/lease` batchSize=50 会全局抢 ingest pending 行,污染 e2e-mixed V1 主线;串行化后稳定 | (CI 稳定性) |

测试规模:**159 → 160** (`npm test` 全套绿)。

### 11.9 v1.4 仍未做 + 刻意推迟决策

| 项 | 优先级 | 状态 |
|---|---|---|
| **M9 webhook 投递层 (完整)** | P2 | **刻意推迟到下迭代** (见 11.10) |
| 故障演练 W1-W7 | — | 未在预生产执行 |

### 11.10 M9 webhook 投递层 — 推迟理由 + 设计草图

**当前状态足够**:外部业务系统通过 `GET /api/v1/events?since=<id>` 轮询已能完整对接;所有业务关键点都 emit。webhook 投递层是"减少轮询延迟"的优化,不是契约缺口。

**为什么不在本轮做**:

1. **atomicity 真坑没解决**:本来想用"events INSERT trigger fan-out 到 deliveries"做最小改,但 emit 当前是 asSystem fire-and-forget,emit 失败 = 没 events 行 = 没 trigger = 没 webhook。要严格 "business commit ⇒ webhook eventual delivery",必须把 `tx` 透传到 emit,改 10+ 处调用点。要么这么做,要么明确文档化 "events 是 best-effort,emit 失败会丢 webhook"。
2. **cardinality 风险**:朴素 deliveries-per-event 模型 = 1 事件 × N 订阅者 × M 重试,大客户会爆。Stripe 等用 **log-based fan-out** 更稳。
3. **webhook 易踩雷**:timeout / 签名时序 / 重试风暴 / DLQ 边界,需要 fresh head + dedicated review,不适合在 11 项改动后立即上。

**下迭代设计草图(log-based fan-out)**:

```
表:
  webhook_subscriptions
    id, tenant_id, url, secret,
    kinds TEXT[],                     -- 订阅哪些事件;空 = 全部
    status (active/paused/disabled),
    cursor BIGINT NOT NULL DEFAULT 0, -- 已成功投递的最大 events.id
    failing_attempt INT  DEFAULT 0,   -- 当前事件连续失败次数
    next_retry_at  TIMESTAMPTZ,       -- 下次拉取时间 (退避后)
    last_error TEXT, last_delivery_at TIMESTAMPTZ
  webhook_dead_letters
    id, subscription_id, event_id, attempts, last_error, finalized_at

worker (类似 autoworker, 每 5s tick):
  for sub in active subscriptions where next_retry_at <= NOW() (SKIP LOCKED):
    pick events.id > sub.cursor [matching sub.kinds] LIMIT 50
    for each event:
      POST sub.url
        body=<event>
        headers:
          X-Webhook-Timestamp: <ts>
          X-Webhook-Signature: sha256=hmac(secret, "<ts>.<body>")
      if 2xx:
        sub.cursor = event.id
        sub.failing_attempt = 0; last_error=null
      elif 4xx (永久错):
        DLQ insert; sub.cursor = event.id (跳过); failing_attempt=0
      elif 5xx / network:
        sub.failing_attempt++
        if failing_attempt >= 6: DLQ insert; sub.cursor = event.id; failing_attempt=0
        else: next_retry_at = NOW() + backoff(failing_attempt) [30s,5m,30m,2h,12h,24h]
        break  -- head-of-line 卡住, 下次再试

优点:
  - 1 event = 1 行 (events 表), 不爆
  - emit 完全不变 (沿用现 GET /events 同一份数据源)
  - 慢订阅者只阻塞自己, 不影响其他
  - DLQ 表只装真正死的, 不混 transient

签名校验:
  客户端: 计算 hmac_sha256(secret, "${ts}.${body}") 比对 X-Webhook-Signature; 拒绝 ts 偏离 ±5min 防回放
```

**集成测试要点(下次写)**:
- 订阅 CRUD + tenant 隔离
- 200 成功 → cursor 推进
- 404/4xx → 进 DLQ + cursor 推进 (不卡)
- 5xx → 退避重试,attempt 上限后入 DLQ
- 慢订阅者不阻塞快订阅者
- HMAC 校验(自验证 + 错误 secret 反例)
- pause 后 worker 不投递, resume 后从 cursor 继续
