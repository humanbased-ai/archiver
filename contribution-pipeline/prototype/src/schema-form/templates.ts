// 内置模板 - 全部使用标准 JSON Schema (Draft 7) + RJSF UI Schema
// 自定义控件 (image-upload / image-display / image-bbox / text-display) 通过 ui:widget 引用
// 详细 widget 实现见 ./widgets

import type { TaskTemplate } from "./types";

/* ============================================================
 * 数据采集模板
 * ============================================================ */

/** 真实世界图片采集 */
const realWorldPhotoCollection: TaskTemplate = {
  id: "real_world_photo_collection",
  title: "真实世界图片采集",
  description: "上传一张真实拍摄的图片, 并补充元信息",
  category: "collection",
  submitText: "提交采集数据",
  schema: {
    type: "object",
    required: ["image", "scene", "lighting"],
    properties: {
      image: {
        type: "string",
        title: "图片",
      },
      scene: {
        type: "string",
        title: "场景类型",
        oneOf: [
          { const: "indoor", title: "室内" },
          { const: "outdoor", title: "户外" },
          { const: "street", title: "街景" },
          { const: "nature", title: "自然风光" },
        ],
      },
      lighting: {
        type: "string",
        title: "光照条件",
        oneOf: [
          { const: "day", title: "白天" },
          { const: "night", title: "夜晚" },
          { const: "indoor_light", title: "室内光" },
        ],
      },
      tags: {
        type: "array",
        title: "标签",
        items: { type: "string" },
        uniqueItems: true,
      },
      description: {
        type: "string",
        title: "图片描述",
        maxLength: 200,
      },
    },
  },
  uiSchema: {
    image: {
      "ui:widget": "image-upload",
      "ui:options": { placeholder: "点击上传一张实拍图片 (JPG/PNG)" },
    },
    scene: { "ui:widget": "select" },
    lighting: { "ui:widget": "radio", "ui:options": { inline: true } },
    tags: {
      "ui:widget": "tags",
      "ui:options": { placeholder: "如: 桌子, 咖啡, 笔记本" },
    },
    description: {
      "ui:widget": "textarea",
      "ui:options": { rows: 3, placeholder: "用 1-2 句话描述图片内容" },
    },
  },
};

/** 加密钱包交易信息采集 */
const cryptoTransactionCollection: TaskTemplate = {
  id: "crypto_transaction_collection",
  title: "交易所交易信息采集",
  description: "提交一次充值/提现的截图与详情",
  category: "collection",
  schema: {
    type: "object",
    required: ["type", "exchange", "network", "currency", "txHash", "screenshot"],
    properties: {
      type: {
        type: "string",
        title: "交易类型",
        default: "deposit",
        oneOf: [
          { const: "deposit", title: "充值" },
          { const: "withdraw", title: "提现" },
        ],
      },
      exchange: {
        type: "string",
        title: "交易所",
        oneOf: [
          { const: "binance", title: "Binance" },
          { const: "okx", title: "OKX" },
          { const: "coinbase", title: "Coinbase" },
        ],
      },
      network: {
        type: "string",
        title: "网络",
        oneOf: [
          { const: "ethereum", title: "Ethereum" },
          { const: "bsc", title: "BSC" },
          { const: "tron", title: "Tron" },
        ],
      },
      currency: {
        type: "string",
        title: "币种",
        oneOf: [
          { const: "USDT", title: "USDT" },
          { const: "USDC", title: "USDC" },
          { const: "BTC", title: "BTC" },
          { const: "ETH", title: "ETH" },
        ],
      },
      txHash: {
        type: "string",
        title: "交易哈希",
      },
      screenshot: {
        type: "string",
        title: "交易截图",
      },
      remark: {
        type: "string",
        title: "备注",
      },
    },
  },
  uiSchema: {
    type: { "ui:widget": "radio", "ui:options": { inline: true } },
    exchange: { "ui:widget": "select" },
    network: { "ui:widget": "select" },
    currency: { "ui:widget": "select" },
    txHash: { "ui:options": { placeholder: "0x..." } },
    screenshot: { "ui:widget": "image-upload" },
    remark: { "ui:widget": "textarea", "ui:options": { rows: 3 } },
  },
};

/* ============================================================
 * 数据标注模板
 * ============================================================ */

/** 图像分类标注 */
const imageClassification: TaskTemplate = {
  id: "image_classification",
  title: "图像分类标注",
  description: "查看图片并选择对应类别",
  category: "annotation",
  submitText: "提交标注",
  schema: {
    type: "object",
    required: ["category", "quality"],
    properties: {
      image: { type: "string", title: "待标注图片" },
      category: {
        type: "string",
        title: "类别",
        oneOf: [
          { const: "person", title: "人物" },
          { const: "vehicle", title: "车辆" },
          { const: "animal", title: "动物" },
          { const: "scenery", title: "风景" },
          { const: "other", title: "其他" },
        ],
      },
      // 联动 - 仅当 category=animal 时显示
      subCategory: {
        type: "string",
        title: "动物子类",
        oneOf: [
          { const: "cat", title: "猫" },
          { const: "dog", title: "狗" },
          { const: "bird", title: "鸟" },
          { const: "other_animal", title: "其他动物" },
        ],
      },
      quality: {
        type: "string",
        title: "图片质量",
        default: "high",
        oneOf: [
          { const: "high", title: "清晰" },
          { const: "medium", title: "一般" },
          { const: "low", title: "模糊" },
        ],
      },
      comment: {
        type: "string",
        title: "备注",
      },
    },
    // 字段联动: 仅当 category=animal 时显示 subCategory
    dependencies: {
      category: {
        oneOf: [
          {
            properties: {
              category: { not: { const: "animal" } },
            },
          },
          {
            properties: {
              category: { const: "animal" },
              subCategory: { type: "string" },
            },
            required: ["subCategory"],
          },
        ],
      },
    },
  },
  uiSchema: {
    image: { "ui:widget": "image-display", "ui:options": { sourceField: "imageUrl" } },
    category: { "ui:widget": "radio" },
    subCategory: { "ui:widget": "select" },
    quality: { "ui:widget": "radio", "ui:options": { inline: true } },
    comment: { "ui:widget": "textarea", "ui:options": { rows: 3, placeholder: "可选" } },
  },
};

