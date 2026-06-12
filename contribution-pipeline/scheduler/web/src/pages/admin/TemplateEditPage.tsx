import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type NodeDef, type PipelineFull, type PipelineTemplate } from "../../api";
import { PipelineEditor } from "../../PipelineEditor";

// 模板 → 走 PipelineEditor + saveAdapter (api.updateTemplate);
// 复用 PipelineFull 形状把 task_id 当 templateId 传, 节省一份编辑器副本
export default function TemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const [tpl, setTpl] = useState<PipelineTemplate | null>(null);
  const [nodeDefs, setNodeDefs] = useState<NodeDef[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!id) return;
    try {
      const [t, n] = await Promise.all([api.getTemplate(id), api.listNodes()]);
      setTpl(t);
      setNodeDefs(n.nodes);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };
  useEffect(() => { reload(); }, [id]);

  if (!id) return null;
  if (error) {
    return <div style={{ padding: 24, color: "#991b1b" }}>{error}</div>;
  }
  if (!tpl) {
    return <div style={{ padding: 24, color: "#9ca3af" }}>加载中…</div>;
  }

  // 把 PipelineTemplate 适配成 PipelineFull 给 editor
  const adapted: PipelineFull = {
    task_id: tpl.id,
    name: tpl.name,
    steps: tpl.steps ?? [],
    layout: tpl.layout ?? null,
    updated_at: tpl.updated_at,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "white", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/admin/templates" style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}>← 模板</Link>
        <span style={{ fontSize: 14, fontWeight: 600 }}>编辑模板: {tpl.name}</span>
        {tpl.description && <span style={{ fontSize: 12, color: "#9ca3af" }}>{tpl.description}</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <PipelineEditor
          pipeline={adapted}
          nodeDefs={nodeDefs}
          saveAdapter={async ({ name, steps, layout }) => {
            await api.updateTemplate(tpl.id, { name, steps, layout });
          }}
          onSaved={reload}
        />
      </div>
    </div>
  );
}
