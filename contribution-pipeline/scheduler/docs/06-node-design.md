# 调度中心 · 功能节点设计

> 节点 = 调度中心的可治理、可复用、可审计的能力资产。本文是节点协议、动态配置表单、多运行形态、节点管理后台的落地依据。
>
> 本版已对齐当前 Phase 1/2/3 已实现的代码(`node_definitions` 三层配置 + auto-upsert + lease 服务端 resolver)。后续可扩展项集中在 §15。
>
> **流程总览图**: [`assets/06-node-lifecycle.svg`](./assets/06-node-lifecycle.svg) — 9 个 Phase 串起 driver 声明 → auto-upsert → pipeline 编辑 → ingest → lease → execute → result/route → 健壮性 → archive/activate 生命周期。
>
> **实现侧分层架构**: 见 [07-node-class-hierarchy.md](./07-node-class-hierarchy.md) — 公共壳 (lease 循环/心跳/校验/提交) 沉到基类, 节点子类只写 `handle`. 本篇 (06) 是"协议契约", 07 是"代码组织".

---

## 0. 修订说明 (v1 → v2)

为避免文档与代码长期漂移,本版基于 v1 的真实评审做了以下调整:

| 原 v1 内容 | 处理 | 原因 |
|---|---|---|
| `presets` 扁平 KV | 改回 `{defaults, constants, pin, secrets}` 四子结构 | 与 Phase 1 落地的代码一致;`pin` 是节点作者锁死字段的安全语义,不能丢 |
| binding 表达式裸 path (`payload.x`) | 统一为 `{{namespace.path}}` 包裹 | 与现有 resolver 一致;裸 path 会被当字面量 |
| `dict.X[Y].Z` 子表达式 | 砍,移到 §15 v2 扩展 | 索引子表达式需要完整 mini-DSL,远超 MVP 复杂度 |
| `runModes:[]` + `defaultRunMode` | 改为单一 `runMode` | 一个节点版本的 driver 实现决定一个 runMode |
| `runConfig` 作为 step 级独立配置块 | 砍,继续用 `step.params.driver/url` | runConfig vs params 边界含糊,统一在 params 下避免重复 |
| 5 态版本状态 (draft/active/deprecated/disabled/archived) | MVP 仅 2 态 (`active`/`archived`) | 多余状态等真实需求出现再加 |
| `status` vs `runtime_status` 两轴分离 | MVP 合并为一轴 | 运维体感需要再拆,目前混着不影响实现 |
| `paramsTransform` 自动迁移 | 砍,移 §15 | 目前零个 v2 版本案例,提前造迁移引擎是过度设计 |
| `node_test_cases` 整表 + case 跟随版本 | 砍持久化,只做内存 try endpoint | 持久化等 case 多到必须管理再上 |
| `node_runtime_events` 单独表 | 砍,合并到 `audit_log` | 已经有 audit_log,不要再起一张表 |
| `tenant_id` on `node_definitions` | 砍,保持全局节点目录 | 当前实现是全局表,租户隔离走 RLS 在业务层;节点目录跨租户共享是合理默认 |
| 15+ admin endpoint | MVP 切到 6 个核心 | 其余移 §15 |
| `dict / tenantConfig / system / secret` binding 命名空间 | MVP 仅 `payload / outputs / tags`;secret 走 `presets.secrets` envVar | 字典是个独立子系统,要单设计 |

---

## 1. 设计目标

### 1.1 产品目标

| 目标 | 说明 |
|---|---|
| 节点可发现 | Pipeline 编辑器动态拉取节点列表与各节点配置契约 |
| 配置可解释 | 节点声明必配、选配、默认值、枚举、校验规则、展示控件 |
| 接入可标准化 | 三种 worker 接入路径(in-process driver / HTTP service / 独立 worker)共用同一节点契约 |
| 运行可多形态 | 内置、内网服务、外部 Worker、人工页面 |
| 版本可治理 | 节点可发布、归档;Pipeline 实例钉住节点版本,升级不影响在飞 |
| 后台可运营 | 管理后台"节点管理"与"Pipeline 模板"平级 |

### 1.2 架构目标

| 目标 | 设计约束 |
|---|---|
| 调度核心保持通用 | 核心只理解 `nodeKey / nodeVersion / params / inputs / output`;不解读业务语义 |
| 节点协议稳定 | 新节点接入不改调度核心,只新增节点定义 + 执行适配 |
| 配置先校验再保存 | Pipeline 保存时按节点版本 schema 校验,运行时只拿已校验配置 |
| 运行时强兼容 | 在飞 item 钉死创建时的 pipeline_version_id → 钉死的 nodeVersion → 老 driver 实现 |
| 多 Pipeline 隔离 | 执行边界 = `tenantId + taskId + stepKey + nodeVersion + runId`,节点不得按 `nodeKey` 反查"当前配置" |
| 入参统一注入 | 服务端 lease 解析 `step.inputs` 表达式 → 写入 `job.inputs`,节点像函数一样消费已校验入参 |
| 安全可控 | 外部 HTTP / Worker 节点必须有鉴权、超时、allowlist、重试、审计 |

