import RjsfForm from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { IChangeEvent } from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { customWidgets } from "./widgets";
import { customTemplates } from "./rjsf-templates";

interface SchemaFormProps {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  value: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  formContext?: Record<string, unknown>;
  disabled?: boolean;
  readonly?: boolean;
}

export function SchemaForm({
  schema,
  uiSchema,
  value,
  onChange,
  formContext,
  disabled,
  readonly,
}: SchemaFormProps) {
  const ui: UiSchema = {
    ...uiSchema,
    "ui:submitButtonOptions": { norender: true },
  };
  // readonly 模式下用 <fieldset disabled> 兜底: 标准 widget (TextWidget/TextareaWidget) 用的是
  // HTML readOnly, 视觉上输入框看起来还是能输入, 实际敲不进去 — 容易误导用户.
  // fieldset disabled 让所有原生 input/select/button/textarea 进 disabled 态 (灰化、不可聚焦),
  // 配合 RjsfForm 自己的 readonly 信号 (widget 自己也会切到 readonly 分支, 比如不渲染 × 删除按钮),
  // 是对"审核阶段不能动"的一道实打实的视觉 + 行为锁.
  const lock = readonly === true;
  const form = (
    <RjsfForm
      schema={schema}
      uiSchema={ui}
      validator={validator}
      formData={value}
      formContext={formContext}
      widgets={customWidgets}
      templates={customTemplates}
      disabled={disabled}
      readonly={readonly}
      onChange={(e: IChangeEvent) => onChange((e.formData ?? {}) as Record<string, unknown>)}
      showErrorList={false}
      noHtml5Validate
      liveValidate={false}
    />
  );
  if (!lock) return form;
  return (
    <fieldset
      disabled
      style={{
        border: "none",
        padding: 0,
        margin: 0,
        // 整体淡背景, 让 reviewer 一眼看出是回填的只读数据
        background: "#f9fafb",
        borderRadius: 6,
        // fieldset disabled 光标会变 not-allowed, 这里收一下 default 让 hover 不显得突兀
        cursor: "default",
      }}
    >
      {form}
    </fieldset>
  );
}
