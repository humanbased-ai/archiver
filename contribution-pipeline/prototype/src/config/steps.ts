import type { StepSchema, StepKey, StepConfig, TaskType } from "../types";

/** 所有步骤 schema */
export const STEP_SCHEMAS: StepSchema[] = [
  {
    key: "collect",
    label: "采集",
    description: "把原始数据收进来",
    icon: "Download",
    color: "bg-sky-100 border-sky-300 text-sky-800",
    implementations: [
      {
        key: "local_upload",
        label: "本地上传",
        description: "手动上传本地文件/文件夹",
        fields: [
          { key: "path", label: "本地路径", type: "text", placeholder: "./data/images", default: "./data/images" },
          {
            key: "file_types", label: "文件类型", type: "multiselect",
            options: [
              { value: "image", label: "图像 (.jpg/.png)" },
              { value: "video", label: "视频 (.mp4)" },
              { value: "text", label: "文本 (.txt/.json)" },
            ],
            default: ["image"],
          },
        ],
      },
      {
        key: "s3",
        label: "S3 拉取",
        description: "从对象存储批量拉取",
        fields: [
          { key: "bucket", label: "Bucket", type: "text", placeholder: "my-bucket" },
          { key: "prefix", label: "Prefix", type: "text", placeholder: "images/batch-2024/" },
          { key: "region", label: "Region", type: "text", default: "us-east-1" },
        ],
      },
      {
        key: "api_push",
        label: "API 推送",
        description: "被动接收外部系统推送",
        fields: [
          { key: "endpoint", label: "Webhook 路径", type: "text", default: "/ingest/push" },
          { key: "auth_token", label: "认证 Token", type: "text", placeholder: "留空表示不校验" },
        ],
      },
      {
        key: "form_submit",
        label: "表单填写",
        description: "通过 JSON Schema 配置的表单收集结构化数据",
        fields: [
          {
            key: "template_id",
            label: "表单模板",
            type: "select",
            options: [
              { value: "real_world_photo_collection", label: "真实图片采集" },
              { value: "crypto_transaction_collection", label: "交易所交易信息" },
            ],
            default: "real_world_photo_collection",
          },
        ],
      },
    ],
  },
  {
    key: "dedup",
    label: "去重",
    description: "按字段类型对样本去重 (自动节点, 采集时即时判定)",
    icon: "Filter",
    color: "bg-amber-100 border-amber-300 text-amber-800",
    /**
     * implementation 表示"去重字段类型". 当前仅实现 image; 其他类型已枚举,
     * 接入只需在 src/run/dedup.ts 中补充 handler.
     */
    implementations: [
      {
        key: "images",
        label: "按图片",
        description: "指定表单中作为图片的字段, 按图片内容去重",
        fields: [
          {
            key: "source_field",
            label: "图片字段路径 (JSON Pointer)",
            type: "text",
            default: "/image",
            help:
              "相对于 formData 的 JSON Pointer; 表单中存放图片的字段, 如 /image, /screenshot, " +
              "/photos/* (数组型字段); 直接图片上传场景可留空, 自动取上传图本身",
          },
          {
            key: "algo",
            label: "算法",
            type: "select",
            options: [
              { value: "exact_hash", label: "精确哈希 (MD5/SHA-1)" },
              { value: "perceptual_hash", label: "感知哈希 (pHash/dHash)" },
              { value: "embedding", label: "语义向量 (CLIP)" },
            ],
            default: "exact_hash",
          },
          {
            key: "threshold",
            label: "相似度阈值",
            type: "number",
            default: 0,
            help: "感知哈希: 汉明距离 (越小越严格); 语义向量: 余弦相似度; exact_hash 忽略此项",
          },
        ],
      },
      {
        key: "addresses",
        label: "按加密地址",
        description: "指定表单中作为地址的字段, 规范化后精确比对",
        fields: [
          {
            key: "source_field",
            label: "地址字段路径 (JSON Pointer)",
            type: "text",
            default: "/address",
            help:
              "相对于 formData 的 JSON Pointer; 如 /address, /txHash, /addresses/* (数组)",
          },
          {
            key: "chain",
            label: "链",
            type: "select",
            options: [
              { value: "any", label: "不限 (按字符串比较)" },
              { value: "evm", label: "EVM 系 (统一小写)" },
              { value: "btc", label: "Bitcoin" },
              { value: "solana", label: "Solana" },
            ],
            default: "any",
            help: "用于地址规范化",
          },
          {
            key: "case_sensitive",
            label: "区分大小写",
            type: "select",
            options: [
              { value: "false", label: "否 (推荐)" },
              { value: "true", label: "是" },
            ],
            default: "false",
          },
        ],
      },
    ],
  },
  {
    key: "datasource",
    label: "数据源",
    description: "引入已有数据集供标注",
    icon: "Database",
    color: "bg-sky-100 border-sky-300 text-sky-800",
    implementations: [
      {
        key: "file_import",
        label: "文件导入",
        description: "从本地 CSV / JSONL / JSON 文件批量导入",
        fields: [
          { key: "path", label: "文件路径", type: "text", placeholder: "./data/items.jsonl", default: "./data/items.jsonl" },
          {
            key: "format", label: "格式", type: "select",
            options: [
              { value: "jsonl", label: "JSONL" },
              { value: "json", label: "JSON 数组" },
              { value: "csv", label: "CSV" },
            ],
            default: "jsonl",
          },
        ],
      },
      {
        key: "s3_dataset",
        label: "S3 数据集",
        description: "从对象存储拉取已整理的数据集",
        fields: [
          { key: "bucket", label: "Bucket", type: "text", placeholder: "my-bucket" },
          { key: "prefix", label: "Prefix", type: "text", placeholder: "datasets/v1/" },
          { key: "region", label: "Region", type: "text", default: "us-east-1" },
        ],
      },
      {
        key: "ls_project",
        label: "Label Studio 项目",
        description: "从已有 Label Studio 项目导入任务",
        fields: [
          { key: "project_id", label: "项目 ID", type: "text", placeholder: "123" },
          { key: "ls_url", label: "LS 地址", type: "text", default: "http://localhost:8080" },
          { key: "api_key", label: "API Key", type: "text", placeholder: "留空使用环境变量" },
        ],
      },
      {
        key: "manual_upload",
        label: "手动上传",
        description: "逐条手动上传待标注数据",
        fields: [
          { key: "path", label: "本地路径", type: "text", placeholder: "./data/images", default: "./data/images" },
          {
            key: "file_types", label: "文件类型", type: "multiselect",
            options: [
              { value: "image", label: "图像 (.jpg/.png)" },
              { value: "video", label: "视频 (.mp4)" },
              { value: "text", label: "文本 (.txt/.json)" },
            ],
            default: ["image"],
          },
        ],
      },
    ],
  },
  {
    key: "annotate",
    label: "标注",
    description: "人工标注 (嵌入 Label Studio Editor)",
    icon: "Edit3",
    color: "bg-emerald-100 border-emerald-300 text-emerald-800",
    implementations: [
      {
        key: "ls_image_detection",
        label: "LS · 图像目标检测",
        description: "Label Studio + RectangleLabels",
        fields: [
          { key: "labels", label: "标签集", type: "tags", default: ["person", "car", "truck"], placeholder: "回车添加" },
          {
            key: "ml_backend", label: "ML Backend 预标", type: "select",
            options: [
              { value: "none", label: "不使用" },
              { value: "yolov8n", label: "YOLOv8n" },
              { value: "yolov8s", label: "YOLOv8s" },
            ],
            default: "yolov8n",
          },
          { key: "conf_threshold", label: "预标置信度阈值", type: "number", default: 0.25 },
        ],
      },
      {
        key: "ls_image_segmentation",
        label: "LS · 图像分割",
        description: "Label Studio + PolygonLabels/BrushLabels",
        fields: [
          { key: "labels", label: "标签集", type: "tags", default: ["foreground", "background"] },
          {
            key: "tool", label: "工具", type: "select",
            options: [
              { value: "polygon", label: "多边形" },
              { value: "brush", label: "画笔" },
              { value: "sam", label: "SAM 交互" },
            ],
            default: "polygon",
          },
        ],
      },
      {
        key: "ls_text_classification",
        label: "LS · 文本分类",
        description: "Label Studio + Choices",
        fields: [
          { key: "labels", label: "类别", type: "tags", default: ["positive", "negative", "neutral"] },
          {
            key: "choice_type", label: "选择方式", type: "select",
            options: [
              { value: "single", label: "单选" },
              { value: "multiple", label: "多选" },
            ],
            default: "single",
          },
        ],
      },
      {
        key: "ls_text_ner",
        label: "LS · 文本实体识别",
        description: "Label Studio + Labels",
        fields: [
          { key: "labels", label: "实体类型", type: "tags", default: ["PER", "LOC", "ORG"] },
        ],
      },
    ],
  },
  {
    key: "review",
    label: "审核",
    description: "质量把关 — 通过 / 打回",
    icon: "ShieldCheck",
    color: "bg-violet-100 border-violet-300 text-violet-800",
    implementations: [
      {
        key: "full_manual",
        label: "全量人工审核",
        description: "所有标注都过人",
        fields: [
          { key: "min_reviewers", label: "最少审核人数", type: "number", default: 1 },
        ],
      },
      {
        key: "sample_review",
        label: "抽检",
        description: "按比例抽样进人工",
        fields: [
          { key: "sample_rate", label: "抽样比例", type: "number", default: 0.2, help: "0~1 之间" },
          {
            key: "strategy", label: "抽样策略", type: "select",
            options: [
              { value: "random", label: "随机" },
              { value: "low_confidence", label: "低置信度优先" },
              { value: "stratified", label: "按标签分层" },
            ],
            default: "random",
          },
        ],
      },
      {
        key: "rule_based",
        label: "规则自动审核",
        description: "规则通过直入库, 不通过走人工",
        fields: [
          {
            key: "rules", label: "规则 (每行一条)", type: "textarea",
            default: "count(labels) > 0\narea > 100",
            help: "支持简单表达式",
          },
        ],
      },
    ],
  },
  {
    key: "export",
    label: "导出",
    description: "数据出库",
    icon: "Upload",
    color: "bg-rose-100 border-rose-300 text-rose-800",
    implementations: [
      {
        key: "coco",
        label: "COCO",
        description: "目标检测标准格式",
        fields: [
          { key: "output_path", label: "输出路径", type: "text", default: "./output/coco.json" },
          { key: "include_rejected", label: "是否包含未通过", type: "select",
            options: [{ value: "false", label: "否 (仅 approved)" }, { value: "true", label: "是" }],
            default: "false",
          },
        ],
      },
      {
        key: "yolo",
        label: "YOLO",
        description: "YOLO 格式 (图+txt)",
        fields: [
          { key: "output_path", label: "输出目录", type: "text", default: "./output/yolo/" },
        ],
      },
      {
        key: "jsonl",
        label: "JSONL",
        description: "每行一条记录",
        fields: [
          { key: "output_path", label: "输出文件", type: "text", default: "./output/data.jsonl" },
          { key: "flatten", label: "展平字段", type: "select",
            options: [{ value: "true", label: "是" }, { value: "false", label: "否 (保留嵌套)" }],
            default: "true",
          },
        ],
      },
      {
        key: "csv",
        label: "CSV",
        description: "表格化导出",
        fields: [
          { key: "output_path", label: "输出文件", type: "text", default: "./output/data.csv" },
        ],
      },
    ],
  },
];