---

## 2. 节点定位

### 2.1 节点是什么

一个可被 Pipeline Step 引用的能力定义,包含:
- 节点身份: `key`、`version`、`displayName`、`category`、`description`
- 配置契约: `paramsSchema`(配置参数)、`inputsSchema`(运行时输入)、`outputsSchema`(产出声明,只展示用)、`uiSchema`(编辑器渲染)、`presets`(节点作者预设)
- 运行契约: `runMode`、`defaultTimeoutMs`、`defaultMaxAttempts`、`idempotent`、`manual`
- 治理: `status`、`createdAt / updatedAt`

### 2.2 Node 与 Step 的关系

| 概念 | 粒度 | 例子 | 归属 |
|---|---|---|---|
| Node Definition | 全局节点类型 + 版本 | `llm_translate@1.0` | 节点管理 |
| Step | Pipeline 内的节点实例 | `translate#1` 引用 `llm_translate@1.0` | Pipeline / 模板 |
| Run | 某 item 在某 step 的一次执行 | `runId=...` | 调度队列 |

一个节点可被多 Pipeline 复用;同 Pipeline 里多次使用同种节点,每个 Step 的 `key` 必须唯一。

---

## 3. 节点协议

### 3.1 节点定义

```jsonc
{
  "key": "ocr",
  "version": "1.2.0",
  "displayName": "OCR 识别",
  "category": "ai",
  "description": "识别图片或 PDF 中的文字",
  "status": "active",
  "manual": false,
  "idempotent": true,
  "runMode": "internal_http",
  "paramsSchema": {
    "type": "object",
    "required": ["engine"],
    "properties": {
      "engine":              { "type": "string", "enum": ["paddle", "tesseract", "llm_vision"] },
      "language":            { "type": "string" },
      "confidenceThreshold": { "type": "number", "minimum": 0, "maximum": 1 }
    }
  },
  "inputsSchema": {
    "type": "object",
    "required": ["fileUrl"],
    "properties": {
      "fileUrl":  { "type": "string", "defaultBinding": "{{payload.fileUrl}}" },
      "mimeType": { "type": "string", "defaultBinding": "{{payload.mimeType}}" }
    }
  },
  "outputsSchema": {
    "type": "object",
    "properties": {
      "text":       { "type": "string" },
      "confidence": { "type": "number" },
      "decision":   { "type": "string" }
    }
  },
  "uiSchema": {
    "groups": [
      { "id": "basic", "label": "基础", "fields": ["engine", "language"] },
      { "id": "adv",   "label": "高级", "fields": ["confidenceThreshold"] }
    ],
    "fields": {
      "engine":              { "widget": "select" },
      "language":            { "widget": "select" },
      "confidenceThreshold": { "widget": "slider", "min": 0, "max": 1, "step": 0.05 }
    }
  },
  "presets": {
    "defaults":  { "language": "zh-CN", "confidenceThreshold": 0.8 },
    "constants": { "maxFileSizeMb": 32 },
    "pin":       ["maxFileSizeMb"],
    "secrets":   { "ocrApiKey": { "envVar": "OCR_API_KEY" } }
  },
  "defaultTimeoutMs": 30000,
  "defaultMaxAttempts": 3
}
```

**presets 四子结构语义** (与 Phase 1 落地一致):

| 子结构 | 谁能填 | 谁能覆盖 | 用途 |
|---|---|---|---|
| `defaults` | 节点作者 | step.params 可覆盖 | 兜底值 |
| `constants` | 节点作者 | **pin 列出的不可覆盖** | 节点作者锁死的常量 |
| `pin: []` | 节点作者 | — | 哪些 constants 字段强制锁死 |
| `secrets` | 节点作者 | — | env 引用,worker 端解析,不进 pipeline JSON |

**最终生效参数计算**:

```text
effectiveParams = { ...presets.defaults, ...step.params };
for (key of presets.pin) effectiveParams[key] = presets.constants[key];
```

### 3.2 Step 引用

```jsonc
{
  "key": "invoice_ocr",
  "nodeKey": "ocr",
  "nodeVersion": "1.2.0",
  "label": "发票 OCR",
  "params": {
    "engine": "paddle",
    "language": "zh-CN",
    "confidenceThreshold": 0.85
  },
  "inputs": {
    "fileUrl":  "{{payload.invoiceImageUrl}}",
    "mimeType": "{{payload.mimeType}}"
  },
  "routes": {
    "on": "decision",
    "cases": {
      "accepted":    { "goto": "export" },
      "need_review": "next"
    },
    "default": "next"
  },
  "policy": {
    "timeoutMs":   45000,
    "maxAttempts": 2
  }
}
```

`step.inputs` 缺省字段会走 `inputsSchema.properties.<k>.defaultBinding` 兜底。

### 3.3 动态配置表单

Pipeline 编辑器编辑 Step 时:

1. 按 `nodeKey + nodeVersion` 拉节点定义。
2. `paramsSchema.required` 决定必填项。
3. `uiSchema.groups` 决定字段分组;`uiSchema.fields.<k>` 决定控件。
4. `inputsSchema.properties.<k>` 渲染输入绑定行,默认展示 `defaultBinding`,可改成其他 `{{path}}` 表达式或字面量。
5. `outputsSchema` 只读展示"这个节点会吐出什么",供下游 Step 的 binding picker 引用。
6. 保存前后端双校验:`step.params` 符合 `paramsSchema`,`step.inputs` 满足 `inputsSchema.required`。

字段分区建议:

| 分区 | 内容 | 用户心智 |
|---|---|---|
| 基础配置 | 必配项、最常改的选项 | 不填不能保存 |
| 输入绑定 | 从 `payload / outputs / tags` 取什么 | 这个节点吃什么数据 |
| 输出说明 | 只读展示 `outputsSchema` | 这个节点会吐出什么 |
| 路由配置 | 按输出字段决定下一步 | 跑完后去哪 |
| 高级配置 | 超时、重试 | 一般不用动 |

### 3.4 表达式语法 v1

`step.inputs` 与 `inputsSchema.defaultBinding` 的字符串值按以下规则求值:

| 写法 | 语义 |
|---|---|
| `"{{payload.x}}"` | `envelope.payload.x`,**整段 `{{}}` 保留原值类型**(number/object/array 不变 string) |
| `"{{outputs.A.y}}"` | 上游 Step `A` 的 `outputs[A].y` |
| `"{{tags.z}}"` | `envelope.tags.z` |
| `"prefix {{payload.x}} suffix"` | 部分模板拼接,**强制 String 化** |
| `"literal"` / `""` | 字面量(空串也是字面量,不走 defaultBinding) |
| `123` / `true` / `{a:1}` | 非字符串值直接透传(已是字面量) |

**命名空间** v1 只有 `payload / outputs / tags`。

**安全**: 路径解析屏蔽 `__proto__ / constructor / prototype`,只走 own properties。

**缺失路径**: 整段 `{{...}}` → `undefined`(字段不出现在 `job.inputs`);部分模板片段 → `""`。

> v2 扩展(详见 §15): `dict.X`(字典查值)、`tenantConfig.X`、`system.now` 等;以及 `[index]` 子表达式索引。

---

## 4. 多 Pipeline 执行隔离

同一节点版本(如 `ocr@1.2.0`)同时服务多 Pipeline 时,执行必须被完整上下文包裹,不能让 A Pipeline 的配置 / 输入 / 输出 / 缓存污染 B Pipeline。

### 4.1 执行上下文边界

每次执行的最小隔离单元是 `runId`,完整上下文:

```jsonc
{
  "tenantId":        "tenant-a",
  "taskId":          "pipeline-id",
  "pipelineVersionId":"...",
  "stepKey":         "invoice_ocr",
  "nodeKey":         "ocr",
  "nodeVersion":     "1.2.0",
  "runId":           "run-id",
  "itemId":          "item-id",
  "attempt":         1,
  "deadline":        "..."
}
```

调度核心 lease 时按这组上下文组装 job;节点执行器**不得**只按 `nodeKey` 自己反查"当前配置"。

### 4.2 配置合并与隔离

| 配置来源 | 归属 | 共享性 | 说明 |
|---|---|---:|---|
| `node_definitions.paramsSchema` | 节点版本 | ✓ | 描述节点能力 |
| `node_definitions.presets` | 节点版本 | ✓ | 节点级默认 + 锁死 + secrets |
| `step.params` | Pipeline Step | ✗ | 每 Pipeline / Step 实例配置 |
| `step.inputs` | Pipeline Step | ✗ | 每 Step 自己声明吃哪些数据 |
| `presets.secrets` 解析后的值 | 运行进程的环境 | ✗ | 只通过 `secretRef` 注入,不落明文 |

合并规则见 §3.1 末尾。

### 4.3 状态与缓存隔离

节点实现按"纯函数优先"设计:

```text
output = nodeFunction(inputs, params, context)
```

若节点内部需要缓存,缓存 key **必须**包含隔离维度:

```text
tenantId : taskId : stepKey : nodeKey : nodeVersion : hash(inputs, params)
```

**禁止**只用 `nodeKey` 或 `modelName` 做全局缓存 key。

### 4.4 执行正确性的校验点

| 阶段 | 校验 | 失败处理 |
|---|---|---|
| 保存 Pipeline | `nodeKey + nodeVersion` 在 `node_definitions` 中且 `status=active` | 400 拒绝保存 |
| 保存 Step | `step.params` 符合 `paramsSchema` | 字段级错误 |
| 保存 Step | `step.inputs` 显式 + `inputsSchema.defaultBinding` 兜底后覆盖 `required` | 字段级错误 |
| 保存 Step | binding 表达式引用的 `outputs.X` 中 `X` 是合法 stepKey | 字段级错误 |
| Lease 组装 job | resolveBindings 解析 `step.inputs` | 失败入 attempts,可重试或 DLQ |
| Result | `output` 可选按 `outputsSchema` 软校验 | 写 warning 不阻断 |

---

## 5. 节点入参与上下文注入

