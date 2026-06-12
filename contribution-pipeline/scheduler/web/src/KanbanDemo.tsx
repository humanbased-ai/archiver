import { useCallback, useEffect, useState } from "react";
import {
  api, biz,
  type Batch, type CollectTask, type Item, type KanbanRun, type KanbanStep,
  type PipelineFull, type StuckItem, type UserStat,
} from "./api";
import { SchemaForm } from "./schema-form";

// ─── 模拟用户 ────────────────────────────────────────────────
const USERS = [
  { id: "user-alice",   name: "Alice" },
  { id: "user-bob",     name: "Bob" },
  { id: "user-charlie", name: "Charlie" },
];
function userName(id: string | null) {
  return USERS.find((u) => u.id === id)?.name ?? id ?? "—";
}

// ─── 小工具 ──────────────────────────────────────────────────
function Countdown({ expectedBy }: { expectedBy: string }) {
  const calc = () => Math.max(0, Math.floor((new Date(expectedBy).getTime() - Date.now()) / 1000));
  const [s, setS] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setS(calc()), 1000);
    return () => clearInterval(t);
  }, [expectedBy]);
  if (s <= 0) return <span style={{ color: "#ef4444" }}> · ⏰ 已过期</span>;
  return <span style={{ color: s < 30 ? "#ef4444" : "#92400e" }}> · {s}s</span>;
}

function Toast({ msg, type, onDone }: { msg: string; type: "ok" | "err"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, maxWidth: 380, padding: "10px 16px",
      borderRadius: 8, fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,.15)", zIndex: 999,
      background: type === "err" ? "#fef2f2" : "#f0fdf4",
      color: type === "err" ? "#991b1b" : "#166534",
      border: `1px solid ${type === "err" ? "#fecaca" : "#bbf7d0"}`,
    }}>
      {type === "err" ? "⚠ " : "✓ "}{msg}
    </div>
  );
}

function btn(bg: string, flex?: number): React.CSSProperties {
  return {
    flex, width: flex ? undefined : "100%",
    padding: "7px 10px", background: bg, color: "white",
    border: "none", borderRadius: 5, cursor: "pointer",
    fontSize: 13, fontWeight: 600,
  };
}

