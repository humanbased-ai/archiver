// 标准 widget 的 Tailwind 样式覆盖
// ----------------------------------------------------------------
// 通过覆盖 RJSF 默认 widget 名 (TextWidget/SelectWidget/...)
// 让所有 schema 字段自动应用项目的 Tailwind 样式
// ----------------------------------------------------------------

import type { WidgetProps } from "@rjsf/utils";

/* ------------------------- 文本类 ------------------------- */

export function TextWidget(props: WidgetProps) {
  const {
    id,
    placeholder,
    value,
    onChange,
    onBlur,
    onFocus,
    autofocus,
    disabled,
    readonly,
    type,
    schema,
    options,
  } = props;

  // 根据 schema.format 自动选择 input type
  const inputType =
    type ??
    (schema.format === "email"
      ? "email"
      : schema.format === "uri"
      ? "url"
      : schema.format === "date"
      ? "date"
      : schema.format === "date-time"
      ? "datetime-local"
      : "text");

  return (
    <input
      id={id}
      type={inputType}
      className="input"
      placeholder={placeholder}
      autoFocus={autofocus}
      disabled={disabled}
      readOnly={readonly}
      value={(value as string | number | undefined) ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? options.emptyValue : e.target.value)}
      onBlur={onBlur && ((e) => onBlur(id, e.target.value))}
      onFocus={onFocus && ((e) => onFocus(id, e.target.value))}
    />
  );
}

export function TextareaWidget(props: WidgetProps) {
  const { id, placeholder, value, onChange, disabled, readonly, options } = props;
  const rows = (options?.rows as number) ?? 4;
  return (
    <textarea
      id={id}
      className="input"
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readonly}
      rows={rows}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? options.emptyValue : e.target.value)}
    />
  );
}

export function PasswordWidget(props: WidgetProps) {
  return <TextWidget {...props} type="password" />;
}

export function EmailWidget(props: WidgetProps) {
  return <TextWidget {...props} type="email" />;
}

export function URLWidget(props: WidgetProps) {
  return <TextWidget {...props} type="url" />;
}

/* ------------------------- 数字 ------------------------- */

export function UpDownWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, schema, placeholder } = props;
  return (
    <input
      id={id}
      type="number"
      className="input"
      disabled={disabled}
      readOnly={readonly}
      placeholder={placeholder}
      min={schema.minimum}
      max={schema.maximum}
      step={schema.multipleOf ?? "any"}
      value={(value as number | string | undefined) ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
    />
  );
}

/* ------------------------- 选择类 ------------------------- */

interface EnumOption {
  value: unknown;
  label: string;
}

function getEnumOptions(props: WidgetProps): EnumOption[] {
  return (props.options?.enumOptions ?? []) as EnumOption[];
}

export function SelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, placeholder, multiple } = props;
  const enumOptions = getEnumOptions(props);

  return (
    <select
      id={id}
      className="input"
      disabled={disabled || readonly}
      multiple={multiple}
      value={(value as string | undefined) ?? ""}
      onChange={(e) => {
        const v = multiple
          ? Array.from(e.target.selectedOptions).map((o) => o.value)
          : e.target.value;
        onChange(v);
      }}
    >
      {!multiple && <option value="">{placeholder ?? "请选择"}</option>}
      {enumOptions.map((opt, i) => (
        <option key={i} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function RadioWidget(props: WidgetProps) {
  const { value, onChange, disabled, readonly, options } = props;
  const enumOptions = getEnumOptions(props);
  const inline = options?.inline as boolean | undefined;

  return (
    <div className={inline ? "flex flex-wrap gap-2" : "flex flex-col gap-1.5"}>
      {enumOptions.map((opt, i) => {
        const selected = String(value) === String(opt.value);
        return (
          <button
            type="button"
            key={i}
            disabled={disabled || readonly}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors text-left ${
              selected
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-slate-700 border-slate-300 hover:border-brand-400"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckboxWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, label } = props;
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer text-sm">
      <input
        id={id}
        type="checkbox"
        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        disabled={disabled || readonly}
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label && <span className="text-slate-700">{label}</span>}
    </label>
  );
}

export function CheckboxesWidget(props: WidgetProps) {
  const { value, onChange, disabled, readonly, options } = props;
  const enumOptions = getEnumOptions(props);
  const inline = options?.inline as boolean | undefined;
  const selected = (Array.isArray(value) ? value : []) as unknown[];

  const toggle = (v: unknown) => {
    const isOn = selected.some((x) => String(x) === String(v));
    onChange(isOn ? selected.filter((x) => String(x) !== String(v)) : [...selected, v]);
  };

  return (
    <div className={inline ? "flex flex-wrap gap-2" : "flex flex-col gap-1.5"}>
      {enumOptions.map((opt, i) => {
        const checked = selected.some((x) => String(x) === String(opt.value));
        return (
          <button
            type="button"
            key={i}
            disabled={disabled || readonly}
            onClick={() => toggle(opt.value)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors text-left ${
              checked
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-slate-700 border-slate-300 hover:border-brand-400"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function RangeWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, schema } = props;
  const v = (value as number | undefined) ?? 0;
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        disabled={disabled || readonly}
        min={schema.minimum ?? 0}
        max={schema.maximum ?? 100}
        step={schema.multipleOf ?? 1}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-brand-600"
      />
      <span className="text-xs text-slate-600 w-10 text-right tabular-nums">{v}</span>
    </div>
  );
}

/* ------------------------- 文件 / 颜色 ------------------------- */

export function ColorWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly } = props;
  return (
    <div className="inline-flex items-center gap-2">
      <input
        id={id}
        type="color"
        disabled={disabled || readonly}
        value={(value as string) ?? "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-9 rounded border border-slate-300 cursor-pointer"
      />
      <span className="text-xs font-mono text-slate-500">{(value as string) ?? "#000000"}</span>
    </div>
  );
}

/* ------------------------- 标准 widget 注册表 ------------------------- */

import type { RegistryWidgetsType } from "@rjsf/utils";

export const standardWidgets: RegistryWidgetsType = {
  TextWidget,
  TextareaWidget,
  PasswordWidget,
  EmailWidget,
  URLWidget,
  UpDownWidget,
  SelectWidget,
  RadioWidget,
  CheckboxWidget,
  CheckboxesWidget,
  RangeWidget,
  ColorWidget,
};
