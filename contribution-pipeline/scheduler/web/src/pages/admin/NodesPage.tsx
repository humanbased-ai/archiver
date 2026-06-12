import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AdminNodeRow } from "../../api";

// 节点列表 — 06-node-design §8.2
// 字段: displayName / key / version / category / runMode / status / usage_count / updated_at
// 操作: archive / activate (直接行内, 不进详情)
//   archive 在仍有引用时给二次确认 — 不阻塞, 但提醒"在飞 item 不受影响, 但新 step 无法引用"
export default function NodesPage() {
  const [rows, setRows] = useState<AdminNodeRow[]>([]);
  const [status, setStatus] = useState<"all" | "active" | "archived" | "paused">("all");
  const [category, setCategory] = useState("all");
  const [runMode, setRunMode] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.adminListNodes({
        status:   status   === "all" ? undefined : status,
        category: category === "all" ? undefined : category,
        runMode:  runMode  === "all" ? undefined : runMode,
        search:   search.trim() || undefined,
      });
      setRows(r.nodes);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setLoading(false); }
  }, [status, category, runMode, search]);

  useEffect(() => { reload(); }, [reload]);

  const toggleStatus = async (row: AdminNodeRow) => {
    const isArchive = row.status === "active" || row.status === "paused";
    if (isArchive) {
      const warn = row.usage_count > 0
        ? `${row.key}@${row.version} 被 ${row.usage_count} 个 pipeline 引用. archive 后:\n  • 已有 step 仍按 nodeVersion 钉死继续运行\n  • 新 step 无法引用, lease 不再下发\n确认 archive?`
        : `archive ${row.key}@${row.version}?`;
      if (!confirm(warn)) return;
    }
    try {
      if (isArchive) await api.adminArchiveNode(row.key, row.version);
      else           await api.adminActivateNode(row.key, row.version);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  const pauseNode = async (row: AdminNodeRow) => {
    try {
      await api.adminPauseNode(row.key, row.version);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  const resumeNode = async (row: AdminNodeRow) => {
    try {
      await api.adminResumeNode(row.key, row.version);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  return (
    <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>节点管理</h2>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        全局节点目录, 跨租户共享. 节点是 pipeline 可编排的能力资产; archive 后老 step 不受影响, 但不能再被新 step 引用.
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
        marginBottom: 16, background: "white", padding: 12,
        border: "1px solid #e5e7eb", borderRadius: 8,
      }}>
        <Field label="状态">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={inputStyle}>
            <option value="all">全部</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
        </Field>
        <Field label="分类">
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            <option value="all">全部</option>
            <option value="ai">ai</option>
            <option value="data">data</option>
            <option value="manual">manual</option>
            <option value="system">system</option>
            <option value="external">external</option>
          </select>
        </Field>
        <Field label="运行方式">
          <select value={runMode} onChange={(e) => setRunMode(e.target.value)} style={inputStyle}>
            <option value="all">全部</option>
            <option value="embedded">embedded</option>
            <option value="internal_http">internal_http</option>
            <option value="external_worker">external_worker</option>
            <option value="manual">manual</option>
          </select>
        </Field>
        <Field label="搜索 (key / 名称)">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="ocr / 翻译…"
                 style={inputStyle} />
        </Field>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
        共 {rows.length} 个版本 {loading && "(加载中…)"}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          {loading ? "" : "没有匹配的节点"}
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th()}>名称</th>
                <th style={th()}>Key</th>
                <th style={th()}>版本</th>
                <th style={th()}>分类</th>
                <th style={th()}>运行方式</th>
                <th style={th()}>状态</th>
                <th style={th()}>运行</th>
                <th style={{ ...th(), textAlign: "right" }}>引用</th>
                <th style={th()}>更新时间</th>
                <th style={th()}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.key}@${r.version}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td()}>
                    <Link to={`/admin/nodes/${encodeURIComponent(r.key)}/${encodeURIComponent(r.version)}`}
                          style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>
                      {r.display_name}
                    </Link>
                  </td>
                  <td style={{ ...td(), fontFamily: "monospace", fontSize: 12, color: "#374151" }}>{r.key}</td>
                  <td style={{ ...td(), fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{r.version}</td>
                  <td style={{ ...td(), fontSize: 12 }}>{r.category ?? "—"}</td>
                  <td style={{ ...td(), fontSize: 12, color: "#374151" }}>{r.run_mode ?? "—"}</td>
                  <td style={td()}><StatusPill status={r.status} /></td>
                  <td style={td()}><RuntimeBadge pendingCount={r.pending_count} inflightCount={r.inflight_count} paused={r.status === "paused"} /></td>
                  <td style={{ ...td(), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.usage_count}</td>
                  <td style={{ ...td(), color: "#6b7280", fontSize: 12 }}>
                    {r.updated_at ? new Date(r.updated_at).toLocaleString("zh-CN") : "—"}
                  </td>
                  <td style={td()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {r.status === "active" && (
                        <>
                          <button onClick={() => pauseNode(r)} title="暂停节点 — 停止下发新任务，已在飞任务不受影响"
                                  style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, background: "#fef3c7", color: "#92400e", border: "none", borderRadius: 4, cursor: "pointer" }}>
                            暂停
                          </button>
                          <button onClick={() => toggleStatus(r)} title="归档节点 — 永久下线，新 pipeline 不可引用"
                                  style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 4, cursor: "pointer" }}>
                            归档
                          </button>
                        </>
                      )}
                      {r.status === "paused" && (
                        <>
                          <button onClick={() => resumeNode(r)} title="启动节点 — 恢复接收新任务"
                                  style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#166534", border: "none", borderRadius: 4, cursor: "pointer" }}>
                            启动
                          </button>
                          <button onClick={() => toggleStatus(r)} title="归档节点 — 永久下线，新 pipeline 不可引用"
                                  style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 4, cursor: "pointer" }}>
                            归档
                          </button>
                        </>
                      )}
                      {r.status === "archived" && (
                        <button onClick={() => toggleStatus(r)} title="激活节点 — 重新上线，可被新 pipeline 引用"
                                style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#166534", border: "none", borderRadius: 4, cursor: "pointer" }}>
                          激活
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "archived" | "paused" }) {
  const styles = status === "active"
    ? { bg: "#dcfce7", color: "#166534" }
    : status === "paused"
    ? { bg: "#fef9c3", color: "#854d0e" }
    : { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
      background: styles.bg, color: styles.color,
    }}>{status}</span>
  );
}

function RuntimeBadge({ pendingCount, inflightCount, paused }: { pendingCount: number; inflightCount: number; paused: boolean }) {
  if (paused) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
        <span style={{ color: "#854d0e" }}>已暂停</span>
      </span>
    );
  }
  if (inflightCount > 0) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ color: "#166534" }}>运行中 ({inflightCount} 在飞)</span>
        {pendingCount > 0 && <span style={{ color: "#6b7280" }}>· {pendingCount} 待处理</span>}
      </span>
    );
  }
  if (pendingCount > 0) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
        <span style={{ color: "#1e40af" }}>{pendingCount} 待处理</span>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d1d5db", display: "inline-block" }} />
      <span style={{ color: "#9ca3af" }}>空闲</span>
    </span>
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
function td(): React.CSSProperties { return { padding: "8px 12px", verticalAlign: "middle" }; }
