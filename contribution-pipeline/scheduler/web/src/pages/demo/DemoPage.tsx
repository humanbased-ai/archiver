import { useEffect, useState } from "react";
import { api, type NodeDef, type PipelineFull } from "../../api";
import { PipelineEditor } from "../../PipelineEditor";
import { ItemRunner } from "../../ItemRunner";
import { KanbanDemo } from "../../KanbanDemo";
import { TracePanel } from "../../TracePanel";
import { Link } from "react-router-dom";

export default function DemoPage() {
  const [tab, setTab] = useState<"editor" | "runner" | "kanban">("kanban");
  const [pipelines, setPipelines] = useState<{ task_id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineFull | null>(null);
  const [nodeDefs, setNodeDefs] = useState<NodeDef[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reloadList = async () => {
    try {
      const [p, n] = await Promise.all([api.listPipelines(), api.listNodes()]);
      setPipelines(p.pipelines);
      setNodeDefs(n.nodes);
      if (!activeId && p.pipelines.length > 0) {
        setActiveId(p.pipelines[0].task_id);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  useEffect(() => { reloadList(); }, []);

  useEffect(() => {
    if (!activeId) { setPipeline(null); return; }
    api.getPipeline(activeId).then(setPipeline).catch((e) => setError(String(e?.message ?? e)));
  }, [activeId]);

  const newPipeline = async () => {
    const name = prompt("新 pipeline 名称?", "未命名 pipeline");
    if (!name) return;
    const p = await api.createPipeline({ name, steps: [] });
    setActiveId(p.task_id);
    await reloadList();
  };

  const removePipeline = async () => {
    if (!activeId || !pipeline) return;
    if (!confirm(`删除 pipeline "${pipeline.name}"?所有 items 一起删除`)) return;
    await api.deletePipeline(activeId);
    setActiveId(null);
    setPipeline(null);
    await reloadList();
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1>🛰 Scheduler Demo (legacy)</h1>
        <div className="tabs">
          <button className={tab === "kanban" ? "active" : ""} onClick={() => setTab("kanban")}>看板</button>
          <button className={tab === "editor" ? "active" : ""} onClick={() => setTab("editor")}>Pipeline 编辑</button>
          <button className={tab === "runner" ? "active" : ""} onClick={() => setTab("runner")}>运行 / 监控</button>
        </div>
        <select value={activeId ?? ""} onChange={(e) => setActiveId(e.target.value || null)}>
          <option value="">— 选择 pipeline —</option>
          {pipelines.map((p) => (<option key={p.task_id} value={p.task_id}>{p.name}</option>))}
        </select>
        <div className="right">
          <Link to="/work" style={{ color: "#2563eb", textDecoration: "none", fontSize: 13 }}>→ 标注页</Link>
          <Link to="/admin" style={{ color: "#2563eb", textDecoration: "none", fontSize: 13 }}>→ 管理后台</Link>
          <button onClick={newPipeline}>+ 新 pipeline</button>
          {pipeline && <button onClick={removePipeline}>删除</button>}
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "6px 12px", fontSize: 12 }}>
          错误: {error} (检查后端是否在 http://localhost:4000)
        </div>
      )}

      {!pipeline ? (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
          {pipelines.length === 0 ? '点击右上角 "+ 新 pipeline" 创建第一条流水线' : "选择上方 pipeline 开始"}
        </div>
      ) : tab === "editor" ? (
        <PipelineEditor pipeline={pipeline} nodeDefs={nodeDefs} onSaved={reloadList} />
      ) : tab === "runner" ? (
        <ItemRunner pipeline={pipeline} nodeDefs={nodeDefs} />
      ) : (
        <KanbanDemo pipeline={pipeline} />
      )}

      <TracePanel />
    </div>
  );
}
