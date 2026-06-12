import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type NodeDef, type PipelineFull } from "../../api";
import { PipelineEditor } from "../../PipelineEditor";

export default function ProjectPipelineEditPage() {
  const { id } = useParams<{ id: string }>();
  const [pipeline, setPipeline] = useState<PipelineFull | null>(null);
  const [nodeDefs, setNodeDefs] = useState<NodeDef[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!id) return;
    try {
      const [p, n] = await Promise.all([api.getPipeline(id), api.listNodes()]);
      setPipeline(p);
      setNodeDefs(n.nodes);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };
  useEffect(() => { reload(); }, [id]);

  if (error) return <div style={{ padding: 24, color: "#991b1b" }}>{error}</div>;
  if (!pipeline) return <div style={{ padding: 24, color: "#9ca3af" }}>加载中…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "white", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        <Link to={`/admin/projects/${id}`} style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}>← 项目详情</Link>
        <span style={{ fontSize: 14, fontWeight: 600 }}>编辑流程: {pipeline.name}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <PipelineEditor
          pipeline={pipeline}
          nodeDefs={nodeDefs}
          onSaved={reload}
          // 项目页面可以"另存为模板"以让别的项目复用
          onSaveAsTemplate={async ({ name, steps, layout }) => {
            await api.createTemplate({ name, steps, layout });
          }}
        />
      </div>
    </div>
  );
}
