import type { WidgetProps } from "@rjsf/utils";

/** 自定义 widget: 只读文本展示 (从 formContext.{sourceField} 读取) */
export function TextDisplayWidget(props: WidgetProps) {
  const { value, options, formContext } = props;
  const sourceField = options?.sourceField as string | undefined;
  const ctx = (formContext ?? {}) as Record<string, unknown>;
  const text = (value as string) || (sourceField ? (ctx[sourceField] as string) : "") || "";

  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 whitespace-pre-wrap">
      {text || <span className="text-slate-400">暂无文本</span>}
    </div>
  );
}
