import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ProjectListItem, type TemplateListItem } from "../../api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const [p, t] = await Promise.all([api.listProjects(), api.listTemplates()]);
      setProjects(p.projects);
      setTemplates(t.templates);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  useEffect(() => { reload(); }, []);

  const remove = async (id: string, name: string) => {
    if (!confirm(`删除项目 "${name}"?所有 items / batches 一起删除`)) return;
    try {
      await api.deletePipeline(id);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  return (
    <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>标注项目</h2>
        <button
          onClick={() => setCreating(true)}
          style={{ marginLeft: "auto", padding: "8px 14px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          + 新建项目
        </button>
      </div>

      {error && <Banner color="red">{error}</Banner>}

      {projects.length === 0 ? (
        <Empty>还没有项目,点右上角"新建项目"。</Empty>
      ) : (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <Th>名称</Th>
                <Th>来源模板</Th>
                <Th>步骤</Th>
                <Th>批次 / Item</Th>
                <Th>更新时间</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.task_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <Td>
                    <Link to={`/admin/projects/${p.task_id}`} style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 600 }}>
                      {p.name}
                    </Link>
                  </Td>
                  <Td color="#6b7280">{p.template_name ?? "—"}</Td>
                  <Td>{p.step_count}</Td>
                  <Td>{p.batch_count} 批 · {p.item_count} item</Td>
                  <Td color="#6b7280">{new Date(p.updated_at).toLocaleString("zh-CN")}</Td>
                  <Td>
                    <Link to={`/admin/projects/${p.task_id}/pipeline`} style={{ color: "#2563eb", textDecoration: "none", fontSize: 12, marginRight: 12 }}>
                      编辑流程
                    </Link>
                    <button
                      onClick={() => remove(p.task_id, p.name)}
                      style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}
                    >
                      删除
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateProjectDialog
          templates={templates}
          onClose={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await reload(); }}
        />
      )}
    </div>
  );
}

function CreateProjectDialog({
  templates, onClose, onCreated,
}: {
  templates: TemplateListItem[]; onClose: () => void; onCreated: () => void;
}) {
  const [mode, setMode] = useState<"template" | "blank">("template");
  const [name, setName] = useState("");
  const [tplId, setTplId] = useState<string>(templates[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setErr("请填写项目名称"); return; }
    setBusy(true);
    setErr(null);
    try {
      if (mode === "template") {
        if (!tplId) { setErr("请选择模板"); setBusy(false); return; }
        await api.instantiateTemplate(tplId, { name: name.trim() });
      } else {
        await api.createPipeline({ name: name.trim(), steps: [] });
      }
      onCreated();
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>新建标注项目</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <ModeBtn active={mode === "template"} onClick={() => setMode("template")}>从模板创建</ModeBtn>
        <ModeBtn active={mode === "blank"} onClick={() => setMode("blank")}>空白项目</ModeBtn>
      </div>

      <Field label="项目名称">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
               style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }} />
      </Field>

      {mode === "template" && (
        <Field label="模板">
          {templates.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              暂无模板。先到 <Link to="/admin/templates" style={{ color: "#2563eb" }}>模板页</Link> 创建。
            </div>
          ) : (
            <select value={tplId} onChange={(e) => setTplId(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, background: "white" }}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.step_count} 步)</option>
              ))}
            </select>
          )}
        </Field>
      )}

      {err && <Banner color="red">{err}</Banner>}

      <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 14px", fontSize: 13, background: "white", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}>
          取消
        </button>
        <button disabled={busy} onClick={submit}
                style={{ padding: "7px 14px", fontSize: 13, background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
          {busy ? "创建中…" : "创建"}
        </button>
      </div>
    </Modal>
  );
}

// ─── 通用组件 ───
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{children}</th>;
}
function Td({ children, color }: { children: React.ReactNode; color?: string }) {
  return <td style={{ padding: "10px 16px", color: color ?? "inherit" }}>{children}</td>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>{children}</div>;
}
function Banner({ color, children }: { color: "red" | "green"; children: React.ReactNode }) {
  const palette = color === "red" ? { bg: "#fef2f2", fg: "#991b1b", bd: "#fecaca" } : { bg: "#f0fdf4", fg: "#166534", bd: "#bbf7d0" };
  return (
    <div style={{ padding: "8px 12px", background: palette.bg, color: palette.fg, border: `1px solid ${palette.bd}`, borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
            style={{
              flex: 1, padding: "8px 0", fontSize: 13,
              background: active ? "#eff6ff" : "white",
              color: active ? "#1d4ed8" : "#374151",
              border: `1px solid ${active ? "#2563eb" : "#d1d5db"}`,
              borderRadius: 6, cursor: "pointer", fontWeight: active ? 600 : 400,
            }}>
      {children}
    </button>
  );
}
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "white", borderRadius: 12, padding: 24, minWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {children}
      </div>
    </div>
  );
}
