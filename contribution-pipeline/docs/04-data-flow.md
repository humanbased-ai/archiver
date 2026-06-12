# 标注任务数据流转说明

## 一、处理流程总览

```
┌─────────┐    ┌─────────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  数据采集  │ -> │  AI 预处理   │ -> │ 人工标注  │ -> │  审核   │ -> │  导出   │
│ Collect │    │ Pre-annotate│    │ Annotate│    │ Review  │    │ Export  │
└─────────┘    └─────────────┘    └─────────┘    └─────────┘    └─────────┘
    │               │                 │              │              │
 pending      pre_annotating    annotating    reviewing      approved
```

---

## 二、各阶段详解

### 阶段 1：数据采集（Collect）

**输入**：图片目录 / S3 路径 / API 推送

**输出（Task）**：
```json
{
  "id": "task_001",
  "status": "pending",
  "payload": {
    "image": "https://s3.bucket/images/001.jpg",
    "metadata": { "source": "batch_20240115" }
  },
  "result": null
}
```

**状态**：`pending`

---

### 阶段 2：AI 预处理（Pre-annotate）【可选】

**输入**：`pending` Task + 图片 URL

**处理**：YOLO 推理 → 转换为 LS 格式

**输出（Draft Annotation）**：
```json
{
  "id": "anno_001",
  "task_id": "task_001",
  "version": "draft",
  "data": [
    {
      "type": "rectanglelabels",
      "value": { "x": 10.5, "y": 20.3, "width": 100, "height": 80, "labels": ["person"] },
      "score": 0.92
    }
  ]
}
```

**状态变化**：`pending -> pre_annotating -> annotating`

---

### 阶段 3：人工标注（Annotate）

**输入**：`annotating` Task + XML 配置 + 预标结果

**XML 配置**：
```xml
<View>
  <Image name="img" value="$image"/>
  <RectangleLabels name="label" toName="img">
    <Label value="person"/><Label value="car"/>
  </RectangleLabels>
</View>
```

**输出（Submitted Annotation）**：
```json
{
  "id": "anno_002",
  "version": "submitted",
  "data": [
    { "origin": "prediction", "type": "rectanglelabels", "value": {...} },
    { "origin": "manual", "type": "rectanglelabels", "value": {...} }
  ],
  "submitted_at": "2024-01-15T11:30:00Z"
}
```

**状态变化**：`annotating -> reviewing`

---

### 阶段 4：审核（Review）

**输入**：`reviewing` Task + Annotation

**输出（Review 记录）**：

通过：
```json
{ "task_id": "task_001", "action": "approve", "reason": null }
```

打回：
```json
{ "task_id": "task_001", "action": "reject", "reason": "框位置偏移" }
```

**状态变化**：
- 通过：`reviewing -> approved`
- 打回：`reviewing -> annotating`（回阶段 3）

---

### 阶段 5：导出（Export）

**输入**：`approved` Task 列表

**输出（COCO 格式）**：
```json
{
  "images": [{ "id": 1, "file_name": "001.jpg", "width": 1920, "height": 1080 }],
  "annotations": [
    { "image_id": 1, "category_id": 1, "bbox": [12, 22.5, 98, 75], "area": 7350 }
  ],
  "categories": [{ "id": 1, "name": "person" }]
}
```

---

## 三、状态机完整流转

```
              ┌─────────────────────┐
              │                     │
              ▼                     │
┌────────┐   ┌─────────────┐   ┌────────┐   ┌──────────┐   ┌────────┐
│pending │-> │pre_annotating│->│annotating│->│reviewing │--->│approved│
└────────┘   └─────────────┘   └────────┘   └──────────┘   └────────┘
                                     │            │
                                     └────────────┘
                                         (reject)
```

| 状态 | 含义 | 下一阶段 |
|------|------|----------|
| `pending` | 刚创建，等待处理 | pre_annotate / annotate |
| `pre_annotating` | AI 预处理中 | annotating |
| `annotating` | 等待/正在人工标注 | reviewing |
| `reviewing` | 等待审核 | approved / annotating |
| `approved` | 审核通过，可导出 | exported |
| `rejected` | （中间态，打回时）| annotating |

---

## 四、数据格式统一协议

所有标注结果遵循统一结构：

```typescript
{
  from_name: string,    // 组件名
  to_name: string,      // 目标对象名
  type: string,         // rectanglelabels | polygonlabels | keypointlabels | choices | rating...
  value: object,        // 具体数值（坐标、标签等）
  origin?: string,      // prediction | manual（来源标记）
  score?: number        // 置信度（AI 预标时）
}
```

---

## 五、核心表结构

| 表名 | 作用 | 关键字段 |
|------|------|----------|
| **Project** | 项目定义 | id, name, type, config_xml |
| **Task** | 待标注数据 | id, project_id, status, payload, result |
| **Annotation** | 标注结果 | id, task_id, version, data |
| **Review** | 审核记录 | id, task_id, action, reason |
| **ExportRecord** | 导出历史 | id, project_id, format, file_path |
