import { Link, Outlet } from "react-router-dom";
import { UserSwitcher } from "../../components/UserSwitcher";
import { TenantSwitcher } from "../../components/TenantSwitcher";

export default function WorkLayout() {
  return (
    <div className="app">
      <div className="topbar">
        <Link to="/work" style={{ textDecoration: "none", color: "inherit" }}>
          <h1>🏷 标注工作台</h1>
        </Link>
        <div className="right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TenantSwitcher />
          <UserSwitcher />
        </div>
      </div>
      <Outlet />
    </div>
  );
}