节点像函数一样工作:接受明确入参,返回明确结果。它不该自己到处查 item、前置节点、字典和系统配置;这些由调度中心解析后注入。

### 5.1 标准 Job 形态(driver / Worker 拿到的)

```jsonc
{
  "runId":       "run-id",
  "itemId":      "item-id",
  "taskId":      "pipeline-id",
  "tenantId":    "tenant-a",
  "stepKey":     "invoice_ocr",
  "nodeKey":     "ocr",
  "nodeVersion": "1.2.0",
  "params":   {
    "engine":              "paddle",
    "language":            "zh-CN",
    "confidenceThreshold": 0.85,
    "maxFileSizeMb":       32
  },
  "inputs":   {
    "fileUrl":  "https://...",
    "mimeType": "image/png"
  },
  "envelope": {
    "payload": {},
    "outputs": {},
    "tags":    {}
  },
  "ctx": {
    "attempt":  1,
    "deadline": "2026-05-12T08:00:00.000Z"
  }
}
```

节点代码只依赖:

```text
handle(inputs, params, context) -> output
```

`envelope` 字段在 job 里**仍然存在**,作为调试 / 历史兼容用,但**新节点应只读 `inputs`**;直接读 `envelope.payload.x` 等于把硬编码的取数路径写进 driver,违背 Phase 3 设计意图。

### 5.2 数据入参

仅 `payload / outputs / tags` 三个命名空间。`outputs.X` 的 `X` 是上游 Step 的 `key`(不是 `nodeKey`)。

### 5.3 Secrets 注入

走 `presets.secrets` 的 envVar 引用:

```jsonc
"presets": {
  "secrets": { "ocrApiKey": { "envVar": "OCR_API_KEY" } }
}
```

执行时由 worker 进程在自己的环境读 `process.env.OCR_API_KEY` 拿到值。**调度核心不解析 secret 实际值,只透传 secret name**(避免明文穿越服务边界)。

paths B/C 异构 worker 需要按 `presets.secrets.<name>.envVar` 自行解析。

### 5.4 统一校验流程

```text
node.presets.defaults + step.params  ──→  validate paramsSchema
                                              │
                                              │  pin 锁死 constants
                                              ▼
                                       effectiveParams
                                              │
step.inputs + inputsSchema.defaultBinding ─→  resolveBindings(envelope)
                                              │
                                              ▼
                                       validate inputsSchema.required
                                              │
                                              ▼
                                       dispatch to driver
                                              │
                                              ▼
                                       (optional) validate outputsSchema
                                              │
                                              ▼
                                       write result / route next step
```

校验错误分类:

| 错误类型 | 示例 | 责任方 | 处理 |
|---|---|---|---|
| 配置错误 | 必填参数缺失、枚举非法 | Pipeline 作者 | 保存时 400 |
| 绑定错误 | 引用不存在的 stepKey | Pipeline 作者 | 保存时 400 |
| 数据错误 | item 缺必需字段 | 数据来源 | 当前 run failed,可回流或 DLQ |
| 密钥错误 | `secretRef` 不存在或无权限 | 管理员 / 运维 | 不派发,直接失败并告警 |

---

## 6. 节点运行方式

### 6.1 总览

| runMode | 适用场景 | 执行者 | 主要风险 |
|---|---|---|---|
| `embedded` | 去重、入库、轻量脚本、系统内置 | 调度核心 AutoWorker / Driver Registry | 代码发布绑定主系统 |
| `internal_http` | OCR、模型推理、内网服务 | HTTP Driver 转发到内网 endpoint | SSRF、超时、服务 SLA |
| `external_worker` | Python/Go、GPU、独立部署 | 外部 worker 主动 lease + result | worker 版本、租约、心跳 |
| `manual` | 采集、审核、校对 | 业务层页面 + 用户 | 权限、配额、重复提交 |

### 6.2 内置 (embedded)

节点逻辑作为 TS Driver 注册在调度核心代码内(`src/drivers/*.ts`),通过 Driver Registry 精确 `nodeKey` 或通配匹配。

适合: `dedup` / `export` / 轻量 JSON 转换 / 条件判断。

要求: 幂等;不长时间阻塞主进程;生产环境不执行不受信脚本。

### 6.3 内网服务 (internal_http)

调度核心 lease 到 job 后,HTTP Driver 把 job 转发到内网服务。

```jsonc
// 请求 (POST <serviceUrl>)
{
  "runId": "...", "itemId": "...", "taskId": "...",
  "stepKey": "invoice_ocr", "nodeKey": "ocr", "nodeVersion": "1.2.0",
  "params":  { "engine": "paddle" },
  "inputs":  { "fileUrl": "https://..." },
  "envelope":{ "payload": {}, "outputs": {}, "tags": {} },
  "ctx":     { "attempt": 1, "deadline": "..." }
}

// 响应
{
  "status": "success",
  "output": { "text": "...", "confidence": 0.94, "decision": "accepted" }
}
// 或
{
  "status": "failed",
  "error":  { "code": "...", "message": "...", "retryable": true }
}
```

配置: pipeline step.params 写 `{ driver: "http", url: "http://...", timeoutMs: 60000 }`;`url` 必须在 `SANDBOX_URL_ALLOWLIST` env 内。

