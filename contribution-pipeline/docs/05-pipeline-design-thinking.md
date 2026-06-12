# Pipeline 设计思考大纲

> 用途:配合脑图工具(XMind / MarginNote / FreeMind 等)逐项展开,把 pipeline 的每个模块、每个环节、模块间/环节间对接、数据结构与流转想清楚。
>
> 阅读建议:从外到内、从静到动 — 先把名词定清楚,再走每个 stage 的设计维度,最后看对接、运行态、边角。

---

## 一、概念层级(先把名词定清楚)

- **Project 项目** — 业务范围 / 标注目标
- **Task 任务** — 一次具体的执行单元(采集 / 标注 / 评测 / …)
  - 任务类型 → 决定 pipeline 形态
  - 任务状态机:草稿 / 运行 / 暂停 / 完成 / 失败
- **Pipeline** — 任务内部的环节序列(线性?DAG?)
- **Stage / Step** — 单个环节
  - 节点类型 vs 节点实例(schema vs config)
  - **Implementation 实现** — 同一节点类型的不同执行方式
- **Item / RunItem** — 在 pipeline 里流动的最小单元
- **Artifact** — 各阶段产出的中间物 / 最终物

---

## 二、每个模块/环节的设计维度

> 每个 stage 都按这个维度清单过一遍,缺哪一项就补哪一项。

- **职责** — 一句话说清楚做什么、不做什么
- **输入契约** — 期待什么形态的数据(必需字段 / 可选字段)
- **输出契约** — 产出什么形态(下游需要什么)
- **配置项** — 静态参数(schema)
- **实现选项** — 同一职责的多种实现
- **执行模式** — 同步 / 异步 / 批 / 流
- **执行者** — 系统自动 / 人(角色)/ 半自动
- **失败/异常** — 失败如何表达、能否重试、是否阻塞下游
- **进度与可观测** — 队列长度 / 完成率 / 性能指标
- **状态变迁** — item 进入/退出此阶段的条件

---

## 三、节点分类(在细化各环节前先分类)

节点不是平铺的"一堆 stage",先按几个维度分类,会发现哪些是"同一种元能力的不同包装"、哪些是真的独立。

### 3.1 按数据流向
- **主流节点** — 输入 item、输出 item(可能改变状态/字段)
- **旁路节点** — 不改变 item,只产生副作用 → 典型:**通知 notify**

### 3.2 按位置(主流节点内部)
- **入口节点** — 产生新 item:**采集 collect** / **导入 import**
- **中间节点** — 加工 item:**去重 dedup** / **数据转换 transform** / **预标注 pre-annotate** / **标注 annotate** / **审核 review**
- **出口节点** — 把 item 送出:**导出 export**

### 3.3 按执行者
- **系统自动** — import / dedup / transform / pre-annotate / export / notify
- **人工** — annotate / review / collect(表单/上传场景)
- **半自动** — review(规则+人工兜底)/ collect(API+人审)

### 3.4 按"元能力"(同一种能力的不同包装)
- **标注元能力 (label capability)** — `pre-annotate` 和 `annotate` 共享同一套标签 schema、同一种产出形态(`annotation`),区别只是执行者(ML vs 人)
  - 设计含义:label schema 应当是节点上面一层的概念,被 pre-annotate / annotate 引用,而不是各自独立配
- **审核元能力 (review capability)** — 规则审核 / 人工审核 / 抽样审核 共享一套"通过 / 打回"的判定接口
- **转换元能力 (transform capability)** — 同一种 transform 可以在多个位置插入(采集后、标注前、导出前)
- **入库元能力 (ingest capability)** — `collect`(产生新数据)和 `import`(从已有数据集/上游任务拉取)在产出形态上是一致的,区别在于来源域

> 这一节提醒自己:不要给每个 stage 各写一套独立 schema,先抽出元能力,再让 stage 引用。

---

## 四、各环节单独细化

### 4.1 采集 collect(入口·主流)
- 来源类型(本地 / S3 / API / 表单)
- 触发模式(手动 / 定时 / 推送)
- 表单 schema 与 item 的映射
- 一次提交是否 = 一条 item
- 与 `import` 的边界:`collect` 是"产生新数据",`import` 是"引入已有数据"

### 4.2 导入 import(入口·主流)
- 来源类型(文件 / S3 数据集 / LS 项目 / **上游任务**)
- 静态快照 vs 动态订阅
- 拉模式 vs 推模式
- 增量 vs 全量
- lineage:导入的 item 必须保留 `sourceTaskId / sourceItemId`

### 4.3 去重 dedup(中间·主流)
- 字段类型(图像 / 地址 / 文本)与算法
- 去重粒度(项目内 / 任务内 / 跨任务)
- 重复样本处理(丢弃 / 标记 / 合并)

### 4.4 数据转换 transform(中间·主流·可多处插入)
- 转换类型 — 字段映射 / 格式转换(图像 resize、文本清洗) / schema 投影 / 字段加密脱敏
- 插入位置 — 采集后 / 标注前 / 标注后 / 导出前 都可能用得到
- 是否破坏性 — 覆盖原字段 vs 写入新字段(保留原始)
- 失败策略 — 跳过 / 阻塞 / 进死信队列
- 配置形式 — 表达式 / 模板 / 脚本

### 4.5 预标注 pre-annotate(中间·主流·标注元能力)
- 与 annotate 共享同一套 label schema(必要约束)
- 模型选择(YOLOv8 / SAM / LLM / 自训练)
- 置信度策略 — 高置信度直通审核?低置信度才进人工?
- 输出形态 — `annotation.predictions[]` 与 `annotation.labels[]` 的关系
- 失败/超时 — 跳过 vs 阻塞
- 是否对人工标注员可见(供参考 vs 锁定)

### 4.6 标注 annotate(中间·主流·标注元能力)
- 标注 schema 与 item kind 的耦合
- 是否接受预标(只读 / 可改 / 必须重做)
- 一条 item 的多人标注 / 重标 / 共识机制
- 工具集成(Label Studio / 自研编辑器)

### 4.7 审核 review(中间·主流·审核元能力)
- 审核策略(全量 / 抽样 / 规则)
- 通过 / 打回(打回到 annotate? pre-annotate? collect?)
- 多级审核 / 仲裁
- 不通过的数据归宿(丢弃 / 入死信 / 退回上游任务)

### 4.8 导出 export(出口·主流)
- 格式(COCO / YOLO / JSONL / CSV / 自定义)
- 触发(攒批 / 定时 / 手动 / 达 targetCount)
- 出库后状态(done / archived)
- 增量导出 vs 全量重导

### 4.9 通知 notify(旁路·副作用)
- 触发事件 — item 进入某 stage / 任务状态变化 / 阈值告警 / 异常
- 通道 — 站内消息 / Webhook / 邮件 / IM
- 频次控制 — 每条 vs 攒批 / 防抖
- 失败重试与降级
- 与主流的关系 — 通知失败**不应**阻塞主流 pipeline
- 订阅方 — 角色 / 用户 / 外部系统

---

## 五、环节间对接(stage ↔ stage)

- **传递形态** — 是 item 整体过去,还是只过去一个引用 / 一个产出?
- **推 vs 拉** — 上游处理完主动 push 到下游队列,还是下游主动 pull?
- **顺序契约** — 必须严格顺序,还是允许跳跃?(例:打回 = review → annotate 倒流)
- **批 vs 单条** — 单条流水线 vs 批处理(export 通常是批)
- **跨阶段共享数据** — 哪些字段是"全程携带",哪些是"某阶段私有"
- **失败语义** — 上游失败下游怎么办?(整任务失败 / 跳过此条 / 重试)
- **幂等** — 重复执行同一条是否安全

---

## 六、任务间对接(task ↔ task)

### 6.1 依赖类型
- 数据依赖(A 的 output → B 的 input)
- 时序依赖(A 完成才能启动 B)
- 配置依赖(B 复用 A 的 schema / 标签集)

### 6.2 数据流转
- 复制 vs 引用
- 一对一 / 一对多 / 多对一
- 实时(逐条)/ 批(任务结束)

### 6.3 触发
- 上游 item 状态变化时镜像
- 上游任务完成时整批导入
- 手动"导入快照"

### 6.4 更改影响
- 上游修订/删除某条数据,下游已经标注的怎么办

---

## 七、数据结构(把字段从概念落到 type)

### 7.1 类型定义清单

