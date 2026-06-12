import { useEffect, useState } from "react";

// 假登录: 演示用,真鉴权后续接入 SSO/JWT
// role 简单二分: admin (走管理后台) / worker (走标注工作台). 一个用户只属于一个角色,
// 越权访问由前端 RoleGuard 静默重定向; 后端鉴权另行接通 (RBAC + api_key, R6).
export type UserRole = "admin" | "worker";

export interface DemoUser {
  id: string;
  name: string;
  role: UserRole;
}

export const USERS: DemoUser[] = [
  { id: "admin-default", name: "Admin",   role: "admin"  },
  { id: "user-alice",    name: "Alice",   role: "worker" },
  { id: "user-bob",      name: "Bob",     role: "worker" },
  { id: "user-charlie",  name: "Charlie", role: "worker" },
  { id: "user-dora",     name: "Dora",    role: "worker" },
];

const STORAGE_KEY = "ls-pipeline:user-id";

export function userName(id: string | null | undefined) {
  return USERS.find((u) => u.id === id)?.name ?? id ?? "—";
}

export function userRole(id: string | null | undefined): UserRole {
  return USERS.find((u) => u.id === id)?.role ?? "worker";
}

export function homeForRole(role: UserRole): string {
  return role === "admin" ? "/admin" : "/work";
}

// 同 tab 内同步 useCurrentUser 多实例的自定义事件 — `storage` 事件只跨 tab 触发,
// 切人后 WorkListPage / Audit / 其它页里的 hook 实例不感知, 拉的还是旧 userId 的数据.
const USER_CHANGE_EVENT = "ls-pipeline:user-change";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && USERS.some((u) => u.id === saved)) return saved;
    return USERS[0].id;
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setUserId(e.newValue);
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setUserId(detail);
    };
    window.addEventListener("storage", onStorage);          // 跨 tab 同步
    window.addEventListener(USER_CHANGE_EVENT, onLocal);    // 同 tab 同步
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(USER_CHANGE_EVENT, onLocal);
    };
  }, []);

  const switchUser = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setUserId(id);
    window.dispatchEvent(new CustomEvent(USER_CHANGE_EVENT, { detail: id }));
  };
  const role = userRole(userId);
  return { userId, role, switchUser };
}
