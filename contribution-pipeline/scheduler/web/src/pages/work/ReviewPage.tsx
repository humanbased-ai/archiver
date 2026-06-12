import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, biz, type ItemDetail, type StepConfig } from "../../api";
import { SchemaForm } from "../../schema-form";
import { useCurrentUser } from "../../users";

const DEFAULT_REJECT_REASON = "内容质量不符合要求";

export default function ReviewPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { userId } = useCurrentUser();

  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [reviewStep, setReviewStep] = useState<StepConfig | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<StepConfig[]>([]);
  const [pipelineName, setPipelineName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(DEFAULT_REJECT_REASON);

  useEffect(() => {
    if (!itemId) return;
    let cancel = false;
    (async () => {
      try {
        const d = await api.getItem(itemId);
        if (cancel) return;
        setDetail(d);
        // 按 item 钉死版本拿 pipeline — 审核必须在原 schema 语义下
        const pipeline = await api.getItemPipeline(itemId);
        if (cancel) return;
        setPipelineName(pipeline.name);
        setPipelineSteps(pipeline.steps);
        const step = pipeline.steps.find((s) => s.key === d.item.current_step);
        setReviewStep(step ?? null);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();
    return () => { cancel = true; };
  }, [itemId]);

  const decide = async (decision: "approved" | "rejected") => {
    if (!itemId) return;
    if (decision === "rejected" && !rejectReason.trim()) {
      setError("请填写拒绝理由");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const batchId = detail?.batch?.id;
      await biz.reviewDecide(itemId, userId, batchId, decision, decision === "rejected" ? rejectReason.trim() : undefined);
      navigate("/work");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  const params = (reviewStep?.params ?? {}) as Record<string, unknown>;
  const schema = params.schema as any;
  const uiSchema = params.uiSchema as any;
  const outputs = (detail?.item.envelope?.outputs ?? {}) as Record<string, unknown>;

  // review step.params.reviewedStepKey 显式声明审核的上游 step.
  // 不再启发式反推 — 之前那套用 schema.properties ∩ outputs[stepKey] 命中找源 step,
  // 模板字段一改就空白; 现在 admin 必须在流程编辑器里选定 "审核来源步骤".
  const reviewedStepKey = (typeof params.reviewedStepKey === "string" && params.reviewedStepKey)
    ? params.reviewedStepKey
    : null;
  const reviewedSrc = pipelineSteps.find((s) => s.key === reviewedStepKey);
  const reviewedRaw = reviewedStepKey ? outputs[reviewedStepKey] : undefined;
  const formValue = (reviewedRaw && typeof reviewedRaw === "object")
    ? (reviewedRaw as Record<string, unknown>)
    : {};
  const sourceLabel = reviewedSrc
    ? `(来自步骤: ${reviewedSrc.label ?? reviewedSrc.key})`
    : "";

  // 配置缺失 / 上游 step 不存在 / 上游还没出 output: 三种异常各给独立提示
  const configError =
    reviewStep && !reviewedStepKey
      ? "此审核步骤未配置 reviewedStepKey, 请管理员到流程编辑器为 review 选定审核来源步骤"
      : reviewStep && reviewedStepKey && !reviewedSrc
        ? `配置的 reviewedStepKey="${reviewedStepKey}" 在当前 pipeline 中不存在 (可能是 step 被删了)`
        : reviewStep && reviewedStepKey && !reviewedRaw
          ? `上游步骤 "${reviewedStepKey}" 还没产生输出, 无法审核 (流程异常, 请联系管理员)`
          : null;

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
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>加载中…</div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                {detail.item.id.slice(0, 8)} · {pipelineName} · 当前步骤: {detail.item.current_step}
              </div>
              <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>审核内容</h2>
            </div>

            {/* 主体: schema 渲染 (只读) 或裸 JSON; 配置异常时直接报错不再瞎猜 */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 10 }}>
                采集结果 <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>{sourceLabel}</span>
              </div>
              {configError ? (
                <div style={{ padding: "10px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13 }}>
                  ⚠ {configError}
                </div>
              ) : schema ? (
                <SchemaForm
                  key={reviewedStepKey ?? "empty"}
                  schema={schema}
                  uiSchema={uiSchema}
                  value={formValue}
                  onChange={() => { /* readonly */ }}
                  readonly
                />
              ) : (
                <pre style={{ background: "#f8fafc", padding: 10, borderRadius: 6, fontSize: 12, overflow: "auto", margin: 0 }}>
                  {JSON.stringify(formValue, null, 2)}
                </pre>
              )}
            </div>

            {/* outputs (前置 step 产物, 例如 dedup hash) */}
            {Object.keys(outputs).length > 0 && (
              <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 10 }}>前置步骤输出</div>
                <pre style={{ background: "#f8fafc", padding: 10, borderRadius: 6, fontSize: 11, overflow: "auto", margin: 0 }}>
                  {JSON.stringify(outputs, null, 2)}
                </pre>
              </div>
            )}

            {/* 决策区 */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                  拒绝理由 (通过时忽略)
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: "100%", fontSize: 13, padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={busy}
                  onClick={() => decide("approved")}
                  style={{
                    flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 600,
                    background: "#059669", color: "white",
                    border: "none", borderRadius: 6, cursor: "pointer",
                  }}
                >
                  ✓ 通过
                </button>
                <button
                  disabled={busy}
                  onClick={() => decide("rejected")}
                  style={{
                    flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 600,
                    background: "#dc2626", color: "white",
                    border: "none", borderRadius: 6, cursor: "pointer",
                  }}
                >
                  ✗ 退回
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
