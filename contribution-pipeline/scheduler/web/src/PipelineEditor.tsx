import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import { api, type Layout, type NodeDef, type PipelineFull, type RouteAction, type Routes, type StepConfig } from "./api";
import { StepNode, type StepNodeData } from "./StepNode";
import { SchemaForm, type RJSFSchema, type UiSchema } from "./schema-form";
import { CodeEditor } from "./components/CodeEditor";

const nodeTypes = { stepNode: StepNode };

interface Props {
  pipeline: PipelineFull;
  nodeDefs: NodeDef[];
  onSaved: () => void;
  liveCurrentStep?: string | null;
  liveStuck?: boolean;
  /** 自定义保存目标. 默认走 api.updatePipeline (修改项目 pipeline). */
  saveAdapter?: (data: { name: string; steps: StepConfig[]; layout: Layout }) => Promise<void>;
  /** 提供时, 工具栏出现"另存为模板"按钮; 用于项目 pipeline 反向 fork 出模板 */
  onSaveAsTemplate?: (data: { name: string; steps: StepConfig[]; layout: Layout }) => Promise<void>;
}

interface InspectorState {
  selected: string | null;
}

export function PipelineEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({ pipeline, nodeDefs, onSaved, liveCurrentStep, liveStuck, saveAdapter, onSaveAsTemplate }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [rfInst, setRfInst] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<StepNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepConfig[]>(pipeline.steps);
  const [name, setName] = useState(pipeline.name);
  const [dirty, setDirty] = useState(false);

  // 初始化 / 切换 pipeline 时,从 steps + layout 渲染
  useEffect(() => {
    setName(pipeline.name);
    setSteps(pipeline.steps);
    setDirty(false);
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
          },
        } as Node<StepNodeData>;
      }),
    );
    setEdges(
      pipeline.steps.slice(0, -1).map((s, i) => ({
        id: `e:${s.key}->${pipeline.steps[i + 1].key}`,
        source: s.key,
        target: pipeline.steps[i + 1].key,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        style: { stroke: "#94a3b8" },
      })),
    );
  }, [pipeline.task_id, nodeDefs, setNodes, setEdges]);

  // selected / live 状态注入到节点 data
  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) => ({
        ...n,
        data: {
          ...n.data,
          selected: n.id === selected,
          liveCurrent: liveCurrentStep === n.id,
          liveStuck: liveStuck && liveCurrentStep === "stuck" && false, // stuck 时没有具体节点,做整体提示
        },
      })),
    );
  }, [selected, liveCurrentStep, liveStuck, setNodes]);

  const onConnect = useCallback(
    (c: Connection) => {
      setEdges((es) =>
        addEdge(
          { ...c, markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" }, style: { stroke: "#94a3b8" } },
          es,
        ),
      );
      setDirty(true);
    },
    [setEdges],
  );

  // 拖入新节点
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeKey = e.dataTransfer.getData("application/x-node-key");
      if (!nodeKey || !rfInst || !wrap.current) return;
      const def = nodeDefs.find((d) => d.key === nodeKey);
      if (!def) return;
      const bounds = wrap.current.getBoundingClientRect();
      const pos = rfInst.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      const baseKey = def.key;
      const existing = nodes.filter((n) => n.data.nodeKey === baseKey).length;
      const stepKey = existing === 0 ? baseKey : `${baseKey}-${existing + 1}`;
      const newStep: StepConfig = {
        key: stepKey,
        nodeKey: def.key,
        nodeVersion: def.version,
        label: def.display_name,
        params: defaultsFromSchema(def.params_schema),
      };
      setSteps((ss) => [...ss, newStep]);
      setNodes((ns) => [
        ...ns,
        {
          id: stepKey,
          type: "stepNode",
          position: pos,
          data: {
            label: def.display_name,
            stepKey,
            nodeKey: def.key,
            manual: def.manual,
            selected: false,
          },
        } as Node<StepNodeData>,
      ]);
      setDirty(true);
    },
    [rfInst, nodeDefs, nodes, setNodes],
  );

  // 把当前 nodes / edges / steps 收成可保存的 (steps, layout)
  const composeSnapshot = (): { steps: StepConfig[]; layout: Layout } | null => {
    const sortedKeys = topoOrder(nodes.map((n) => n.id), edges);
    if (!sortedKeys) {
      alert("图中存在环或多分支起点,无法保存");
      return null;
    }
    const stepByKey = new Map(steps.map((s) => [s.key, s]));
    const newSteps = sortedKeys.map((k) => stepByKey.get(k)).filter((s): s is StepConfig => !!s);
    const layout = {
      positions: Object.fromEntries(nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }])),
    };
    return { steps: newSteps, layout };
  };

  const handleSave = async () => {
    const snap = composeSnapshot();
    if (!snap) return;
    const payload = { name, steps: snap.steps, layout: snap.layout };
    if (saveAdapter) {
      await saveAdapter(payload);
    } else {
      await api.updatePipeline(pipeline.task_id, payload);
    }
    setSteps(snap.steps);
    setDirty(false);
    onSaved();
  };

  const handleSaveAsTemplate = async () => {
    if (!onSaveAsTemplate) return;
    const snap = composeSnapshot();
    if (!snap) return;
    const tplName = prompt("模板名称?", `${name} (模板)`);
    if (!tplName?.trim()) return;
    try {
      await onSaveAsTemplate({ name: tplName.trim(), steps: snap.steps, layout: snap.layout });
      alert(`模板 "${tplName.trim()}" 已保存`);
    } catch (e: any) {
      alert(`保存模板失败: ${e?.message ?? String(e)}`);
    }
  };

  const selectedStep = selected ? steps.find((s) => s.key === selected) : null;

  const updateStep = (key: string, patch: Partial<StepConfig>) => {
    setSteps((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    if (patch.label) {
      setNodes((ns) =>
        ns.map((n) => (n.id === key ? { ...n, data: { ...n.data, label: patch.label! } } : n)),
      );
    }
    setDirty(true);
  };

  const deleteStep = (key: string) => {
    setSteps((ss) => ss.filter((s) => s.key !== key));
    setNodes((ns) => ns.filter((n) => n.id !== key));
    setEdges((es) => es.filter((e) => e.source !== key && e.target !== key));
    setSelected(null);
    setDirty(true);
  };

  return (
    <div className="workspace">
      <div className="palette">
        <h3>节点类型</h3>
        {nodeDefs.map((d) => (
          <div
            key={d.key}
            className="palette-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-node-key", d.key);
              e.dataTransfer.effectAllowed = "move";
            }}
          >
            {d.display_name}
            {d.manual && <span className="badge manual">人工</span>}
          </div>
        ))}
        <div style={{ marginTop: 16, fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>
          拖拽到画布添加节点;<br />
          连线 = 默认下一站;<br />
          点击节点配置参数 / 路由
        </div>
      </div>

      <div className="canvas" ref={wrap} onDrop={onDrop} onDragOver={onDragOver}>
        <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10, display: "flex", gap: 6 }}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
          />
          <button
            onClick={handleSave}
            disabled={!dirty}
            style={{
              padding: "4px 12px",
              background: dirty ? "#2563eb" : "#9ca3af",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: dirty ? "pointer" : "not-allowed",
              fontSize: 13,
            }}
          >
            {dirty ? "保存" : "已保存"}
          </button>
          {onSaveAsTemplate && (
            <button
              onClick={handleSaveAsTemplate}
              style={{
                padding: "4px 12px", background: "white", color: "#2563eb",
                border: "1px solid #2563eb", borderRadius: 4, cursor: "pointer", fontSize: 13,
              }}
            >
              另存为模板
            </button>
          )}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            if (changes.some((c) => c.type === "remove" || c.type === "add")) setDirty(true);
          }}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelected(n.id)}
          onPaneClick={() => setSelected(null)}
          onNodeDragStop={() => setDirty(true)}
          onInit={setRfInst}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-white" />
        </ReactFlow>
      </div>

      <div className="inspector">
        {selectedStep ? (
          <Inspector
            step={selectedStep}
            nodeDef={nodeDefs.find((d) => d.key === selectedStep.nodeKey)}
            onChange={(p) => updateStep(selectedStep.key, p)}
            onDelete={() => deleteStep(selectedStep.key)}
            allKeys={steps.map((s) => s.key).filter((k) => k !== selectedStep.key)}
            upstreamSteps={steps.slice(0, steps.findIndex((s) => s.key === selectedStep.key))}
          />
        ) : (
          <div style={{ color: "#9ca3af" }}>点击节点查看 / 编辑配置</div>
        )}
      </div>
    </div>
  );
}