- **Project** — 名称 / 类型 / schema 模板?
- **Task** — 类型 / 状态 / pipeline / 目标量 / 上游引用 / 角色权限
- **Pipeline** — 节点序列 + 连接关系(线性?DAG?)
- **StepConfig** — 节点 key / 实现 key / 参数 / 状态
- **RunItem** — 不变字段(id/source) + 阶段产物字段
  - 通用字段 vs item kind 特有字段(image / form / text)
  - 阶段产物字段是平铺(`annotation`, `reviewStatus`)还是分层(`stageOutputs[stage]`)?
- **跨任务 lineage** — item 的 `sourceItemId` / `sourceTaskId`
- **角色/权限** — Stage → Role 映射

---

### 7.2 RunItem 生命周期(参考 Label Studio,扩展支持表单模板)

> 参考 LS 的 task 模型:`data`(原始载荷,不变) + `predictions[]`(模型标注) + `annotations[]`(人工标注) + `meta`(元数据)。在此基础上加 `dedup` / `transform` / `review` / `lineage` 几个 envelope 字段;并把 `data` 泛化为可承载表单 `formData`,使同一套结构既能装图像,也能装自定义表单。

#### 7.2.1 顶层 envelope(跨 stage 不变 / 增量扩展)

```jsonc
{
  // === 标识 ===
  "id": "i-abc123",
  "taskId": "t-1",

  // === 1. data: 原始载荷 (collect/import 写入, 之后不变) ===
  "data": {
    // 图像类:
    "image": "https://.../001.jpg",
    // 或表单类(自定义表单模板):
    "templateId": "real_world_photo_collection",
    "formData": {
      "photos": ["data:image/...", "data:image/..."],
      "address": "0xabc...",
      "note": "早高峰东三环"
    }
  },

  // === 2. meta: 元数据 (collect 写入, 各 stage 可附加 audit) ===
  "meta": {
    "kind": "image" | "form",
    "source": "form_submit",
    "createdAt": "2025-04-25T09:01:00Z",
    "createdBy": "u-collector-1"
  },

  // === 3. lineage: 跨任务血缘 (import 写入) ===
  "lineage": {
    "sourceTaskId": "t-0",
    "sourceItemId": "i-x9y8z7"
  },

  // === 4. dedup: 去重产物 (dedup 写入) ===
  "dedup": {
    "input":  { "images": ["data:image/..."], "addresses": ["0xabc..."] },
    "hashes": ["md5:..."],
    "keys":   ["md5:..."],
    "kept": true,
    "duplicateOf": null,
    "duplicateMatchKey": null
  },

  // === 5. transform: 转换产物 (transform 写入, 可多次, 非破坏) ===
  "derived": {
    "image_resized": "data:image/...",
    "address_normalized": "0xabc..."
  },

  // === 6. predictions: 模型预标 (pre-annotate 写入, 可多次/多模型) ===
  "predictions": [
    {
      "id": "p1",
      "model_version": "yolov8n",
      "score": 0.87,
      "createdAt": "2025-04-25T09:02:00Z",
      "result": [
        {
          "id": "r1",
          "from_name": "label",         // 控件名 (取自 label config)
          "to_name": "/image",          // JSON Pointer → 指向 data 里的字段
          "type": "rectanglelabels",
          "value": {
            "x": 10, "y": 20, "width": 30, "height": 40,
            "rectanglelabels": ["car"]
          }
        }
      ]
    }
  ],

  // === 7. annotations: 人工标注 (annotate 写入, 可多人) ===
  "annotations": [
    {
      "id": "a1",
      "completedBy": "u-annotator-2",
      "completedAt": "2025-04-25T10:30:00Z",
      "leadTime": 23.4,                  // 秒
      "wasPredicted": true,              // 是否基于预标修改
      "result": [ /* 同 predictions.result 结构 */ ]
    }
  ],

  // === 8. review: 审核结论 (review 写入) ===
  "review": {
    "status": "approved" | "rejected" | "pending",
    "reviewer": "u-reviewer-3",
    "reviewedAt": "2025-04-25T11:00:00Z",
    "reason": "",
    "annotationId": "a1"                 // 审核的是哪一条 annotation
  },

  // === 9. export: 出库标记 (export 写入) ===
  "exports": [
    { "format": "coco", "exportedAt": "...", "outputPath": "..." }
  ],

  // === 10. currentStage: 当前队列位置 (运行态指针) ===
  "currentStage": "annotate"
}
```

设计要点:
- `data` **不变** — collect / import 写入后,后续 stage 一律不修改。需要派生数据写到 `derived`
- 各 stage 产物**互不覆盖** — 每个 stage 写自己的 envelope 字段,可以并行 / 重跑
- `predictions` / `annotations` 是**数组** — 支持多模型预标、多人标注
- `from_name` / `to_name` 沿用 LS 习惯,但 `to_name` 用 **JSON Pointer** 而不是控件名,以支持表单字段寻址

---

#### 7.2.2 各 stage 的消费 / 产出契约

| Stage | 读 (consume) | 写 (produce) | 备注 |
| --- | --- | --- | --- |
| **collect** | (外部输入) | `data`, `meta`, `currentStage` | 新建 envelope |
| **import** | 上游 RunItem | `data`, `meta`, `lineage`, `currentStage` | clone + 写血缘 |
| **dedup** | `data` (经 dedupInput 抽取) | `dedup` | 不通过则推进 currentStage 到 done |
| **transform** | `data` / `derived` | `derived` (推荐非破坏) | 可多次插入 |
| **pre-annotate** | `data` | `predictions[]` | 不阻塞下游, 失败可跳过 |
| **annotate** | `data`, `predictions[]`(供参考) | `annotations[]` | |
| **review** | `annotations[]` | `review` | reject 可打回 annotate(currentStage 倒流) |
| **export** | `data` + `annotations[]`(approved) | `exports[]`(只标记) | 写出文件,不改主 envelope |
| **notify** | 任意 stage 事件 | — (副作用) | 通知失败不影响 envelope |

> 这张表配 7.2.1 的 envelope,等于把"每个 stage 在 RunItem 上动了哪几个字段"完全锁死。

---

#### 7.2.3 标签寻址:`to_name` = JSON Pointer

LS 原生 `to_name` 是控件名(如 `image`),只够覆盖"一个 task 一个标注对象"的场景。一旦支持自定义表单模板,task 里可能有多个字段需要分别标注。把 `to_name` 改成 **JSON Pointer**,统一寻址:

| 场景 | `to_name` | 指向 |
| --- | --- | --- |
| 单图像目标检测 | `/image` | `data.image` |
| 表单内某张图 | `/formData/photos/0` | `data.formData.photos[0]` |
| 表单内文本字段(NER) | `/formData/note` | `data.formData.note` |
| 表单内地址字段(分类) | `/formData/address` | `data.formData.address` |

label config(对应 LS 的 XML)也按 JSON Pointer 来声明可标注字段。同一个 envelope + 同一套 result schema 既装图像也装表单,扩展不破坏。

---

#### 7.2.4 演进示例:一条数据走完全 pipeline

每个 stage 后,新增的字段用 `+++` 标注,被推进的 `currentStage` 用 `~~~` 标注。

**Stage 0 · collect 完成后:**
```jsonc
{
  "id": "i-1", "taskId": "t-1",
+++ "data": { "image": "data:image/..." },
+++ "meta": { "kind": "image", "createdAt": "...", "createdBy": "u-1" },
~~~ "currentStage": "dedup"
}
```

**Stage 1 · dedup 完成后:**
```jsonc
{
  ... ,
+++ "dedup": { "hashes": ["md5:abc"], "keys": ["md5:abc"], "kept": true, "duplicateOf": null },
~~~ "currentStage": "pre-annotate"
}
```

**Stage 2 · pre-annotate 完成后:**
```jsonc
{
  ... ,
+++ "predictions": [{
+++   "id": "p1", "model_version": "yolov8n", "score": 0.87,
+++   "result": [{ "from_name": "label", "to_name": "/image", "type": "rectanglelabels",
+++              "value": { "x": 10, "y": 20, "width": 30, "height": 40, "rectanglelabels": ["car"] } }]
+++ }],
~~~ "currentStage": "annotate"
}
```

