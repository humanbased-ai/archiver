import type { CSSProperties } from "react";

export const inputStyle: CSSProperties = {
  padding: "6px 8px",
  border: "1px solid #d1d5db",
  borderRadius: 4,
  fontSize: 12,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 4,
};

export const descriptionStyle: CSSProperties = {
  fontSize: 10,
  color: "#9ca3af",
  marginTop: 2,
};

export const errorStyle: CSSProperties = {
  fontSize: 11,
  color: "#ef4444",
  marginTop: 2,
};

export const fieldStyle: CSSProperties = {
  marginBottom: 12,
};

export const requiredMark: CSSProperties = {
  color: "#ef4444",
  marginLeft: 2,
};

export const buttonOptionStyle = (selected: boolean): CSSProperties => ({
  padding: "5px 10px",
  borderRadius: 4,
  fontSize: 12,
  border: `1px solid ${selected ? "#2563eb" : "#d1d5db"}`,
  background: selected ? "#2563eb" : "white",
  color: selected ? "white" : "#374151",
  cursor: "pointer",
  textAlign: "left",
});
