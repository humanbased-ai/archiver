import { NavLink, Outlet } from "react-router-dom";
import { UserSwitcher } from "../../components/UserSwitcher";
import { TenantSwitcher } from "../../components/TenantSwitcher";

const navStyle = (isActive: boolean): React.CSSProperties => ({
  display: "block", padding: "8px 14px", borderRadius: 6,
  textDecoration: "none", fontSize: 13, marginBottom: 4,
  background: isActive ? "#eff6ff" : "transparent",
  color: isActive ? "#1d4ed8" : "#374151",
  fontWeight: isActive ? 600 : 400,
});

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 220, background: "white", borderRight: "1px solid #e5e7eb", padding: 16, flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⚙ 管理后台</div>
        <NavLink to="/admin/projects" style={({ isActive }) => navStyle(isActive)}>
          📦 标注项目
        </NavLink>
        <NavLink to="/admin/templates" style={({ isActive }) => navStyle(isActive)}>
          🧩 Pipeline 模板
        </NavLink>
        <NavLink to="/admin/nodes" style={({ isActive }) => navStyle(isActive)}>
          🧱 节点管理
        </NavLink>
        <NavLink to="/admin/audit" style={({ isActive }) => navStyle(isActive)}>
          📜 审计日志
        </NavLink>

        <div style={{ marginTop: "auto", borderTop: "1px solid #f3f4f6", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <TenantSwitcher />
          <UserSwitcher />
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
    </div>
  );
}
