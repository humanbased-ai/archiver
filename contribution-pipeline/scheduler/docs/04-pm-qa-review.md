# 调度中心 · 对外契约审计 + 端到端打通验证

> 续接 [`03-testing.md`](./03-testing.md) 的 A-Q(覆盖调度核心内部行为)。本文换视角:
> 把 scheduler 当作**底层 PaaS**,审它**给外部业务系统**的对外契约,以及上线前必须跑通的端到端路径。

---

## 一、被审计的是哪一层

真实生产形态:

```
[独立管理端]                    ┐
                                ├──→ [业务层服务] ──→ [scheduler 核心 API]
[独立采集/标注/审核客户端]      ┘
```

- **scheduler 核心** = 本仓库 `backend/src/{router,dispatcher,receiver,reconciler,...}` 暴露的 `/pipelines /batches /run /result /admin/*` 等 — **真正的对外契约**,外部业务层调它
- **业务层** = `backend/src/business.ts`,在本仓库里**同时担任两个角色**:
  1. 给本仓库 web 用的胶水层(让示例 demo 能跑)
  2. 未来外部业务团队的**参考实现/形状**
- **本仓库的 web** = 跑通流程用的最小客户端,不追求体验,不在审计范围

所以下文谈"契约缺口" = **scheduler 核心**;谈"接入能力" = **业务层(参考实现)**。两者不混。

---

## 二、上线前必须跑通的最小关键路径

骨架先列出来,后面用例围绕它展开。模拟"外部业务系统"视角:

```
模板/项目准备     POST /api/templates           创建模板
                  POST /api/projects            从模板实例化项目
                  POST /api/projects/:id/pipeline  保存 pipeline → 产生 pipeline_version

任务编排          POST /api/batches             创建批次 → target 个 item 落 outbox
                  GET  /api/batches/:id         轮询进度 (approved / target / stuck)
                  POST /api/batches/:id/pause   软暂停
                  POST /api/batches/:id/resume  恢复

任务领取/提交     GET  /api/work/collect-tasks  外部客户端拉可领取列表
                  POST /api/collect/:id/claim   认领 (含配额、disallowed、互斥校验)
                  POST /api/collect/:id/submit  提交 → schedPost result
                  POST /api/collect/:id/release 放弃
                  POST /api/collect/:id/redo    上一轮失败后重做

审核              GET  /api/work/review-tasks   待审列表
                  POST /api/review/:id/decide   approved / rejected → 写 dataset 或 loopback

故障/兜底         GET  /api/admin/stuck         运维看 stuck
                  POST /api/admin/replay        DLQ 重放
                  GET  /api/admin/audit         审计回溯

数据交付          GET  /api/datasets/:id/records  外部下游消费已通过数据
```

每一段都需要 happy path + 一个失败路径。完整连成 V1 端到端脚本(见第六节)。

---

## 三、对外契约的挡路石(7 项)

按"接入痛点"排序,每条都能在代码里直接验证。已剔除 web UI 体验类(本项目不解决)。

### 3.1 没有"事件推送" — 进度只能轮询

外部业务层只能 poll `GET /api/batches/:id`,batch 进度 / item.transit / dlq.enter 等都没 webhook。

- **影响**:百万级 item 时业务层轮询风暴;实时通知客户端要再做一层。
- **建议**:scheduler 加 `webhook_subscriptions` 表 + `events` 出站队列,事件名约定见 `01-design.md`。短期可由业务层包一层 SSE/WS,但**事件源必须在 scheduler**,否则跨业务层重启会漏。

### 3.2 配额规则只在 first step 生效

`business.ts` 取 `firstStep.params.max_concurrent_per_user / max_total_per_user`;review step 即使配了也不读。

- **影响**:外部业务层无法用同一份 schema 表达"reviewer 限并发"。
- **建议**:scheduler 的 step.params 增加**通用配额执行点**契约,或业务层抽 `enforceUserCapacity(step, userId)` 在 claim/decide 都跑(参考实现层修)。