**Stage 3 · annotate 完成后(标注员在预标基础上微调):**
```jsonc
{
  ... ,
+++ "annotations": [{
+++   "id": "a1", "completedBy": "u-2", "wasPredicted": true,
+++   "result": [{ "from_name": "label", "to_name": "/image", "type": "rectanglelabels",
+++              "value": { "x": 12, "y": 22, "width": 28, "height": 38, "rectanglelabels": ["car"] } }]
+++ }],
~~~ "currentStage": "review"
}
```

**Stage 4 · review approved:**
```jsonc
{
  ... ,
+++ "review": { "status": "approved", "reviewer": "u-3", "annotationId": "a1" },
~~~ "currentStage": "export"
}
```

**Stage 5 · export 完成后:**
```jsonc
{
  ... ,
+++ "exports": [{ "format": "coco", "exportedAt": "...", "outputPath": "./output/coco.json" }],
~~~ "currentStage": "done"
}
```

打回路径(review reject):`review.status = "rejected"` + `currentStage` 倒流回 `annotate`,**不删** `annotations[a1]`,而是新增 `annotations[a2]`,这样审计完整可见。

---

#### 7.2.5 一对多:多标注员场景的数据组织与流转

> 「一条 item 被多人标注」不是新增一种结构,而是 `annotations[]` 这个数组从"一般只有 1 条"变成"会有 N 条";配套需要一个 item 级别的**进度指针** `annotateState`,告诉运行时"这条 item 在 annotate 阶段是不是真的处理完了"。

##### A. 数据组织(envelope 上的增量)

```jsonc
{
  // ... data / meta / dedup / predictions 不变 ...

  // === annotations: N 条独立标注 ===
  "annotations": [
    { "id": "a1", "completedBy": "u-A", "completedAt": "...", "leadTime": 23.4, "result": [/*...*/] },
    { "id": "a2", "completedBy": "u-B", "completedAt": "...", "leadTime": 19.1, "result": [/*...*/] },
    { "id": "a3", "completedBy": "u-C", "status": "skipped", "skipReason": "图像模糊" }
  ],

  // === annotateState: item 在 annotate 阶段的进度指针 (新增) ===
  "annotateState": {
    "required": 3,                          // 配置: 至少 N 人提交才算完成
    "assigned": ["u-A", "u-B", "u-C"],      // 派单 (可选; 没派单就走抢占式)
    "submitted": ["u-A", "u-B"],            // 已提交的标注员 ID
    "skipped":   ["u-C"],
    "complete": false                        // submitted.length >= required ?
  },

  // === consensusAnnotation: 合并产出 (可选, 由 annotate.merge 子步骤产生) ===
  "consensusAnnotation": {
    "id": "c1",
    "strategy": "majority_vote",            // majority_vote / take_first / arbiter / ...
    "sourceAnnotations": ["a1", "a2"],      // 引用而非复制
    "agreement": 0.83,                      // IAA, 用于审核优先级
    "result": [/*...*/]                     // 合并后的结果, 形态同单条 annotation.result
  },

  // === review: 改成针对 consensusAnnotation, 或针对单条 annotation ===
  "review": {
    "target": "consensus",                  // "consensus" | "annotation"
    "annotationId": "c1",                   // 审核的是哪条 (consensus 或 a1/a2/a3)
    "status": "approved",
    "reviewer": "u-3"
  }
}
```

设计要点:
- `annotations[]` 里每条**互相独立**,带各自的 `completedBy` / `completedAt` / `result` / 可选 `status: skipped`
- `annotateState` 是 item 级别的"是否完成"指针,**不**是从 `annotations.length` 推导,因为有 skipped、有派单未提交,需要显式
- `consensusAnnotation` 是**派生物**,通过 `sourceAnnotations` 引用原标注,不复制结果(便于审计、便于 strategy 切换)
- `review` 默认审核 `consensus`;若关闭合并,则对每条 annotation 单独 review(`review` 字段可能也要变数组,看是否支持"分别审核")

---

##### B. 队列流转(annotate 阶段内部)

单标注员场景:item 在 annotate 队列里**对所有人都是同一条**,谁来都能取。
多标注员场景:item 对每个人是不是"可见"取决于 ta 有没有提交过。队列变成**人维视图**:

```
annotate 队列 (item-level)
  ├─ item-1: assigned=[A,B,C], submitted=[A,B], 还差 C
  ├─ item-2: assigned=[A,B,C], submitted=[A],   还差 B, C
  └─ item-3: assigned=[D,E,F], submitted=[],    全员未提交

标注员 A 看到的队列:
  └─ item-3 (未派给 A) 不可见
  └─ item-1 / item-2 中 A 已提交 → 不可见
  → A 看到 0 条 (这批都标完了)

标注员 C 看到的队列:
  └─ item-1 (差 C) ✓ 可见
  └─ item-2 (差 C) ✓ 可见
```

可见性判定:
```
visible_to(item, user)
  = user ∈ item.annotateState.assigned
  ∧ user ∉ item.annotateState.submitted
  ∧ user ∉ item.annotateState.skipped
```

派单两种模式:
- **预派单**:item 进入 annotate 阶段时,调度器选 N 人写入 `assigned`(可控但需要算法决定 N 人是谁)
- **抢占式**:不写 `assigned`,任何标注员都能取,直到 `submitted.length >= required` 后这条不再出现在队列里(简单但不能保证多样性)

---

##### C. stage 推进条件(谁来判定 item 离开 annotate)

每次有人提交一条 annotation,运行时跑一遍判定:

```
on annotation submitted:
  push annotation into item.annotations[]
  push user into item.annotateState.submitted

  if submitted.length >= required:
    item.annotateState.complete = true
    if 配置启用合并:
      run merge_strategy → write consensusAnnotation
    advance currentStage: annotate → review
```

边角:
- **超时**:超过配置时长仍没凑齐 N 人,管理员可强制推进(`complete=true` 标记 `forceAdvanced`)
- **skip**:`skipped` 不计入 `submitted`,但要避免死锁 — 配置 `accept_skip_as_submission` 决定 skip 是否消耗一个名额
- **退回**:review reject 后,`currentStage` 倒流到 annotate,但此时 `annotateState.submitted` 不清空,而是依据"打回策略"处理:
  - 重做一条:在 `assigned` 末尾追加新人(或同一人),`required` 不变,需要再凑 1 条
  - 全部重做:清空 submitted,重新走一遍

---

##### D. 各 stage 对一对多的契约更新

| Stage | 多标注员场景下的差异 |
| --- | --- |
| **annotate** | 写 `annotations[]`(append 一条) + 更新 `annotateState`;不直接推进 currentStage,由判定逻辑推进 |
| **annotate.merge**(可选子步) | 读 `annotations[]`,按 `merge_strategy` 写 `consensusAnnotation` |
| **review** | 默认审 `consensusAnnotation`;打回时通过 `review.target` + `annotationId` 精确指明审的是哪条 |
| **export** | 默认导出 `consensusAnnotation.result`;审计模式下也可导出 `annotations[]` 全量(可见每个标注员的版本) |

> **核心一句话**:`annotations[]` 的多元化 + `annotateState` 这个 item 级指针 + 可选的 `consensusAnnotation` 派生物,三件套就够覆盖一对多。`currentStage` 仍是单值,不需要变成 per-user。

---

## 八、运行态 / 执行模型

- **谁在驱动 pipeline**
  - 显式 worker 循环
  - 用户操作 UI 时被动驱动(原型常见)
  - 事件 / 订阅
- **并发 / 多人协作** — 同一 stage 多人同时取队列
- **暂停 / 恢复 / 取消**
- **目标量达成** — 达到 targetCount 后是停采集还是允许超采
- **重放 / 重跑** — 配置改了之后,已处理 item 要不要重新跑一遍

---

## 九、配置 vs 实例(静态 vs 动态)

### 9.1 三层模型

三层独立、不要互相耦合:

| 层 | 含义 | 体现 |
| --- | --- | --- |
| Schema 层 | 节点能做什么 | `STEP_SCHEMAS` |
| Config 层 | 这次任务怎么用 | `StepConfig` |
| Runtime 层 | 实际运行产生的数据 | `RunItem` 上的 stage 字段 |

**数据流向只走单向**:Schema → 派生 Config(`buildPipeline()` 用 schema 默认值灌一份) → 任务运行时读 Config + 写 Runtime。Runtime 不能反向修改 Config,Config 不能反向修改 Schema。

---

### 9.2 Schema 层:节点能做什么

每个节点 schema 描述了**"这个节点暴露给配置面板的能力面"**:

```ts
interface FieldSchema {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "textarea" | "tags";
  default?: any;
  options?: { value: string; label: string }[];
  help?: string;
  placeholder?: string;
}

interface ImplementationSchema {
  key: string;          // 例: "exact_hash" / "perceptual_hash"
  label: string;
  description: string;
  fields: FieldSchema[];
}

interface StepSchema {
  key: StepKey;         // 例: "dedup"
  label: string;
  icon: string;
  color: string;
  implementations: ImplementationSchema[];   // 同一节点的多种实现
}
```

举例(dedup 节点):
```jsonc
{
  "key": "dedup", "label": "去重", "icon": "Filter",
  "implementations": [
    { "key": "images",    "fields": [ {key:"algo",   type:"select", options:[...]},
                                       {key:"threshold", type:"number", default:0} ] },
    { "key": "addresses", "fields": [ {key:"chain",  type:"select", options:[...]},
                                       {key:"case_sensitive", type:"select", options:[...]} ] }
  ]
}
```

要点:
- **节点 key** 决定 icon/color/role,影响所有渲染
- **implementation** 决定字段集 — 切实现 = 换一套字段
- **field.type** 是渲染分发的开关(见 9.4.2)
- **field.default** 是 buildPipeline 时灌进 Config 的初值

---

### 9.3 Config 层:任务里的实例

```ts
interface StepConfig {
  key: StepKey;             // 对应 schema.key
  implementation: string;   // 当前选中的 impl key
  params: Record<string, any>;   // 字段值, 由 schema fields 派生
}

type Pipeline = StepConfig[];   // 任务持有
```

`buildPipeline(taskType)` 按节点顺序,为每个节点选第一个实现,把所有 `field.default` 灌到 `params` 里 — 这是"零配置可运行"的基础。

---

### 9.4 配置如何驱动渲染(四个渲染面)

#### 9.4.1 画布节点(StepNode)
读取:`schema.icon` / `schema.color` / `schema.label` + `config.implementation`
- 节点形状/位置:由 pipeline 顺序决定,**不受 config 影响**
- 节点副标:`config.implementation` 变化时显示 "去重 · 按图片"
- 选中态:UI 状态,不写入 config

> **切实现不重画节点**,只换副标 — 这点很关键,canvas 稳定。

#### 9.4.2 配置面板(NodeConfigPanel)
读取:`schema.implementations` + 当前 `config`
- **顶部** — 实现选择器,列出 `schema.implementations`;切换时**重置** `params` 为新 impl 的 defaults(老 params 丢弃,避免脏字段)
- **中部** — 遍历当前 impl 的 `fields`,按 `field.type` 分发渲染:
  ```
  text       → <input type="text">
  number     → <input type="number">
  select     → <select>
  multiselect→ <checkbox group>
  textarea   → <textarea>
  tags       → 标签输入器
  ```
  → **加新 field type 必须同步加新 case**,否则面板渲染不出来
- **字段联动** — `field.help` 渲染为说明;复杂联动(A 选了 X 才显示 B)需要扩展 schema(加 `field.visibleWhen`)
- **写回** — 用户改字段 → 写 `config.params[field.key]` → 标记任务"未保存"

#### 9.4.3 队列入口(StageQueuePage 入口卡片)
读取:`schema.icon/color/label` + 运行时 `items.filter(currentStage===stage).length` + `STAGE_ROLE`
- 卡片样式:`schema.color`
- 队列计数:实时,**与 config 无关**
- 角色权限标识:`STAGE_ROLE[stage]` 映射,与 config 无关

> 这一层基本"看 schema、看 runtime",不直接读 params。

#### 9.4.4 处理界面(*Process 组件)
读取:`config.implementation` + `config.params`
- **implementation 是粗粒度分发开关** — 进入 stage 处理界面时,先按 implementation 选要渲染的子组件:
  ```
  collect.form_submit  → <SchemaForm template={params.template_id}/>
  collect.local_upload → <DropzoneUpload/>
  export.coco          → COCO 预览 + 下载按钮
  export.csv           → CSV 预览 + 下载按钮
  ```
- **params 是细粒度调节** — 同一子组件内部,params 改变行为:
  ```
  collect.form_submit.params.template_id  → 注入哪个表单模板
  annotate.params.labels                  → LS Editor 注入的标签集
  annotate.params.ml_backend              → 是否拉预标 + 拉哪个模型
  ```

---

### 9.5 配置如何驱动运行时逻辑(两层分发)

#### 9.5.1 implementation 分发 — 走哪条代码路径

```ts
// dedup
switch (config.implementation) {
  case "images":    return hashImage(input, config.params);
  case "addresses": return normalizeAddress(input, config.params);
}

// export
switch (config.implementation) {
  case "coco": return buildCoco(items);
  case "yolo": return buildYolo(items);
  case "jsonl": return buildJsonl(items);
  case "csv":  return buildCsv(items);
}
```

#### 9.5.2 params 调节 — 同一路径的参数化

```ts
// dedup.images
const algo = config.params.algo;            // exact_hash | perceptual_hash | embedding
const threshold = config.params.threshold;  // 命中阈值

// pre-annotate
const model = config.params.ml_backend;
const conf  = config.params.conf_threshold;  // 低于此阈值的预测被丢弃
```

#### 9.5.3 跨 stage 的配置耦合(易踩坑)
- `pre-annotate.params.labels` 必须 = `annotate.params.labels` — 同一**标注元能力**应当上提到 task 级,各 stage 引用而非各自配
- `review.params.打回目标` 决定 `currentStage` 倒流到 `annotate` 还是 `pre-annotate`
- `dedup.params.source_field`(JSON Pointer)依赖 collect 表单模板的字段路径 — 改表单字段必须同步改 dedup 配置,否则空指针

> **建议**:把跨 stage 共享的 schema(如 label schema)提升为 task 级别,各 stage 配置通过 reference 引用,避免多处复制 → 多处不一致。

---

### 9.6 配置变更对运行中数据的影响

每个字段在 schema 上声明三态之一:

| 状态 | 含义 | 例子 |
| --- | --- | --- |
| **mutable** | 任意时候可改,只影响新流入的 item | `pre-annotate.conf_threshold` |
| **rerun-required** | 改了之后已处理的 item 需要重跑该 stage | `dedup.algo`(改了算法,老 hash 失效) |
| **frozen-after-write** | 一旦该 stage 有 runtime 写入就锁定 | `annotate.labels`(已经有标注产出,改了会让老数据对不上) |

实现:
- schema 中给 field 加 `mutability: "mutable" | "rerun-required" | "frozen-after-write"`
- 配置面板读这个字段决定输入框是否禁用、是否给警告
- 如果是 `rerun-required`,改完弹出"已处理 N 条受影响,是否重跑"

---

### 9.7 一图概括 schema → config → render → logic

```
            STEP_SCHEMAS (静态, 全局)
                  │
                  │ buildPipeline(taskType): 选第一个 impl, 灌 defaults
                  ▼
            Task.pipeline: StepConfig[] (Config 层)
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   StepNode   ConfigPanel  *Process
   (副标)     (字段渲染)   (实现分发 + params 调节)
                              │
                              ▼
                       writes RunItem (Runtime 层)
```

> 一句话:**schema 决定能配什么,config 决定本次怎么配,render 是 config 的可视化,logic 是 config 的可执行化。**

---

### 9.8 Schema 的边界:够用 vs 不够用

> 上面 9.1~9.7 都假设节点的配置 = "几个预定义字段 + 选项"。但有些节点(典型如**数据转换**、**规则评估**、**派单策略**)的行为本质上是用户自己定义的逻辑 — 这时纯 schema 不够,需要把"代码 / 表达式"也变成 schema 的一种 field type。

#### A. Schema(预定义字段)够用的情形
- 字段是 primitive / enum / 数组 / 对象,**取值范围有限**
- 行为完全由参数决定,**不需要用户表达逻辑**
- 例:`dedup.algo` / `pre-annotate.conf_threshold` / `export.format`

#### B. Schema 不够用的典型反例
- **数据转换** — 把 A 字段映射成 B 字段、字符串重组、嵌套展平
- **规则评估** — review 的 "标签数 > 0 且面积 > 100"
- **格式转换** — 任意结构 → 任意结构
- **派单策略** — 多人标注 "按地域 + 经验分桶"
- **AI 后处理** — 预标完做 NMS / 过滤 / 合并

共同特征:**输入到输出的映射不是静态的,而是用户自己定义的逻辑**。

