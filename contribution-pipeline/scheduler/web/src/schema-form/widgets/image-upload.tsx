import { useRef } from "react";
import type { WidgetProps } from "@rjsf/utils";

export function ImageUploadWidget(props: WidgetProps) {
  const { value, onChange, options, disabled, readonly } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const url = value as string | undefined;
  const placeholder = (options?.placeholder as string) ?? "点击上传图片";

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  if (url) {
    return (
      <div
        style={{
          position: "relative",
          borderRadius: 4,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          background: "#f9fafb",
        }}
      >
        <img
          src={url}
          alt=""
          style={{ display: "block", maxWidth: "100%", maxHeight: 240, margin: "0 auto" }}
        />
        {!disabled && !readonly && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "rgba(255,255,255,0.9)",
              borderRadius: "50%",
              border: "none",
              width: 24,
              height: 24,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ×
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
        style={{
          width: "100%",
          padding: "32px 12px",
          border: "2px dashed #d1d5db",
          borderRadius: 6,
          background: "white",
          color: "#6b7280",
          textAlign: "center",
          cursor: disabled || readonly ? "not-allowed" : "pointer",
          fontSize: 12,
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 4 }}>⬆</div>
        <div>{placeholder}</div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
    </>
  );
}