/** 目标检测 (边界框) */
const objectDetection: TaskTemplate = {
  id: "object_detection",
  title: "目标检测标注",
  description: "在图片上拖拽鼠标绘制边界框, 选择对应类别",
  category: "annotation",
  submitText: "提交检测结果",
  schema: {
    type: "object",
    required: ["boxes"],
    properties: {
      image: { type: "string", title: "图片" },
      boxes: {
        type: "array",
        title: "边界框",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            w: { type: "number" },
            h: { type: "number" },
            label: { type: "string" },
          },
        },
      },
      difficulty: {
        type: "string",
        title: "标注难度",
        default: "normal",
        oneOf: [
          { const: "easy", title: "简单" },
          { const: "normal", title: "正常" },
          { const: "hard", title: "困难" },
        ],
      },
    },
  },
  uiSchema: {
    image: { "ui:widget": "image-display", "ui:options": { sourceField: "imageUrl" } },
    boxes: {
      "ui:widget": "image-bbox",
      "ui:options": {
        sourceField: "imageUrl",
        labels: [
          { value: "person", label: "person", color: "#3b82f6" },
          { value: "car", label: "car", color: "#ef4444" },
          { value: "bicycle", label: "bicycle", color: "#10b981" },
          { value: "dog", label: "dog", color: "#f59e0b" },
        ],
      },
    },
    difficulty: { "ui:widget": "radio", "ui:options": { inline: true } },
  },
};

/** 文本分类 */
const textClassification: TaskTemplate = {
  id: "text_classification",
  title: "文本分类标注",
  category: "annotation",
  schema: {
    type: "object",
    required: ["sentiment"],
    properties: {
      text: { type: "string", title: "文本内容" },
      sentiment: {
        type: "string",
        title: "情感倾向",
        oneOf: [
          { const: "positive", title: "正面" },
          { const: "neutral", title: "中性" },
          { const: "negative", title: "负面" },
        ],
      },
      intent: {
        type: "string",
        title: "意图",
        oneOf: [
          { const: "question", title: "提问" },
          { const: "complaint", title: "投诉" },
          { const: "praise", title: "好评" },
          { const: "suggestion", title: "建议" },
        ],
      },
      labels: {
        type: "array",
        title: "多标签",
        uniqueItems: true,
        items: {
          type: "string",
          oneOf: [
            { const: "urgent", title: "紧急" },
            { const: "spam", title: "垃圾" },
            { const: "needs_review", title: "需要复核" },
          ],
        },
      },
    },
  },
  uiSchema: {
    text: { "ui:widget": "text-display", "ui:options": { sourceField: "text" } },
    sentiment: { "ui:widget": "radio", "ui:options": { inline: true } },
    intent: { "ui:widget": "select" },
    labels: { "ui:widget": "checkboxes", "ui:options": { inline: true } },
  },
};

/** 通用业务表单 (展示 RJSF 标准能力, 全用内置 widget) */
const generalBusinessForm: TaskTemplate = {
  id: "general_business_form",
  title: "通用业务表单 (展示 RJSF 标准能力)",
  description: "全部使用 RJSF 内置 widget, 演示数组/嵌套/校验",
  category: "other",
  schema: {
    type: "object",
    required: ["name", "email"],
    properties: {
      name: { type: "string", title: "姓名", minLength: 2 },
      email: { type: "string", title: "邮箱", format: "email" },
      age: { type: "integer", title: "年龄", minimum: 0, maximum: 150 },
      website: { type: "string", title: "个人主页", format: "uri" },
      bio: { type: "string", title: "个人简介", maxLength: 500 },
      contacts: {
        type: "array",
        title: "联系人",
        items: {
          type: "object",
          required: ["name", "phone"],
          properties: {
            name: { type: "string", title: "姓名" },
            phone: { type: "string", title: "电话" },
            relationship: {
              type: "string",
              title: "关系",
              oneOf: [
                { const: "family", title: "家人" },
                { const: "friend", title: "朋友" },
                { const: "colleague", title: "同事" },
              ],
            },
          },
        },
      },
    },
  },
  uiSchema: {
    bio: { "ui:widget": "textarea", "ui:options": { rows: 4 } },
  },
};

export const TEMPLATES: Record<string, TaskTemplate> = {
  real_world_photo_collection: realWorldPhotoCollection,
  crypto_transaction_collection: cryptoTransactionCollection,
  image_classification: imageClassification,
  object_detection: objectDetection,
  text_classification: textClassification,
  general_business_form: generalBusinessForm,
};