#### C. 配置能力的六个阶梯(从弱到强)

| 阶梯 | 形式 | 适用 | 例 |
| --- | --- | --- | --- |
| 1 | **预定义参数** | schema 基本类型 | `algo: "exact_hash"` |
| 2 | **字段映射表** | 声明式 `from → to` | `dedup.source_field` 已在用 |
| 3 | **表达式** | JSONata / JMESPath / JsonLogic | review 规则、字段计算 |
| 4 | **模板** | Handlebars / Liquid | 通知文案、字符串拼接 |
| 5 | **代码片段** | sandbox 跑用户脚本(JS/Python) | 自定义 transform、复杂分支 |
| 6 | **外部函数 / Webhook** | 完全外置,schema 只存 URL | 大计算 / 私有逻辑 |

→ 对应 schema 上扩展 field type:`expression` / `template` / `code` / `mapping`。配置面板按 9.4.2 分发渲染:`code` 渲染成 Monaco 编辑器、`expression` 渲染成带语法高亮的小输入框、`mapping` 渲染成可拖拽的字段映射表。

#### D. 数据转换节点的实际配置:三档可选(同节点不同 implementation)

**档 1 · preset(预设转换)** — 最常见,优先用
```jsonc
{
  "implementation": "preset",
  "params": {
    "preset": "image_resize",          // 预设清单: image_resize / text_clean / json_flatten / ...
    "args": { "width": 640, "height": 640 }
  }
}
```

**档 2 · mapping(字段映射)** — 声明式,可视化
```jsonc
{
  "implementation": "mapping",
  "params": {
    "mappings": [
      { "from": "/data/raw_text",  "to": "/derived/cleaned_text",
        "transform": "trim | lowercase" },
      { "from": "/data/timestamp", "to": "/derived/date_ymd",
        "transform": "format_date('YYYY-MM-DD')" }
    ]
  }
}
```

**档 3 · script(脚本)** — 兜底
```jsonc
{
  "implementation": "script",
  "params": {
    "language": "python",
    "code": "def transform(item, ctx):\n    text = item['data']['text']\n    return { 'derived': { 'cleaned': text.strip().lower() } }",
    "timeout_ms": 5000,
    "memory_mb": 128
  }
}
```

→ 三档共享同一个 NodeProcessor 接口,只是 processor 内部按 implementation 分发。
→ 用户**先尝试 preset,不够再 mapping,再不够才 script**。

#### E. 引入"代码字段"必须配套的东西

只加一个 `type: "code"` 是不够的,周边配套必须一起到位:

- **沙箱执行** — 隔离环境(WASM / subprocess / Docker / Lambda),禁网、禁文件系统、限内存、限时
- **强制接口契约** — 必须 `transform(item, ctx) -> patch` 这样的签名,避免任意 `main`
- **干跑预览** — 配置面板有"用一条样本 item 试跑"按钮,直接看输出
- **静态校验** — lint / 类型提示 / 禁止 import 危险模块
- **审计** — 谁写的 / 改了什么 / 运行多少次 / 错误率
- **版本与回滚** — 脚本本身是一个 artifact,有版本号,可以回滚到历史版本
- **可移植性警告** — 含脚本的任务导出/复制时提示用户(脚本不一定能在另一个环境跑)

> 这套配套缺一项,引入代码字段就是定时炸弹。

#### F. 设计决策:先声明式,后代码

**原则:能用声明式就不用代码**

- 90% 的转换需求能被"字段映射 + 预设函数"解决,先把这条路修宽
- 用户开始写"奇形怪状的 expression"时,意味着声明式表达力耗尽,该提供脚本了
- 提供脚本之后**不要废掉声明式** — 简单需求继续走声明式(可读、可校验、可可视化编辑、可静态分析)

→ 落在 schema 上:`transform` 节点保留 `preset` / `mapping` / `script` 三个 implementation 并存,**不**把所有逻辑都塞 script。

#### G. 更进一步:把"自定义实现"做成一等公民

最强的配置 = 让用户**注册自己的 implementation**(参见 10.3)。路径:
- 用户写一个 NodeDefinition(脚本 + 一份 schema 描述,作为一个插件)
- 通过插件系统注册到本项目 / 全局
- 之后该实现和内置实现一样出现在配置面板下拉里,带自己的 fields 和 ProcessView

→ 这就走到了"低代码 → 代码 → 框架级扩展"的最高一阶,跟 LS 注册自定义 tag 是一回事。

#### H. 一句话回答原问题

> **够用吗?** — 对采集 / 去重 / 标注 / 审核 / 导出这些"目标明确、参数有限"的节点,schema 够用。
> **不够吗?** — 数据转换、规则评估、派单策略 这些 "用户自己定义逻辑" 的节点,schema 不够,需要把 **expression / template / code** 也作为合法的 field type,但要配齐沙箱、契约、试跑、审计、版本管理。
> **要不要直接上脚本?** — 不要。**先 preset,再 mapping,最后 script**;否则用户用脚本写本可以预设的东西,可读性、可校验性、可移植性都会塌。

---

## 十、节点接口抽象与扩展点

> 节点要满足"灵活处理"的需求,关键不是给每个节点写无限多的功能,而是把接口抽对 — 让"加新能力 = 加新实现",而不是"改主框架"。下面先列设计目标和接口分层,再看 Label Studio 是怎么落地的。

---

### 10.1 设计目标(节点接口要解决什么)

- **一致契约** — 不论是采集 / 标注 / 审核 / 导出,都用同一种"读什么、写什么、怎么推进"的形式描述
- **实现可插拔** — 同一节点的不同实现 = 注册一个新对象,主框架不感知差异
- **配置驱动** — implementation + params 决定行为,代码不写死
- **多渲染面** — canvas 节点 / 配置面板 / 队列入口 / 处理界面 都能挂
- **副作用隔离** — 通知 / 日志 / 审计 走旁路,不阻塞主流
- **错误统一** — 失败 / 重试 / 超时 是接口级行为,不是每个实现各写一套

---

### 10.2 节点接口的三层分离

把节点接口拆成 **Schema / Processor / Views** 三层,互不污染。

#### A. Schema 接口(静态描述)
```ts
interface NodeSchema {
  key: StepKey;
  label: string;
  icon: string;
  color: string;
  category: "ingress" | "transform" | "label" | "review" | "egress" | "side";

  // I/O 契约: 显式声明本节点读 / 写 envelope 的哪几个字段
  reads:  EnvelopePath[];   // 例: ["data", "predictions"]
  writes: EnvelopePath[];   // 例: ["annotations"]

  implementations: ImplementationSchema[];  // 含 fields, 见 9.2
}
```

> `reads` / `writes` 不只是文档,**运行时可校验**:同一 stage 多次执行不能写同一个字段(除非声明为 append),便于排查脏写。

#### B. Processor 接口(动态执行)
```ts
interface NodeProcessor<P = any> {
  // 主流: 单条数据处理
  process?(item: RunItem, params: P, ctx: Ctx): Promise<ProcessOutcome>;

  // 批处理: 攒到一定条数 / 时间触发 (如 export, dedup 大批量)
  processBatch?(items: RunItem[], params: P, ctx: Ctx): Promise<BatchOutcome>;

  // 生命周期 hook
  onConfigUpdate?(oldParams: P, newParams: P): Migration;
  beforeAdvance?(item: RunItem, params: P): "advance" | "hold" | "reroute";
}

interface ProcessOutcome {
  patch: Partial<RunItem>;       // 这次写了 envelope 的哪几个字段
  advance: ItemStage | "hold";   // 推进到哪 / 不推进 (例: 多人标注未达阈值)
  sideEffects?: Effect[];        // 通知 / 日志 / 审计, 走旁路队列
}
```

要点:
- `process` 与 `processBatch` 二选一(或都实现)
- 返回值是**声明式**的(patch + advance + effects),框架来执行写入和推进 — 而不是 processor 直接改 state
- `advance: "hold"` 是关键 — 多人标注、攒批导出、人工审核都需要"我处理完了但 item 不动"

#### C. Views 接口(可视化)
```ts
interface NodeViews {
  CanvasNode?: React.FC<{ config }>;          // 默认: 按 schema 渲染图标+副标
  ConfigPanel?: React.FC<{ config; onChange }>;  // 默认: 按 fields 自动渲染表单
  ProcessView: React.FC<{ taskId; config; item? }>;  // 必须: 处理界面差异最大
  QueueView?: React.FC<{ items }>;            // 默认: 通用列表 + currentStage 过滤
}
```

