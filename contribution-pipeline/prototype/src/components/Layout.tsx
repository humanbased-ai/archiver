import { Outlet, NavLink } from "react-router-dom";
import { LayoutGrid, Workflow, FileJson, UserCog } from "lucide-react";
import { useStore, ROLE_LABEL, type Role } from "../store/useStore";

const ROLE_ORDER: Role[] = ["admin", "collector", "annotator", "reviewer"];

export default function Layout() {
  const currentRole = useStore((s) => s.currentRole);
  const setRole = useStore((s) => s.setRole);

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 shrink-0 border-b border-slate-200 bg-white px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-brand-600" />
          <span className="font-semibold">Pipeline Manager</span>
          <span className="text-xs text-slate-400 ml-1">MVP Prototype</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `btn-ghost ${isActive ? "bg-slate-100 text-slate-900" : ""}`
            }
          >
            <LayoutGrid className="w-4 h-4" /> 项目
          </NavLink>
          <NavLink
            to="/schema-form"
            className={({ isActive }) =>
              `btn-ghost ${isActive ? "bg-slate-100 text-slate-900" : ""}`
            }
          >
            <FileJson className="w-4 h-4" /> Schema 表单
          </NavLink>

          {/* 角色切换 (原型: 模拟登录态) */}
          <div className="ml-3 pl-3 border-l border-slate-200 flex items-center gap-1.5">
            <UserCog className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">角色:</span>
            <select
              value={currentRole}
              onChange={(e) => setRole(e.target.value as Role)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-200"
              title="切换当前角色 (原型用)"
            >
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
