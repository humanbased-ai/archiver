import { useMemo } from "react";
import type { Attempt, Item } from "./api";

// 一条 item 的"数据演化时间线":把 payload + 一连串 attempts 折叠出每一步前后的 envelope
// 输入:item.envelope.payload (原始) + history (按 finished_at ASC) → 输出每步的 before / after / output

interface Props {
  item: Item;
  history: Attempt[];
  onClose: () => void;
}

interface Frame {
  attempt: Attempt;
  endpoint: string;        // 这一步 worker 调的接口(用于直观说明)
  beforeEnvelope: { payload: any; outputs: Record<string, unknown> };
  afterEnvelope: { payload: any; outputs: Record<string, unknown> };
  changedKeys: string[];   // outputs 这一步新增 / 改变的 stepKey
}

function buildFrames(item: Item, history: Attempt[]): Frame[] {
  const payload = item.envelope?.payload ?? {};
  const outputs: Record<string, unknown> = {};
  const frames: Frame[] = [];

  for (const a of history) {
    const before = { payload, outputs: { ...outputs } };
    const changed: string[] = [];

    if (a.outcome === "success" && a.output && typeof a.output === "object") {
      const key = a.step_key;
      // 调度核心写 envelope.outputs[step_key] = output
      const prev = outputs[key];
      outputs[key] = a.output;
      if (JSON.stringify(prev) !== JSON.stringify(a.output)) changed.push(key);
    }

    const after = { payload, outputs: { ...outputs } };

    frames.push({
      attempt: a,
      endpoint: endpointFor(a),
      beforeEnvelope: before,
      afterEnvelope: after,
      changedKeys: changed,
    });
  }
  return frames;
}

// 演示用:这次 attempt 大致对应了哪个接口被调用
function endpointFor(a: Attempt): string {
  // worker 提交结果的统一入口
  if (a.outcome === "success") return `POST /api/v1/result   (status=success)`;
  if (a.outcome === "failed") return `POST /api/v1/result   (status=failed)`;
  if (a.outcome === "timeout") return `Reconciler 超时回收  (lease 过期)`;
  if (a.outcome === "dlq") return `进入 DLQ (重试用尽)`;
  return `attempt outcome=${a.outcome}`;
}

export function ItemTape({ item, history, onClose }: Props) {
  const frames = useMemo(() => buildFrames(item, history), [item, history]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 800,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          height: "78vh",
          background: "white",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#f9fafb",
          }}
        >
          <strong style={{ fontSize: 14 }}>📜 数据演化时间线</strong>
          <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "ui-monospace, monospace" }}>
            item {item.id.slice(0, 8)} · 当前阶段 {item.current_step} · 共 {frames.length} 次执行
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              padding: "3px 10px",
              border: "1px solid #d1d5db",
              background: "white",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            关闭
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            padding: "16px 16px 24px",
          }}
        >
          {frames.length === 0 ? (
            <div style={{ color: "#9ca3af", padding: 30, textAlign: "center" }}>
              这条 item 还没执行过任何 step
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "stretch", gap: 0, height: "100%" }}>
              {/* 起点:原始 payload */}
              <Stage label="起点 (payload)" tone="origin">
                <Pre obj={{ payload: item.envelope?.payload ?? {}, outputs: {} }} />
              </Stage>
              {frames.map((f, i) => (
                <FrameCol key={f.attempt.id} frame={f} index={i} />
              ))}
              {/* 终点:当前 envelope */}
              <Stage label={`当前 (current_step=${item.current_step})`} tone="current">
                <Pre obj={item.envelope ?? {}} />
              </Stage>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FrameCol({ frame, index }: { frame: Frame; index: number }) {
  const { attempt, endpoint, beforeEnvelope, afterEnvelope, changedKeys } = frame;
  const ok = attempt.outcome === "success";
  const accent = ok ? "#10b981" : attempt.outcome === "failed" ? "#ef4444" : "#f59e0b";

  return (
    <>
      <Arrow />
      <div style={{ minWidth: 360, display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            #{index + 1} · attempt {attempt.attempt}
          </span>
          <span>{new Date(attempt.finished_at).toLocaleTimeString()}</span>
        </div>

        <div
          style={{
            border: `2px solid ${accent}`,
            borderRadius: 8,
            padding: 10,
            background: "white",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <code style={{ fontSize: 12, fontWeight: 600 }}>{attempt.step_key}</code>
            <span
              style={{
                fontSize: 10,
                background: accent,
                color: "white",
                padding: "1px 6px",
                borderRadius: 3,
                textTransform: "uppercase",
              }}
            >
              {attempt.outcome}
            </span>
          </div>

          <Section title="① 调用接口">
            <code style={miniCode}>{endpoint}</code>
          </Section>

          <Section title={ok ? "② 输出 (output)" : "② 错误 (error)"}>
            <Pre obj={ok ? attempt.output : attempt.error} />
          </Section>

          <Section title="③ envelope 变化">
            {ok && changedKeys.length > 0 ? (
              <div style={{ fontSize: 10, color: "#16a34a" }}>
                outputs[<b>{changedKeys.join(", ")}</b>] 写入新值
              </div>
            ) : ok ? (
              <div style={{ fontSize: 10, color: "#9ca3af" }}>无 output, envelope 不变</div>
            ) : (
              <div style={{ fontSize: 10, color: "#9ca3af" }}>失败,envelope 不变</div>
            )}
          </Section>

          <details style={{ marginTop: 4 }}>
            <summary style={{ fontSize: 11, color: "#6b7280", cursor: "pointer" }}>
              展开:执行前 / 后 envelope
            </summary>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={subTitle}>before</div>
                <Pre obj={beforeEnvelope} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={subTitle}>after</div>
                <Pre obj={afterEnvelope} />
              </div>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}

function Stage({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "origin" | "current";
  children: React.ReactNode;
}) {
  const bg = tone === "origin" ? "#eff6ff" : "#f0fdf4";
  const border = tone === "origin" ? "#bfdbfe" : "#bbf7d0";
  return (
    <div
      style={{
        minWidth: 280,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
      <div
        style={{
          border: `2px dashed ${border}`,
          background: bg,
          borderRadius: 8,
          padding: 10,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div
      style={{
        alignSelf: "center",
        margin: "0 6px",
        color: "#9ca3af",
        fontSize: 18,
      }}
    >
      →
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={subTitle}>{title}</div>
      {children}
    </div>
  );
}

const subTitle: React.CSSProperties = {
  fontSize: 10,
  color: "#6b7280",
  textTransform: "uppercase",
  marginBottom: 2,
  letterSpacing: 0.4,
};

const miniCode: React.CSSProperties = {
  fontSize: 10,
  background: "#0f172a",
  color: "#a5f3fc",
  padding: "2px 6px",
  borderRadius: 3,
  display: "inline-block",
  fontFamily: "ui-monospace, monospace",
};

function Pre({ obj }: { obj: unknown }) {
  if (obj === null || obj === undefined) {
    return <span style={{ color: "#9ca3af", fontSize: 11 }}>(空)</span>;
  }
  let text: string;
  try {
    text = JSON.stringify(obj, null, 2);
  } catch {
    text = String(obj);
  }
  return (
    <pre
      style={{
        margin: 0,
        fontSize: 10,
        background: "#0f172a",
        color: "#e5e7eb",
        padding: 6,
        borderRadius: 4,
        overflow: "auto",
        maxHeight: 180,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {text}
    </pre>
  );
}
