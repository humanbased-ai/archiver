import { useRef } from "react";
import { Upload as UploadIcon, X } from "lucide-react";
import type { WidgetProps } from "@rjsf/utils";

/**
 * 自定义 widget: 图片上传 (单张)
 * 用法: { "ui:widget": "image-upload", "ui:options": { placeholder: "..." } }
 *
 * Widget 协议 (RJSF 标准):
 *  - 接收 WidgetProps, 通过 props.value / props.onChange 与表单状态同步
 *  - 通过 props.options 读取 ui:options
 *  - 通过 props.schema / props.required 读取 schema 元数据
 */
export function ImageUploadWidget(props: WidgetProps) {
  const { value, onChange, options, disabled, readonly } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const url = value as string | undefined;
  const placeholder = (options?.placeholder as string) ?? "点击上传图片";

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 读成 data URL: 同一文件字节 → 同一字符串, 下游 dedup 才能稳定 hash 命中.
    // (URL.createObjectURL 每次会生成全新 blob URL, 哈希永远不一样, 会破坏去重)
    // 真实场景: 应上传后端获取持久化 URL, 并在前端单独保留 hash 字段
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  if (url) {
    return (
      <div className="relative rounded border border-slate-200 overflow-hidden bg-slate-50">
        <img src={url} alt="" className="block max-w-full max-h-[300px] mx-auto" />
        {!disabled && !readonly && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || readonly}
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-300 rounded-lg py-10 text-center text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        <UploadIcon className="w-6 h-6 mx-auto mb-1.5" />
        <div className="text-sm">{placeholder}</div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
    </>
  );
}