### 3.3 没有"已通过数据回滚"路径

`/api/collect/:itemId/redo` 只删 `result IN ('duplicate','rejected')` 的 submission;`approved` 一旦写 `dataset_records` 只能改库。

- **影响**:外部业务发现违规数据,只能反向调 dataset 删除,审计割裂、item 状态机不闭环。
- **建议**:加 `POST /api/admin/items/:id/recall` — dataset 标 `recalled` + item 钉到指定 step 重跑,审计强制 reason。这是契约缺口,不是 UI 问题。

### 3.4 没有"批次提前关闭"

`POST /api/batches` 创建即落 `target` 个空 item,完成判据 = `approved >= target`。target 设大了,无收尾接口 → 永远 in-flight。

- **建议**:加 `POST /api/batches/:id/close`,把未结束 item 标 `cancelled`,与 pause 区分(关闭不可逆)。**外部业务层无法只在自己侧做**,因为 outbox/items 在 scheduler 内。

### 3.5 disallowedFromSteps 校验口径漂移

`/api/work/collect-tasks` 用 item 钉死的 `pipeline_version_id` 过滤;`/api/collect/:id/claim` 取的是当前 pipeline(非钉死版本)。

- **影响**:外部业务层切换 disallowedFromSteps 时,列表 / claim 之间出现"看得到点不进"或反之。
- **建议**:`claim` / `decide` 一律读 `items.pipeline_version_id` 对应的 `pipeline_versions.steps`,与列表一致。

### 3.6 stuck item 没有"重放申请"接口

stuck 后客户端不再列;但 `my-submissions` 仍可见。**外部客户端没有"申请重放"路径**,只能依赖运维主动看 `/admin/stuck`。

- **建议**:加 `POST /api/items/:id/replay-request` 写 `replay_requests` 表,`/admin/stuck` 标红。

### 3.7 INTERNAL_KEY 在分进程部署下风险

`auth.ts:43` `INTERNAL_KEY = randomUUID()` 进程级。生产若**业务层与 scheduler 拆服务**但 `REMOTE_SCHED` 未配,业务层会拿"本进程"的 INTERNAL_KEY 去签名请求,而真实 scheduler 进程不识别 → 401;反过来若两边凑巧同 key(开发/测试),它形同 admin 通配。

- **建议**:`if (NODE_ENV==='production' && !REMOTE_SCHED) warn/exit`;INTERNAL_KEY 限 127.0.0.1/UDS;或改用预共享密钥 + JWT。

### 附:其他设计债(非阻塞,记录在案)

- `GET /api/work/my-submissions` 有副作用(stale claimed → returned 自愈)。语义上应是 `POST /api/work/heal` 或返回 `healed_count`。外部业务对账重复 GET 会触发多次自愈事件。
- reviewer 没有 claim 阶段,关页不释放 lease,只能等 60s 超时 — 外部审核客户端要么忍受这个延迟,要么业务层补 claim/release 一对操作。
- `POST /api/batches` 缺 `Idempotency-Key`,外部业务重试可能创建多个同名 batch — 业务层可加,但 scheduler 应统一设计。
- 错误码不闭合:同"找不到/态不对"散落在 400 / 404 / 409。建议出一份**错误码字典**附 `02-api.md`,稳定 SLA。

---

## 四、业务层(参考实现)需要补齐的接入能力

外部业务团队接 scheduler 时,这些能力必须在自己侧实现 — 本仓库 `business.ts` 应作为示范:

| 能力 | 当前 business.ts | 应补 |
|---|---|---|
| 幂等键透传 | claim/submit/release 已用 itemId+userId 自然幂等 | 批次创建/recall 加 Idempotency-Key 头 |
| schedPost 失败重试 | 上抛 → 用户看到 SCHED_ERROR | 异步队列重试 + 对账 |
| webhook fan-out | 无 | 订阅 scheduler 事件,推外部客户端(SSE/WS) |
| 配额扩展点 | 仅 firstStep | `enforceUserCapacity` 在 claim/decide 都跑 |
| 数据交付通道 | dataset_records 直查 | 加 `GET /api/datasets/:id/export?format=jsonl` 给外部下游 |
| 故障对账 | 仅 `my-submissions` 读时自愈 | 定时 job 主动对账 in-flight |

