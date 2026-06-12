import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import { useStore } from "../store/useStore";
import { Modal } from "../components/Modal";
import type { ProjectType } from "../types";

const TYPE_LABEL: Record<ProjectType, string> = {
  image_detection: "图像·目标检测",
  image_segmentation: "图像·分割",
  text_classification: "文本·分类",
  custom: "自定义",
};

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const tasksOfProject = useStore((s) => s.tasksOfProject);
  const createProject = useStore((s) => s.createProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<ProjectType>("image_detection");

  const submit = () => {
    if (!name.trim()) return;
    createProject({ name: name.trim(), description: desc, type });
    setName("");
    setDesc("");
    setType("image_detection");
    setOpen(false);
  };

  return (
    <div className="h-full overflow-auto px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">项目</h1>
          <p className="text-sm text-slate-500 mt-0.5">以项目组织标注任务, 每个项目可包含多批任务</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> 新建项目
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => {
          const tasks = tasksOfProject(p.id);
          return (
            <div key={p.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/projects/${p.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FolderOpen className="w-4 h-4 text-brand-600" />
                    <span className="font-medium truncate">{p.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 mr-2">
                      {TYPE_LABEL[p.type]}
                    </span>
                    {tasks.length} 个任务
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">
                    {p.description || <span className="text-slate-400">—</span>}
                  </p>
                </Link>
                <button
                  className="text-slate-400 hover:text-rose-600 p-1"
                  onClick={() => {
                    if (confirm(`删除项目 "${p.name}" 及其所有任务?`)) deleteProject(p.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="新建项目"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>取消</button>
            <button className="btn-primary" onClick={submit}>创建</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">名称</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如: 城市监控目标检测" />
          </div>
          <div>
            <label className="label">类型</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">描述</label>
            <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