/** 采集任务步骤顺序: 采集 → 去重 → 审核 → 导出 */
export const COLLECT_STEP_ORDER: StepKey[] = ["collect", "dedup", "review", "export"];

/** 标注任务步骤顺序: 数据源 → 标注 → 审核 → 导出 */
export const ANNOTATE_STEP_ORDER: StepKey[] = ["datasource", "annotate", "review", "export"];

/** 兼容旧引用, 指向采集顺序 */
export const STEP_ORDER = COLLECT_STEP_ORDER;

export function getStepOrder(taskType: TaskType): StepKey[] {
  return taskType === "annotate" ? ANNOTATE_STEP_ORDER : COLLECT_STEP_ORDER;
}

export function getStepSchema(key: StepKey): StepSchema {
  return STEP_SCHEMAS.find((s) => s.key === key)!;
}

export function getImplSchema(stepKey: StepKey, implKey: string) {
  return getStepSchema(stepKey).implementations.find((i) => i.key === implKey);
}

/** 根据 schema 默认值生成指定类型的 pipeline */
export function buildPipeline(taskType: TaskType): StepConfig[] {
  return getStepOrder(taskType).map((key) => {
    const schema = getStepSchema(key);
    const impl = schema.implementations[0];
    const params: Record<string, any> = {};
    impl.fields.forEach((f) => {
      if (f.default !== undefined) params[f.key] = f.default;
    });
    return { key, implementation: impl.key, params };
  });
}

/** @deprecated 使用 buildPipeline("collect") */
export function defaultPipeline(): StepConfig[] {
  return buildPipeline("collect");
}
