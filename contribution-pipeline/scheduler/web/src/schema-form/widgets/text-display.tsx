import type { WidgetProps } from "@rjsf/utils";

export function TextDisplayWidget(props: WidgetProps) {
  const { value, options, formContext } = props;
  const sourceField = options?.sourceField as string | undefined;
  const ctx = (formContext ?? {}) as Record<string, unknown>;
  const text = (value as string) || (sourceField ? (ctx[sourceField] as string) : "") || "";

  return (
    <div
      style={{
        borderRadius: 4,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        padding: "8px 10px",
        fontSize: 12,
        color: "#374151",
        whiteSpace: "pre-wrap",
      }}
    >
      {text || <span style={{ color: "#9ca3af" }}>暂无文本</span>}
    </div>
  );
}
