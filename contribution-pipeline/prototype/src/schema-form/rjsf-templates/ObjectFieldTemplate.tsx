import type { ObjectFieldTemplateProps } from "@rjsf/utils";

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { title, description, properties } = props;
  return (
    <div className="space-y-1">
      {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
      {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}
      {properties.map((p) => (
        <div key={p.name}>{p.content}</div>
      ))}
    </div>
  );
}
