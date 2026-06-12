import { useState } from "react";
import { X } from "lucide-react";
import type { WidgetProps } from "@rjsf/utils";

/** 自定义 widget: 标签输入 (回车添加) */
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
        <div className="flex flex-wrap gap-1.5 mb-2">
          {arr.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
            >
              {tag}
              {!disabled && !readonly && (
                <button type="button" onClick={() => remove(tag)}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <input
        className="input"
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
