import { useEffect, useState } from "react";
import ReactFlow, {
  Background,
  MarkerType,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "reactflow";
import { api, type ItemDetail, type Item, type NodeDef, type PipelineFull } from "./api";
import { StepNode, type StepNodeData } from "./StepNode";
import { ItemTape } from "./ItemTape";

const nodeTypes = { stepNode: StepNode };

interface Props {
  pipeline: PipelineFull;
  nodeDefs: NodeDef[];
}

export function ItemRunner({ pipeline, nodeDefs }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [payload, setPayload] = useState<string>(
    JSON.stringify({ text: "Hello, scheduler!" }, null, 2),
  );
  const [queue, setQueue] = useState<{ node_key: string; status: string; n: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [pipeline.task_id]);

  const refresh = async () => {
    try {
      const [it, q] = await Promise.all([api.listItems(pipeline.task_id), api.queueSnapshot()]);
      setItems(it.items);
      setQueue(q.queue);
      if (activeId) {
        const d = await api.getItem(activeId);
        setDetail(d);
      }
    } catch (e) {
      // ignore polling errors
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [pipeline.task_id, activeId]);

  const ingest = async () => {
    setError(null);
    try {
      const p = JSON.parse(payload);
      const r = await api.ingest(pipeline.task_id, p);
      setActiveId(r.itemId);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const liveStep = detail?.item.current_step ?? null;
  const liveStuck = liveStep === "stuck";

  return (
    <div className="runner-pane">
      <div className="runner-left">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>投递新数据</h3>
        <>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            envelope.payload (JSON)
          </div>
          <textarea value={payload} onChange={(e) => setPayload(e.target.value)} />
        </>
        <button className="primary" onClick={ingest} style={{ marginTop: 10 }}>
          ▶ 启动一个 item
        </button>
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</div>}

        <h3 style={{ fontSize: 14, marginTop: 24 }}>队列概览</h3>
        {queue.length === 0 ? (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>队列空</div>
        ) : (
          <div>
            {queue.map((q) => (
              <div
                key={`${q.node_key}-${q.status}`}
                style={{ fontSize: 12, padding: "3px 0", display: "flex", justifyContent: "space-between" }}
              >
                <span>
                  <code style={{ color: "#374151" }}>{q.node_key}</code>{" "}
                  <span style={{ color: q.status === "leased" ? "#92400e" : "#6b7280" }}>
                    [{q.status}]
                  </span>
                </span>
                <b>{q.n}</b>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: 14, marginTop: 24 }}>已投递数据</h3>
        {items.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>暂无</div>}
        {items.map((it) => (
          <div
            key={it.id}
            className={`item-card ${activeId === it.id ? "active" : ""} ${
              it.current_step === "done" ? "done" : ""
            } ${it.current_step === "stuck" ? "stuck" : ""}`}
            onClick={() => setActiveId(it.id)}
          >
            <div className="id">{it.id.slice(0, 8)}</div>
            <div>
              {previewPayload(it.envelope.payload)}
              <span
                className={`stage ${it.current_step === "done" ? "done" : ""} ${
                  it.current_step === "stuck" ? "stuck" : ""
                }`}
              >
                {it.current_step}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="runner-mid">
        <ReactFlowProvider>
          <RunnerCanvas pipeline={pipeline} nodeDefs={nodeDefs} liveStep={liveStep} />
        </ReactFlowProvider>
      </div>

      <div className="runner-right">
        {detail ? (
          <ItemDetailView detail={detail} pipeline={pipeline} onChanged={refresh} />
        ) : (
          <div style={{ color: "#9ca3af", fontSize: 12 }}>
            {activeId ? "加载中..." : "选择左侧 item 查看明细"}
          </div>
        )}
      </div>
    </div>
  );
}

function RunnerCanvas({
  pipeline,
  nodeDefs,
  liveStep,
}: {
  pipeline: PipelineFull;
  nodeDefs: NodeDef[];
  liveStep: string | null;
}) {
  const [nodes, setNodes] = useNodesState<StepNodeData>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  useEffect(() => {
    const positions = pipeline.layout?.positions ?? {};
    setNodes(
      pipeline.steps.map((s, i) => {
        const def = nodeDefs.find((d) => d.key === s.nodeKey);
        const pos = positions[s.key] ?? { x: 100 + i * 220, y: 200 };
        return {
          id: s.key,
          type: "stepNode",
          position: pos,
          data: {
            label: s.label ?? def?.display_name ?? s.nodeKey,
            stepKey: s.key,
            nodeKey: s.nodeKey,
            manual: !!def?.manual,
            selected: false,
            liveCurrent: liveStep === s.key,
            liveStuck: false,
          },
          draggable: false,
        } as Node<StepNodeData>;
      }),
    );
    setEdges(
      pipeline.steps.slice(0, -1).map((s, i) => ({
        id: `e:${s.key}->${pipeline.steps[i + 1].key}`,
        source: s.key,
        target: pipeline.steps[i + 1].key,
        animated: liveStep === s.key,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        style: { stroke: "#94a3b8" },
      })),
    );
  }, [pipeline, nodeDefs, liveStep, setNodes, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#cbd5e1" gap={20} />
    </ReactFlow>
  );
}

function ItemDetailView({
  detail,
  pipeline,
  onChanged,
}: {
  detail: ItemDetail;
  pipeline: PipelineFull;
  onChanged: () => void;
}) {
  const [tapeOpen, setTapeOpen] = useState(false);
  const inflight = detail.inflight[0];

  return (
    <div className="item-detail">
      <div style={{ fontSize: 11, color: "#6b7280" }}>Item ID</div>
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{detail.item.id}</div>

      {detail.batch && (
        <div style={{
          marginTop: 8, padding: "6px 8px", borderRadius: 4,
          background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 11, color: "#1d4ed8",
        }}>
          属于批次「{detail.batch.name}」· 任务领取与提交请到 <b>看板</b> 操作
        </div>
      )}

      <h4>当前阶段</h4>
      <div>
        <span
          className={`stage ${detail.item.current_step === "done" ? "done" : ""} ${
            detail.item.current_step === "stuck" ? "stuck" : ""
          }`}
        >
          {detail.item.current_step}
        </span>
        {detail.item.current_step === "stuck" && (
          <ReplayPanel itemId={detail.item.id} pipeline={pipeline} onDone={onChanged} />
        )}
      </div>

      {inflight && (
        <div style={{ marginTop: 10 }}>
          <h4>
            在飞 run
            <span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280", marginLeft: 6 }}>
              [{inflight.node_key} · {inflight.status}]
              {inflight.leased_by && <> · {inflight.leased_by}</>}
            </span>
          </h4>
          <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
            该页只读。任务认领 / 完成请到看板（人工节点）或交由 worker 自动处理。
          </div>
        </div>
      )}

      <button
        onClick={() => setTapeOpen(true)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "8px",
          background: "#0f172a",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        📜 数据演化时间线 ({detail.history.length})
      </button>

      <h4>Envelope</h4>
      <pre>{JSON.stringify(detail.item.envelope, null, 2)}</pre>

      <h4>历史 ({detail.history.length})</h4>
      <div className="history">
        {detail.history.map((h) => (
          <div key={h.id} className={`history-item ${h.outcome}`}>
            <code>{h.step_key}</code> · attempt {h.attempt} ·{" "}
            <b>{h.outcome}</b>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>
              {new Date(h.finished_at).toLocaleTimeString()}
              {h.error && <span> · {h.error.code ?? "ERR"}</span>}
            </div>
            {h.error?.message && (
              <div
                style={{
                  fontSize: 11,
                  color: "#991b1b",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 4,
                  padding: "4px 6px",
                  marginTop: 4,
                  fontFamily: "ui-monospace, monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {h.error.message}
              </div>
            )}
          </div>
        ))}
      </div>

      {tapeOpen && (
        <ItemTape
          item={detail.item}
          history={detail.history}
          onClose={() => setTapeOpen(false)}
        />
      )}
    </div>
  );
}

function previewPayload(p: Record<string, unknown> | undefined): string {
  if (!p) return "(empty)";
  const candidate =
    (p as any).title ?? (p as any).text ?? (p as any).url ?? (p as any).name;
  if (typeof candidate === "string" && candidate) return candidate.slice(0, 32);
  const json = JSON.stringify(p);
  return json.length > 32 ? json.slice(0, 32) + "…" : json;
}

function ReplayPanel({
  itemId,
  pipeline,
  onDone,
}: {
  itemId: string;
  pipeline: PipelineFull;
  onDone: () => void;
}) {
  const [target, setTarget] = useState(pipeline.steps[0]?.key ?? "");
  return (
    <div style={{ marginTop: 10, padding: 8, background: "#fef2f2", borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: "#991b1b", marginBottom: 6 }}>DLQ 重放</div>
      <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: "100%", marginBottom: 6 }}>
        {pipeline.steps.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label ?? s.key}
          </option>
        ))}
      </select>
      <button
        onClick={async () => {
          await api.replay(itemId, target);
          onDone();
        }}
        style={{ width: "100%", padding: 5, background: "#dc2626", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
      >
        重放到该阶段
      </button>
    </div>
  );
}
