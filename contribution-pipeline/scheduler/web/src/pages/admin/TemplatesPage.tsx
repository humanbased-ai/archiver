import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type TemplateListItem } from "../../api";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    try {
      const r = await api.listTemplates();
      setTemplates(r.templates);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };
  useEffect(() => { reload(); }, []);

  const remove = async (id: string, name: string) => {
    if (!confirm(`删除模板 "${name}"?已派生的项目不受影响 (template_id 置 NULL)`)) return;
    try {
      await api.deleteTemplate(id);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  return (
    <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Pipeline 模板</h2>
        <button onClick={() => setCreating(true)}
                style={{ marginLeft: "auto", padding: "8px 14px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          + 新建模板
        </button>
      </div>

      {error && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {templates.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
          还没有模板。<br />
          模板 = 项目无关的可复用流程蓝图,新建项目时可以基于模板克隆。
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th()}>名称</th>
                <th style={th()}>描述</th>
                <th style={th()}>步骤</th>
                <th style={th()}>更新时间</th>
                <th style={th()}>操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td()}>
                    <Link to={`/admin/templates/${t.id}`} style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>
                      {t.name}
                    </Link>
                  </td>
                  <td style={{ ...td(), color: "#6b7280" }}>{t.description ?? "—"}</td>
                  <td style={td()}>{t.step_count}</td>
                  <td style={{ ...td(), color: "#6b7280" }}>{new Date(t.updated_at).toLocaleString("zh-CN")}</td>
                  <td style={td()}>
                    <button onClick={() => remove(t.id, t.name)}
                            style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateTemplateDialog onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); await reload(); }} />
      )}
    </div>
  );
}

function CreateTemplateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setErr("请填写模板名称"); return; }
    setBusy(true); setErr(null);
    try {
      await api.createTemplate({ name: name.trim(), description: description.trim() || undefined, steps: [] });
      onCreated();
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, padding: 24, minWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>新建 Pipeline 模板</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>名称</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                 style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>描述 (可选)</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>
          创建后会进入编辑器,你可以拖拽节点搭出流程并保存。
        </div>
        {err && <div style={{ padding: "6px 10px", fontSize: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 4, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", fontSize: 13, background: "white", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}>取消</button>
          <button disabled={busy} onClick={submit}
                  style={{ padding: "7px 14px", fontSize: 13, background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {busy ? "创建中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

function th(): React.CSSProperties { return { textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280" }; }
function td(): React.CSSProperties { return { padding: "10px 16px" }; }