---

## 五、测试用例矩阵(取舍后)

砍掉原 S 组(管理后台 UI 16 条)/ T 组(用户端 UI 18 条)/ 角色泳道节 — 这些是 web 体验,不在审计范围。保留 R(业务契约) + U(多租户) + V(端到端) + B-*(边界)。

### 组 R:业务契约(24 条,落地到 `backend/test/business.e2e.test.ts`)

| # | 场景 | 预期 |
|---|---|---|
| R1 | 创建批次 → target 个 item + outbox pending=target | 200,stepCounts 全在 firstStep |
| R2 | target=0 / target=101 边界 | 400 (zod min(1) max(100)) |
| R3 | pipelineId 不存在 | 404 PIPELINE_NOT_FOUND |
| R4 | pipeline 没 current_version | 404 PIPELINE_NOT_FOUND |
| R5 | 批次 pause → claim | 409 BATCH_PAUSED |
| R6 | 批次 pause 时已 claim 的 submit | 200(in-flight 不挡) |
| R7 | pipeline pause → claim | 409 PIPELINE_PAUSED |
| R8 | 同 user 二次 claim 同 item | 409 ALREADY_CLAIMING(幂等) |
| R9 | 两 user 并发 claim | 一胜一败 ALREADY_CLAIMED |
| R10 | 满 max_concurrent_per_user | 409 TOO_MANY_ACTIVE |
| R11 | 满 max_total_per_user | 409 USER_QUOTA_FULL |
| R12 | stuck item claim | 409 ITEM_INACTIVE,reason=stuck |
| R13 | done item claim | 409 ITEM_INACTIVE,reason=done |
| R14 | submit 但未 claim | 409 NOT_CLAIMED |
| R15 | submit 后 schedPost 抛错 | 409 SCHED_ERROR,submission 仍 claimed(待自愈) |
| R16 | release → submission='returned' + lease 释放 | 200,后续他人可 claim |
| R17 | release 但 lease 已超时 | 200(忽略 sched 错) |
| R18 | redo 删 duplicate/rejected | 200 removed=N |
| R19 | redo 无失败提交 | 404 NO_FAILED_SUBMISSION |
| R20 | redo 不动 status='claimed' 当前活动行 | SELECT 仍有那一行 |
| R21 | review.approved → 写采集 step result=approved | my-submissions 看到 |
| R22 | review.rejected reason 缺失 | **当前 min(1) 仅一字符过关 → 记契约缺口** |
| R23 | review 命中 disallowedFromSteps | 403 STEP_OPERATOR_CONFLICT,返 conflictStep |
| R24 | autoworker dedup duplicate 回写 | my_last_result=duplicate |

### 组 U:多租户 + RBAC(14 条,沿用 `multitenant.test.ts`)

| # | 场景 | 预期 |
|---|---|---|
| U1-4 | 鉴权:无 key / 错 key / revoked / 过期 | 401 |
| U5 | tenantA 调 tenantB 的 GET /pipelines/:id | 404(RLS 不暴露存在性) |
| U6 | tenantA 调 POST /result 用 tenantB 的 runId | 404 RUN_NOT_FOUND |
| U7 | scope=system 不带 X-Tenant-Id 调写 | isSystemActor=true,跨租户 |
| U8 | scope=system 带 X-Tenant-Id=A 写 B 的 item | 仅作用 A |
| U9 | scope=admin 但仅 readonly 调写 | 403 pipeline.write |
| U10 | dev 模式 AUTH_REQUIRED=false | caller 仍存,perms=["*"](生产应 fail-fast,3.7 缺口) |
| U11 | INTERNAL_KEY 跨进程被外部使用 | 应 401(当前不闭合,3.7 缺口) |
| U12 | bootstrapApiKey 同 key 重启 | upsert 不重复 |
| U13 | bootstrapApiKey 长度 <16 | warn 跳过 |
| U14 | 缺 audit.read 调 GET /admin/audit | 403 |

