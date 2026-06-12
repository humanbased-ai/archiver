import type { ArrayFieldTemplateProps } from "@rjsf/utils";

interface ArrayItem {
  key: string;
  children: React.ReactNode;
  index: number;
  hasMoveUp: boolean;
  hasMoveDown: boolean;
  hasRemove: boolean;
  onReorderClick: (i: number, j: number) => () => void;
  onDropIndexClick: (i: number) => () => void;
}

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { title, canAdd, onAddClick } = props;
  const items = props.items as unknown as ArrayItem[];

  return (
    <div style={{ marginBottom: 12 }}>
      {title && (
        <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>{title}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              padding: 8,
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              background: "white",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>{item.children}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {item.hasMoveUp && (
                <button
                  type="button"
                  onClick={item.onReorderClick(item.index, item.index - 1)}
                  style={iconBtn}
                >
                  ↑
                </button>
              )}
              {item.hasMoveDown && (
                <button
                  type="button"
                  onClick={item.onReorderClick(item.index, item.index + 1)}
                  style={iconBtn}
                >
                  ↓
                </button>
              )}
              {item.hasRemove && (
                <button
                  type="button"
                  onClick={item.onDropIndexClick(item.index)}
                  style={{ ...iconBtn, color: "#ef4444" }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={onAddClick}
          style={{
            marginTop: 8,
            background: "transparent",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            fontSize: 12,
            padding: 0,
          }}
        >
          + 添加项
        </button>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#9ca3af",
  fontSize: 14,
  lineHeight: 1,
  padding: "2px 4px",
};