### 6.4 外部 Worker

worker 自己订阅 `nodeKey`:

1. `POST /api/v1/queue/:nodeKey/lease` 拉活
2. 长任务定期 `POST /api/v1/queue/lease/:runId/heartbeat`
3. 完成后 `POST /api/v1/result`
4. 失败返回 `retryable`,调度中心决定重试或 DLQ
5. 优雅停机时 `POST /api/v1/queue/lease/:runId/release` 放回在飞租约

需要 worker-only API key(`keys-create --roles=worker`),含 `queue.lease + queue.result` 权限。

### 6.5 人工节点

人工节点仍走 lease / result,只是执行者是浏览器+用户:

- 节点定义 `manual=true`,`runMode=manual`
- `paramsSchema` 描述页面表单 schema、审核 rubric、互斥规则
- `outputsSchema` 描述用户提交的输出结构
- 业务层负责用户、配额、资格、互斥;调度核心只负责 outbox/lease/result

---

## 7. 节点版本管理

### 7.1 版本规则

`MAJOR.MINOR.PATCH` (SemVer)。

| 变更类型 | 例子 | 版本策略 |
|---|---|---|
| 兼容修复 | 文案、默认值、内部 bugfix | PATCH |
| 兼容增强 | 新增可选参数、新增输出字段 | MINOR |
| 不兼容变更 | 删除字段、必填项变化、输出结构变化、语义变化 | MAJOR |

**从老命名 `1.0` 迁移**: 现有 `node_definitions.version="1.0"` 不动,新发布版本写 `1.0.1` / `1.1.0` / `2.0.0`。处理 SemVer 比较时容错老格式:`1.0` 等价于 `1.0.0`。

### 7.2 状态

MVP 仅 2 态:

| 状态 | 可被新 Step 引用 | 已有 Step 继续运行 |
|---|:---:|:---:|
| `active` | ✓ | ✓ |
| `archived` | ✗ | ✓ |

更细的 `draft / deprecated / disabled` 见 §15。

### 7.3 Pipeline 与节点版本的关系

- 新建 Step 默认选该节点最新 `active` 版本
- 保存 Pipeline / 模板时**必须**写入 `nodeVersion`
- 已发布 pipeline 不应被节点定义静默升级影响 — 通过 `pipeline_versions` append-only + `items.pipeline_version_id` 钉死,已在 Phase 1 落地
- 节点升级后,后台提供"影响分析":哪些模板、项目、在飞 item 使用旧版本
- 模板手动升级节点版本:展示 schema diff,允许"复制并升级"

---

## 8. 管理后台设计

### 8.1 信息架构

```text
管理后台
├── 标注项目
├── Pipeline 模板
├── 节点管理       ← 新增,与模板平级
└── 审计日志
```

模板解决"怎么编排",节点管理解决"有哪些可编排能力"。

### 8.2 节点列表页

字段:

| 字段 | 说明 |
|---|---|
| 节点名称 | `displayName` |
| Key | `key` |
| 最新版本 | 最新 `active` 版本 |
| 分类 | `category` (ai / data / manual / system / external) |
| 运行方式 | `runMode` |
| 状态 | `active / archived` |
| 使用情况 | 被多少模板、项目引用 |
| 更新时间 | 最近一次发布或修改 |

筛选: category / runMode / status / key 搜索 / 风险节点(archived 仍有在飞)。

### 8.3 节点详情页

Tab:

| Tab | 内容 |
|---|---|
| 概览 | 基本信息、状态、运行方式、默认策略 |
| 配置协议 | `paramsSchema / inputsSchema / outputsSchema / uiSchema` JSON 全文 + 可视化预览 |
| 调试 | dry-run 面板(见 §8.4) |
| 版本历史 | 每个版本的状态、变更说明、发布时间 |
| 引用关系 | 被哪些模板 / 项目 / Step 引用 |
| 运行监控 | pending / leased / success / failed / 平均耗时 / 超时率 |
| 接入说明 | Path A/B/C 接入样例链接 |

### 8.4 调试 (dry-run)

调试面板填:
- `params` (按 `paramsSchema` 渲染)
- `inputs` 表达式 (按 `inputsSchema` 渲染)
- `envelope.payload / outputs / tags` (作为表达式求值上下文)

点"试运行" → 后端 `POST /api/v1/admin/nodes/:key/:version/debug/run`,构造合成 `DriverJob`,**绕过 outbox / attempts**,直接 invoke driver.handle,返回 result。

执行结果 5 个区块:
- 解析后入参 (resolveBindings 求值后的 inputs)
- 配置 (effectiveParams)
- 执行结果 (output 或 error)
- 耗时 / 日志 / route 预览

MVP 调试**不持久化**case;调过的输入/输出留在本地浏览器 sessionStorage。持久化 case 管理见 §15。

### 8.5 Pipeline 编辑器联动

编辑 Step 时右侧面板:

```text
节点: OCR 识别   ocr@1.2.0
状态: active
运行方式: 内网服务

[基础配置]
- 识别引擎 *      [select: paddle/tesseract/llm_vision]
- 语言            [select: zh-CN/en-US/...]

[输入绑定]                                ← binding picker
- fileUrl *   ← {{payload.invoiceImageUrl}}
- mimeType    ← {{payload.mimeType}}

[输出说明]
- text       : string
- confidence : number
- decision   : string

[路由]
- decision = accepted    → export
- decision = need_review → manual_review

[高级]
- timeoutMs
- maxAttempts
```

---

## 9. 后端数据模型

### 9.1 当前已实现的 schema (Phase 1/2/3)

```sql
node_definitions
  key                  TEXT NOT NULL
  version              TEXT NOT NULL
  display_name         TEXT NOT NULL
  params_schema        JSONB NOT NULL
  ui_schema            JSONB
  presets              JSONB
  inputs_schema        JSONB
  idempotent           BOOLEAN NOT NULL DEFAULT FALSE
  default_timeout_ms   INT NOT NULL DEFAULT 30000
  default_max_attempts INT NOT NULL DEFAULT 3
  manual               BOOLEAN NOT NULL DEFAULT FALSE
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  PRIMARY KEY (key, version)
```

**全局表,无 tenant_id**。节点目录跨租户共享(类似公司内部能力库)。

### 9.2 节点管理 MVP 需追加的列

```sql
ALTER TABLE node_definitions
  ADD COLUMN status            TEXT NOT NULL DEFAULT 'active'  -- 'active' | 'archived'
  ADD COLUMN category          TEXT                            -- 'ai' | 'data' | 'manual' | 'system' | 'external'
  ADD COLUMN run_mode          TEXT                            -- 'embedded' | 'internal_http' | 'external_worker' | 'manual'
  ADD COLUMN outputs_schema    JSONB
  ADD COLUMN description       TEXT
  ADD COLUMN updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();
```

这些字段在 `DriverNodeDefinition` 里同步声明,由 auto-upsert 写入。

### 9.3 与现有"driver 是真相源"的关系

- `node_definitions` 行内容由 driver 启动时 auto-upsert 同步(Phase 1 已落)
- 管理后台**展示** node_definitions 的内容
- 管理后台对节点的运行态变更(active → archived)直接写 `node_definitions.status`,不被 auto-upsert 覆盖(upsert 仅写"代码描述的字段",不写 status)

> v2 扩展表(node_versions / node_runtime_configs / node_test_cases 等)见 §15。

---

## 10. API 设计

### 10.1 现有公开 endpoint(Worker 协议,已实现)

| 接口 | 用途 |
|---|---|
| `GET /api/v1/nodes` | Pipeline 编辑器读节点列表 + 三层 schema |
| `POST /api/v1/queue/:nodeKey/lease` | worker 按节点类型拉活 |
| `POST /api/v1/queue/lease/:runId/heartbeat` | 长任务续租 |
| `POST /api/v1/queue/lease/:runId/release` | 主动释放 |
| `POST /api/v1/result` | 提交结果 |

`lease` 返回的 job 已包含: `params`(服务端 merge 后)、`inputs`(resolveBindings 求值后)、`nodeVersion`、`tenantId`、`envelope`、`ctx`。

### 10.2 节点管理 MVP 新增 endpoint

| 接口 | 用途 |
|---|---|
| `GET /api/v1/admin/nodes` | 节点管理列表,含状态、引用数、最新版本 |
| `GET /api/v1/admin/nodes/:key/:version` | 节点定义详情 |
| `GET /api/v1/admin/nodes/:key/:version/usages` | 被哪些模板、项目、在飞 item 引用 |
| `POST /api/v1/admin/nodes/:key/:version/archive` | 归档版本(`status=archived`) |
| `POST /api/v1/admin/nodes/:key/:version/activate` | 重新激活(`status=active`) |
| `POST /api/v1/admin/nodes/:key/:version/debug/run` | dry-run,不写 outbox/attempts |

更细的版本治理 endpoint(发布草稿、迁移分析等)见 §15。

---

## 11. 典型跑通流程

### 11.1 流程一:内置去重 + 人工审核 + 入库

```text
manual_collect → dedup → manual_review → export
```

| Step | Node | runMode |
|---|---|---|
| `manual_collect` | `manual_input@1.0` | manual |
| `dedup`          | `dedup@1.0`        | embedded |
| `manual_review`  | `review@1.0`       | manual |
| `export`         | `export@1.0`       | embedded |

调度核心 autoworker 自动 lease 内置节点;人工节点等业务层用户 claim。

### 11.2 流程二:内网 OCR + 人工校对

```text
upload → ocr → manual_correct → export
```

OCR 节点 step 配置:

```jsonc
{
  "key": "ocr",
  "nodeKey": "ocr",
  "nodeVersion": "1.2.0",
  "params": {
    "driver":  "http",
    "url":     "http://ocr-service.internal/run",
    "engine":  "paddle"
  },
  "inputs": {
    "fileUrl":  "{{payload.fileUrl}}",
    "mimeType": "{{payload.mimeType}}"
  }
}
```