// ─── 批次面板 ────────────────────────────────────────────────
function BatchPanel({
  pipeline, batch, onBatchChange,
}: { pipeline: PipelineFull; batch: Batch | null; onBatchChange: (b: Batch | null) => void }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState(5);

  const reload = useCallback(async () => {
    const { batches: list } = await biz.listBatches();
    setBatches(list.filter((b) => b.task_id === pipeline.task_id));
  }, [pipeline.task_id]);

  useEffect(() => { reload(); }, [reload]);

  const create = async () => {
    if (!newName.trim()) return;
    const r = await biz.createBatch({ pipelineId: pipeline.task_id, name: newName.trim(), target: newTarget });
    await reload();
    const { batches: list } = await biz.listBatches();
    const created = list.find((b) => b.id === r.batchId) ?? null;
    if (created) onBatchChange(created);
    setCreating(false);
    setNewName("");
  };

  const pct = batch ? Math.round(((batch.approved ?? 0) / batch.target) * 100) : 0;
  const stuckCount = batch?.stuck ?? 0;

  return (
    <div style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 16px", background: "#f8fafc", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>批次：</span>
        <select
          value={batch?.id ?? ""}
          onChange={(e) => { onBatchChange(batches.find((b) => b.id === e.target.value) ?? null); }}
          style={{ fontSize: 12, padding: "3px 6px", borderRadius: 4, border: "1px solid #d1d5db" }}
        >
          <option value="">— 选择批次 —</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {!creating ? (
          <button onClick={() => setCreating(true)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #3b82f6", color: "#3b82f6", background: "white", cursor: "pointer" }}>
            + 新建批次
          </button>
        ) : (
          <span style={{ display: "flex", gap: 4 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="批次名称" style={{ fontSize: 11, padding: "3px 6px", borderRadius: 4, border: "1px solid #d1d5db", width: 120 }} />
            <input type="number" value={newTarget} min={1} max={100} onChange={(e) => setNewTarget(Number(e.target.value))} style={{ fontSize: 11, padding: "3px 4px", borderRadius: 4, border: "1px solid #d1d5db", width: 50 }} />
            <button onClick={create} style={{ ...btn("#2563eb"), padding: "3px 8px" }}>创建</button>
            <button onClick={() => setCreating(false)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}>取消</button>
          </span>
        )}
      </div>
      {batch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
            {batch.approved ?? 0} / {batch.target} 已通过
          </span>
          <div style={{ width: 120, height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#10b981" : "#3b82f6", transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{pct}%</span>
          {stuckCount > 0 && (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 10,
              background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca",
            }}>
              ⚠ {stuckCount} 失败 (DLQ)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 用户容量面板 ─────────────────────────────────────────────
function UserCapacityPanel({ batchId, pipeline }: { batchId: string; pipeline: PipelineFull }) {
  const [stats, setStats] = useState<UserStat[]>([]);
  useEffect(() => {
    const load = () => biz.userStats(batchId).then((r) => setStats(r.stats)).catch(() => {});
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [batchId]);

  const ingestParams = (pipeline.steps[0]?.params ?? {}) as Record<string, unknown>;
  const maxConcurrent = (ingestParams.max_concurrent_per_user as number) ?? "∞";
  const maxTotal = (ingestParams.max_total_per_user as number) ?? "∞";

  const byUser: Record<string, Record<string, number>> = {};
  for (const s of stats) {
    if (!byUser[s.user_id]) byUser[s.user_id] = {};
    byUser[s.user_id][s.status] = s.n;
  }

  return (
    <div style={{ padding: "6px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "#6b7280" }}>同时上限 {maxConcurrent}，批次上限 {maxTotal}：</span>
      {USERS.map((u) => {
        const s = byUser[u.id] ?? {};
        return (
          <span key={u.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#f1f5f9", color: "#374151" }}>
            <b>{u.name}</b>：{s.claimed > 0 && <span style={{ color: "#f59e0b" }}>🔒{s.claimed} </span>}已提交 {s.submitted ?? 0}
          </span>
        );
      })}
    </div>
  );
}

// ─── 采集表单（用户已领取后填写）───────────────────────────────
type RejectionHint =
  | { kind: "dedup"; hash?: string }
  | { kind: "review"; reason?: string };

function detectRejection(item: Item): RejectionHint | null {
  const outputs = (item.envelope?.outputs ?? {}) as Record<string, any>;
  for (const v of Object.values(outputs)) {
    if (!v || typeof v !== "object") continue;
    if (v.deduped === true || v.decision === "duplicate") {
      return { kind: "dedup", hash: typeof v.hash === "string" ? v.hash : undefined };
    }
    if (v.decision === "rejected") {
      return { kind: "review", reason: typeof v.reason === "string" ? v.reason : undefined };
    }
  }
  return null;
}

function CollectForm({
  item, run, pipeline, userId, onDone, onNotify,
}: {
  item: Item; run: KanbanRun; pipeline: PipelineFull;
  userId: string; onDone: () => void; onNotify: (t: "ok" | "err", m: string) => void;
}) {
  const [formVal, setFormVal] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  const params = (pipeline.steps[0]?.params ?? {}) as Record<string, unknown>;
  const schema = params.schema as any;
  const uiSchema = params.uiSchema as any;
  const firstKey = pipeline.steps[0]?.key;
  const rejection = detectRejection(item);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await biz.submitCollect(item.id, userId, formVal);
      onNotify("ok", r.nextStep === firstKey ? "提交成功，被退回重新采集" : "提交成功，进入下一步");
      setFormVal({});
      onDone();
    } catch (e: any) { onNotify("err", e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  const release = async () => {
    if (!confirm("确定放弃认领此任务？")) return;
    setBusy(true);
    try {
      await biz.releaseCollect(item.id, userId);
      onNotify("ok", "已放弃认领");
      onDone();
    } catch (e: any) { onNotify("err", e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 12, borderRadius: 6, border: "1px solid #3b82f6", background: "#eff6ff" }}>
      <div style={{ fontSize: 11, color: "#1d4ed8", marginBottom: 8, fontWeight: 600 }}>
        ▶ 你正在填写
        {run.expected_by && <Countdown expectedBy={run.expected_by} />}
      </div>
      {rejection && (
        <div style={{
          padding: "8px 10px", marginBottom: 10, borderRadius: 5,
          background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 12,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            ⚠ 上次提交被退回
            {rejection.kind === "dedup" ? "（去重判定为重复）" : "（审核退回）"}
          </div>
          <div style={{ color: "#7f1d1d" }}>
            {rejection.kind === "dedup"
              ? "请修改字段内容后再提交，避免和已有数据撞重。"
              : `理由：${rejection.reason ?? "（未填写）"}`}
          </div>
          {rejection.kind === "dedup" && rejection.hash && (
            <div style={{ marginTop: 2, fontSize: 10, color: "#b91c1c", fontFamily: "monospace" }}>
              撞重指纹：{rejection.hash}
            </div>
          )}
        </div>
      )}
      {schema ? (
        <SchemaForm schema={schema} uiSchema={uiSchema} value={formVal} onChange={setFormVal} />
      ) : (
        <textarea
          value={JSON.stringify(formVal, null, 2)}
          onChange={(e) => { try { setFormVal(JSON.parse(e.target.value)); } catch {} }}
          style={{ width: "100%", height: 80, fontSize: 11, fontFamily: "monospace", boxSizing: "border-box" }}
        />
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button disabled={busy} onClick={submit} style={btn("#059669", 1)}>提交</button>
        <button disabled={busy} onClick={release} style={{ flex: 1, padding: "7px 10px", fontSize: 13, borderRadius: 5, border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}>放弃</button>
      </div>
    </div>
  );
}

const DEFAULT_REJECT_REASON = "内容质量不符合要求";

// ─── 审核表单（用户已领取后审核）──────────────────────────────
function ReviewForm({
  item, run, batchId, userId, onDone, onNotify,
}: {
  item: Item; run: KanbanRun; batchId?: string;
  userId: string; onDone: () => void; onNotify: (t: "ok" | "err", m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState(DEFAULT_REJECT_REASON);

  const decide = async (decision: "approved" | "rejected") => {
    if (decision === "rejected" && !rejectReason.trim()) {
      onNotify("err", "请填写拒绝理由");
      return;
    }
    setBusy(true);
    try {
      const r = await biz.reviewDecide(
        item.id, userId, batchId, decision,
        decision === "rejected" ? rejectReason.trim() : undefined,
      );
      onNotify("ok", decision === "approved" ? "审核通过，进入入库" : `已退回：${rejectReason.trim()} (→ ${r.nextStep})`);
      setRejectReason(DEFAULT_REJECT_REASON);
      onDone();
    } catch (e: any) { onNotify("err", e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  const payload = item.envelope?.payload ?? {};
  const outputs = item.envelope?.outputs ?? {};

  return (
    <div style={{ padding: 12, borderRadius: 6, border: "1px solid #3b82f6", background: "#eff6ff" }}>
      <div style={{ fontSize: 11, color: "#1d4ed8", marginBottom: 8, fontWeight: 600 }}>
        ▶ 你正在审核
        {run.expected_by && <Countdown expectedBy={run.expected_by} />}
      </div>
      <div style={{ fontSize: 12, color: "#374151", marginBottom: 8, maxHeight: 100, overflow: "auto" }}>
        {Object.entries(payload).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 2 }}><b>{k}:</b> {String(v).slice(0, 80)}</div>
        ))}
      </div>
      {Object.keys(outputs).length > 0 && (
        <pre style={{ fontSize: 10, background: "#f8fafc", padding: 6, borderRadius: 4, margin: "0 0 8px", maxHeight: 60, overflow: "auto" }}>
          {JSON.stringify(outputs, null, 2)}
        </pre>
      )}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>
          拒绝理由（通过时忽略）
        </label>
        <textarea
          rows={2}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{
            width: "100%", fontSize: 12, padding: "5px 7px",
            border: "1px solid #d1d5db", borderRadius: 4,
            fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button disabled={busy} onClick={() => decide("approved")} style={btn("#059669", 1)}>✓ 通过</button>
        <button disabled={busy} onClick={() => decide("rejected")} style={btn("#dc2626", 1)}>✗ 退回</button>
      </div>
    </div>
  );
}

// ─── 列 ─────────────────────────────────────────────────────
function StepColumn({
  step, pipeline, batchId, collectTasks, canClaim,
  currentUserId, onDone, onNotify,
}: {
  step: KanbanStep; pipeline: PipelineFull;
  batchId?: string | null; collectTasks: CollectTask[]; canClaim: boolean;
  currentUserId: string; onDone: () => void; onNotify: (t: "ok" | "err", m: string) => void;
}) {
  const firstStep = pipeline.steps[0];
  const isCollect = step.stepKey === firstStep?.key;
  const isReview = step.nodeKey === "review";
  const [busy, setBusy] = useState(false);

  // 当前用户在该列的已领取 item
  const myLeased = step.items.find(({ run }) => run?.status === "leased" && run.leased_by === currentUserId);

  const pendingCount = isCollect
    ? collectTasks.length
    : step.items.filter((i) => i.run?.status === "pending").length;
  const leasedCount = step.items.filter((i) => i.run?.status === "leased").length;

  const claimCollect = async () => {
    if (!batchId || collectTasks.length === 0) return;
    setBusy(true);
    try {
      await biz.claimCollect(collectTasks[0].id, currentUserId, batchId);
      onNotify("ok", "已领取任务");
      onDone();
    } catch (e: any) { onNotify("err", e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  const claimReview = async () => {
    const first = step.items.find(({ run }) => run?.status === "pending");
    if (!first?.run) return;
    setBusy(true);
    try {
      await api.claimRun(first.run.run_id, currentUserId, 3600);
      onNotify("ok", "已领取审核任务");
      onDone();
    } catch (e: any) { onNotify("err", e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 8 }}>

      {/* 列头：始终展示两个计数 */}
      <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{step.label ?? step.stepKey}</div>
        <code style={{ fontSize: 10, color: "#94a3b8" }}>{step.nodeKey}</code>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12 }}>
          <span style={{ color: pendingCount > 0 ? "#3b82f6" : "#cbd5e1", fontWeight: 500 }}>
            ⬤ {pendingCount} 待领取
          </span>
          <span style={{ color: leasedCount > 0 ? "#f59e0b" : "#cbd5e1", fontWeight: 500 }}>
            🔒 {leasedCount} 处理中
          </span>
        </div>
      </div>

      {/* 操作区：仅一个按钮或操作表单 */}
      {isCollect ? (
        !batchId ? (
          <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>请先选择或创建批次</div>
        ) : myLeased ? (
          <CollectForm
            item={myLeased.item} run={myLeased.run!} pipeline={pipeline}
            userId={currentUserId} onDone={onDone} onNotify={onNotify}
          />
        ) : (
          <button
            disabled={busy || !canClaim || collectTasks.length === 0}
            onClick={claimCollect}
            style={btn(canClaim && collectTasks.length > 0 ? "#2563eb" : "#9ca3af")}
          >
            {!canClaim ? "暂不可领取" : collectTasks.length === 0 ? "暂无可领取任务" : "领取任务"}
          </button>
        )
      ) : isReview ? (
        myLeased ? (
          <ReviewForm
            item={myLeased.item} run={myLeased.run!}
            batchId={batchId ?? undefined}
            userId={currentUserId} onDone={onDone} onNotify={onNotify}
          />
        ) : pendingCount > 0 ? (
          <button disabled={busy} onClick={claimReview} style={btn("#7c3aed")}>
            领取审核
          </button>
        ) : (
          <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>暂无待审核任务</div>
        )
      ) : (
        // 自动节点
        <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>
          {pendingCount > 0 || leasedCount > 0 ? "⚙ 自动处理中…" : "⚙ 自动处理 · 空"}
        </div>
      )}
    </div>
  );
}

// ─── DLQ / Stuck 列 ──────────────────────────────────────────
function StuckColumn({
  items, pipeline, onDone,
}: { items: StuckItem[]; pipeline: PipelineFull; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const firstStepKey = pipeline.steps[0]?.key ?? "ingest";
  const replay = async (id: string) => {
    if (!confirm("把该任务回放到第一步重新执行?")) return;
    setBusy(id);
    try {
      await api.replay(id, firstStepKey);
      onDone();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally { setBusy(null); }
  };
  return (
    <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#991b1b" }}>失败 / DLQ</div>
        <code style={{ fontSize: 10, color: "#dc2626" }}>stuck</code>
        <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
          ⚠ {items.length} 个 item 已停滞 (重试用尽 / 配置错误)
        </div>
      </div>
      {items.map((it) => {
        const preview = JSON.stringify(it.envelope.payload).slice(0, 40);
        const loops = Object.entries(it.loop_counts ?? {})
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${k}×${n}`)
          .join(" ");
        return (
          <div key={it.id} style={{
            padding: 10, borderRadius: 6, border: "1px solid #fecaca", background: "white",
            fontSize: 11, color: "#374151",
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#9ca3af" }}>
              {it.id.slice(0, 8)}
            </div>
            <div style={{ margin: "4px 0", wordBreak: "break-all" }}>{preview}</div>
            {loops && (
              <div style={{ fontSize: 10, color: "#dc2626" }}>循环: {loops}</div>
            )}
            <button
              disabled={busy === it.id}
              onClick={() => replay(it.id)}
              style={{
                marginTop: 6, width: "100%", padding: "5px",
                fontSize: 11, borderRadius: 4, cursor: "pointer",
                border: "1px solid #dc2626", background: "white", color: "#dc2626",
              }}
            >
              重放到「{pipeline.steps[0]?.label ?? firstStepKey}」
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────
export function KanbanDemo({ pipeline }: { pipeline: PipelineFull }) {
  const [userId, setUserId] = useState(() => localStorage.getItem("kanban-user-id") ?? USERS[0].id);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [steps, setSteps] = useState<KanbanStep[]>([]);
  const [stuckItems, setStuckItems] = useState<StuckItem[]>([]);
  const [collectTasks, setCollectTasks] = useState<CollectTask[]>([]);
  const [canClaim, setCanClaim] = useState(false);
  const [batchDetail, setBatchDetail] = useState<Batch | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const notify = (type: "ok" | "err", msg: string) => setToast({ type, msg });

  const refresh = useCallback(async () => {
    try {
      const kanban = await api.kanban(pipeline.task_id, batch?.id);
      setSteps(kanban.steps);
      setStuckItems(kanban.stuck ?? []);
      if (batch) {
        const [detail, collectData] = await Promise.all([
          biz.getBatch(batch.id),
          biz.collectTasks(batch.id, userId),
        ]);
        setBatchDetail(detail);
        setCollectTasks(collectData.items);
        setCanClaim(collectData.canClaim);
        setBatch((prev) => prev ? { ...prev, approved: detail.approved } : prev);
      }
    } catch { /* ignore */ }
  }, [pipeline.task_id, batch?.id, userId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [refresh]);

  const switchUser = (id: string) => {
    setUserId(id);
    localStorage.setItem("kanban-user-id", id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      <BatchPanel
        pipeline={pipeline}
        batch={batchDetail ?? batch}
        onBatchChange={(b) => { setBatch(b); setBatchDetail(null); }}
      />

      {batch && <UserCapacityPanel batchId={batch.id} pipeline={pipeline} />}

      {/* 顶栏：流水线路径 + 用户切换 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, flex: 1, flexWrap: "wrap" }}>
          {pipeline.steps.map((s, i) => (
            <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: "#cbd5e1" }}>→</span>}
              <span style={{ padding: "2px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, fontFamily: "monospace", color: "#475569" }}>
                {s.label ?? s.key}
              </span>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {USERS.map((u) => (
            <button key={u.id} onClick={() => switchUser(u.id)} style={{
              padding: "3px 10px", fontSize: 12, borderRadius: 12, cursor: "pointer", fontWeight: u.id === userId ? 600 : 400,
              border: `1px solid ${u.id === userId ? "#2563eb" : "#e2e8f0"}`,
              background: u.id === userId ? "#eff6ff" : "white",
              color: u.id === userId ? "#1d4ed8" : "#374151",
            }}>
              {u.name}
            </button>
          ))}
        </div>
      </div>

      {/* 设计说明条 */}
      <div style={{ display: "flex", gap: 16, padding: "4px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, color: "#64748b", flexWrap: "wrap", flexShrink: 0 }}>
        <span>📋 采集步：<b>业务层</b>校验配额 + 容量，领取后填表提交</span>
        <span>🔒 审核步：<b>业务层</b>决定通过/退回，退回触发 loopback 重置认领资格</span>
        <span>⚙ 去重/入库：<b>调度核心</b>直接操作</span>
        <span>♻ 租约 60s，过期自动解锁，旧 runId 提交被拒绝</span>
      </div>

      {/* 看板列 */}
      <div style={{ display: "flex", gap: 16, padding: 16, overflowX: "auto", flex: 1, alignItems: "flex-start" }}>
        {steps.map((step) => (
          <StepColumn
            key={step.stepKey}
            step={step}
            pipeline={pipeline}
            batchId={batch?.id}
            collectTasks={collectTasks}
            canClaim={canClaim}
            currentUserId={userId}
            onDone={refresh}
            onNotify={notify}
          />
        ))}
        {batch && stuckItems.length > 0 && (
          <StuckColumn items={stuckItems} pipeline={pipeline} onDone={refresh} />
        )}
        {steps.length === 0 && (
          <div style={{ color: "#9ca3af", fontSize: 13, padding: "40px 0" }}>选择上方 Pipeline 开始</div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