> 大多数节点只需实现 `ProcessView`(因为它跟 implementation 强相关),其他三个都有默认实现。

---

### 10.3 实现注册与发现(Plugin Registry)

```ts
interface NodeDefinition<P = any> {
  schema: NodeSchema;
  processors: Record<string, NodeProcessor<P>>;  // implKey -> processor
  views:      Record<string, Partial<NodeViews>>; // implKey -> view 覆盖 (可选)
  defaultViews?: NodeViews;                       // implKey 没覆盖时用这个
}

registerNode(definition);
const def = lookupNode(stepKey);
const processor = def.processors[stepConfig.implementation];
```

新加节点 = 写一个 `NodeDefinition` + `registerNode`。
新加实现 = 在已有 NodeDefinition 的 `processors` / `views` 里加一项。
**主框架代码不改**。

---

### 10.4 灵活性从哪里来(把 9.5 / 7.2.3 串起来)

| 来源 | 说明 |
| --- | --- |
| **implementation 多态** | 切实现 = 换一个 processor + 换一个 ProcessView |
| **params 调节** | 同一 processor 内部,params 当作纯函数参数 |
| **lifecycle hooks** | `onConfigUpdate` 处理迁移、`beforeAdvance` 拦截推进 |
| **Effect 旁路** | 通知 / 日志 / 审计 不污染主流 |
| **Capability 引用** | label schema 上提到 task,pre-annotate / annotate 引用同一份 |
| **JSON Pointer 寻址** | result 能定位 envelope 任意字段(图像、表单字段都能标) |

---

### 10.5 Label Studio 是怎么做的

LS 的扩展能力主要靠下面几个"扩展点",每一项都对应到上面接口的一部分:

#### a) Labeling Config(XML)— 最核心的扩展点
- **Object tag** — 数据类型(`<Image>`, `<Text>`, `<Audio>`, `<Video>`, `<Paragraphs>`)
- **Control tag** — 标注操作(`<RectangleLabels>`, `<Choices>`, `<PolygonLabels>`, `<Labels>`)
- 通过 `name` / `toName` 双向绑定:`<RectangleLabels name="label" toName="image">`
- 每个 tag = React 组件 + MobX state-tree model + 序列化逻辑
- 注册:`Registry.addTag(tagName, ModelClass, ViewComponent)` — 这就是它的 plugin registry

> 对应到我们:label config 整体 = task 级的"标注元能力" schema;tag = annotation `result` 项的 `type`/`from_name`/`to_name`/`value` 协议。

#### b) ML Backend 协议 — 模型预标的标准接口
- 继承 `LabelStudioMLBase`,实现:
  - `predict(tasks, **kwargs)` — 必须
  - `fit(tasks, **kwargs)` — 可选(主动学习)
- 返回 predictions,结构与 annotations 完全对齐(都用 `result[]` 协议)
- LS ↔ ML backend 走 REST,HTTP 是天然隔离边界

> 对应到我们:`pre-annotate` 节点的 implementation,本质是一个远程 processor,返回 patch 写到 `predictions[]`。

#### c) Storage 协议 — I/O 解耦
- Source storage(S3 / GCS / Azure / Redis / local)读 task
- Target storage 写 annotations
- 共同接口:`list / get / set / iter_objects`
- 实现可插拔,新加一个云存储 = 实现一组方法

> 对应到我们:`collect` / `import` / `export` 节点的 implementation 集合。

#### d) Webhook 事件
- 注册感兴趣的事件:`TASK_CREATED` / `ANNOTATION_CREATED` / `PROJECT_UPDATED` / ...
- LS 主动 HTTP POST 到外部 endpoint
- 异步,不阻塞主流程

> 对应到我们:`notify` 节点(旁路)。

#### e) Converters — 格式适配
- import/export 格式以 converter 注册:COCO / YOLO / Pascal VOC / Brush RLE / JSON / CSV
- 共同接口:`from_label_studio()` / `to_label_studio()`

> 对应到我们:`export` 节点的 implementation。

#### f) Project 层 vs Task 层
- 项目持有 **labeling config**(XML)= schema/template
- 每个任务持有 **data** + **annotations** = instance/runtime
- 同一项目下所有任务**共享同一份 labeling config**

> 这是"标注元能力上提"的源头思路 — 别在每个 task 里复制一遍 label schema。

---

### 10.6 本系统 vs Label Studio 对照表

| 维度 | Label Studio | 本系统 |
| --- | --- | --- |
| 节点 schema | XML tag + Registry | `NodeSchema` + registerNode |
| 实现注册 | `Registry.addTag` | `registerNode({processors, views})` |
| 节点实例 | task.data + task.annotations | `StepConfig` + `RunItem` envelope |
| 字段寻址 | tag `name`/`toName` + value 引用 | `from_name` / `to_name`(JSON Pointer) |
| 模型预标 | ML Backend(REST) | `pre-annotate` 节点的远程 processor |
| I/O | Storage 接口 | `collect` / `import` / `export` 的 implementation |
| 事件 / 通知 | Webhook | `notify` 节点(旁路) |
| 格式适配 | Converter | `export` 节点的 implementation |
| 跨任务共享 schema | Project labeling config | task / project 级"元能力"引用 |

---

### 10.7 抽象设计原则(一页总结)

1. **三层分离** — Schema(声明) / Processor(执行) / Views(渲染),互不污染
2. **I/O 契约显式** — `reads[]` / `writes[]` 写在 schema,框架可校验
3. **声明式输出** — processor 返回 `{patch, advance, sideEffects}`,框架执行,不直接改 state
4. **实现注册即扩展** — `registerNode` + plugin registry,主框架代码不动
5. **副作用走旁路** — 通知 / 日志 / 审计 单独通道,失败不阻塞主流
6. **能力上提** — 跨节点共享的 schema(标签集、表单模板)放到 task / project 层,各节点引用
7. **统一 result 协议** — `{from_name, to_name, type, value}` 横跨预标 / 标注 / 转换工具

> **一句话**:节点不是一个写死的"功能模块",而是 **一份 schema + 一组可注册的 processor + 一组可注册的 view**;主框架只关心"怎么调度这三样",不关心实现细节。这与 LS 把 tag、ML backend、storage、webhook 全部做成可注册扩展点,是同一种思路。

---

### 10.8 端到端示例:加一个新节点(以 `translate` 翻译节点为例)

> 把"配置化 / 统一接口 / 自定义实现 / 影响数据"四个问题用一个实例串起来。
>
> **场景**:文本类项目里,采集到的多语言文本想先翻译成统一语言,再交给标注员标注。

#### 第 1 步 · 配置化(Schema 层 — 决定"能配什么")

```ts
// nodes/translate/schema.ts
export const translateSchema: NodeSchema = {
  key: "translate",
  label: "翻译",
  icon: "Languages",
  color: "bg-cyan-100 border-cyan-300",
  category: "transform",

  reads:  ["data.text"],            // 显式声明: 读 data.text
  writes: ["derived.translated"],   // 显式声明: 写到 derived.translated

  implementations: [
    {
      key: "google",
      label: "Google Translate",
      fields: [
        { key: "target_lang", type: "select", default: "zh-CN",
          options: [{ value: "zh-CN", label: "中文" }, { value: "en", label: "English" }],
          mutability: "rerun-required" },
        { key: "api_key", type: "text", placeholder: "API Key",
          mutability: "mutable" },
      ],
    },
    {
      key: "llm",
      label: "LLM 翻译",
      fields: [
        { key: "model", type: "select", default: "gpt-4",
          options: [{ value: "gpt-4", label: "GPT-4" }, { value: "claude", label: "Claude" }] },
        { key: "system_prompt", type: "textarea",
          default: "Translate to Chinese, preserve technical terms" },
      ],
    },
  ],
};
```

→ 节点暴露的"可配置面"完全在这里。
→ 加新字段就在 `fields` 里追加,**配置面板按 9.4.2 自动渲染**,不写 UI 代码。
→ `mutability` 决定该字段在任务运行中能不能改、改了要不要重跑(对应 9.6)。

---

#### 第 2 步 · 抽象统一接口(Processor 层 — 决定"怎么算")

两个实现共享 `NodeProcessor` 接口签名,行为不同但形状一致:

```ts
// nodes/translate/processors.ts
export const googleTranslate: NodeProcessor<{
  target_lang: string;
  api_key: string;
}> = {
  async process(item, params, ctx) {
    const sourceText = readPath(item, "data.text");
    const translated = await callGoogleTranslate(sourceText, params);

    return {
      // 声明式: 我写了 envelope 的哪几个字段
      patch: {
        derived: { ...item.derived, translated },
      },
      // 声明式: 我处理完了, 推到下一阶段
      advance: ctx.nextStage(item.currentStage),
      // 旁路: 日志 / 通知, 失败不阻塞主流
      sideEffects: [
        { type: "log", payload: { stage: "translate", chars: sourceText.length } },
      ],
    };
  },
};

export const llmTranslate: NodeProcessor<{
  model: string;
  system_prompt: string;
}> = {
  async process(item, params, ctx) {
    /* 不同实现, 同一份接口签名 */
    return { patch: { ... }, advance: ctx.nextStage(item.currentStage) };
  },
};
```

要点:
- **接口统一**:都接 `(item, params, ctx)` → 都返回 `{ patch, advance, sideEffects }`
- **声明式**:processor 不直接改 state,只**声明**自己写了什么 — 框架统一落库,便于审计、回滚、并发
- **可测**:processor 是纯函数(除了网络调用),用假 item + 假 params 就能单测

---

#### 第 3 步 · 自定义实现(Plugin 层 — 决定"怎么接进系统")

把 schema + processors + views 打包注册:

```ts
// nodes/translate/index.ts
import { registerNode } from "../core/registry";
import { translateSchema } from "./schema";
import { googleTranslate, llmTranslate } from "./processors";
import { GoogleTranslateView, LLMTranslateView, GenericTranslateView } from "./views";

registerNode({
  schema: translateSchema,
  processors: {
    google: googleTranslate,
    llm:    llmTranslate,
  },
  views: {
    google: { ProcessView: GoogleTranslateView },   // 实现专属 UI
    llm:    { ProcessView: LLMTranslateView },
  },
  defaultViews: { ProcessView: GenericTranslateView }, // 没覆盖时的兜底
  // CanvasNode / ConfigPanel 不写, 框架按 schema 自动渲染
});
```

→ 写完这一行 `registerNode`,主框架在 pipeline 画布、配置面板、队列入口、处理界面里**全自动接上**这个新节点。
→ **主框架代码不改**。新加一个实现(比如 `deepl`)就再往 `processors` / `views` 里塞一项。

---

#### 第 4 步 · 影响数据(Envelope 演进 — 决定"数据变成什么")

`schema.writes: ["derived.translated"]` 已经声明了写位置。运行时实际变化:

```diff
{
  "id": "i-1",
  "data": { "text": "Hello world" },         // 不变
  "meta": { "kind": "text", ... },
+ "derived": {
+   "translated": "你好世界"                  // 新增
+ },
- "currentStage": "translate"
+ "currentStage": "annotate"                  // 推进
}
```

要点:
- `data` **不变** — 原文保留,可追溯(对应 7.2.1 设计要点)
- 派生数据写到 `derived.translated`,与 schema 声明一致;框架可以校验 patch 不能写在 `writes` 范围之外的字段
- 下游 `annotate` 节点只需把它的 `to_name` 从 `/data/text` 改成 `/derived/translated`,标注就作用在翻译后的文本上 — 这就是 7.2.3 JSON Pointer 寻址的好处

---

#### 四个问题的"代码归位表"

| 问题 | 落在哪 | 关键产物 |
| --- | --- | --- |
| **如何配置化** | `NodeSchema.implementations[].fields[]` | 配置面板自动渲染 |
| **如何抽象统一接口** | `NodeProcessor.process()` 签名 + `ProcessOutcome` 形态 | 任何实现都返回 `{ patch, advance, sideEffects }` |
| **如何自定义实现** | `registerNode({ processors, views })` | 主框架不改,plugin 即扩展 |
| **如何影响数据** | `schema.writes[]` 声明 + processor 返回的 `patch` | envelope 受控演进,可校验、可审计 |

> **闭环**:schema 决定**能配什么** → config 决定**本次怎么配** → processor 决定**怎么执行** → patch 决定**数据怎么变** → views 决定**界面怎么呈现**。每一环职责单一,任何一环都可以单独替换、扩展、测试。

---

## 十一、整体架构图(角色全景)

把 7 个核心角色一次性见齐:**Project / Task / Item / Node 类型 / StepConfig / Schema / Scheduler / 前端 UI / 外部服务**(其中 Item 和 Ctx 是黏合层,不在用户提的列表里但故事少不了它们)。

### 11.1 各角色职责(一句话版)

| 角色 | 是什么 | 谁拥有它 | 何时活跃 |
|---|---|---|---|
| **Project** | 业务域容器(标签模式、角色、配额) | 用户/管理员 | 设计期 |
| **Task** | 一次具体作业,拥有自己的 pipeline 配置 | 属于 Project | 设计期 + 运行期 |
| **Item** | 一条数据(信封),在 pipeline 里流动 | 属于 Task | 运行期 |
| **Node 类型** | 注册表里的纯函数(schema + processor + views),无状态、跨任务共享 | 平台 / 插件作者 | 全程 |
| **StepConfig** | 任务里某个 Node 的"实例化配置"(impl + params) | 属于 Task.pipeline | 全程 |
| **Schema** | 描述 Node 的 params 长什么样;描述 Project 的标注产物长什么样 | 属于 Node / Project | 全程 |
| **Scheduler** | 看 Task.pipeline 和 Item 状态,决定下一步派发谁 | 平台单实例 | 运行期 |
| **前端 UI** | ① 拼 pipeline ② 看队列 ③ 干活(标注/审核界面) | 用户 | 全程 |
| **外部服务** | LLM / 去重索引 / 对象存储 / ML Backend | 平台 / 第三方 | 运行期 |
| **Ctx** | 调度器递给 Node 的"封闭信封":projectId / taskId / 各种 scope 过的访问器 | 调度器构造 | 每次调用 |

> 关键认知:**Node 类型是全局共享的一份代码**,**StepConfig 是任务里的实例化配置**——前者像"切菜师傅这个工种",后者像"3 号桌订单上写的:切丁、3mm"。

### 11.2 静态结构图(谁指向谁)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            ─── 设计态 ───                                │
│                                                                          │
│   ┌─────────────┐          ┌─────────────────────────────────┐          │
│   │   Project   │ 1───*    │             Task                │          │
│   │             │─────────▶│  pipeline: StepConfig[]         │          │
│   │ labelSchema │          │  (有序列表,每个元素是一个       │          │
│   │ roles       │          │   Node 类型的实例化配置)         │          │
│   │ quota       │          └────────────┬────────────────────┘          │
│   └─────────────┘                       │ 每个元素                        │
│         ▲                               ▼                                │
│         │                ┌──────────────────────────────────┐            │
│         │                │           StepConfig             │            │
│         │                │  { key, implementation, params } │            │
│         │                └──────────────┬───────────────────┘            │
│         │                               │ key 索引                        │
│         │                               ▼                                │
│         │           ╔════════════ Node Registry (全局, 一份) ════╗       │
│         │           ║                                              ║       │
│         │           ║  "dedup"     →  { schema, processor, views } ║       │
│         │           ║  "translate" →  { schema, processor, views } ║       │
│         │           ║  "annotate"  →  { schema, processor, views } ║       │
│         │           ║  ...                                          ║       │
│         │           ╚════╤═══════════════╤═══════════════╤═════════╝       │
│         │                │ schema        │ processor      │ views          │
│         │                ▼               │                ▼                 │
│         │       ┌──────────────┐         │       ┌────────────────┐       │
│         │       │  前端 UI     │         │       │  前端 UI        │       │
│         │       │ NodeConfigPan│         │       │ Stage Queue /   │       │
│         │       │  渲染配置表单 │         │       │ Stage Process   │       │
│         │       └──────┬───────┘         │       └────────┬────────┘       │
│         │              │ 保存 params      │                │ 提交结果        │
│         │              ▼                  │                ▼                │
│         │         (写回 Task.pipeline)    │           (写回 Item)           │
│         │                                 │                                │
└─────────┼─────────────────────────────────┼────────────────────────────────┘
          │                                 │
