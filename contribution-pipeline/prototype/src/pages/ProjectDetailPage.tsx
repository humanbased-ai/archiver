import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Play, CheckCircle2, Pause, AlertCircle, Clock, Download, Edit3 } from "lucide-react";
import { useStore } from "../store/useStore";
import { Modal } from "../components/Modal";
import type { Task, TaskType } from "../types";

const STATUS_META: Record<Task["status"], { label: string; cls: string; icon: any }> = {
  draft: { label: "草稿", cls: "bg-slate-100 text-slate-700", icon: Clock },
  running: { label: "运行中", cls: "bg-sky-100 text-sky-700", icon: Play },
  paused: { label: "已暂停", cls: "bg-amber-100 text-amber-700", icon: Pause },
  completed: { label: "已完成", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "失败", cls: "bg-rose-100 text-rose-700", icon: AlertCircle },
};

export default function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const project = useStore((s) => s.getProject(projectId));
  const tasks = useStore((s) => s.tasksOfProject(projectId));
  const createTask = useStore((s) => s.createTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [targetCount, setTargetCount] = useState<number>(100);
  const [taskType, setTaskType] = useState<TaskType>("collect");

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-slate-600">项目不存在</div>
        <Link to="/projects" className="text-brand-600 text-sm">← 回到项目列表</Link>
      </div>
    );
  }

  const submit = () => {
    if (!name.trim()) return;
    if (!Number.isFinite(targetCount) || targetCount <= 0) return;
    createTask(projectId, {
      name: name.trim(),
      description: desc,
      targetCount: Math.floor(targetCount),
      taskType,
    });
    setName("");
    setDesc("");
    setTargetCount(100);
    setTaskType("collect");
    setOpen(false);
  };

  return (
    <div className="h-full overflow-auto px-6 py-5">
      <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> 项目
      </Link>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{project.description || "—"}</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> 新建任务
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">任务</th>
              <th className="text-left px-4 py-2.5 font-medium w-24">状态</th>
              <th className="text-left px-4 py-2.5 font-medium">进度</th>
              <th className="text-left px-4 py-2.5 font-medium w-36">创建时间</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  暂无任务, 点击右上角"新建任务"开始
                </td>
              </tr>
            )}
            {tasks.map((t) => {
              const meta = STATUS_META[t.status];
              const StatusIcon = meta.icon;
              const collected = t.stats?.total ?? 0;
              const pct = t.targetCount > 0 ? Math.min(100, Math.round((collected / t.targetCount) * 100)) : 0;
              return (
                <tr
                  key={t.id}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/tasks/${t.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                        t.taskType === "collect"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {t.taskType === "collect"
                          ? <><Download className="w-2.5 h-2.5" /> 采集</>
                          : <><Edit3 className="w-2.5 h-2.5" /> 标注</>
                        }
                      </span>
                      <span className="font-medium text-slate-800 hover:text-brand-600">{t.name}</span>
                    </div>
                    {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${meta.cls}`}>
                      <StatusIcon className="w-3 h-3" /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-20">
                        {collected}/{t.targetCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-slate-400 hover:text-rose-600 p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`删除任务 "${t.name}"?`)) deleteTask(t.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="新建任务"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>取消</button>
            <button className="btn-primary" onClick={submit}>创建</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">任务类型</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskType("collect")}
                className={`rounded-lg border p-3 text-left transition-all ${
                  taskType === "collect"
                    ? "border-sky-400 bg-sky-50 ring-2 ring-sky-300"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-sm text-slate-800">
                  <Download className="w-4 h-4 text-sky-600" /> 采集任务
                </div>
                <div className="text-[11px] text-slate-500 mt-1">采集 → 去重 → 审核 → 导出</div>
              </button>
              <button
                type="button"
                onClick={() => setTaskType("annotate")}
                className={`rounded-lg border p-3 text-left transition-all ${
                  taskType === "annotate"
                    ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-sm text-slate-800">
                  <Edit3 className="w-4 h-4 text-emerald-600" /> 标注任务
                </div>
                <div className="text-[11px] text-slate-500 mt-1">数据源 → 标注 → 审核 → 导出</div>
              </button>
            </div>
          </div>
          <div>
            <label className="label">名称</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如: 采集-2025-04-28" />
          </div>
          <div>
            <label className="label">描述</label>
            <textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div>
            <label className="label">目标数量</label>
            <input
              className="input"
              type="number"
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              placeholder="如: 500"
            />
            <p className="text-xs text-slate-500 mt-1">
              1 条数据 = 1 个任务实例; 达到目标数量后任务可标记完成
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