const KNOWN_OUTCOMES: Record<string, string[]> = {
  dedup: ["keep", "duplicate"],
  review: ["approved", "rejected"],
};

function RoutesEditor({
  nodeKey,
  routes,
  allKeys,
  onChange,
}: {
  nodeKey: string;
  routes: Routes | undefined;
  allKeys: string[];
  onChange: (r: Routes | undefined) => void;
}) {
  const outcomes = KNOWN_OUTCOMES[nodeKey] ?? [];
  if (outcomes.length === 0) return null;

  const cases = (routes?.cases ?? {}) as Record<string, RouteAction>;

  function setCase(outcome: string, raw: string, maxLoops: number) {
    let action: RouteAction;
    if (raw === "next") action = "next";
    else if (raw === "done") action = "done";
    else action = { goto: raw, maxLoops };
    onChange({ on: "decision", cases: { ...cases, [outcome]: action } });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {outcomes.map((outcome) => {
        const action = cases[outcome];
        let selectVal: string;
        let maxLoops = 1;
        if (!action || action === "next") {
          selectVal = "next";
        } else if (action === "done") {
          selectVal = "done";
        } else if (typeof action === "object" && "goto" in action) {
          selectVal = action.goto;
          maxLoops = action.maxLoops ?? 1;
        } else {
          selectVal = "next";
        }
        const isGoto = selectVal !== "next" && selectVal !== "done";
        const tagColor =
          outcome === "approved" || outcome === "keep"
            ? { bg: "#dcfce7", fg: "#166534" }
            : { bg: "#fee2e2", fg: "#991b1b" };
        return (
          <div key={outcome} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                minWidth: 72,
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                background: tagColor.bg,
                color: tagColor.fg,
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              {outcome}
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>→</span>
            <select
              value={selectVal}
              onChange={(e) => setCase(outcome, e.target.value, maxLoops)}
              style={{
                flex: 1,
                fontSize: 12,
                padding: "3px 6px",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                minWidth: 100,
              }}
            >
              <option value="next">下一步 (next)</option>
              <option value="done">结束 (done)</option>
              {allKeys.map((k) => (
                <option key={k} value={k}>
                  回到: {k}
                </option>
              ))}
            </select>
            {isGoto && (
              <>
                <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>最多</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxLoops}
                  onChange={(e) => setCase(outcome, selectVal, Number(e.target.value) || 1)}
                  style={{
                    width: 44,
                    fontSize: 12,
                    padding: "3px 4px",
                    border: "1px solid #d1d5db",
                    borderRadius: 4,
                  }}
                />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>次</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Inspector({
  step,
  nodeDef,
  onChange,
  onDelete,
  allKeys,
  upstreamSteps,
}: {
  step: StepConfig;
  nodeDef: NodeDef | undefined;
  onChange: (patch: Partial<StepConfig>) => void;
  onDelete: () => void;
  allKeys: string[];
  // 当前 step 之前的所有 step (按 pipeline 顺序). review 用它选 reviewedStepKey
  upstreamSteps: StepConfig[];
}) {
  const [paramsText, setParamsText] = useState(JSON.stringify(step.params, null, 2));
  const [routesText, setRoutesText] = useState(step.routes ? JSON.stringify(step.routes, null, 2) : "");
  const [paramsErr, setParamsErr] = useState<string | null>(null);
  const [routesErr, setRoutesErr] = useState<string | null>(null);
  const [previewValue, setPreviewValue] = useState<Record<string, unknown>>({});
  const [schemaTab, setSchemaTab] = useState<"fields" | "preview" | "json">("fields");
  const [schemaText, setSchemaText] = useState<string>("");
  const [schemaErr, setSchemaErr] = useState<string | null>(null);

  const params = (step.params ?? {}) as Record<string, unknown>;
  const formSchema = params.schema as RJSFSchema | undefined;
  const formUiSchema = params.uiSchema as UiSchema | undefined;
  const isFormIngest =
    step.nodeKey === "ingest" && params.source === "form" && !!formSchema;
  const isReviewWithSchema = step.nodeKey === "review" && !!formSchema;
  const showSchemaPanel = isFormIngest || isReviewWithSchema;

  // nodeDef.params_schema 声明 script 字段 → 此节点是"脚本节点", 给独立 CM6 JS 编辑器.
  // 与 params textarea 双向同步: CM6 改 → 自己 set paramsText; textarea 改 → params.script 变 → CM6 value 跟随
  const hasScriptField = !!((nodeDef?.params_schema as any)?.properties?.script);
  const scriptValue = typeof params.script === "string" ? params.script : "";

  useEffect(() => {
    setParamsText(JSON.stringify(step.params, null, 2));
    setRoutesText(step.routes ? JSON.stringify(step.routes, null, 2) : "");
    setPreviewValue({});
    setSchemaText(
      formSchema ? JSON.stringify({ schema: formSchema, uiSchema: formUiSchema ?? {} }, null, 2) : "",
    );
    setSchemaErr(null);
  }, [step.key]);

  return (
    <div>
      <h3>{step.label ?? step.nodeKey}</h3>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
        节点类型: <b>{step.nodeKey}</b>
        {nodeDef?.manual && <span className="badge manual" style={{ marginLeft: 6 }}>人工</span>}
      </div>

      <div className="field">
        <label>显示名 (label)</label>
        <input value={step.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} />
      </div>

      <div className="field">
        <label>step.key (在 pipeline 内唯一)</label>
        <input value={step.key} disabled />
      </div>

      <div className="field">
        <label>params (JSON)</label>
        <textarea
          rows={6}
          value={paramsText}
          onChange={(e) => {
            setParamsText(e.target.value);
            try {
              const v = JSON.parse(e.target.value);
              onChange({ params: v });
              setParamsErr(null);
            } catch (err) {
              setParamsErr(String((err as Error).message));
            }
          }}
        />
        {paramsErr && <div style={{ color: "#ef4444", fontSize: 11 }}>{paramsErr}</div>}
      </div>

      {hasScriptField && (
        <div className="field">
          <label>params.script (JavaScript)</label>
          <CodeEditor
            language="javascript"
            value={scriptValue}
            onChange={(v) => {
              // CM6 改 → 同步 step.params.script + 重算 paramsText (让 textarea 跟住)
              const newParams = { ...params, script: v };
              onChange({ params: newParams });
              setParamsText(JSON.stringify(newParams, null, 2));
              setParamsErr(null);
            }}
            minHeight={200}
            maxHeight={520}
          />
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            脚本里可访问 payload / outputs / tags / params 四个 globals, return 一个对象作为 step output.
            写完去节点管理 → script@1.0 → 调试 dry-run 验证.
          </div>
        </div>
      )}

      {step.nodeKey === "review" && (
        <div className="field">
          <label style={{ fontWeight: 600, fontSize: 13 }}>审核来源步骤 (reviewedStepKey)</label>
          <select
            value={(params.reviewedStepKey as string | undefined) ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              const newParams = { ...(step.params as Record<string, unknown>) };
              if (next) newParams.reviewedStepKey = next;
              else delete newParams.reviewedStepKey;
              onChange({ params: newParams });
              setParamsText(JSON.stringify(newParams, null, 2));
            }}
            style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, background: "white" }}
          >
            <option value="">— 请选择 —</option>
            {upstreamSteps.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label ? `${s.label} (${s.key})` : s.key}
              </option>
            ))}
          </select>
          {!params.reviewedStepKey && (
            <div style={{ color: "#b45309", fontSize: 11, marginTop: 4 }}>
              ⚠ 未配置. 审核页将无法定位上游表单数据
            </div>
          )}
          {upstreamSteps.length === 0 && (
            <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>
              当前 step 之前还没有其他 step, 把它放到流程后面再配
            </div>
          )}
        </div>
      )}

      {showSchemaPanel && formSchema && (
        <div className="field">
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13 }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                color: "#6b7280",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M9 13l-2 2 2 2" />
                <path d="M15 13l2 2-2 2" />
              </svg>
            </span>
            {isReviewWithSchema ? "审核视图 Schema" : "表单 Schema"}
          </label>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
              background: "white",
            }}
          >
            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
              <SchemaTab active={schemaTab === "fields"} onClick={() => setSchemaTab("fields")}>
                字段
              </SchemaTab>
              <SchemaTab active={schemaTab === "preview"} onClick={() => setSchemaTab("preview")}>
                <span style={{ marginRight: 4 }}>👁</span>表单预览
              </SchemaTab>
              <SchemaTab active={schemaTab === "json"} onClick={() => setSchemaTab("json")}>
                JSON
              </SchemaTab>
            </div>
            <div style={{ padding: 12 }}>
              {schemaTab === "fields" && <FieldsView schema={formSchema} uiSchema={formUiSchema} />}
              {schemaTab === "preview" && (
                <>
                  <SchemaForm
                    schema={formSchema}
                    uiSchema={formUiSchema}
                    value={previewValue}
                    onChange={setPreviewValue}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setPreviewValue({})}
                      style={{
                        padding: "3px 8px",
                        border: "1px solid #d1d5db",
                        background: "white",
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      重置
                    </button>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>仅预览,不会真的投递</span>
                  </div>
                </>
              )}
              {schemaTab === "json" && (
                <>
                  <textarea
                    rows={14}
                    value={schemaText}
                    onChange={(e) => {
                      setSchemaText(e.target.value);
                      try {
                        const parsed = JSON.parse(e.target.value);
                        const nextSchema = parsed?.schema;
                        const nextUi = parsed?.uiSchema;
                        if (!nextSchema || typeof nextSchema !== "object") {
                          throw new Error("顶层必须包含 schema 对象");
                        }
                        const newParams: Record<string, unknown> = {
                          ...(step.params as Record<string, unknown>),
                          schema: nextSchema,
                        };
                        if (nextUi && typeof nextUi === "object" && Object.keys(nextUi).length > 0) {
                          newParams.uiSchema = nextUi;
                        } else {
                          delete newParams.uiSchema;
                        }
                        onChange({ params: newParams });
                        setParamsText(JSON.stringify(newParams, null, 2));
                        setSchemaErr(null);
                      } catch (err) {
                        setSchemaErr(String((err as Error).message));
                      }
                    }}
                    style={{
                      width: "100%",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: 11,
                      padding: 8,
                      border: "1px solid #e5e7eb",
                      borderRadius: 4,
                      boxSizing: "border-box",
                    }}
                  />
                  {schemaErr && (
                    <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{schemaErr}</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="field">
        <label>拒绝路由</label>
        {KNOWN_OUTCOMES[step.nodeKey] ? (
          <RoutesEditor
            nodeKey={step.nodeKey}
            routes={step.routes}
            allKeys={allKeys}
            onChange={(r) => {
              onChange({ routes: r });
              setRoutesText(r ? JSON.stringify(r, null, 2) : "");
            }}
          />
        ) : (
          <>
            <textarea
              rows={4}
              placeholder='{"on":"decision","cases":{"approved":"next","rejected":{"goto":"translate","maxLoops":2}}}'
              value={routesText}
              onChange={(e) => {
                setRoutesText(e.target.value);
                const t = e.target.value.trim();
                if (!t) {
                  onChange({ routes: undefined });
                  setRoutesErr(null);
                  return;
                }
                try {
                  onChange({ routes: JSON.parse(t) });
                  setRoutesErr(null);
                } catch (err) {
                  setRoutesErr(String((err as Error).message));
                }
              }}
            />
            {routesErr && <div style={{ color: "#ef4444", fontSize: 11 }}>{routesErr}</div>}
          </>
        )}
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
          可跳转的 step.key: {allKeys.join(", ") || "(无)"}
        </div>
      </div>

      <button className="delete-btn" onClick={onDelete}>
        删除节点
      </button>
    </div>
  );
}

function SchemaTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 12px",
        border: "none",
        borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
        background: "transparent",
        color: active ? "#1d4ed8" : "#6b7280",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

function FieldsView({ schema, uiSchema }: { schema: RJSFSchema; uiSchema?: UiSchema }) {
  const props = (schema.properties ?? {}) as Record<string, RJSFSchema>;
  const required = new Set((schema.required ?? []) as string[]);
  const entries = Object.entries(props);
  if (entries.length === 0) {
    return <div style={{ fontSize: 12, color: "#9ca3af" }}>没有字段</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {entries.map(([key, field], i) => {
        const ct = controlType(field, (uiSchema?.[key] ?? {}) as Record<string, unknown>);
        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 4px",
              borderTop: i === 0 ? "none" : "1px solid #f3f4f6",
              gap: 8,
              fontSize: 13,
            }}
          >
            <code style={{ color: "#3b82f6", fontWeight: 500, fontFamily: "ui-monospace, monospace" }}>
              {key}
            </code>
            <span style={{ color: "#9ca3af" }}>·</span>
            <span style={{ flex: 1, color: "#374151" }}>{field.title ?? key}</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                background: "#f3f4f6",
                borderRadius: 4,
                color: "#6b7280",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {ct}
            </span>
            {required.has(key) && (
              <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 4 }}>必填</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function controlType(field: RJSFSchema, ui: Record<string, unknown>): string {
  const widget = ui["ui:widget"] as string | undefined;
  if (widget) return widget;
  const f = field as any;
  if (f.type === "array") return "tags";
  if (f.format === "image-upload" || f.format === "image") return "image-upload";
  if (Array.isArray(f.oneOf) && f.oneOf.length > 0) return "select";
  if (Array.isArray(f.enum) && f.enum.length > 0) return "select";
  if (f.type === "boolean") return "checkbox";
  if (f.type === "number" || f.type === "integer") return "number";
  if (f.type === "string") return "text";
  return f.type ?? "text";
}

function defaultsFromSchema(schema: any): Record<string, unknown> {
  const props = schema?.properties ?? {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries<any>(props)) {
    if (v?.default !== undefined) out[k] = v.default;
    else if (v?.enum?.length) out[k] = v.enum[0];
  }
  return out;
}

function topoOrder(nodes: string[], edges: Edge[]): string[] | null {
  const indeg = new Map<string, number>(nodes.map((n) => [n, 0]));
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    if (!indeg.has(e.target) || !adj.has(e.source)) continue;
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    adj.get(e.source)!.push(e.target);
  }
  const order: string[] = [];
  const queue = nodes.filter((n) => (indeg.get(n) ?? 0) === 0);
  while (queue.length) {
    const v = queue.shift()!;
    order.push(v);
    for (const w of adj.get(v) ?? []) {
      const d = (indeg.get(w) ?? 0) - 1;
      indeg.set(w, d);
      if (d === 0) queue.push(w);
    }
  }
  if (order.length !== nodes.length) return null;
  return order;
}