┌─────────┼─────────────────────────────────┼────────────────────────────────┐
│         │      ─── 运行态 ───              │                                 │
│         │                                 │                                 │
│   ┌─────┴────────────┐    读 pipeline +   │                                 │
│   │     Item         │◀───items────────┐  │                                 │
│   │ data + envelope  │                 │  │                                 │
│   │ currentStage     │                 │  │                                 │
│   └────────▲─────────┘            ┌────┴──┴──────────────┐                  │
│            │ 写回新阶段           │      Scheduler        │                  │
│            │ (outbox 原子写)      │  • 队列 / outbox      │                  │
│            └──────────────────────│  • 幂等 (attemptId)   │                  │
│                                   │  • 重试 / 超时        │                  │
│                                   │  • 资源配额            │                  │
│                                   └──────────┬───────────┘                  │
│                                              │ dispatch                     │
│                                              │  (item, params, ctx)         │
│                                              ▼                              │
│                                    ┌────────────────────┐                   │
│                                    │  Node.processor    │                   │
│                                    │  (无状态纯函数)     │                   │
│                                    └─────────┬──────────┘                   │
│                                              │ 通过 ctx 访问                 │
│                          ┌───────────────────┼────────────────────┐         │
│                          ▼                   ▼                    ▼         │
│                   ┌────────────┐      ┌────────────┐       ┌────────────┐   │
│                   │   LLM 服务  │      │  去重索引   │       │  对象存储   │   │
│                   │            │      │ (per-task) │       │ (per-proj) │   │
│                   └────────────┘      └────────────┘       └────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**这张图要看清的事**:

1. **配置往下指,代码不下指**:Task 通过 StepConfig 的 `key` 引用注册表里的 Node;Node 不知道有谁在用它
2. **Schema 在中间扮演两个角色**:给 UI 看 → 渲染配置表单;给 Scheduler 看 → 校验保存的 params 合法
3. **前端 UI 出现两次**,对应 Node 的两类视图:`views.configForm` 在设计期画布右侧;`views.runner` 在运行期干活界面
4. **Scheduler 是唯一进入 Node 的门**:外部不能直接调 Node;Node 也不主动找别人——它只看 ctx
5. **外部服务都被 ctx 包了一层**,自带 scope(taskId / projectId),Node 拿不到全局

### 11.3 配置态:Schema 驱动 UI

```
   用户在画布上点了一个节点 (selectedKey = "dedup")
        │
        ▼
   ┌─────────────────────────┐
   │  NodeConfigPanel        │
   └────────────┬────────────┘
                │ 拿到 selectedKey
                ▼
   ┌─────────────────────────┐
   │  registry["dedup"]      │
   │     .schema             │  ← {threshold: number, hashAlgo: enum, ...}
   └────────────┬────────────┘
                │ schema → form widgets
                ▼
   ┌─────────────────────────┐
   │  渲染出表单              │  ← 数字框、下拉、勾选...
   │  用户填写 params         │
   └────────────┬────────────┘
                │ onChange + Schema 校验
                ▼
   ┌─────────────────────────┐
   │  写回 Task.pipeline[i]   │  ← 持久化
   └─────────────────────────┘
```

**这就是"配置化"的全部**:一份 Schema,前端拿来画表单,后端拿来校验存盘。换一个 Node 类型,UI 不用改代码,自动出新表单。

### 11.4 运行态:数据如何穿过

```
  采集端                Scheduler          Node                外部
   │                       │                │                   │
   │  新数据 (Item 创建)   │                │                   │
   ├──────────────────────▶│                │                   │
   │                       │ 写 Item        │                   │
   │                       │ currentStage=  │                   │
   │                       │   "dedup"      │                   │
   │                       │ outbox 入队     │                   │
   │                       │                │                   │
   │                       │ 读 Task.       │                   │
   │                       │ pipeline 找到   │                   │
   │                       │ "dedup" 的     │                   │
   │                       │ StepConfig     │                   │
   │                       │                │                   │
   │                       │ dispatch       │                   │
   │                       │ (item, params, │                   │
   │                       │  ctx)          │                   │
   │                       ├───────────────▶│                   │
   │                       │                │ ctx.dedupIndex    │
   │                       │                │ (taskId).query    │
   │                       │                ├──────────────────▶│
   │                       │                │◀──────────────────│
   │                       │                │                   │
   │                       │◀───────────────┤ 返回 verdict       │
   │                       │                │                   │
   │                       │ 原子写:        │                   │
   │                       │  • Item patch  │                   │
   │                       │  • currentStage│                   │
   │                       │    = "review"  │                   │
   │                       │  • outbox 入下  │                   │
   │                       │    一阶段队列   │                   │
```

**关键点**:
- 自动节点(dedup/translate/export)和人工节点(annotate/review)在 Scheduler 视角下是同一种东西——都是"等待一个结果回来"。区别只在结果由代码产出,还是由人在 UI 上产出
- Node 不知道下一个节点是谁,**Scheduler 看 Task.pipeline 决定下一站**——这就是为什么换 pipeline 不用改 Node

### 11.5 串一个例子(把所有角色见齐)

> **场景**:Project P("商品评论情感") → Task B(标注 3000 条) → pipeline = `[datasource → translate → annotate → review → export]`,其中 `translate` 调外部 LLM。

| 时刻 | 谁在动 | 干了什么 |
|---|---|---|
| ① 设计期 | 用户 + 前端 UI + Schema + Node 注册表 | 用户在画布点 `translate` → UI 读 `registry["translate"].schema` 渲染表单(目标语言、模型 ID)→ 填完保存到 `Task.pipeline[1].params` |
| ② 运行期触发 | 采集端 / 上游 Task | 一条新 Item 写入 Task B,`currentStage = "datasource"` |
| ③ 调度 | Scheduler | 读 Task.pipeline,找到 datasource 的 StepConfig → 派发 → 完成 → 推进到 translate |
| ④ 节点执行 | Node.processor + Ctx + LLM 服务 | `registry["translate"].processor` 被调用,通过 `ctx.llm` 发请求,模型 ID 来自 `params.model_id`(任务 B 私有) |
| ⑤ 写回 | Scheduler + Item | 原子写:Item.envelope 加上译文字段,currentStage = "annotate" |
| ⑥ 人工 | 前端 UI + Node.views | 标注员打开 Stage Process 页,UI 渲染 `registry["annotate"].views.runner` |
| ⑦ 提交 | 前端 UI → Scheduler | 标注结果回到 Scheduler,推进到 review |
| ⑧ 隔离体现 | Ctx | 同一时刻 Task A 也在跑 translate,但它的 params.model_id 不同、ctx.llm 配额独立——Node 代码完全相同,行为完全不同 |

---

## 十二、调度器内部设计(已迁出)

调度器内部的 4 组件(Dispatcher / Receiver / Reconciler / Router)、outbox 模式、运行态四维隔离(配置 / 数据 / 资源 / 代码)、Schema vs Service 两层注册表、失败重试与对账等机制,属于 **scheduler 模块的内部实现**,与 pipeline 设计本身正交,已迁出到独立子模块文档,本目录不再承载:

- `scheduler/docs/01-walkthrough.md` —— 图解版
- `scheduler/docs/02-design.md` —— 技术设计

`docs/` 只描述 pipeline 的对外形态与系统总览,与 `scheduler/docs/` 互不依赖。

---

## 十三、UI / 可观测

- 项目详情:任务列表 + 任务间依赖可视化
- 任务详情:pipeline 画布 + 各 stage 队列 + 配置面板
- Stage 详情:队列 + 单条处理 + 历史
- Item 详情:全生命周期 timeline / lineage
- 角色视角差异(管理员 / 采集员 / 标注员 / 审核员)

---

## 十四、容易被忽略的边角(每个都问一遍)

- 空状态 / 第一条数据怎么来
- 删除一个任务,流入下游的数据怎么处理
- 修改 pipeline 配置,运行中 item 是否生效
- 标签集变更后老数据怎么对齐
- 同一 item 在同一 stage 被处理多次(重标 / 多审)
- 数据回溯 / 审计(谁在什么时候做了什么)
- 大批量场景(10w 条)和原型(几十条)的差异

---

## 推荐展开顺序(脑图建议)

1. 先列 **二(模块维度)** + **三(节点分类)** + **七(数据结构)** — 这三组组合起来能很快暴露"哪些 stage 其实是同一种元能力"
2. 再走 **四(各环节细化)** + **五(环节间对接)**,把每个 stage 沿维度过一遍,顺便定清楚相邻 stage 的输入输出契约
3. 最后用 **十四(边角)** 做兜底校验

每一项展开到三层即可:概念 → 选项 → 取舍依据。
