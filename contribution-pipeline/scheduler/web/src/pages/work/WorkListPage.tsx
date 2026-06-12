import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, biz, type Batch, type MySubmission, type ReviewTaskItem, type WorkCollectTask } from "../../api";
import { useCurrentUser, userName } from "../../users";

type Tab = "collect" | "review" | "mine";

export default function WorkListPage() {
  const { userId } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("collect");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string>("__all__");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // collect 列表 (跨批次/单批次同形态)
  const [collectItems, setCollectItems] = useState<WorkCollectTask[]>([]);
  const [canClaim, setCanClaim] = useState(false);
  const [quotaText, setQuotaText] = useState<string>("");

  // review 列表
  const [reviewItems, setReviewItems] = useState<ReviewTaskItem[]>([]);

  // 我的提交记录
  const [mySubs, setMySubs] = useState<MySubmission[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { batches: list } = await biz.listBatches();
      setBatches(list);

      if (tab === "mine") {
        const r = await biz.mySubmissions(userId);
        setMySubs(r.submissions);
      } else if (tab === "collect") {
        const filterBatch = batchId !== "__all__" ? batchId : undefined;
        const r = await biz.workCollectTasks(userId, filterBatch);
        setCollectItems(r.items);
        setCanClaim(r.items.length > 0);
        if (filterBatch) {
          // 单批次详情走老接口拿 quota / userCapacity (sum 不出来)
          try {
            const detail = await biz.collectTasks(filterBatch, userId);
            setQuotaText(`批次配额 ${detail.quota.approved}/${detail.quota.target} · 我:同时 ${detail.userCapacity.active}/${detail.userCapacity.maxConcurrent} · 累计 ${detail.userCapacity.total_submitted}/${detail.userCapacity.maxTotal}`);
            setCanClaim(detail.canClaim && r.items.length > 0);
          } catch { setQuotaText(""); }
        } else {
          setQuotaText("跨批次视图,选择具体批次查看配额");
        }
      } else if (tab === "review") {
        const r = await api.reviewTasks(userId, batchId !== "__all__" ? batchId : undefined);
        setReviewItems(r.items);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [tab, batchId, userId]);

  // 仅在 (tab/batch/user) 变化时拉一次, 不再轮询; 用户点"刷新"按钮主动获取最新
  useEffect(() => { refresh(); }, [refresh]);

  const myReview = useMemo(
    () => reviewItems.filter((i) => i.status === "leased" && i.leased_by === userId),
    [reviewItems, userId],
  );
  const reviewPending = useMemo(
    () => reviewItems.filter((i) => i.status === "pending"),
    [reviewItems],
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* tabs + 批次选择 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
        background: "white", borderBottom: "1px solid #e5e7eb",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          <TabBtn active={tab === "collect"} onClick={() => setTab("collect")}>
            📋 采集 {tab === "collect" && collectItems.length > 0 && `(${collectItems.length})`}
          </TabBtn>
          <TabBtn active={tab === "review"} onClick={() => setTab("review")}>
            🔍 审核 {tab === "review" && reviewPending.length > 0 && `(待 ${reviewPending.length})`}
          </TabBtn>
          <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>
            📜 我的记录 {tab === "mine" && mySubs.length > 0 && `(${mySubs.length})`}
          </TabBtn>
        </div>

        <div style={{ marginLeft: 16, fontSize: 12, color: "#6b7280" }}>批次:</div>
        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          style={{ padding: "5px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, background: "white" }}
        >
          <option value="__all__">全部</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.pipeline_name} / {b.name}</option>
          ))}
        </select>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: "5px 10px", fontSize: 12, cursor: loading ? "default" : "pointer",
            background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6,
          }}
          title="重新拉取列表"
        >
          {loading ? "…" : "↻ 刷新"}
        </button>

        <div style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
          以 <b>{userName(userId)}</b> 身份操作
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "6px 12px", fontSize: 12 }}>
          错误: {error}
        </div>
      )}

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "collect" ? (
          <CollectList items={collectItems} canClaim={canClaim} batchesEmpty={batches.length === 0} batchId={batchId} quotaText={quotaText} />
        ) : tab === "review" ? (
          <ReviewList myReview={myReview} pending={reviewPending} userId={userId} onChanged={refresh} />
        ) : (
          <MyList submissions={mySubs} batchId={batchId} />
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? "#2563eb" : "white",
        color: active ? "white" : "#374151",
        border: `1px solid ${active ? "#2563eb" : "#d1d5db"}`,
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── 采集任务列表 ───
//
// 两种视图:
//   1. "全部" (batchId === "__all__"): 按 batch 分组, 每组带标题. 用户能直观看到
//      "当前哪些批次开放领取 / 各批还剩多少". 不重复在每张卡里贴 batch 名.
//   2. 具体批次 (batchId !== "__all__"): 扁平 grid + 配额条. 给"决定要不要继续在
//      这个批次干活"的视角.
function CollectList({
  items, canClaim, batchesEmpty, batchId, quotaText,
}: {
  items: WorkCollectTask[]; canClaim: boolean; batchesEmpty: boolean; batchId: string; quotaText: string;
}) {
  if (batchId === "__all__" && batchesEmpty) {
    return <Empty>暂无批次,先到管理后台创建。</Empty>;
  }

  if (batchId === "__all__") {
    // 按 batch_id 分组. 顺序按 batch 内最早 item 的 created_at 隐式 (后端已排序).
    const groups = new Map<string, { batchId: string; batchName: string; pipelineName: string; items: WorkCollectTask[] }>();
    for (const it of items) {
      const g = groups.get(it.batch_id);
      if (g) g.items.push(it);
      else groups.set(it.batch_id, {
        batchId: it.batch_id,
        batchName: it.batch_name,
        pipelineName: it.pipeline_name,
        items: [it],
      });
    }
    if (groups.size === 0) return <Empty>没有待采集的任务</Empty>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {[...groups.values()].map((g) => (
          <div key={g.batchId}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              paddingBottom: 6, borderBottom: "1px solid #e5e7eb",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                {g.pipelineName} / {g.batchName}
              </span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>· 待采集 {g.items.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {g.items.map((it) => (
                <CollectCard key={it.id} item={it} compact />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 具体批次视图
  return (
    <div>
      {quotaText && (
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          {quotaText} {!canClaim && <span style={{ color: "#ef4444", marginLeft: 8 }}>已达上限</span>}
        </div>
      )}
      {items.length === 0 ? (
        <Empty>没有待采集的任务</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {items.map((it) => (
            <CollectCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

// compact: 在分组视图里, batch / pipeline 名已经在分组标题展示, 卡片内省略
function CollectCard({ item, compact }: { item: WorkCollectTask; compact?: boolean }) {
  // 只在"我自己上次的提交"被打回时给提示, 别人撞重不应展示给我.
  // 撞重的具体 hash / 审核拒绝理由能在 envelope.outputs 找到, 这里只用 my_last_result 决定要不要显示.
  let rejection: string | null = null;
  if (item.my_last_result === "duplicate") {
    rejection = "你上次提交撞重了,请换数据再试";
  } else if (item.my_last_result === "rejected") {
    const outputs = (item.envelope?.outputs ?? {}) as Record<string, any>;
    let reason = "";
    for (const v of Object.values(outputs)) {
      if (v && typeof v === "object" && v.decision === "rejected" && typeof v.reason === "string") {
        reason = v.reason; break;
      }
    }
    rejection = `你上次提交被审核退回${reason ? `:${reason}` : ""}`;
  }

  return (
    <Link
      to={`/work/collect/${item.id}?batchId=${item.batch_id}`}
      style={{
        textDecoration: "none", color: "inherit",
        background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: 14, display: "block", transition: "all .15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2563eb"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(37,99,235,.1)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace, monospace", marginBottom: 4 }}>
        {item.id.slice(0, 8)}
      </div>
      {!compact && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.pipeline_name}</div>}
      {!compact && <div style={{ fontSize: 12, color: "#6b7280" }}>批次: {item.batch_name}</div>}
      {compact && (
        <div style={{ fontSize: 12, color: "#374151" }}>
          {/* 在分组视图里, 用 payload 的前 1-2 字段当 preview */}
          {(() => {
            const payload = (item.envelope?.payload ?? {}) as Record<string, unknown>;
            const pv = Object.entries(payload).slice(0, 2)
              .map(([k, v]) => `${k}: ${String(v).slice(0, 28)}`).join(" · ");
            return pv || "(无 payload 预览)";
          })()}
        </div>
      )}
      {rejection && (
        <div style={{ marginTop: 8, padding: "6px 8px", background: "#fef2f2", color: "#991b1b", fontSize: 11, borderRadius: 4, border: "1px solid #fecaca" }}>
          ⚠ {rejection}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: "#2563eb", fontWeight: 600 }}>开始填写 →</div>
    </Link>
  );
}

// ─── 审核任务列表 ───
function ReviewList({
  myReview, pending, userId, onChanged,
}: {
  myReview: ReviewTaskItem[]; pending: ReviewTaskItem[]; userId: string; onChanged: () => void;
}) {
  const claim = async (runId: string, itemId: string) => {
    try {
      await api.claimRun(runId, userId, 3600);
      onChanged();
      // 跳转到审核页
      window.location.assign(`/work/review/${itemId}`);
    } catch (e: any) {
      alert(e?.message ?? String(e));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 我正在审核 */}
      <Section title={`我正在审核 (${myReview.length})`} empty="当前没有正在审核的任务">
        {myReview.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {myReview.map((it) => (
                <Link
                  key={it.run_id}
                  to={`/work/review/${it.item_id}`}
                  style={{
                    textDecoration: "none", color: "inherit",
                    background: "#eff6ff", border: "1px solid #2563eb", borderRadius: 8,
                    padding: 14, display: "block",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace, monospace" }}>
                    {it.item_id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{it.pipeline_name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>批次: {it.batch_name}</div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>继续审核 →</div>
                </Link>
              ))}
          </div>
        )}
      </Section>

      {/* 待领取审核 */}
      <Section title={`待审核 (${pending.length})`} empty="暂无待审核任务">
        {pending.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {pending.map((it) => {
              const payload = (it.envelope?.payload ?? {}) as Record<string, unknown>;
              const preview = Object.entries(payload).slice(0, 2).map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`).join(" · ");
              return (
                <div key={it.run_id} style={{
                  background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14,
                }}>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "ui-monospace, monospace" }}>
                    {it.item_id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{it.pipeline_name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>批次: {it.batch_name}</div>
                  {preview && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#374151", maxHeight: 40, overflow: "hidden" }}>
                      {preview}
                    </div>
                  )}
                  <button
                    onClick={() => claim(it.run_id, it.item_id)}
                    style={{
                      marginTop: 10, width: "100%", padding: "7px 0",
                      fontSize: 13, background: "#7c3aed", color: "white",
                      border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600,
                    }}
                  >
                    领取审核
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>{title}</div>
      {children ? children : <Empty>{empty}</Empty>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "32px 0" }}>
      {children}
    </div>
  );
}

// ─── 我的提交记录 ───
type MyState =
  | { code: "claimed";   label: string; color: string }
  | { code: "in_flight"; label: string; color: string }
  | { code: "approved";  label: string; color: string }
  | { code: "stored";    label: string; color: string }
  | { code: "rejected";  label: string; color: string }
  | { code: "duplicate"; label: string; color: string }
  | { code: "stuck";     label: string; color: string }
  | { code: "returned";  label: string; color: string };

function classify(s: MySubmission): MyState {
  // current_step 终态优先于 submission.status — 否则 stale claimed (后端没及时
  // 收尾, 历史 bug) 会被错误归为 "我正在做" 让用户点"继续"触发新一轮 claim.
  if (s.current_step === "stuck") return { code: "stuck",   label: "流程卡住",     color: "#dc2626" };
  if (s.current_step === "done")  return { code: "stored",  label: "已入库",       color: "#059669" };
  if (s.status === "claimed")  return { code: "claimed",   label: "我正在做",      color: "#1d4ed8" };
  if (s.status === "returned") return { code: "returned",  label: "我已放弃",      color: "#9ca3af" };
  // submitted 起
  if (s.result === "approved" && s.dataset_at) return { code: "stored", label: "已入库", color: "#059669" };
  if (s.result === "approved")  return { code: "approved",  label: "审核通过",     color: "#059669" };
  if (s.result === "rejected")  return { code: "rejected",  label: "审核退回",     color: "#dc2626" };
  if (s.result === "duplicate") return { code: "duplicate", label: "撞重退回",     color: "#dc2626" };
  // submitted 但还在中间步
  return { code: "in_flight", label: `进行中: ${s.current_step}`, color: "#f59e0b" };
}

const TERMINAL_CODES: MyState["code"][] = ["stored", "approved", "rejected", "duplicate", "returned", "stuck"];

function MyList({ submissions, batchId }: { submissions: MySubmission[]; batchId: string }) {
  // 1. 批次过滤 (batchId="__all__" 不过滤)
  const filtered = batchId === "__all__"
    ? submissions
    : submissions.filter((s) => s.batch_id === batchId);

  // 2. 进行中 vs 终态
  const inFlight = filtered.filter((s) => !TERMINAL_CODES.includes(classify(s).code));
  const finished = filtered.filter((s) =>  TERMINAL_CODES.includes(classify(s).code));

  if (filtered.length === 0) {
    return <Empty>{batchId === "__all__" ? "你还没有提交过任何任务" : "本批次没有你的提交记录"}</Empty>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Section title={`进行中 (${inFlight.length})`} empty="暂无进行中的任务">
        {inFlight.length > 0 ? <SubmissionTable rows={inFlight} /> : null}
      </Section>
      <Section title={`已完成 / 终态 (${finished.length})`} empty="暂无已完成任务">
        {finished.length > 0 ? <SubmissionTable rows={finished} /> : null}
      </Section>
    </div>
  );
}

function SubmissionTable({ rows }: { rows: MySubmission[] }) {
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th style={cellTh()}>项目</th>
            <th style={cellTh()}>批次</th>
            <th style={cellTh()}>步骤</th>
            <th style={cellTh()}>状态</th>
            <th style={cellTh()}>更新时间</th>
            <th style={cellTh()}>详情</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const state = classify(s);
            return (
              <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={cellTd()}>{s.pipeline_name}</td>
                <td style={cellTd()}>{s.batch_name}</td>
                <td style={{ ...cellTd(), color: "#6b7280", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                  {s.step_key}
                </td>
                <td style={cellTd()}>
                  <StatePill color={state.color}>{state.label}</StatePill>
                  {s.result_reason && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      理由: {s.result_reason}
                    </div>
                  )}
                </td>
                <td style={{ ...cellTd(), color: "#6b7280", fontSize: 12 }}>
                  {new Date(s.updated_at).toLocaleString("zh-CN")}
                </td>
                <td style={cellTd()}>
                  {state.code === "claimed" ? (
                    <Link to={`/work/collect/${s.item_id}?batchId=${s.batch_id}`} style={{ color: "#2563eb", textDecoration: "none", fontSize: 12 }}>
                      继续 →
                    </Link>
                  ) : (
                    <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                      {s.item_id.slice(0, 8)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatePill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: `${color}1A`,
      color,
      border: `1px solid ${color}33`,
    }}>
      {children}
    </span>
  );
}

function cellTh(): React.CSSProperties { return { textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#6b7280" }; }
function cellTd(): React.CSSProperties { return { padding: "10px 14px", verticalAlign: "top" }; }
