import { useEffect, useState } from "react";

// dev 演示模式的 tenant 切换器. 通过 GET /api/v1/dev/tenants 拉 demo 列表,
// 选定后把对应明文 dev key 写到 localStorage("scheduler-api-key"), 然后整页刷
// 让所有内存态被丢弃 — 比尝试主动驱动 React 树重渲染干净.
//
// 生产环境后端会 /dev/tenants 返 404, 这个组件 fetch 失败后整个不渲染. 没有 demo
// 数据时也不渲染, 不会污染真实 UI.
//
// 注意: 这是 dev 便利, 真实多租户的入口在生产形态是"外部服务自带 X-Api-Key" — 见
// trace.ts 里的 readApiKey().

interface DevTenant {
  slug: string;
  name: string;
  tenantId: string;
  devKey: string | null; // default 租户没有 dev key, 选它就是清空 localStorage
}

const KEY_STORAGE = "scheduler-api-key";

export function TenantSwitcher() {
  const [tenants, setTenants] = useState<DevTenant[] | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string>("default");

  useEffect(() => {
    fetch("/api/v1/dev/tenants")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.tenants?.length) return;
        setTenants(j.tenants);
        // 用当前 localStorage key 反查匹配的 slug
        const cur = (localStorage.getItem(KEY_STORAGE) ?? "").trim();
        const match = j.tenants.find((t: DevTenant) => t.devKey && t.devKey === cur);
        setCurrentSlug(match ? match.slug : "default");
      })
      .catch(() => { /* 生产环境 404, 不渲染 */ });
  }, []);

  if (!tenants) return null;

  const onChange = (slug: string) => {
    const t = tenants.find((x) => x.slug === slug);
    if (!t) return;
    if (t.devKey) {
      localStorage.setItem(KEY_STORAGE, t.devKey);
    } else {
      localStorage.removeItem(KEY_STORAGE);
    }
    // 刷到 home, 避免在 tenant A 的某 detail 页切到 B 之后 404
    window.location.assign("/");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span title="dev 模式: 通过 X-Api-Key 切换租户" style={{
        fontSize: 10, padding: "2px 6px", borderRadius: 4,
        background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe",
        fontWeight: 600, letterSpacing: 0.3,
      }}>TENANT</span>
      <select
        value={currentSlug}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "4px 8px", fontSize: 13,
          border: "1px solid #d1d5db", borderRadius: 6,
          background: "white", cursor: "pointer",
        }}
      >
        {tenants.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.name}{t.slug !== "default" && ` (${t.slug})`}
          </option>
        ))}
      </select>
    </div>
  );
}
