# Pipeline MVP Prototype

纯前端原型 — 演示 Pipeline Manager 的 MVP 交互：项目 / 任务管理 + ReactFlow 任务编排。
**无真实后端**，所有数据在内存（zustand）中维护，刷新丢失。

## 覆盖范围

- **项目管理**：列表 / 新建 / 删除
- **任务管理**（项目下）：列表 / 新建 / 删除
- **任务编排**：ReactFlow 画布 **固定 5 节点流水线**，每节点可在侧栏：
  - 切换具体实现（如 `dedup` 选 精确哈希 / 感知哈希 / 语义向量）
  - 编辑参数（text / number / select / multiselect / tags / textarea）
  - 预览生成的 YAML 配置
- **运行演示**（点"启动运行"进入 `/tasks/:id/run`）：5 阶段可交互模拟，全程纯前端
  - **采集**：拖拽/选择本地图片 → DataURL
  - **去重**：浏览器内 `crypto.subtle` 计算 SHA-1，按选择的实现（精确/感知/向量）判重，展示保留 vs 重复
  - **标注**：占位跳转 LS 链接 + "模拟 ML 预标"按钮按节点配置的 `labels` 给样本随机赋标 + conf
  - **审核**：根据策略（全量/抽检/规则）初始化队列，图片网格 通过/打回，支持"全部通过剩余"
  - **导出**：按选择实现生成 COCO / YOLO / JSONL / CSV 内容，预览 + 一键下载

### 五个固定节点 & 可选实现

| 节点 | 可选实现 |
|------|----------|
| **采集** (collect) | 本地上传 · S3 拉取 · API 推送 |
| **去重** (dedup) | 精确哈希 (md5/sha1) · 感知哈希 (pHash/dHash) · 语义向量 (CLIP/BGE/OpenAI) |
| **标注** (annotate) | LS·图像目标检测 · LS·图像分割 · LS·文本分类 · LS·文本 NER |
| **审核** (review) | 全量人工 · 抽检 · 规则自动审核 |
| **导出** (export) | COCO · YOLO · JSONL · CSV |

> 标注节点全部走 Label Studio 方案（嵌入 Editor + ML Backend），自研表单暂不做。

## 技术栈

- Vite + React 18 + TypeScript
- React Router v6
- ReactFlow 11
- Zustand (状态管理)
- Tailwind CSS
- Lucide Icons

## 运行

```bash
cd prototype
npm install
npm run dev
# 打开 http://localhost:3000
```

## 目录结构

```
prototype/
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # 路由
│   ├── types.ts                      # 数据模型
│   ├── config/steps.ts               # 5 节点 × N 实现 × 字段 schema
│   ├── mock/data.ts                  # 种子数据
│   ├── store/useStore.ts             # zustand store
│   ├── pages/
│   │   ├── ProjectsPage.tsx          # 项目列表
│   │   ├── ProjectDetailPage.tsx     # 项目下的任务列表
│   │   └── TaskDetailPage.tsx        # 任务编排 (ReactFlow)
│   └── components/
│       ├── Layout.tsx
│       ├── Modal.tsx
│       ├── StepNode.tsx              # ReactFlow 自定义节点
│       └── NodeConfigPanel.tsx       # 节点配置侧栏
└── (vite/ts/tailwind 配置)
```

## 数据模型 (核心)

```ts
Project {
  id, name, type, description, createdAt
}

Task {
  id, projectId, name, description, status,
  pipeline: StepConfig[]    // 顺序固定: collect → dedup → annotate → review → export
  stats?: { total, annotated, reviewed, exported }
}

StepConfig {
  key: "collect" | "dedup" | "annotate" | "review" | "export"
  implementation: string    // 当前选择的实现 key
  params: Record<string, any>
}
```

## 与真实后端对接的边界（未来）

- **节点 schema** (`src/config/steps.ts`) 会成为后端 `engine/steps/*` 的配置契约
- 任务的 `pipeline` 字段可直接序列化为 YAML 后投喂给 `pipeline_manager.engine.runner.run_pipeline`
- 标注节点的 `labels / ml_backend` 参数对应 Label Studio Project 的 XML 配置 + ML Backend 注册

> 此原型只验证**交互形态**；真实实现参考同仓库 `@/Users/yangxiaohu/Documents/work/b18a/label-studio-pipeline/pipeline_manager`。
