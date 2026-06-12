import type { WidgetProps } from "@rjsf/utils";

export function ImageDisplayWidget(props: WidgetProps) {
  const { value, options, formContext } = props;
  const sourceField = options?.sourceField as string | undefined;
  const ctx = (formContext ?? {}) as Record<string, unknown>;
  const url = (value as string) || (sourceField ? (ctx[sourceField] as string) : "") || "";

  if (!url) return <div style={{ fontSize: 11, color: "#9ca3af" }}>暂无图片</div>;
  return (
    <div
      style={{
        borderRadius: 4,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        background: "#f9fafb",
      }}
    >
      <img src={url} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: 320, margin: "0 auto" }} />
    </div>
  );
}