调度核心 autoworker 把 job 转发到 OCR 内网服务,服务按 DriverResult 协议返回。

### 11.3 流程三:外部 Python Worker 推理

```text
ingest → classify → review_if_needed → export
```

Python worker 主循环:

```text
while True:
  jobs = POST /queue/text_classifier/lease
  for job in jobs:
    output = predict(job.inputs.text, job.params.modelName)
    heartbeat if long running
    POST /result {runId, status, output}
```

路由按 `output.decision` 走 `auto_accept → export` 或 `need_review → next`。

### 11.4 流程四:同节点服务多 Pipeline

`ocr@1.2.0` 同时被两个 Pipeline 使用:

| Pipeline | Step | params | inputs |
|---|---|---|---|
| 发票 | `invoice_ocr` | `engine=paddle, confidenceThreshold=0.85` | `fileUrl={{payload.invoiceImageUrl}}` |
| 病历 | `record_ocr` | `engine=llm_vision, confidenceThreshold=0.7` | `fileUrl={{payload.recordPdfUrl}}` |

调度核心 lease 时按 `taskId + stepKey + nodeVersion` 组装 job:
- 发票 job 得到 `inputs.fileUrl = payload.invoiceImageUrl 的值`
- 病历 job 得到 `inputs.fileUrl = payload.recordPdfUrl 的值`
- OCR 服务只看到解析后的 `inputs + params + context`,**不自行读取 Pipeline 配置**
- 缓存 key 含 `tenantId:taskId:stepKey:nodeVersion`,不会串缓存

### 11.5 流程五:节点调试 (dry-run)

管理员要验证 `text_classifier@2.0.0`:

1. 打开"节点管理 → text_classifier@2.0.0 → 调试"
2. 表单填 `params.modelName=quality-v2`
3. 填 `inputs.text = {{payload.title}}`
4. 填 `sampleEnvelope.payload.title = "测试标题"`
5. 点"入参预览" → 系统 resolveBindings 解析出 `inputs.text = "测试标题"`,按 `inputsSchema` 校验
6. 点"试运行" → 系统调真实 driver/HTTP service/worker sandbox,返回 `output = { label, score, decision }`
7. 不写 outbox/attempts,纯内存

---

## 12. 安全与治理

| 风险 | 控制手段 |
|---|---|
| 外部服务 SSRF | `url` 必须在 `SANDBOX_URL_ALLOWLIST` env 中(已实现) |
| 节点配置泄密 | 密钥只保存 `presets.secrets.<name>.envVar`,不进 pipeline JSON / lease 返回 |
| Worker 重复提交 | `/result` 以 `runId + lease 状态`保证幂等收敛 |
| 节点升级破坏在飞任务 | Step 钉住 `nodeVersion`,`pipeline_versions` append-only(已实现) |
| 多 Pipeline 串配置 | lease job 必带 `taskId/stepKey/nodeVersion/runId`,节点不得按 `nodeKey` 反查 |
| 多 Pipeline 串缓存 | 缓存 key 必含 tenant + Pipeline + Step + 节点版本 + 输入 hash |
| 入参不完整 | `step.inputs` resolveBindings 后按 `inputsSchema` 校验,失败不派发 |
| 长任务假死 | heartbeat + lease 过期 reconciler 回收 |
| 人工节点越权 | 业务层按用户、配额、批次、角色判断 |
| 表达式 prototype 污染 | resolver 屏蔽 `__proto__/constructor/prototype`(已实现) |

---

## 13. MVP 落地建议

### 13.1 第一阶段(已实现 Phase 1/2/3)

- `node_definitions` 三层(`params_schema / ui_schema / presets / inputs_schema`)
- driver 自带 `nodeDefinition`,autoworker 启动时 auto-upsert
- Pipeline 编辑器按 `paramsSchema` 渲染表单(后端就绪,前端待接)
- 保存 Pipeline 时按 schema 校验
- lease 服务端 merge effectiveParams + resolveBindings(`{{path}}` 表达式)
- pickDriver 三轮派发,支持多版本(driver 多实例并存)

### 13.2 第二阶段(节点管理 MVP)

- 前端新增"节点管理"一级菜单
- 列表页 + 详情页(只读 catalog + schema 展示 + usages)
- 调试面板 (dry-run endpoint)
- `node_definitions` 加 `status / category / run_mode / outputs_schema / description / updated_at` 列
- archive / activate 管理接口
- driver 端补 `outputsSchema`(给编辑器渲染输出说明)

### 13.3 第三阶段(治理与运行态)

- paths B/C(Python service + 独立 worker)同步消费 `job.inputs`(目前还在读 envelope)
- 完善 HTTP Driver 协议文档(02-api.md + openapi.yaml)
- 节点运行监控:耗时 / 成功率 / 超时率 / DLQ
- pickDriver pass-2 收紧(详见 memory P2 留尾)
- dedup / export / sandbox-js 加 `inputsSchema`(目前还硬编码 envelope 路径)

---

## 14. 关键结论

