import { useState } from "react";
import type { WidgetProps } from "@rjsf/utils";
import { inputStyle } from "../styles";

export function TagsWidget(props: WidgetProps) {
  const { value, onChange, options, disabled, readonly } = props;
  const arr = (Array.isArray(value) ? value : []) as string[];
  const [input, setInput] = useState("");
  const placeholder = (options?.placeholder as string) ?? "输入后回车添加";

  const add = () => {
    const v = input.trim();
    if (v && !arr.includes(v)) onChange([...arr, v]);
    setInput("");
  };
  const remove = (tag: string) => onChange(arr.filter((x) => x !== tag));

  return (
    <div>
      {arr.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {arr.map((tag) => (
            <span
              key={tag}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                background: "#f3f4f6",
                color: "#374151",
              }}
            >
              {tag}
              {!disabled && !readonly && (
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    padding: 0,
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                  aria-label="remove"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <input
        style={inputStyle}
        disabled={disabled || readonly}
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