### 组 V:端到端混合(16 条,核心是 V1)

**V1(主线)**:`backend/test/e2e-mixed.test.ts` 一段连续脚本,模拟外部业务系统全程:

```
1. INTERNAL_KEY 启 fastify
2. 建 tenant + apiKey(scope=admin)
3. POST /api/templates → 含 collect + review 两 step
4. POST /api/projects(从模板)
5. POST /api/projects/:id/pipeline 保存 → 拿到 pipelineVersionId
6. POST /api/batches { target: 5 }
7. 轮询 GET /api/batches/:id 直到 firstStep.pending=5
8. 模拟 collector 用户 alice:
   GET /api/work/collect-tasks?batchId=X → 5 个
   for item in items: POST /claim → POST /submit { value }
9. 模拟 reviewer 用户 bob:
   GET /api/work/review-tasks → 5 个
   3 个 approved, 2 个 rejected
10. 等 reconciler tick → 2 个 rejected 回 collect step
11. alice (disallowedFromSteps 命中自己) → 切 charlie 重做 2 条 → submit → bob review approved
12. GET /api/batches/:id → approved=5, status=done
13. GET /api/datasets/:id/records → 5 条
```

| # | 场景 | 预期 |
|---|---|---|
| V1 | 上述主线 | 全程 200,审计完整,dataset=5 |
| V2 | DLQ:translate worker 失败 3 次 → stuck → admin replay → 跑通 | replay 后 outbox pending |
| V3 | 配额 maxConcurrent=2,claim 第 3 个 | 409 + 审计 quota.denied |
| V4 | 5 用户同时 claim 同 1 item | 仅 1 胜,outbox 1 条 leased |
| V5 | 多 reconciler 实例 + 大量过期 lease | advisory_lock 串行,无重复回收 |
| V6 | 版本钉死:批次创建 → 改 schema → 旧 item submit | 仍按旧 schema 通过 |
| V7 | 软暂停:5 item, 3 in-flight 时 pause | 3 全 done,b_status=paused |
| V8 | 永远达不到 target:maxLoops 用尽 → 5 stuck → 无关闭按钮 | **验证缺口 3.4** |
| V9 | schedPost 间歇失败:50% 注入 5xx | 业务层自愈链路最终一致 |
| V10 | 跨服务 INTERNAL_KEY 误用:业务层与 scheduler 不同进程同 key | **当前不拒绝(缺口 3.7)** |
| V11 | 批次创建幂等键:同 Idempotency-Key 重发 2 次 | **当前不识别(契约债)**,期望返同一 batchId |
| V12 | 批次创建 target=100 满流压测 | outbox 写吞吐 ≥ 50/s,无锁等待告警 |
| V13 | 业务层重启:进程崩溃后 30s 内恢复 | in-flight lease 不丢,reconciler 不误回 |
| V14 | scheduler 不可达 30s:业务层 schedPost retry+对账 | 恢复后无重复 result,无丢失 |
| V15 | reviewer 关浏览器:60s 后 lease 自然超时 → 他人接手 | NO_LEASED_RUN 后 reconciler 收回 |
| V16 | tenantA 业务层用 tenantB pipelineId 创建批次 | 404,无跨租户副作用 |

合计 R+U+V = **54 条**,加 A-Q 50+ → 总覆盖 **104+**。S/T 组下沉为 web 冒烟(每页 1 条,够证明联通即可,不进矩阵)。

---

## 六、故障演练清单(必须在预生产跑过)