- 节点是调度中心的"能力资产",Pipeline 模板是"能力编排"。两者管理后台平级。
- 动态配置来自节点定义的 `paramsSchema / inputsSchema / outputsSchema / uiSchema` 四份 schema。
- Step 必须钉住 `nodeVersion`,通过 `pipeline_versions` append-only + `items.pipeline_version_id` 钉死,节点升级不污染在飞任务。
- 同节点服务多 Pipeline 时,执行边界 = `tenantId + taskId + stepKey + nodeVersion + runId`,**不是** `nodeKey`。
- 节点是函数:`handle(inputs, params, context) -> output`。`inputs` 是服务端 resolveBindings 后的已解析入参,节点不直接消费 envelope。
- 表达式语法 v1 = `{{namespace.path}}`,命名空间 `payload / outputs / tags`,无子表达式索引。
- 入参校验发生在节点执行前(`step.inputs` + `defaultBinding` 兜底)。
- 节点管理 MVP 优先做:可发现(列表)+ 可解释(详情)+ 可调试(dry-run)+ 可治理(active/archived)四件事。
- 持久化测试用例、多状态机、自动迁移、字典子系统等都在 §15 v2,**不进 MVP**。
- 运行方式不改变调度核心协议;无论 embedded / internal_http / external_worker / manual,最终都收敛到 lease / heartbeat / result。

---

## 15. 未来扩展 (v2+)

以下条目已在 v1 文档中讨论但不进 MVP,集中放这里避免影响实施节奏。

### 15.1 字典子系统(`dict.*` 命名空间)

需要新增设计:
- `dictionaries(key, version, data jsonb, tenant_scope)` 表
- 字典 CRUD 后台
- 字典版本化与"运行时按哪版字典执行"的可追溯(`inputsMeta.dictVersion`)
- 表达式扩展支持 `{{dict.X.Y}}` 与 `[index]` 子表达式
- 缓存与失效策略

业务诉求示例: 业务类型编码、审核标准、标签体系、模型名册、地区映射。

### 15.2 表达式语法 v2

- `[expr]` 子表达式索引: `{{dict.document_types[payload.documentType].name}}`
- 内置函数: `{{date(now)}}` / `{{lower(payload.x)}}`
- 默认值运算符: `{{payload.x ?? "default"}}`

需要一个完整 mini-DSL 设计,远超 v1 简单替换。

### 15.3 持久化测试用例

- `node_test_cases(id, node_key, node_version, name, params, inputs, sample_envelope, expected, last_result, ...)` 表
- 用例跟随节点版本
- 节点发布前要求所有 case 跑过
- 从历史 run 一键复制为 case
- Breaking change 强制全部 case 重跑

### 15.4 多状态机

`draft / active / deprecated / disabled / archived` 五态,以及 `status`(版本治理)vs `runtime_status`(接单态)双轴分离。

需要在节点详情页加状态流转 UI,以及每种状态的行为规则。

### 15.5 自动迁移

```jsonc
{
  "from": "1.1.0",
  "to":   "1.2.0",
  "compatible": true,
  "paramsTransform": { "language": "lang" },
  "outputsTransform": { "text": "content" }
}
```

需要先在 driver 实现里支持版本到版本的 transform 钩子,以及对在飞 item 是否原地升级的策略。

### 15.6 `inputsMeta` 完整契约

lease 返回的 job 额外带:

```jsonc
"inputsMeta": {
  "fileUrl":  { "source": "step.inputs", "expr": "{{payload.invoiceImageUrl}}" },
  "language": { "source": "presets.defaults" },
  "dictRef":  { "source": "dict.document_types", "version": "2026-05-01" }
}
```

用于回溯调试、字典版本归档、审计。

### 15.7 节点目录的租户隔离

如果某天需要"租户 X 私有节点不让租户 Y 看到",再给 `node_definitions` 加 `tenant_id`(nullable,NULL = 全局节点)+ 列表接口的 RLS 过滤。当前 MVP 跨租户共享一份能力库即可。

### 15.8 节点运行态独立治理

`runtime_status`(active 接单 / paused 暂停 / stopped 关闭)与 `status`(版本治理)解耦,以及"强制回收已 leased 超长任务"的运营接口。

### 15.9 节点版本字典 / 节点版本配置

`presets` 之外再加节点版本绑定的字典(`nodeDict.supported_languages`)和外部配置中心引用(`config.model_catalog`)。

---

## 变更记录

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-05-12 | 初始版本,新增功能节点协议、运行方式、版本治理、后台设计和典型流程。 |
| v1.1 | 2026-05-12 | 补充多 Pipeline 执行隔离、节点入参注入与校验、节点调试用例、启动暂停关闭运行态。 |
| v2.0 | 2026-05-12 | 大幅修订: 对齐 Phase 1/2/3 已实现代码(presets 四子结构、`{{path}}` 表达式语法);删 v1 中冲突项(裸 path、扁平 presets、tenant_id on node_definitions);砍过度设计(paramsTransform 迁移、持久化 cases、5 态状态机、`runtime_status` 双轴);所有 v1 中讨论但不进 MVP 的条目集中到 §15 v2 扩展。文档从 1153 行精简到约 700 行,P0/P1 段更精准。 |
