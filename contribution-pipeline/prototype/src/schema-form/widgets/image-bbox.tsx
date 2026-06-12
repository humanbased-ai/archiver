import { useRef, useState } from "react";
import { Square, X } from "lucide-react";
import type { WidgetProps } from "@rjsf/utils";

interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface BBoxLabel {
  value: string;
  label: string;
  color?: string;
}

/**
 * 自定义 widget: 图片 + 边界框标注
 * ui:options:
 *  - labels: { value, label, color }[] (可选标签)
 *  - sourceField: 从 formContext 中读取图片 URL (默认 imageUrl)
 */
export function ImageBboxWidget(props: WidgetProps) {
  const { value, onChange, options, formContext } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  const labels = (options?.labels as BBoxLabel[]) ?? [];
  const sourceField = (options?.sourceField as string) ?? "imageUrl";
  const ctx = (formContext ?? {}) as Record<string, unknown>;
  const imageUrl = ctx[sourceField] as string | undefined;

  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string>(labels[0]?.value ?? "");
  const boxes = (Array.isArray(value) ? value : []) as BBox[];

  const onMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrawing({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!drawing) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const x = Math.min(drawing.x, x2);
    const y = Math.min(drawing.y, y2);
    const w = Math.abs(x2 - drawing.x);
    const h = Math.abs(y2 - drawing.y);
    if (w > 5 && h > 5 && currentLabel) {
      onChange([...boxes, { x, y, w, h, label: currentLabel }]);
    }
    setDrawing(null);
  };

  const removeBox = (idx: number) => onChange(boxes.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {labels.map((opt) => {
          const active = currentLabel === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => setCurrentLabel(opt.value)}
              className={`px-2.5 py-1 rounded text-xs border ${
                active ? "border-transparent text-white" : "bg-white border-slate-300 text-slate-700"
              }`}
              style={
                active
                  ? { backgroundColor: opt.color || "#0ea5e9" }
                  : { borderColor: opt.color }
              }
            >
              <Square className="inline w-3 h-3 mr-1" style={{ color: opt.color }} />
              {opt.label}
            </button>
          );
        })}
      </div>
      <div
        ref={containerRef}
        className="relative inline-block border border-slate-300 rounded overflow-hidden cursor-crosshair select-none"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="block max-h-[420px] pointer-events-none" />
        ) : (
          <div className="w-[400px] h-[280px] bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
            无图片 (检查 ui:options.sourceField 与 formContext)
          </div>
        )}
        {boxes.map((b, i) => {
          const opt = labels.find((o) => o.value === b.label);
          return (
            <div
              key={i}
              className="absolute border-2 group"
              style={{
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                borderColor: opt?.color || "#0ea5e9",
              }}
            >
              <span
                className="absolute -top-5 left-0 text-[10px] px-1 rounded text-white"
                style={{ backgroundColor: opt?.color || "#0ea5e9" }}
              >
                {opt?.label || b.label}
              </span>
              <button
                type="button"
                onClick={() => removeBox(i)}
                className="absolute -top-2 -right-2 bg-white border border-slate-300 rounded-full p-0.5 opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        在图片上拖拽鼠标即可绘制边界框 · 当前 {boxes.length} 个
      </p>
    </div>
  );
}
