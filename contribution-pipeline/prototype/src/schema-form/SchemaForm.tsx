import { useCallback, useState } from "react";
import RjsfForm from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { IChangeEvent } from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

import { customWidgets } from "./widgets";
import { customTemplates } from "./rjsf-templates";
import type { FormResult } from "./types";

interface SchemaFormProps {
  /** 表单 id (用于 FormResult.templateId, 也可作为 RJSF 的 idPrefix) */
  id?: string;
  /** 标准 JSON Schema */
  schema: RJSFSchema;
  /** UI Schema, 控制 widget 与展示 */
  uiSchema?: UiSchema;
  /** 任务上下文 (传给 widget 通过 formContext 读取, 如 imageUrl/text 等) */
  taskData?: Record<string, unknown>;
  /** 初始数据 */
  initialData?: Record<string, unknown>;
  /** 提交回调 */
  onSubmit: (result: FormResult) => void | Promise<void>;
  /** 表单变更回调 (自动保存草稿) */
  onChange?: (data: Record<string, unknown>) => void;
  /** 提交按钮文案 */
  submitText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readonly?: boolean;
}

/**
 * SchemaForm - 基于 @rjsf/core 的表单渲染器
 *
 * 特性:
 *  - 标准 JSON Schema (Draft 7) 驱动
 *  - 内置 30+ widget (RJSF 核心提供) + 5 个项目自定义 widget
 *  - Tailwind 样式 (通过 customTemplates 适配)
 *  - taskData 通过 formContext 注入到 widget, 用于变量插值
 *
 * 添加自定义 widget: 见 ./widgets/README.md
 */
export function SchemaForm({
  id,
  schema,
  uiSchema,
  taskData,
  initialData,
  onSubmit,
  onChange,
  submitText = "提交",
  disabled,
  readonly,
}: SchemaFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData ?? {});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: IChangeEvent) => {
      setFormData(e.formData ?? {});
      onChange?.(e.formData ?? {});
    },
    [onChange]
  );

  const handleSubmit = useCallback(
    async (e: IChangeEvent) => {
      setSubmitting(true);
      try {
        await onSubmit({
          templateId: id ?? "anonymous",
          data: e.formData ?? {},
          submittedAt: new Date().toISOString(),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [id, onSubmit]
  );

  return (
    <RjsfForm
      idPrefix={id}
      schema={schema}
      uiSchema={uiSchema}
      validator={validator}
      formData={formData}
      formContext={taskData}
      widgets={customWidgets}
      templates={customTemplates}
      disabled={disabled}
      readonly={readonly}
      onChange={handleChange}
      onSubmit={handleSubmit}
      showErrorList={false}
      noHtml5Validate
    >
      <div className="pt-2">
        <button type="submit" className="btn-primary" disabled={submitting || disabled}>
          {submitting ? "提交中..." : submitText}
        </button>
      </div>
    </RjsfForm>
  );
}
