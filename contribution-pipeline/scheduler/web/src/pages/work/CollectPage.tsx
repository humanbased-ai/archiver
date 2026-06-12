import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, biz, type ItemDetail } from "../../api";
import { SchemaForm } from "../../schema-form";
import { useCurrentUser } from "../../users";

export default function CollectPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const [search] = useSearchParams();
  const queryBatch = search.get("batchId") ?? "";
  const navigate = useNavigate();
  const { userId } = useCurrentUser();

  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [stepKey, setStepKey] = useState<string>("");
  const [schema, setSchema] = useState<any>(null);
  const [uiSchema, setUiSchema] = useState<any>({});
  const [formVal, setFormVal] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [pipelineName, setPipelineName] = useState<string>("");
  // 当前用户在该 item 上"上一次结束态" submission 的结果. RejectionHint 完全由它驱动:
  // 别的用户撞重导致 envelope.outputs 留下的痕迹不会渗到我这里. null 表示我没有失败历史.
  const [myLastResult, setMyLastResult] = useState<"duplicate" | "rejected" | "approved" | null>(null);
  const [myLastReason, setMyLastReason] = useState<string | null>(null);

  const loadState = async (id: string, uid: string) => {
    const s = await biz.collectState(id, uid);
    setMyLastResult(s.my_last_result);
    setMyLastReason(s.my_last_reason);
  };

  // 加载 item + 拉对应 pipeline 的 form schema + 我的最近提交结果
  useEffect(() => {
    if (!itemId) return;
    let cancel = false;
    (async () => {
      try {
        const d = await api.getItem(itemId);
        if (cancel) return;
        setDetail(d);
        setStepKey(d.item.current_step);

        // 按 item 钉死版本拿 schema, 不是 pipeline 当前版本 — 防止 admin 改 schema 后
        // 在飞 item 字段错位
        const pipeline = await api.getItemPipeline(itemId);
        if (cancel) return;
        setPipelineName(pipeline.name);
        const step = pipeline.steps.find((s) => s.key === d.item.current_step);
        const params = (step?.params ?? {}) as Record<string, unknown>;
        setSchema(params.schema ?? null);
        setUiSchema(params.uiSchema ?? {});

        await loadState(itemId, userId);
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? String(e));
      }
    })();
    return () => { cancel = true; };
    // userId 变化时也要重拉, 否则切换用户后还看到上一个用户的状态
  }, [itemId, userId]);

  const claim = async () => {
    if (!itemId) return;
    const batchId = resolveBatchId();
    if (!batchId) {
      setError("找不到该 item 所在的 batch");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await biz.claimCollect(itemId, userId, batchId);
      setClaimed(true);
    } catch (e: any) {
      // 已经领过了 → 也允许进入填表
      if (e?.code === "ALREADY_CLAIMING") {
        setClaimed(true);
      } else {
        setError(e?.message ?? String(e));
      }
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!itemId) return;
    setBusy(true);
    setError(null);
    try {
      await biz.submitCollect(itemId, userId, formVal);
      navigate("/work");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  const release = async () => {
    if (!itemId) return;
    if (!confirm("确定放弃此任务?")) return;
    setBusy(true);
    try {
      await biz.releaseCollect(itemId, userId);
      navigate("/work");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  // 重做: 后端把我之前 result IN (duplicate, rejected) 的 submission 行抹掉.
  // claimed 行 (这次进页面 auto-claim 出来的) 不会动 — 留着继续 submit.
  const redo = async () => {
    if (!itemId) return;
    if (!confirm("确定重做? 你之前撞重 / 被退回的提交记录会被清掉, 表单也会清空。")) return;
    setBusy(true);
    setError(null);
    try {
      await biz.redoCollect(itemId, userId);
      setFormVal({});
      await loadState(itemId, userId);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  const resolveBatchId = () => queryBatch || detail?.batch?.id || "";

  // 自动尝试 claim (进页面就申请). 但 stuck/done 的 item 不能 claim:
  //   - 后端业务层会返 ITEM_INACTIVE, 但前端再触发一次也没意义且会闪错
  //   - 用户可能从历史链接 / 我的记录进来, 这时静默把 inactive 状态摆出来
  const itemInactive = detail?.item.current_step === "stuck" || detail?.item.current_step === "done";
  useEffect(() => {
    if (detail && !claimed && !busy && !itemInactive) {
      claim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <Link to="/work" style={{ color: "#6b7280", textDecoration: "none" }}>← 返回任务列表</Link>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 16, border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {!detail ? (
          <Loading />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                {detail.item.id.slice(0, 8)} · {pipelineName} · 当前步骤: {stepKey}
              </div>
              <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>
                {(schema?.title as string) ?? "填写采集表单"}
              </h2>
            </div>

            <RejectionHint
              myLastResult={myLastResult}
              myLastReason={myLastReason}
              outputs={(detail.item.envelope?.outputs ?? {}) as Record<string, any>}
              busy={busy}
              onRedo={redo}
            />

            {itemInactive && (
              <div style={{ padding: "10px 12px", marginBottom: 16, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13 }}>
                ⚠ 该任务{stepKey === "stuck" ? "已卡住" : "已结束"}, 无法继续填写. 请回任务列表选其它.
              </div>
            )}

            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
              {schema ? (
                <SchemaForm schema={schema} uiSchema={uiSchema} value={formVal} onChange={setFormVal} />
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
                    当前步骤未配置 schema, 直接编辑 JSON:
                  </div>
                  <textarea
                    rows={10}
                    value={JSON.stringify(formVal, null, 2)}
                    onChange={(e) => { try { setFormVal(JSON.parse(e.target.value)); } catch { /* noop */ } }}
                    style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: 8, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }}
                  />
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                <button
                  disabled={busy || !claimed}
                  onClick={submit}
                  style={{
                    flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 600,
                    background: !claimed ? "#9ca3af" : "#059669", color: "white",
                    border: "none", borderRadius: 6, cursor: !claimed ? "not-allowed" : "pointer",
                  }}
                >
                  {!claimed ? "领取中…" : "提交"}
                </button>
                <button
                  disabled={busy}
                  onClick={release}
                  style={{
                    padding: "10px 16px", fontSize: 13,
                    background: "white", color: "#374151",
                    border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer",
                  }}
                >
                  放弃
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 仅在 myLastResult ∈ (duplicate, rejected) 时显示提示. 别人撞的重不应该展示给当前用户.
// hash / reason 文本本身仍可从 envelope.outputs 取 (item-global, 没问题), 但"是否展示"只看我.
function RejectionHint({
  myLastResult, myLastReason, outputs, busy, onRedo,
}: {
  myLastResult: "duplicate" | "rejected" | "approved" | null;
  myLastReason: string | null;
  outputs: Record<string, any>;
  busy: boolean;
  onRedo: () => void;
}) {
  if (myLastResult !== "duplicate" && myLastResult !== "rejected") return null;

  // 从 envelope.outputs 翻出最近一条 dedup / review 记录用于展示 hash / reason.
  let hash: string | undefined;
  let envReason: string | undefined;
  for (const v of Object.values(outputs)) {
    if (!v || typeof v !== "object") continue;
    if ((v.deduped === true || v.decision === "duplicate") && typeof v.hash === "string") hash = v.hash;
    if (v.decision === "rejected" && typeof v.reason === "string") envReason = v.reason;
  }
  const isDedup = myLastResult === "duplicate";
  const reason = myLastReason ?? envReason;

  return (
    <div style={{
      padding: "10px 12px", marginBottom: 16, borderRadius: 6,
      background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            ⚠ 你上次提交被退回 ({isDedup ? "去重判定为重复" : "审核退回"})
          </div>
          <div>
            {isDedup ? "请修改字段内容后再提交,避免和已有数据撞重。" : `理由: ${reason ?? "(未填写)"}`}
          </div>
          {isDedup && hash && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#b91c1c", fontFamily: "monospace" }}>
              撞重指纹: {hash}
            </div>
          )}
        </div>
        <button
          onClick={onRedo}
          disabled={busy}
          title="清除上次失败记录, 当成新任务重新填写"
          style={{
            padding: "6px 12px", fontSize: 12, fontWeight: 600,
            background: "white", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6,
            cursor: busy ? "default" : "pointer", whiteSpace: "nowrap",
          }}
        >
          重做
        </button>
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>加载中…</div>;
}
