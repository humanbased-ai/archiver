import type { WidgetProps } from "@rjsf/utils";

/**
 * 自定义 widget: 只读图片展示
 * 数据来源:
 *  1. 字段值 (props.value)
 *  2. ui:options.sourceField + formContext (从任务上下文中读取)
 */
export function ImageDisplayWidget(props: WidgetProps) {
  const { value, options, formContext } = props;

  const sourceField = options?.sourceField as string | undefined;
  const ctx = (formContext ?? {}) as Record<string, unknown>;
  const url = (value as string) || (sourceField ? (ctx[sourceField] as string) : "") || "";

  if (!url) return <div className="text-xs text-slate-400">暂无图片</div>;

  return (
    <div className="rounded border border-slate-200 overflow-hidden bg-slate-50">
      <img src={url} alt="" className="block max-w-full max-h-[400px] mx-auto" />
    </div>
  );
}
