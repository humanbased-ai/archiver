import { useEffect, useRef, useState } from "react";
import { trace, type TraceEvent } from "./trace";

export function TracePanel() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [filter, setFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | "scheduler" | "business">("all");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const unsub = trace.subscribe((evs) => {
      if (pausedRef.current) return;
      setEvents(evs);
    });
    return unsub;
  }, []);

  const filtered = events.filter((e) => {
    if (groupFilter !== "all" && e.group !== groupFilter) return false;
    if (!filter) return true;
    const lf = filter.toLowerCase();
    return (
      e.url.toLowerCase().includes(lf) ||
      e.method.toLowerCase().includes(lf) ||
      String(e.status ?? "").includes(lf)
    );
  });

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="API 调用流水"
        style={{
          position: "fixed",
          bottom: 18,
          right: 18,
          zIndex: 1000,
          width: 46,
          height: 46,
          borderRadius: "50%",
          border: "none",
          background: open ? "#0f172a" : "#2563eb",
          color: "white",
          fontSize: 18,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
        }}
      >
        {events.length > 99 ? "99+" : events.length || "API"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 76,
            right: 18,
            zIndex: 999,
            width: 520,
            height: "min(70vh, 640px)",
            background: "white",
            border: "1px solid #d1d5db",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f9fafb",
            }}
          >
            <strong style={{ fontSize: 13 }}>API 调用流水</strong>
            <span style={{ fontSize: 11, color: "#6b7280" }}>{filtered.length} / {events.length}</span>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as any)}
              style={{ marginLeft: "auto", fontSize: 11, padding: "2px 4px" }}
            >
              <option value="all">全部</option>
              <option value="scheduler">调度层</option>
              <option value="business">业务层</option>
            </select>
            <input
              placeholder="过滤 url/方法/状态"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: 120, fontSize: 11, padding: "2px 6px" }}
            />
            <button
              onClick={() => setPaused((v) => !v)}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                border: "1px solid #d1d5db",
                background: paused ? "#fde68a" : "white",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {paused ? "继续" : "暂停"}
            </button>
            <button
              onClick={() => trace.clear()}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                border: "1px solid #d1d5db",
                background: "white",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              清空
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
                还没有调用,操作一下界面就会出现
              </div>
            ) : (
              filtered.map((e) => <TraceRow key={e.id} ev={e} />)
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TraceRow({ ev }: { ev: TraceEvent }) {
  const [open, setOpen] = useState(false);
  const isErr = ev.error || (ev.status !== undefined && ev.status >= 400);
  const groupColor = ev.group === "business" ? "#7c3aed" : "#0891b2";

  return (
    <div style={{ borderBottom: "1px solid #f1f5f9" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          background: isErr ? "#fef2f2" : open ? "#f8fafc" : "transparent",
        }}
      >
        <span style={{ color: "#9ca3af", width: 50 }}>
          {new Date(ev.ts).toLocaleTimeString("en-GB", { hour12: false })}
        </span>
        <span
          style={{
            display: "inline-block",
            width: 36,
            textAlign: "center",
            padding: "1px 0",
            background: methodBg(ev.method),
            color: "white",
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {ev.method}
        </span>
        <span
          style={{
            color: groupColor,
            fontSize: 9,
            border: `1px solid ${groupColor}`,
            padding: "0 4px",
            borderRadius: 3,
          }}
        >
          {ev.group ?? "?"}
        </span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.url}
        </span>
        <span
          style={{
            color: ev.error ? "#dc2626" : statusColor(ev.status ?? 0),
            fontWeight: 600,
            width: 38,
            textAlign: "right",
          }}
        >
          {ev.error ? "ERR" : ev.status ?? "-"}
        </span>
        <span style={{ color: "#9ca3af", width: 44, textAlign: "right" }}>{ev.durationMs}ms</span>
      </div>
      {open && (
        <div style={{ padding: "8px 10px 12px", background: "#0f172a", color: "#e5e7eb" }}>
          <KV label="Request">
            {ev.reqBody === undefined ? (
              <span style={{ color: "#64748b" }}>(无 body)</span>
            ) : (
              <pre style={preStyle}>{stringify(ev.reqBody)}</pre>
            )}
          </KV>
          <KV label="Response">
            {ev.error ? (
              <pre style={{ ...preStyle, color: "#fca5a5" }}>{ev.error}</pre>
            ) : ev.resBody === undefined ? (
              <span style={{ color: "#64748b" }}>(空)</span>
            ) : (
              <pre style={preStyle}>{stringify(ev.resBody)}</pre>
            )}
          </KV>
        </div>
      )}
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 2, textTransform: "uppercase" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  fontFamily: "ui-monospace, monospace",
};

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function methodBg(m: string): string {
  switch (m) {
    case "GET":
      return "#0891b2";
    case "POST":
      return "#16a34a";
    case "PUT":
      return "#d97706";
    case "DELETE":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

function statusColor(s: number): string {
  if (s === 0) return "#9ca3af";
  if (s >= 500) return "#dc2626";
  if (s >= 400) return "#ea580c";
  if (s >= 300) return "#d97706";
  return "#16a34a";
}
