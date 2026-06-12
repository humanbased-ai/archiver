import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, biz, type Batch, type KanbanStep, type StuckItem, type UserStat } from "../../api";
import { userName } from "../../users";

interface BatchFull extends Batch {
  task_id: string;
  pipeline_steps: { key: string; nodeKey: string; label?: string }[];
  pipeline_status?: "active" | "paused" | "archived";
}

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<BatchFull | null>(null);
  const [steps, setSteps] = useState<KanbanStep[]>([]);
  const [stuck, setStuck] = useState<StuckItem[]>([]);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!batchId) return;
    try {
      const b = (await biz.getBatch(batchId)) as unknown as BatchFull;
      setBatch(b);
      const k = await api.kanban(b.task_id, batchId);
      setSteps(k.steps);
      setStuck(k.stuck);
      const u = await biz.userStats(batchId);
      setUserStats(u.stats);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [batchId]);

  useEffect(() => { reload(); }, [reload]);

  // 重投: 跳到指定 step. 后端 /admin/items/:id/replay 是 core, 不感知 batch.
  const replay = async (itemId: string, stepKey: string) => {
    if (!confirm(`将 item ${itemId.slice(0, 8)} 重投到 ${stepKey} 步骤?`)) return;
    setBusy(true);
    try {
      await api.replay(itemId, stepKey);
      await reload();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  if (!batch) {
    return (
      <div style={{ padding: 24 }}>
        {error && <ErrorBox msg={error} />}
        {!error && <div style={{ color: "#9ca3af", fontSize: 13 }}>加载中…</div>}
      </div>
    );
  }

  const target = batch.target ?? 0;
  const approved = batch.approved ?? 0;
  const stuckN = batch.stuck ?? 0;
  const inflight = (batch.stepCounts ?? []).reduce((a, c) => a + c.n, 0);
  const pct = target > 0 ? Math.min(100, Math.round((approved / target) * 100)) : 0;

  return (
    <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
      <div style={{ marginBottom: 8, fontSize: 13 }}>
        <Link to={`/admin/projects/${batch.task_id}`} style={{ color: "#6b7280", textDecoration: "none" }}>
          ← 项目: {batch.pipeline_name}
        </Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>批次: {batch.name}</h2>
        {batch.status === "paused" && (
          <span style={{
            padding: "3px 10px", fontSize: 11, fontWeight: 600,
            background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 12,
          }}>批次已暂停</span>
        )}
        {batch.pipeline_status === "paused" && (
          <span style={{
            padding: "3px 10px", fontSize: 11, fontWeight: 600,
            background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 12,
          }}>项目已暂停 (硬停)</span>
        )}
        <button
          disabled={busy}
          onClick={async () => {
            const willPause = batch.status !== "paused";
            if (willPause && !confirm("暂停此批次? 仅挡新认领, 已在飞节点继续走.")) return;
            setBusy(true);
            try {
              if (willPause) await biz.pauseBatch(batch.id);
              else await biz.resumeBatch(batch.id);
              await reload();
            } catch (e: any) { setError(e?.message ?? String(e)); }
            finally { setBusy(false); }
          }}
          title="批次暂停 = 软停 (新认领挡, 中间步继续); 项目暂停 = 硬停"
          style={{
            marginLeft: "auto", padding: "7px 14px", fontSize: 13, fontWeight: 600,
            background: "white",
            color: batch.status === "paused" ? "#059669" : "#dc2626",
            border: `1px solid ${batch.status === "paused" ? "#a7f3d0" : "#fecaca"}`,
            borderRadius: 6, cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "…" : batch.status === "paused" ? "▶ 恢复批次" : "⏸ 暂停批次"}
        </button>
      </div>

      {error && <ErrorBox msg={error} />}

      {/* 健康度卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <Stat label="目标" value={target} />
        <Stat label="已采集 (approved)" value={`${approved} / ${target}`} sub={`${pct}%`} color="#059669" />
        <Stat label="在飞" value={inflight} color="#f59e0b" />
        <Stat label="卡住" value={stuckN} color={stuckN > 0 ? "#dc2626" : "#9ca3af"} />
      </div>

      {/* 进度条 */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "#10b981", transition: "width .3s" }} />
        </div>
      </div>

      {/* Step 分布 */}
      <Card title={`步骤分布`}>
        {steps.length === 0 ? (
          <Empty>无在飞 item</Empty>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {steps.map((s) => (
              <div key={s.stepKey} style={{
                padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6,
                background: s.items.length === 0 ? "#fafafa" : "#eff6ff",
                minWidth: 120,
              }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{s.label ?? s.stepKey}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: s.items.length === 0 ? "#9ca3af" : "#1d4ed8" }}>
                  {s.items.length}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>{s.nodeKey}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 用户贡献 */}
      <Card title={`用户贡献 (${userStats.length})`}>
        {userStats.length === 0 ? (
          <Empty>暂无用户提交</Empty>
        ) : (
          <UserStatTable stats={userStats} />
        )}
      </Card>

      {/* Stuck items + 干预 */}
      <Card title={`卡住的任务 (${stuck.length})`}>
        {stuck.length === 0 ? (
          <Empty>没有卡住的任务 ✅</Empty>
        ) : (
          <StuckTable
            items={stuck}
            steps={batch.pipeline_steps ?? []}
            onReplay={replay}
            busy={busy}
          />
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color ?? "#111", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: color ?? "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function UserStatTable({ stats }: { stats: UserStat[] }) {
  // 按 user 聚合
  const byUser = new Map<string, Record<string, number>>();
  for (const s of stats) {
    const m = byUser.get(s.user_id) ?? {};
    m[s.status] = s.n;
    byUser.set(s.user_id, m);
  }
  const STATUSES = ["claimed", "submitted", "returned"] as const;
  return (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
          <th style={th()}>用户</th>
          {STATUSES.map((s) => <th key={s} style={th()}>{labelStatus(s)}</th>)}
          <th style={th()}>合计</th>
        </tr>
      </thead>
      <tbody>
        {[...byUser.entries()].map(([uid, m]) => {
          const total = STATUSES.reduce((a, s) => a + (m[s] ?? 0), 0);
          return (
            <tr key={uid} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={td()}>{userName(uid)} <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>{uid}</span></td>
              {STATUSES.map((s) => <td key={s} style={td()}>{m[s] ?? 0}</td>)}
              <td style={{ ...td(), fontWeight: 600 }}>{total}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function labelStatus(s: string): string {
  if (s === "claimed") return "进行中";
  if (s === "submitted") return "已提交";
  if (s === "returned") return "已放弃";
  return s;
}

function StuckTable({
  items, steps, onReplay, busy,
}: {
  items: StuckItem[];
  steps: { key: string; nodeKey: string; label?: string }[];
  onReplay: (itemId: string, stepKey: string) => void;
  busy: boolean;
}) {
  return (
    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
          <th style={th()}>Item</th>
          <th style={th()}>循环计数</th>
          <th style={th()}>更新时间</th>
          <th style={th()}>重投到</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
            <td style={td()}>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{it.id.slice(0, 8)}</span>
            </td>
            <td style={{ ...td(), fontSize: 11, color: "#6b7280" }}>
              {Object.entries(it.loop_counts ?? {}).map(([k, n]) => `${k}=${n}`).join(", ") || "—"}
            </td>
            <td style={{ ...td(), fontSize: 12, color: "#6b7280" }}>
              {new Date(it.updated_at).toLocaleString("zh-CN")}
            </td>
            <td style={td()}>
              <ReplaySelect
                steps={steps}
                disabled={busy}
                onPick={(stepKey) => onReplay(it.id, stepKey)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReplaySelect({
  steps, disabled, onPick,
}: { steps: { key: string; label?: string }[]; disabled: boolean; onPick: (stepKey: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
        style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #d1d5db", borderRadius: 4 }}
      >
        <option value="">选择步骤</option>
        {steps.map((s) => <option key={s.key} value={s.key}>{s.label ?? s.key}</option>)}
      </select>
      <button
        disabled={disabled || !v}
        onClick={() => v && onPick(v)}
        style={{
          padding: "4px 10px", fontSize: 12,
          background: v ? "#dc2626" : "#e5e7eb", color: v ? "white" : "#9ca3af",
          border: "none", borderRadius: 4, cursor: v && !disabled ? "pointer" : "not-allowed",
        }}
      >
        重投
      </button>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
      {msg}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 600, color: "#374151" }}>{title}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "#9ca3af", padding: "16px 0", textAlign: "center" }}>{children}</div>;
}

function th(): React.CSSProperties { return { textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#6b7280" }; }
function td(): React.CSSProperties { return { padding: "8px 12px" }; }
