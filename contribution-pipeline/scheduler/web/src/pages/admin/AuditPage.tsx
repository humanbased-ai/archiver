import { useCallback, useEffect, useState } from "react";
import { api, type AuditEntry } from "../../api";

const ACTIONS = [
  "all",
  "pipeline.create", "pipeline.save", "pipeline.delete",
  "pipeline.pause", "pipeline.resume",
  "batch.create", "batch.pause", "batch.resume",
  "item.replay",
  "submission.submit", "submission.release",
  "review.approved", "review.rejected",
  "item.dlq", "quota.denied",
];

const KINDS = ["all", "pipeline", "batch", "item", "submission"];

export default function AuditPage() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("all");
  const [kind, setKind] = useState("all");
  const [resourceId, setResourceId] = useState("");
  const [hours, setHours] = useState(24);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandId, setExpandId] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      const r = await api.auditList({
        actor: actor.trim() || undefined,
        action: action === "all" ? undefined : action,
        kind:   kind   === "all" ? undefined : kind,
        id:     resourceId.trim() || undefined,
        since,
        limit: 200,
      });
      setEntries(r.entries);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setLoading(false); }
  }, [actor, action, kind, resourceId, hours]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>审计日志</h2>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        仅显示当前租户. append-only, 按时间倒序; 跨租户审计请走离线归档.
      </div>

      {/* Filter bar */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
        marginBottom: 16, background: "white", padding: 12,
        border: "1px solid #e5e7eb", borderRadius: 8,
      }}>
        <Field label="Actor (精确)">
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="如 user:xxx / system:reconciler"
            style={inputStyle}
          />
        </Field>
        <Field label="Action">
          <select value={action} onChange={(e) => setAction(e.target.value)} style={inputStyle}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a === "all" ? "全部" : a}</option>)}
          </select>
        </Field>
        <Field label="Resource Kind">
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={inputStyle}>
            {KINDS.map((k) => <option key={k} value={k}>{k === "all" ? "全部" : k}</option>)}
          </select>
        </Field>
        <Field label="Resource ID (精确)">
          <input
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            placeholder="UUID"
            style={inputStyle}
          />
        </Field>
        <Field label="时间窗">
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} style={inputStyle}>
            <option value={1}>近 1 小时</option>
            <option value={6}>近 6 小时</option>
            <option value={24}>近 24 小时</option>
            <option value={72}>近 3 天</option>
            <option value={168}>近 7 天</option>
          </select>
        </Field>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
        共 {entries.length} 条 {loading && "(加载中…)"}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          {loading ? "" : "无匹配的审计行"}
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th()}>时间</th>
                <th style={th()}>Actor</th>
                <th style={th()}>Action</th>
                <th style={th()}>Resource</th>
                <th style={th()}></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <Row
                  key={e.id}
                  e={e}
                  expanded={expandId === e.id}
                  onToggle={() => setExpandId(expandId === e.id ? null : e.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ e, expanded, onToggle }: { e: AuditEntry; expanded: boolean; onToggle: () => void }) {
  const hasDiff = e.before != null || e.after != null;
  return (
    <>
      <tr style={{ borderBottom: "1px solid #f3f4f6", cursor: hasDiff ? "pointer" : "default" }}
          onClick={hasDiff ? onToggle : undefined}>
        <td style={{ ...td(), fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
          {new Date(e.created_at).toLocaleString("zh-CN")}
        </td>
        <td style={{ ...td(), fontSize: 12 }}>
          <ActorPill actor={e.actor} />
        </td>
        <td style={{ ...td(), fontFamily: "monospace", fontSize: 12 }}>{e.action}</td>
        <td style={td()}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{e.resource.kind}</span>
          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6, fontFamily: "monospace" }}>
            {String(e.resource.id ?? "").slice(0, 8)}
          </span>
        </td>
        <td style={{ ...td(), color: "#9ca3af", fontSize: 11 }}>
          {hasDiff ? (expanded ? "▾" : "▸") : ""}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr>
          <td colSpan={5} style={{ padding: "8px 16px 16px", background: "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <DiffPanel title="before" data={e.before} />
              <DiffPanel title="after" data={e.after} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ActorPill({ actor }: { actor: string }) {
  let bg = "#f3f4f6", color = "#374151";
  if (actor.startsWith("system:")) { bg = "#fee2e2"; color = "#991b1b"; }
  else if (actor.startsWith("user:")) { bg = "#dbeafe"; color = "#1d4ed8"; }
  else if (actor.startsWith("dev:"))  { bg = "#fef3c7"; color = "#92400e"; }
  return (
    <span style={{
      padding: "2px 6px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
      background: bg, color,
    }}>{actor}</span>
  );
}

function DiffPanel({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{title}</div>
      <pre style={{
        margin: 0, padding: 8, background: "white",
        border: "1px solid #e5e7eb", borderRadius: 4,
        fontSize: 11, fontFamily: "ui-monospace, monospace",
        overflow: "auto", maxHeight: 240,
      }}>
        {data == null ? "—" : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "5px 8px", fontSize: 12,
  border: "1px solid #d1d5db", borderRadius: 4, boxSizing: "border-box",
};

function th(): React.CSSProperties { return { textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#6b7280" }; }
function td(): React.CSSProperties { return { padding: "8px 12px", verticalAlign: "top" }; }
