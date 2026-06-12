import type { FieldTemplateProps } from "@rjsf/utils";
import { fieldStyle, labelStyle, descriptionStyle, errorStyle, requiredMark } from "../styles";

export function FieldTemplate(props: FieldTemplateProps) {
  const { id, label, required, rawErrors, children, description, help, hidden, schema, displayLabel } = props;
  if (hidden) return <div style={{ display: "none" }}>{children}</div>;
  if (schema.type === "object" || schema.type === "array") {
    return <div>{children}</div>;
  }
  return (
    <div style={fieldStyle}>
      {displayLabel && label && (
        <label htmlFor={id} style={labelStyle}>
          {label}
          {required && <span style={requiredMark}>*</span>}
        </label>
      )}
      {children}
      {description && <div style={descriptionStyle}>{description}</div>}
      {rawErrors && rawErrors.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {rawErrors.map((err, i) => (
            <li key={i} style={errorStyle}>
              {err}
            </li>
          ))}
        </ul>
      )}
      {help}
    </div>
  );
}
