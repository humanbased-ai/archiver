// Schema Form 类型定义 (基于 @rjsf/core)
// ----------------------------------------------------------------
// 设计:
//  - 使用标准 JSON Schema (Draft 7) 描述数据结构和校验
//  - 使用 RJSF 的 UI Schema 控制 UI 呈现 (ui:widget / ui:options ...)
//  - TaskTemplate 把 schema/uiSchema 打包, 配合元信息便于检索
// ----------------------------------------------------------------

import type { RJSFSchema, UiSchema } from "@rjsf/utils";

/** 任务模板: 一个完整的可配置表单单元 */
export interface TaskTemplate {
  /** 模板 id (唯一) */
  id: string;
  /** 显示标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 分类: 数据采集 / 数据标注 / 其他 */
  category: "collection" | "annotation" | "other";
  /** 标准 JSON Schema (Draft 7) */
  schema: RJSFSchema;
  /** RJSF UI Schema, 控制控件类型与样式 */
  uiSchema?: UiSchema;
  /** 提交按钮文案 */
  submitText?: string;
}

/** 提交结果 */
export interface FormResult {
  templateId: string;
  /** 表单数据 (符合 schema 的对象) */
  data: Record<string, unknown>;
  /** 提交时间 */
  submittedAt: string;
}

// 重新导出 RJSF 类型, 方便消费方使用
export type { RJSFSchema, UiSchema } from "@rjsf/utils";
