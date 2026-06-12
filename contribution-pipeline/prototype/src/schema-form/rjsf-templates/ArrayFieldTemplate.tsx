import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
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
    <div className="mb-4">
      {title && <div className="block text-sm font-medium text-slate-700 mb-2">{title}</div>}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-start gap-2 p-3 border border-slate-200 rounded bg-white"
          >
            <div className="flex-1 min-w-0">{item.children}</div>
            <div className="flex flex-col gap-1 shrink-0">
              {item.hasMoveUp && (
                <button
                  type="button"
                  onClick={item.onReorderClick(item.index, item.index - 1)}
                  className="text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}
              {item.hasMoveDown && (
                <button
                  type="button"
                  onClick={item.onReorderClick(item.index, item.index + 1)}
                  className="text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
              {item.hasRemove && (
                <button
                  type="button"
                  onClick={item.onDropIndexClick(item.index)}
                  className="text-slate-400 hover:text-rose-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
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
          className="mt-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          <Plus className="w-3.5 h-3.5" /> 添加项
        </button>
      )}
    </div>
  );
}
