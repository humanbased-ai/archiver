import type { ObjectFieldTemplateProps } from "@rjsf/utils";

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { title, description, properties } = props;
  return (
    <div>
      {title && (
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
          {title}
        </h4>
      )}
      {description && (
        <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px" }}>{description}</p>
      )}
      {properties.map((p) => (
        <div key={p.name}>{p.content}</div>
      ))}
    </div>
  );
}
