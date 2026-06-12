import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DemoPage from "./pages/demo/DemoPage";
import WorkLayout from "./pages/work/WorkLayout";
import WorkListPage from "./pages/work/WorkListPage";
import CollectPage from "./pages/work/CollectPage";
import ReviewPage from "./pages/work/ReviewPage";
import AdminLayout from "./pages/admin/AdminLayout";
import ProjectsPage from "./pages/admin/ProjectsPage";
import ProjectDetailPage from "./pages/admin/ProjectDetailPage";
import ProjectPipelineEditPage from "./pages/admin/ProjectPipelineEditPage";
import BatchDetailPage from "./pages/admin/BatchDetailPage";
import AuditPage from "./pages/admin/AuditPage";
import TemplatesPage from "./pages/admin/TemplatesPage";
import TemplateEditPage from "./pages/admin/TemplateEditPage";
import NodesPage from "./pages/admin/NodesPage";
import NodeDetailPage from "./pages/admin/NodeDetailPage";
import { homeForRole, USERS, useCurrentUser, type UserRole } from "./users";

// 当前 user 是 admin 进 /admin, worker 进 /work. 角色不匹配渲染一个轻量提示页 +
// "切到合适身份"按钮 — 不再静默重定向, 否则 demo 用户从 /admin 进总是被弹回 /work
// 摸不到管理面.
function RoleGuard({ allow, children }: { allow: UserRole; children: React.ReactNode }) {
  const { role, switchUser } = useCurrentUser();
  if (role !== allow) {
    return <RoleMismatch current={role} need={allow} onSwitch={(uid) => switchUser(uid)} />;
  }
  return <>{children}</>;
}

function RoleMismatch({ current, need, onSwitch }: {
  current: UserRole; need: UserRole; onSwitch: (userId: string) => void;
}) {
  const candidates = USERS.filter((u) => u.role === need);
  const labelNeed = need === "admin" ? "管理员" : "标注员";
  const labelCurrent = current === "admin" ? "管理员" : "标注员";
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f9fafb", padding: 24,
    }}>
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: 32, maxWidth: 480, width: "100%",
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          需要{labelNeed}身份
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          当前是{labelCurrent}身份, 此页面只对{labelNeed}开放. 选一个{labelNeed}账号继续, 或回原工作台.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {candidates.map((u) => (
            <button
              key={u.id}
              onClick={() => onSwitch(u.id)}
              style={{
                padding: "9px 14px", fontSize: 14, fontWeight: 600, textAlign: "left",
                background: "#2563eb", color: "white", border: "none", borderRadius: 6,
                cursor: "pointer",
              }}
            >
              切到 {u.name} ({labelNeed}) →
            </button>
          ))}
        </div>
        <a href={homeForRole(current)} style={{ fontSize: 13, color: "#6b7280" }}>
          ← 留在{labelCurrent}工作台
        </a>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { role } = useCurrentUser();
  return <Navigate to={homeForRole(role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* 标注工作台 — 仅 worker */}
        <Route path="/work" element={<RoleGuard allow="worker"><WorkLayout /></RoleGuard>}>
          <Route index element={<WorkListPage />} />
          <Route path="collect/:itemId" element={<CollectPage />} />
          <Route path="review/:itemId" element={<ReviewPage />} />
        </Route>

        {/* 管理后台 — 仅 admin */}
        <Route path="/admin" element={<RoleGuard allow="admin"><AdminLayout /></RoleGuard>}>
          <Route index element={<Navigate to="/admin/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="projects/:id/pipeline" element={<ProjectPipelineEditPage />} />
          <Route path="batches/:batchId" element={<BatchDetailPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="templates/:id" element={<TemplateEditPage />} />
          <Route path="nodes" element={<NodesPage />} />
          <Route path="nodes/:key/:version" element={<NodeDetailPage />} />
        </Route>

        {/* 旧 demo, 保持兼容 — 不做角色限制 */}
        <Route path="/demo" element={<DemoPage />} />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