| 演练 | 注入方式 | 验证点 |
|---|---|---|
| scheduler 短暂不可达(30-90s) | 防火墙临时阻断 | 业务层 schedPost 重试 + 对账 job 最终一致;无重复 result |
| 业务层崩溃重启 | kill -9 | in-flight item lease 不丢,reconciler 60s 内自愈 |
| Postgres 主从切换 | RDS failover | claim/submit 5xx 后可重试,outbox SKIP LOCKED 不死锁 |
| reconciler 多实例 split-brain | 同时启 3 实例 | advisory_lock(9527) 串行,无重复回收 |
| pipeline_version 不可变验证 | 跑批中改 schema | item 仍按 pinned version 跑;新批次拿新版 |
| INTERNAL_KEY 误配置 | 业务层与 scheduler 拆进程,REMOTE_SCHED 未设 | 应 fail-fast(当前不会,缺口 3.7) |
| outbox 表巨量积压 | 批量插 100k 条 pending | dispatcher LIMIT batch + index hit,无全表扫 |

---

## 七、边界场景(17 条,砍 UI 类后)

### 7.1 并发/竞争(6)

- **B-CR-1** 同 user 两 tab 同时 claim → 一胜一败 ALREADY_CLAIMING
- **B-CR-2** user 与 autoworker 同时 lease → DB `uniq_outbox_inflight` 兜底
- **B-CR-3** claim 第二段事务 INSERT submission 撞唯一索引 → 必须释放 lease
- **B-CR-4** reconciler 收回 lease 与 worker heartbeat 同时 → heartbeat 应 409
- **B-CR-5** 多业务实例 schedPost 同 runId → idempotency-key 兜底
- **B-CR-6** pause 与 claim race window → 接受 1-2 条额外通过,文档化

### 7.2 状态机边界(4)

- **B-SM-1** stuck 瞬间 review decide → NO_LEASED_RUN
- **B-SM-2** done item 上 redo → 404,errCode 精确
- **B-SM-3** 批次 pause + 其下 item 已 done → my-submissions 仍能列
- **B-SM-4** pipeline pause 时新建批次 → 应禁(当前未拦,记缺口)

### 7.3 权限/租户(3)

- **B-AT-1** tenantA 用 tenantB itemId → 404(RLS 隐式过滤)
- **B-AT-2** 角色刚 revoke,api-key 仍在 → 下个请求 403(权限缓存须 per-request)
- **B-AT-3** dev 模式 X-Tenant-Id 非 UUID → 应 400 而非 500

### 7.4 版本与一致性(3)

- **B-VC-1** item 钉 v1,admin 发 v2 → claim/decide 走 v1
- **B-VC-2** reviewedStepKey 在 v1 存在,v2 删 → 旧 batch 正常,新 batch configError
- **B-VC-3** dataset_records UPSERT 同 itemId 仅一条,多次 approved 不双行

### 7.5 时间相关(1)

- **B-TM-1** lease 60s vs claim 3600s 边界:刚到 60s 内 heartbeat → 应延长(reconciler 不抢)

---

## 八、落地建议

1. **R + V 组先落代码**(`backend/test/{business,e2e-mixed}.e2e.test.ts`) — 这是上线信心的根。**V1 主线必须能一键跑过**。
2. **U 组**沿用 `multitenant.test.ts` 矩阵化补齐。
3. **故障演练**每条至少在预生产跑一次,出报告。
4. **契约缺口 3.1-3.7** 转 issue,优先级:`3.4 > 3.5 > 3.7 > 3.3 > 3.6 > 3.2 > 3.1`(按"上线就需要"vs"可分阶段")。
5. **业务层接入手册**(第四节表格)整理成独立 markdown,给未来外部团队。
6. **错误码字典**补到 `02-api.md` 末尾,锁定 SLA。

---

## 文档索引

| 文件 | 内容 |
|---|---|
| [00-summary.md](./00-summary.md) | 总览(图解 + 比喻) |
| [01-design.md](./01-design.md) | 设计细节 |
| [02-api.md](./02-api.md) | 接口使用说明 |
| [03-testing.md](./03-testing.md) | 调度核心 e2e 用例 A-Q |
| **04-pm-qa-review.md** | **本文件:对外契约审计 + 端到端打通** |
