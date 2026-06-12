import type { FieldTemplateProps } from "@rjsf/utils";

/**
 * 自定义 FieldTemplate (Tailwind 适配)
 * 用 Tailwind 的 input/label class 替换 RJSF 默认的 Bootstrap 样式
 */
export function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    label,
    required,
    rawErrors,
    children,
    description,
    help,
    hidden,
    schema,
    displayLabel,
  } = props;

  if (hidden) return <div className="hidden">{children}</div>;

  // 对象/数组类型由 ObjectFieldTemplate / ArrayFieldTemplate 处理外壳, 这里仅渲染 children
  if (schema.type === "object" || schema.type === "array") {
    return <div>{children}</div>;
  }

  return (
    <div className="mb-4">
      {displayLabel && label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {description && <div className="text-xs text-slate-500 mt-1">{description}</div>}
      {rawErrors && rawErrors.length > 0 && (
        <ul className="mt-1">
          {rawErrors.map((err, i) => (
            <li key={i} className="text-xs text-rose-600">
              {err}
            </li>
          ))}
        </ul>
      )}
      {help}
    </div>
  );
}
