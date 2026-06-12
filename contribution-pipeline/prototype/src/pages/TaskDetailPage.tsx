import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "reactflow";
import {
  ArrowLeft,
  Save,
  Code2,
  Inbox,
  Filter,
  Edit3,
  ShieldCheck,
  Upload as UploadIcon,
  ArrowRight,
  Database,
} from "lucide-react";
import { useStore, STAGE_ROLE, ROLE_LABEL, type Role } from "../store/useStore";
import StepNode from "../components/StepNode";
import NodeConfigPanel from "../components/NodeConfigPanel";
import { Modal } from "../components/Modal";
import type { StepConfig } from "../types";
import type { RunStageKey } from "../run/types";

const nodeTypes = { stepNode: StepNode };

const STAGE_META: Record<RunStageKey, { label: string; icon: any; cls: string }> = {
  collect: { label: "采集", icon: Inbox, cls: "bg-sky-100 text-sky-700 border-sky-200" },
  dedup: { label: "去重", icon: Filter, cls: "bg-amber-100 text-amber-700 border-amber-200" },
  datasource: { label: "数据源", icon: Database, cls: "bg-sky-100 text-sky-700 border-sky-200" },
  annotate: { label: "标注", icon: Edit3, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  review: { label: "审核", icon: ShieldCheck, cls: "bg-violet-100 text-violet-700 border-violet-200" },
  export: { label: "导出", icon: UploadIcon, cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function TaskDetailPage() {
  const { taskId = "" } = useParams();
  const task = useStore((s) => s.getTask(taskId));
  const project = useStore((s) => (task ? s.getProject(task.projectId) : undefined));
  const items = useStore((s) => s.getItems(taskId));
  const currentRole = useStore((s) => s.currentRole);
  const updateTaskPipeline = useStore((s) => s.updateTaskPipeline);
  const navigate = useNavigate();

  const pipelineSteps = task?.pipeline.map((s) => s.key as RunStageKey) ?? [];
  const [selectedKey, setSelectedKey] = useState<string | null>(pipelineSteps[0] ?? null);
  const [pipeline, setPipeline] = useState<StepConfig[]>(task?.pipeline ?? []);
  const [yamlOpen, setYamlOpen] = useState(false);
  const [saved, setSaved] = useState(true);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<any>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<any>([]);

  // pipeline 或选中态变化时, 重建 ReactFlow 内部 nodes (确保 data 同步)
  useEffect(() => {
    setRfNodes(
      pipeline.map((s, i) => ({
        id: s.key,
        type: "stepNode",
        position: { x: i * 240, y: 100 },
        data: {
          stepKey: s.key,
          implementation: s.implementation,
          selected: selectedKey === s.key,
        },
        draggable: false,
      }))
    );
  }, [pipeline, selectedKey, setRfNodes]);

  useEffect(() => {
    setRfEdges(
      pipeline.slice(0, -1).map((s, i) => ({
        id: `${s.key}->${pipeline[i + 1].key}`,
        source: s.key,
        target: pipeline[i + 1].key,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      }))
    );
  }, [pipeline, setRfEdges]);

  const currentStep = pipeline.find((s) => s.key === selectedKey);

  const yamlConfig = useMemo(() => toYamlLike(pipeline, task?.name ?? ""), [pipeline, task?.name]);

  if (!task || !project) {
    return (
      <div className="p-6">
        <div className="text-slate-600">任务不存在</div>
        <Link to="/projects" className="text-brand-600 text-sm">← 回到项目列表</Link>
      </div>
    );
  }

  const handleStepChange = (updated: StepConfig) => {
    setPipeline((ps) => ps.map((s) => (s.key === updated.key ? updated : s)));
    setSaved(false);
  };

  const handleSave = () => {
    updateTaskPipeline(taskId, pipeline);
    setSaved(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶栏 */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <div>
          <Link to={`/projects/${project.id}`} className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> {project.name}
          </Link>
          <div className="font-semibold mt-0.5">
            {task.name}
            <span className="ml-2 text-xs font-normal text-slate-500">
              目标 {task.targetCount} 条 · 1 条数据 = 1 个任务实例
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!saved && <span className="text-xs text-amber-600">● 未保存</span>}
          <button className="btn-outline" onClick={() => setYamlOpen(true)}>
            <Code2 className="w-4 h-4" /> 查看配置
          </button>
          <button className="btn-outline" onClick={handleSave} disabled={saved}>
            <Save className="w-4 h-4" /> 保存
          </button>
        </div>
      </div>

      {/* 各阶段队列入口 */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="text-xs text-slate-500 mb-2">
          各阶段队列 · 当前角色「{ROLE_LABEL[currentRole]}」可处理：
          {pipelineSteps.filter((k) => {
            const r = STAGE_ROLE[k];
            return currentRole === "admin" || r === "system" || (currentRole as Role) === r;
          }).map((k) => STAGE_META[k].label).join(" / ") || "—"}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {pipelineSteps.map((stage, i) => {
            const meta = STAGE_META[stage];
            const queueLen = items.filter((it) => it.currentStage === stage).length;
            const role = STAGE_ROLE[stage];
            const canHandle =
              currentRole === "admin" || role === "system" || (currentRole as Role) === role;
            return (
              <button
                key={stage}
                onClick={() => navigate(`/tasks/${taskId}/stages/${stage}`)}
                className={`text-left rounded-lg border p-3 hover:shadow-sm transition-all ${meta.cls} ${
                  queueLen > 0 ? "ring-2 ring-offset-1 ring-current/30" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] opacity-60">#{i + 1}</span>
                    <meta.icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{meta.label}</span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">{queueLen}</span>
                </div>
                <div className="text-[10px] opacity-70 mt-1 flex items-center justify-between">
                  <span>
                    执行: {role === "system" ? "系统" : ROLE_LABEL[role as Role]}
                  </span>
                  <span className={canHandle ? "" : "opacity-50"}>
                    {canHandle ? "进入 →" : "无权限"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
          数据流:{" "}
          {pipelineSteps.map((k, i) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              {STAGE_META[k].label}
              {i < pipelineSteps.length - 1 && <ArrowRight className="w-3 h-3" />}
            </span>
          ))}
          · 每条数据处理完自动流入下一队列
        </div>
      </div>

      {/* 主体: 画布 + 侧栏 */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-slate-50 relative">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, n) => setSelectedKey(n.id)}
            onPaneClick={() => { /* 保持当前选中不变 */ }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#cbd5e1" gap={24} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-white" />
          </ReactFlow>
          <div className="absolute top-3 left-3 text-xs text-slate-500 bg-white/80 backdrop-blur rounded px-2.5 py-1 border border-slate-200">
            {task.taskType === "collect" ? "采集任务: 采集 → 去重 → 审核 → 导出" : "标注任务: 数据源 → 标注 → 审核 → 导出"} · 点击节点配置
          </div>
        </div>
        {currentStep && (
          <NodeConfigPanel
            stepConfig={currentStep}
            onChange={handleStepChange}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>

      <Modal
        open={yamlOpen}
        onClose={() => setYamlOpen(false)}
        title="Pipeline 配置 (YAML 预览)"
        footer={
          <button className="btn-primary" onClick={() => setYamlOpen(false)}>关闭</button>
        }
      >
        <pre className="bg-slate-900 text-slate-100 rounded p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre">
{yamlConfig}
        </pre>
      </Modal>
    </div>
  );
}

function toYamlLike(pipeline: StepConfig[], name: string): string {
  const lines: string[] = [];
  lines.push(`name: ${name}`);
  lines.push("steps:");
  pipeline.forEach((s) => {
    lines.push(`  - type: ${s.key}`);
    lines.push(`    impl: ${s.implementation}`);
    lines.push(`    params:`);
    Object.entries(s.params).forEach(([k, v]) => {
      const val = typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v);
      lines.push(`      ${k}: ${val}`);
    });
  });
  return lines.join("\n");
}
