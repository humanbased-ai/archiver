import { useNavigate } from "react-router-dom";
import { homeForRole, USERS, useCurrentUser, userRole } from "../users";

// demo 用户切换器. 真实生产换成 SSO/JWT 登录态时整体替换掉, 不要让它渗到业务逻辑.
// 切换后强制跳到目标角色的 home, 避免: admin 切到 worker 后还停在 /admin (RoleGuard 会拦,
// 但闪一下不优雅), 或反过来 worker 切到 admin 后停在 /work.
export function UserSwitcher() {
  const { userId, role, switchUser } = useCurrentUser();
  const navigate = useNavigate();

  const onChange = (nextId: string) => {
    const nextRole = userRole(nextId);
    switchUser(nextId);
    if (nextRole !== role) navigate(homeForRole(nextRole), { replace: true });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span title="demo 模式: 真实环境会换成登录态" style={{
        fontSize: 10, padding: "2px 6px", borderRadius: 4,
        background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a",
        fontWeight: 600, letterSpacing: 0.3,
      }}>DEV</span>
      <select
        value={userId}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "4px 8px",
          fontSize: 13,
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "white",
          cursor: "pointer",
        }}
      >
        {USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} · {u.role === "admin" ? "管理员" : "标注员"}
          </option>
        ))}
      </select>
    </div>
  );
}
