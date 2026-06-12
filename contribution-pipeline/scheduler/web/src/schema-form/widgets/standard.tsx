import type { WidgetProps, RegistryWidgetsType } from "@rjsf/utils";
import { inputStyle, buttonOptionStyle } from "../styles";

export function TextWidget(props: WidgetProps) {
  const { id, placeholder, value, onChange, onBlur, onFocus, autofocus, disabled, readonly, type, schema, options } = props;
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
      style={inputStyle}
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
  const rows = (options?.rows as number) ?? 3;
  return (
    <textarea
      id={id}
      style={{ ...inputStyle, resize: "vertical" }}
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

export function UpDownWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, schema, placeholder } = props;
  return (
    <input
      id={id}
      type="number"
      style={inputStyle}
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

interface EnumOption {
  value: unknown;
  label: string;
}
function getEnumOptions(props: WidgetProps): EnumOption[] {
  return (props.options?.enumOptions ?? []) as EnumOption[];
}

export function SelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, placeholder, multiple, required } = props;
  const enumOptions = getEnumOptions(props);
  return (
    <select
      id={id}
      style={inputStyle}
      disabled={disabled || readonly}
      multiple={multiple}
      value={multiple ? (value as string[] | undefined) ?? [] : (value as string | undefined) ?? ""}
      onChange={(e) => {
        const v = multiple
          ? Array.from(e.target.selectedOptions).map((o) => o.value)
          : e.target.value;
        onChange(v === "" ? undefined : v);
      }}
    >
      {!multiple && <option value="">{placeholder ?? (required ? "请选择" : "— 请选择 —")}</option>}
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
    <div
      style={{
        display: "flex",
        flexDirection: inline ? "row" : "column",
        flexWrap: inline ? "wrap" : "nowrap",
        gap: 6,
      }}
    >
      {enumOptions.map((opt, i) => {
        const selected = String(value) === String(opt.value);
        return (
          <button
            type="button"
            key={i}
            disabled={disabled || readonly}
            onClick={() => onChange(opt.value)}
            style={buttonOptionStyle(selected)}
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
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      <input
        id={id}
        type="checkbox"
        disabled={disabled || readonly}
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label && <span style={{ color: "#374151" }}>{label}</span>}
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
    <div
      style={{
        display: "flex",
        flexDirection: inline ? "row" : "column",
        flexWrap: inline ? "wrap" : "nowrap",
        gap: 6,
      }}
    >
      {enumOptions.map((opt, i) => {
        const checked = selected.some((x) => String(x) === String(opt.value));
        return (
          <button
            type="button"
            key={i}
            disabled={disabled || readonly}
            onClick={() => toggle(opt.value)}
            style={buttonOptionStyle(checked)}
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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        id={id}
        type="range"
        disabled={disabled || readonly}
        min={schema.minimum ?? 0}
        max={schema.maximum ?? 100}
        step={schema.multipleOf ?? 1}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ fontSize: 11, color: "#6b7280", width: 32, textAlign: "right" }}>{v}</span>
    </div>
  );
}

export function ColorWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly } = props;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input
        id={id}
        type="color"
        disabled={disabled || readonly}
        value={(value as string) ?? "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 28, border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", padding: 0 }}
      />
      <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#6b7280" }}>
        {(value as string) ?? "#000000"}
      </span>
    </div>
  );
}

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
