import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, biz, type Batch, type PipelineFull } from "../../api";

interface BatchWithProgress extends Batch {
  approved: number;
  stuck: number;
  inflight: number;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pipeline, setPipeline] = useState<PipelineFull | null>(null);
  const [batches, setBatches] = useState<BatchWithProgress[]>([]);
  const [pipelineStuck, setPipelineStuck] = useState<number>(0);
  const [pipelineInflight, setPipelineInflight] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    if (!id) return;
    try {
      const p = await api.getPipeline(id);
      setPipeline(p);

      // 全 pipeline 健康度: kanban 不带 batchId 一次拿到所有 step 分布 + stuck 列
      const k = await api.kanban(id);
      setPipelineInflight(k.steps.reduce((a, s) => a + s.items.length, 0));
      setPipelineStuck(k.stuck.length);

      // 每批次单独拉进度: getBatch 返 target/approved/stuck/stepCounts
      const all = await biz.listBatches();
      const mine = all.batches.filter((b) => b.task_id === id);
      const enriched = await Promise.all(mine.map(async (b) => {
        const detail = await biz.getBatch(b.id) as Batch;
        const inflight = (detail.stepCounts ?? []).reduce((a, c) => a + c.n, 0);
        return { ...b, approved: detail.approved ?? 0, stuck: detail.stuck ?? 0, inflight };
      }));
      setBatches(enriched);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };
  useEffect(() => { reload(); }, [id]);

  return (
    <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
      <div style={{ marginBottom: 8, fontSize: 13 }}>
        <Link to="/admin/projects" style={{ color: "#6b7280", textDecoration: "none" }}>← 项目列表</Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{pipeline?.name ?? "…"}</h2>
        {pipeline?.status === "paused" && (
          <span style={{
            padding: "3px 10px", fontSize: 11, fontWeight: 600,
            background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 12,
          }}>已暂停</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {pipeline && (
            <PauseToggle
              status={pipeline.status ?? "active"}
              hint="暂停项目 = autoworker 全停 + 不能新认领 (已 leased 的还会跑完)"
              onPause={async () => {
                if (!confirm("暂停整个项目? autoworker 将停止处理, 已认领的任务可以继续完成.")) return;
                await api.pausePipeline(id!);
                await reload();
              }}
              onResume={async () => {
                await api.resumePipeline(id!);
                await reload();
              }}
            />
          )}
          <Link to={`/admin/projects/${id}/pipeline`}
                style={{ padding: "7px 14px", background: "white", color: "#2563eb", border: "1px solid #2563eb", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            编辑流程
          </Link>
        </div>
      </div>

      {error && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* 流程概览 */}
      {pipeline && (
        <Card title="流程">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {pipeline.steps.map((s, i) => (
              <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {i > 0 && <span style={{ color: "#cbd5e1" }}>→</span>}
                <span style={{ padding: "4px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 14, fontSize: 12, color: "#475569" }}>
                  {s.label ?? s.key}
                  <code style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>{s.nodeKey}</code>
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* 整体健康度 */}
      {pipeline && (
        <Card title="健康度">
          <div style={{ display: "flex", gap: 16 }}>
            <Indicator label="在飞" value={pipelineInflight} color="#f59e0b" />
            <Indicator label="卡住" value={pipelineStuck} color={pipelineStuck > 0 ? "#dc2626" : "#9ca3af"} />
          </div>
          {pipelineStuck > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#991b1b" }}>
              ⚠ 有 {pipelineStuck} 条卡住,进入对应批次详情可干预重投
            </div>
          )}
        </Card>
      )}

      {/* 批次 */}
      <Card title={`批次 (${batches.length})`} action={
        <button onClick={() => setCreating(true)}
                style={{ padding: "5px 12px", background: "#2563eb", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          + 新建批次
        </button>
      }>
        {batches.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9ca3af", padding: "16px 0", textAlign: "center" }}>
            暂无批次,点 "+ 新建批次" 投放 N 条待采集 item
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th()}>名称</th>
                <th style={th()}>进度</th>
                <th style={th()}>在飞</th>
                <th style={th()}>卡住</th>
                <th style={th()}>创建时间</th>
                <th style={th()}></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const pct = b.target > 0 ? Math.round((b.approved / b.target) * 100) : 0;
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td()}>
                      <Link to={`/admin/batches/${b.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                        {b.name}
                      </Link>
                      {b.status === "paused" && (
                        <span style={{
                          marginLeft: 6, padding: "1px 6px", fontSize: 10, fontWeight: 600,
                          background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 8,
                        }}>暂停</span>
                      )}
                    </td>
                    <td style={td()}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 60, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "#10b981" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#6b7280", minWidth: 60 }}>
                          {b.approved}/{b.target}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td(), color: b.inflight > 0 ? "#f59e0b" : "#9ca3af" }}>{b.inflight}</td>
                    <td style={{ ...td(), color: b.stuck > 0 ? "#dc2626" : "#9ca3af", fontWeight: b.stuck > 0 ? 600 : 400 }}>
                      {b.stuck}
                    </td>
                    <td style={{ ...td(), color: "#6b7280" }}>{new Date(b.created_at).toLocaleString("zh-CN")}</td>
                    <td style={td()}>
                      <Link to={`/admin/batches/${b.id}`} style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>
                        详情 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {creating && id && (
        <NewBatchDialog
          pipelineId={id}
          onClose={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await reload(); }}
        />
      )}
    </div>
  );
}

function NewBatchDialog({
  pipelineId, onClose, onCreated,
}: { pipelineId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setErr("请填写批次名称"); return; }
    setBusy(true); setErr(null);
    try {
      await biz.createBatch({ pipelineId, name: name.trim(), target });
      onCreated();
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 12, padding: 24, minWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>新建批次</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>名称</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                 style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>目标 item 数 (1-100)</label>
          <input type="number" min={1} max={100} value={target} onChange={(e) => setTarget(Number(e.target.value) || 1)}
                 style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }} />
        </div>
        {err && <div style={{ padding: "6px 10px", fontSize: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 4, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", fontSize: 13, background: "white", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}>取消</button>
          <button disabled={busy} onClick={submit}
                  style={{ padding: "7px 14px", fontSize: 13, background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {busy ? "创建中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PauseToggle({
  status, hint, onPause, onResume,
}: {
  status: "active" | "paused" | "archived";
  hint?: string;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const isPaused = status === "paused";
  const click = async () => {
    setBusy(true);
    try { isPaused ? await onResume() : await onPause(); }
    finally { setBusy(false); }
  };
  return (
    <button
      disabled={busy}
      onClick={click}
      title={hint}
      style={{
        padding: "7px 14px", fontSize: 13, fontWeight: 600,
        background: "white",
        color: isPaused ? "#059669" : "#dc2626",
        border: `1px solid ${isPaused ? "#a7f3d0" : "#fecaca"}`,
        borderRadius: 6, cursor: busy ? "default" : "pointer",
      }}
    >
      {busy ? "…" : isPaused ? "▶ 恢复" : "⏸ 暂停"}
    </button>
  );
}

function Indicator({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 80 }}>
      <span style={{ fontSize: 11, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{title}</span>
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
function th(): React.CSSProperties { return { textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#6b7280" }; }
function td(): React.CSSProperties { return { padding: "8px 12px" }; }
