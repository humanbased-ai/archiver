import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  type AdminNodeDebugResult,
  type AdminNodeDetail,
  type AdminNodeUsages,
  type NodeExample,
} from "../../api";
import { CodeEditor } from "../../components/CodeEditor";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

// 节点详情 — 06-node-design §8.3 MVP 范围
//   - 概览: 基本信息 + 状态切换 (archive/activate) + 使用示例
//   - 配置协议: paramsSchema / inputsSchema / outputsSchema / uiSchema / presets JSON 展示
//   - 调试: dry-run 面板, 不持久化 case (§8.4); 顶部 supportsDryRun badge
//   - 引用关系: pipelines + 在飞 outbox 计数
// 后续 Tab (版本历史 / 运行监控 / 接入说明) 在 v2 范围, 此处不做.
type Tab = "overview" | "schema" | "debug" | "usages";

// 调试 Tab 初始填充 — example "填入调试"按钮 → setDebugPreset(example) + setTab("debug")
// 节点 paramsSchema 含 script 字段时, 脚本独立编辑, 其余 params 走 JSON 编辑;
// 否则 scriptTxt 为 null, paramsJsonTxt 含全部 params.
interface DebugPreset {
  scriptTxt: string | null;
  paramsJsonTxt: string;
  inputsTxt: string;
  envelopeTxt: string;
}

/** paramsSchema 声明了 string 类型的 script 字段 → 该节点是"脚本节点", 脚本独立编辑器 */
function nodeHasScriptField(paramsSchema: unknown): boolean {
  const props = (paramsSchema as any)?.properties;
  return !!props && typeof props === "object" && props.script && (props.script.type === "string" || props.script.type === undefined);
}

export default function NodeDetailPage() {
  const params = useParams<{ key: string; version: string }>();
  const key = params.key!;
  const version = params.version!;

  const [node, setNode] = useState<AdminNodeDetail | null>(null);
  const [usages, setUsages] = useState<AdminNodeUsages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [debugPreset, setDebugPreset] = useState<DebugPreset | null>(null);
  const [runtime, setRuntime] = useState<{ pending: number; inflight: number; driverRegistered: boolean } | null>(null);

  const applyExample = useCallback((ex: NodeExample) => {
    // example.step.{params,inputs,routes} 中 routes 在 dry-run 不用, 只取 params + inputs.
    // 节点有 script 字段时: 把 params.script 抽到 scriptTxt 独立编辑, 剩下的字段塞 paramsJsonTxt.
    const allParams = ex.step.params ?? {};
    const hasScript = node && nodeHasScriptField(node.params_schema);
    let scriptTxt: string | null = null;
    let restParams: Record<string, unknown> = allParams;
    if (hasScript && typeof (allParams as any).script === "string") {
      const { script, ...rest } = allParams as Record<string, unknown> & { script: string };
      scriptTxt = script;
      restParams = rest;
    }
    setDebugPreset({
      scriptTxt,
      paramsJsonTxt: JSON.stringify(restParams, null, 2),
      inputsTxt:     JSON.stringify(ex.step.inputs ?? {}, null, 2),
      envelopeTxt:   JSON.stringify(ex.envelope ?? { payload: {}, outputs: {}, tags: {} }, null, 2),
    });
    setTab("debug");
  }, [node]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [d, u] = await Promise.all([
        api.adminGetNode(key, version),
        api.adminGetNodeUsages(key, version),
      ]);
      setNode(d.node);
      setUsages(u);
    } catch (e: any) { setError(e?.message ?? String(e)); }
  }, [key, version]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const fetchRuntime = async () => {
      try {
        const r = await api.adminGetNodeRuntime(key, version);
        setRuntime(r);
      } catch { /* ignore */ }
    };
    fetchRuntime();
    const t = setInterval(fetchRuntime, 5000);
    return () => clearInterval(t);
  }, [key, version]);

  const toggleStatus = async () => {
    if (!node) return;
    const isArchive = node.status === "active" || node.status === "paused";
    if (isArchive && usages && usages.pipelines.length > 0) {
      if (!confirm(`${key}@${version} 被 ${usages.pipelines.length} 个 pipeline 引用. archive 后:\n  • 已有 step 仍按 nodeVersion 钉死继续运行\n  • 新 step 无法引用, lease 不再下发\n确认 archive?`)) return;
    }
    try {
      if (isArchive) await api.adminArchiveNode(key, version);
      else           await api.adminActivateNode(key, version);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  const pauseNode = async () => {
    try {
      await api.adminPauseNode(key, version);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  const resumeNode = async () => {
    try {
      await api.adminResumeNode(key, version);
      await reload();
    } catch (e: any) { setError(e?.message ?? String(e)); }
  };

  if (error && !node) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/admin/nodes" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← 节点管理</Link>
        <div style={{ marginTop: 12, padding: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13 }}>{error}</div>
      </div>
    );
  }
  if (!node) {
    return <div style={{ padding: 24, color: "#9ca3af", fontSize: 13 }}>加载中…</div>;
  }

  return (
    <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
      <Link to="/admin/nodes" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← 节点管理</Link>
      <div style={{ display: "flex", alignItems: "center", marginTop: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{node.display_name}</h2>
        <span style={{ marginLeft: 12, fontFamily: "monospace", fontSize: 13, color: "#6b7280" }}>
          {node.key}@{node.version}
        </span>
        <StatusPill status={node.status} style={{ marginLeft: 12 }} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {node.status === "active" && (
            <>
              <button onClick={pauseNode} title="暂停节点 — 停止下发新任务，已在飞任务不受影响"
                      style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, background: "#fef3c7", color: "#92400e", border: "none", borderRadius: 6, cursor: "pointer" }}>
                暂停
              </button>
              <button onClick={toggleStatus} title="归档节点 — 永久下线，新 pipeline 不可引用"
                      style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer" }}>
                归档
              </button>
            </>
          )}
          {node.status === "paused" && (
            <>
              <button onClick={resumeNode} title="启动节点 — 恢复接收新任务"
                      style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>
                启动
              </button>
              <button onClick={toggleStatus} title="归档节点 — 永久下线，新 pipeline 不可引用"
                      style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer" }}>
                归档
              </button>
            </>
          )}
          {node.status === "archived" && (
            <button onClick={toggleStatus} title="激活节点 — 重新上线，可被新 pipeline 引用"
                    style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, background: "#dcfce7", color: "#166534", border: "none", borderRadius: 6, cursor: "pointer" }}>
              激活
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Tab 切换 */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        {([
          ["overview", "概览"],
          ["schema",   "配置协议"],
          ["debug",    "调试 (dry-run)"],
          ["usages",   `引用关系 (${usages?.pipelines.length ?? 0})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
                  style={{
                    padding: "8px 14px", fontSize: 13, background: "none", border: "none", cursor: "pointer",
                    borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
                    color: tab === t ? "#1d4ed8" : "#6b7280",
                    fontWeight: tab === t ? 600 : 400,
                    marginBottom: -1,
                  }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab node={node} onApplyExample={applyExample} runtime={runtime} />}
      {tab === "schema"   && <SchemaTab   node={node} />}
      {tab === "debug"    && <DebugTab    node={node} preset={debugPreset} />}
      {tab === "usages"   && <UsagesTab   usages={usages} />}
    </div>
  );
}

function OverviewTab({ node, onApplyExample, runtime }: { node: AdminNodeDetail; onApplyExample: (ex: NodeExample) => void; runtime: { pending: number; inflight: number; driverRegistered: boolean } | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 运行状态 panel */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>运行状态</div>
        {runtime == null ? (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>获取中…</span>
        ) : (
          <>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
              background: runtime.driverRegistered ? "#dcfce7" : "#f3f4f6",
              color: runtime.driverRegistered ? "#166534" : "#6b7280",
            }}>
              {runtime.driverRegistered ? "驱动已注册" : "无驱动"}
            </span>
            <span style={{ fontSize: 12, color: "#374151" }}>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{runtime.inflight}</b> 条在飞
            </span>
            <span style={{ fontSize: 12, color: "#374151" }}>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{runtime.pending}</b> 条待处理
            </span>
            {node.status === "paused" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#fef9c3", color: "#854d0e" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
                已暂停 — 新 lease 不下发
              </span>
            )}
          </>
        )}
      </div>
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
        <Grid>
          <Cell label="Key">{<code>{node.key}</code>}</Cell>
          <Cell label="Version">{<code>{node.version}</code>}</Cell>
          <Cell label="状态"><StatusPill status={node.status} /></Cell>
          <Cell label="分类">{node.category ?? "—"}</Cell>
          <Cell label="运行方式">{node.run_mode ?? "—"}</Cell>
          <Cell label="人工节点">{node.manual ? "是" : "否"}</Cell>
          <Cell label="幂等">{node.idempotent ? "是" : "否"}</Cell>
          <Cell label="dry-run 安全">
            <DryRunBadge supports={node.supports_dry_run} />
          </Cell>
          <Cell label="默认超时">{node.default_timeout_ms} ms</Cell>
          <Cell label="默认重试上限">{node.default_max_attempts}</Cell>
          <Cell label="最近更新">{new Date(node.updated_at).toLocaleString("zh-CN")}</Cell>
        </Grid>
        {node.description && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>描述</div>
            <div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{node.description}</div>
          </div>
        )}
      </div>

      {/* 使用示例 — driver 自带的 examples */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>使用示例</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
          driver 自带的"如何用"示例 (auto-upsert 写入). 点"填入调试"把 params/inputs/envelope 一键灌进调试面板.
        </div>
        {!node.examples || node.examples.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 12, background: "#fafafa", borderRadius: 4 }}>
            该节点未提供示例 — 在 driver 文件的 nodeDefinition 中补充 examples 字段, 重启 autoworker 触发 auto-upsert.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {node.examples.map((ex, i) => (
              <ExampleCard key={i} ex={ex} onApply={() => onApplyExample(ex)} disabled={!node.supports_dry_run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleCard({ ex, onApply, disabled }: { ex: NodeExample; onApply: () => void; disabled: boolean }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 12, background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{ex.title}</div>
        <button onClick={onApply} disabled={disabled}
                title={disabled ? "节点未声明 supportsDryRun, 不能 dry-run" : "把这条示例的 params/inputs/envelope 灌进调试面板"}
                style={{
                  marginLeft: "auto",
                  padding: "3px 10px", fontSize: 11,
                  background: disabled ? "#e5e7eb" : "#2563eb",
                  color: disabled ? "#9ca3af" : "white",
                  border: "none", borderRadius: 4,
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}>
          填入调试
        </button>
      </div>
      {ex.description && (
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{ex.description}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <ExampleBlock title="step.params" data={ex.step.params} />
        <ExampleBlock title="step.inputs" data={ex.step.inputs} />
      </div>
      {ex.envelope && (
        <div style={{ marginTop: 8 }}>
          <ExampleBlock title="envelope (求值上下文)" data={ex.envelope} />
        </div>
      )}
    </div>
  );
}

function ExampleBlock({ title, data }: { title: string; data: unknown }) {
  const text = data == null || (typeof data === "object" && Object.keys(data as object).length === 0)
    ? "{}"
    : JSON.stringify(data, null, 2);
  return (
    <div>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>{title}</div>
      <pre style={{
        margin: 0, padding: 8, background: "white",
        border: "1px solid #e5e7eb", borderRadius: 4,
        fontSize: 11, fontFamily: "ui-monospace, monospace",
        overflow: "auto", maxHeight: 120,
      }}>{text}</pre>
    </div>
  );
}

function DryRunBadge({ supports }: { supports: boolean }) {
  return supports ? (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
      background: "#dcfce7", color: "#166534",
    }} title="driver 承诺: dry-run 时跳过持久化/外网调用, 返回 mock output">
      ✓ safe
    </span>
  ) : (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
      background: "#fee2e2", color: "#991b1b",
    }} title="driver 未声明 supportsDryRun: dry-run 仍可能触发真实副作用 (写库 / 打外网)">
      ⚠ unsafe
    </span>
  );
}

function SchemaTab({ node }: { node: AdminNodeDetail }) {
  // 4 份 schema + presets, 都直接 JSON 展示. 可视化预览见 §8.3 v2, 此处不做.
  const blocks: { title: string; subtitle: string; data: unknown }[] = [
    { title: "paramsSchema",  subtitle: "step.params 的 JSON Schema, 保存时按 required + 类型校验",            data: node.params_schema },
    { title: "inputsSchema",  subtitle: "运行时入参契约; defaultBinding 给 lease 兜底",                          data: node.inputs_schema },
    { title: "outputsSchema", subtitle: "节点输出说明 (只展示, 调度核心不校验), 给下游 step 的 binding picker 用", data: node.outputs_schema },
    { title: "uiSchema",      subtitle: "编辑器渲染 — groups 分组 / fields 控件",                                data: node.ui_schema },
    { title: "presets",       subtitle: "节点作者预设 — defaults / constants / pin / secrets",                  data: node.presets },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {blocks.map((b) => (
        <div key={b.title} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{b.title}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{b.subtitle}</div>
          <JsonBlock data={b.data} />
        </div>
      ))}
    </div>
  );
}

function DebugTab({ node, preset }: { node: AdminNodeDetail; preset: DebugPreset | null }) {
  // dry-run 面板 — CM6 编辑器版本.
  //   - 节点声明 params.script (paramsSchema.properties.script): 脚本独立 JS 编辑器, 其余 params 用小 JSON 编辑器
  //   - 否则: 单个 params JSON 编辑器即可
  //   - inputs / envelope 都走 JSON 编辑器
  //   - Cmd/Ctrl+Enter 任意编辑器内触发"试运行"
  const hasScript = nodeHasScriptField(node.params_schema);
  const [scriptTxt,    setScriptTxt]    = useState<string>(hasScript ? "return {};" : "");
  const [paramsJsonTxt,setParamsJsonTxt]= useState("{}");
  const [inputsTxt,    setInputsTxt]    = useState("{}");
  const [envelopeTxt,  setEnvelopeTxt]  = useState('{\n  "payload": {},\n  "outputs": {},\n  "tags": {}\n}');
  const [result, setResult] = useState<AdminNodeDebugResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // manual (collect) 节点: formSubmitData = C 端新填写的表单数据, 与 inputs 绑定上下文分离
  const [formSubmitData, setFormSubmitData] = useState<Record<string, unknown>>({});

  // parse params.schema from the params editor; require .properties to be non-empty
  const parsedSchema = useMemo(() => {
    if (!node.manual) return null;
    try {
      const p = JSON.parse(paramsJsonTxt || "{}");
      const s = p.schema;
      if (!s || typeof s !== "object") return null;
      if (!s.properties || typeof s.properties !== "object" || Object.keys(s.properties).length === 0) return null;
      return s as Record<string, unknown>;
    } catch { return null; }
  }, [paramsJsonTxt, node.manual]);

  const parsedUiSchema = useMemo(() => {
    try {
      const p = JSON.parse(paramsJsonTxt || "{}");
      const base = p.uiSchema && typeof p.uiSchema === "object" ? p.uiSchema : {};
      return { ...base, "ui:submitButtonOptions": { norender: true } };
    } catch { return { "ui:submitButtonOptions": { norender: true } }; }
  }, [paramsJsonTxt]);

  // inputs 绑定解析后的上下文 — 随 inputsTxt / envelopeTxt 实时更新, 只读展示
  const resolvedContext = useMemo(() => {
    if (!node.manual) return null;
    const ctx = resolveInputsForForm(inputsTxt, envelopeTxt);
    return Object.keys(ctx).length > 0 ? ctx : null;
  }, [node.manual, inputsTxt, envelopeTxt]);

  useEffect(() => {
    if (preset) {
      if (preset.scriptTxt !== null) setScriptTxt(preset.scriptTxt);
      setParamsJsonTxt(preset.paramsJsonTxt);
      setInputsTxt(preset.inputsTxt);
      setEnvelopeTxt(preset.envelopeTxt);
      setResult(null);
      setErr(null);
      if (node.manual) setFormSubmitData({});
    }
  }, [preset, node.manual]);

  if (!node.supports_dry_run) {
    return (
      <div style={{ background: "white", border: "1px solid #fde68a", color: "#92400e", borderRadius: 8, padding: 20, fontSize: 13 }}>
        该节点未声明 supportsDryRun, dry-run 不适用. 人工节点请在 collect/review 工作台测试.
      </div>
    );
  }

  const run = async () => {
    setBusy(true); setErr(null); setResult(null);
    try {
      const restParams = JSON.parse(paramsJsonTxt || "{}");
      const finalParams = hasScript ? { ...restParams, script: scriptTxt } : restParams;
      // manual 节点: dry-run inputs = context (resolved bindings) 合并用户新输入, 与表单 formData 保持一致
      const parsedInputs   = node.manual
        ? { ...formSubmitData, ...resolveInputsForForm(inputsTxt, envelopeTxt) }
        : JSON.parse(inputsTxt || "{}");
      const parsedEnvelope = JSON.parse(envelopeTxt || "{}");
      const r = await api.adminDebugRunNode(node.key, node.version, {
        params: finalParams, inputs: parsedInputs, envelope: parsedEnvelope,
      });
      setResult(r);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* dry-run 安全提示带 */}
      {node.supports_dry_run ? (
        <div style={{ padding: "8px 12px", background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12 }}>
          <b>✓ dry-run 安全</b> — driver 声明 supportsDryRun=true, 调试时跳过持久化/外网调用, 不影响线上数据.
        </div>
      ) : (
        <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12 }}>
          <b>⚠ dry-run 不安全</b> — driver 未声明 supportsDryRun, 调试可能写库 / 打外网 / 触发计费.
        </div>
      )}

      {/* minmax(0, *) 关键: 不写 minmax 时 grid 列默认 min-content, 长 JSON 会撑爆右列 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: hasScript ? "minmax(0, 1.4fr) minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 12,
      }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>输入</div>
            <span style={{ marginLeft: 8, fontSize: 11, color: "#9ca3af" }}>
              {hasScript ? "脚本里可访问 payload / outputs / tags / params 四个 globals · " : ""}⌘/Ctrl + Enter 运行
            </span>
          </div>

          {hasScript && (
            <>
              <Label>script (JavaScript, return 一个 object)</Label>
              <CodeEditor language="javascript" value={scriptTxt} onChange={setScriptTxt} onSubmit={run} minHeight={180} maxHeight={420} />
              <div style={{ height: 8 }} />
              <Label>params 其余字段 (JSON, 不含 script)</Label>
              <CodeEditor language="json" value={paramsJsonTxt} onChange={setParamsJsonTxt} onSubmit={run} minHeight={70} maxHeight={160} />
            </>
          )}
          {!hasScript && (
            <>
              <Label>params (按 paramsSchema 填)</Label>
              <CodeEditor language="json" value={paramsJsonTxt} onChange={setParamsJsonTxt} onSubmit={run} minHeight={100} maxHeight={220} />
            </>
          )}
          <div style={{ height: 8 }} />

          {node.manual ? (
            /* ── manual (collect) 节点 ──
               inputs 绑定 → resolvedContext (随 envelope 实时更新)
               表单: { ...formSubmitData, ...resolvedContext } — context 优先覆盖, 保证
               ui:readonly 字段始终显示最新解析值; 用户编辑的可写字段保存在 formSubmitData
               C 端同逻辑: claim 返回 resolvedInputs, 作为 formData 初始值传入同一套 uiSchema */
            <>
              <Label>inputs 绑定 (上下文映射 — 回填到下方表单的只读字段)</Label>
              <CodeEditor language="json" value={inputsTxt} onChange={setInputsTxt} onSubmit={run} minHeight={60} maxHeight={120} />
              {parsedSchema && (
                <>
                  <div style={{ height: 8 }} />
                  <Label>表单 (ui:readonly 字段来自绑定, 其余字段为用户新输入)</Label>
                  <div className="rjsf-debug-form" style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 16px", background: "white" }}>
                    <style>{`
                      .rjsf-debug-form fieldset{border:none;padding:0;margin:0}
                      .rjsf-debug-form .form-group{margin-bottom:12px}
                      .rjsf-debug-form label{display:block;font-size:12px;color:#374151;margin-bottom:4px;font-weight:500}
                      .rjsf-debug-form input[type=text],.rjsf-debug-form textarea,.rjsf-debug-form select{width:100%;padding:6px 8px;font-size:13px;border:1px solid #d1d5db;border-radius:4px;box-sizing:border-box;font-family:inherit}
                      .rjsf-debug-form textarea[readonly],.rjsf-debug-form input[readonly]{background:#f9fafb;color:#6b7280;cursor:default}
                      .rjsf-debug-form input[type=radio]{width:auto;margin-right:6px}
                      .rjsf-debug-form .field-radio-group label{display:inline-flex;align-items:center;margin-right:16px;font-weight:400}
                      .rjsf-debug-form .errors-block,.rjsf-debug-form .error-detail{color:#dc2626;font-size:11px;margin-top:2px;list-style:none;padding:0}
                    `}</style>
                    <Form
                      schema={parsedSchema as any}
                      uiSchema={parsedUiSchema}
                      formData={{ ...formSubmitData, ...(resolvedContext ?? {}) }}
                      onChange={(e: any) => {
                        // exclude readonly context keys so they never pollute formSubmitData
                        const fd = (e.formData ?? {}) as Record<string, unknown>;
                        const readonlyKeys = new Set(Object.keys(resolvedContext ?? {}));
                        setFormSubmitData(
                          Object.fromEntries(Object.entries(fd).filter(([k]) => !readonlyKeys.has(k)))
                        );
                      }}
                      validator={validator}
                      liveValidate
                      noHtml5Validate
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            /* ── 非 manual 节点: 原样 inputs JSON 编辑器 ── */
            <>
              <Label>inputs (绑定表达式或字面量)</Label>
              <CodeEditor language="json" value={inputsTxt} onChange={setInputsTxt} onSubmit={run} minHeight={70} maxHeight={160} />
            </>
          )}

          <div style={{ height: 8 }} />
          <Label>envelope.payload / outputs / tags (表达式求值上下文)</Label>
          <CodeEditor language="json" value={envelopeTxt} onChange={setEnvelopeTxt} onSubmit={run} minHeight={100} maxHeight={200} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <button onClick={run} disabled={busy}
                    style={{
                      padding: "7px 14px", fontSize: 13, fontWeight: 600,
                      background: busy ? "#9ca3af" : "#2563eb", color: "white",
                      border: "none", borderRadius: 6, cursor: busy ? "default" : "pointer",
                    }}>
              {busy ? "运行中…" : "试运行 (5s 超时)"}
            </button>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              绕过 outbox/attempts, 直接 invoke driver
              {!node.supports_dry_run && <> — <b style={{ color: "#dc2626" }}>driver 内部副作用 (DB/外网) 仍会发生</b></>}
            </span>
          </div>
          {err && <div style={{ marginTop: 8, padding: "8px 10px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 4, fontSize: 12 }}>{err}</div>}
        </div>

        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>结果</div>
          {!result && !busy && <div style={{ color: "#9ca3af", fontSize: 13 }}>填好输入, 点"试运行" (或在任意编辑器里按 ⌘/Ctrl + Enter)</div>}
          {result && <DebugResultBlock result={result} envelopeTxt={envelopeTxt} nodeKey={node.key} />}
        </div>
      </div>
    </div>
  );
}

function DebugResultBlock({ result, envelopeTxt, nodeKey }: { result: AdminNodeDebugResult; envelopeTxt: string; nodeKey: string }) {
  const status = result.result.status;
  const ok = status === "success";
  const v = result.outputValidation;

  const rawOutput = ok ? (result.result as { output: Record<string, unknown> }).output : null;
  const isDryRun = rawOutput?.dryRun === true;

  // strip the dryRun marker — it's driver metadata, not actual output data
  const displayOutput = useMemo(() => {
    if (!rawOutput) return rawOutput;
    if (!isDryRun) return rawOutput;
    const { dryRun: _dr, ...rest } = rawOutput as Record<string, unknown>;
    return rest;
  }, [rawOutput, isDryRun]);

  const updatedEnvelope = useMemo(() => {
    if (!ok) return null;
    try {
      const env = JSON.parse(envelopeTxt || "{}");
      return { ...env, outputs: { ...(env.outputs ?? {}), [nodeKey]: displayOutput } };
    } catch { return null; }
  }, [ok, envelopeTxt, nodeKey, displayOutput]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
          background: ok ? "#dcfce7" : "#fee2e2",
          color:      ok ? "#166534" : "#991b1b",
        }}>{status}</span>
        {isDryRun && (
          <span style={{
            padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
            background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
          }}>dry run</span>
        )}
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          driver = {result.driver.name} · {result.durationMs} ms
        </span>
      </div>

      {v && (
        <div style={{
          marginBottom: 12,
          padding: "8px 10px",
          background: v.mode === "strict" ? "#fef2f2" : "#fffbeb",
          color:      v.mode === "strict" ? "#991b1b" : "#92400e",
          border: `1px solid ${v.mode === "strict" ? "#fecaca" : "#fde68a"}`,
          borderRadius: 4, fontSize: 12,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            ⚠ outputsSchema 校验失败 ({v.mode === "strict" ? "strict — 已翻 result=failed" : "warn — 仅记录"})
          </div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
            {v.violations.map((vi, i) => (
              <li key={i}><code style={{ fontSize: 11 }}>{vi.path || "/"}</code>: {vi.message} <span style={{ color: "#9ca3af" }}>({vi.keyword})</span></li>
            ))}
          </ul>
        </div>
      )}
      <Section title="解析后入参 (resolveBindings)">
        <JsonBlock data={result.resolvedInputs} />
      </Section>
      <Section title="生效配置 (effectiveParams)">
        <JsonBlock data={result.effectiveParams} />
      </Section>
      <Section title={ok ? "输出" : "错误"}>
        <JsonBlock data={ok
          ? displayOutput
          : (result.result as { error: unknown }).error}
        />
      </Section>
      {updatedEnvelope && (
        <Section title={`运行后 envelope (outputs.${nodeKey} ← driver output)`}>
          <JsonBlock data={updatedEnvelope} />
        </Section>
      )}
    </div>
  );
}

function UsagesTab({ usages }: { usages: AdminNodeUsages | null }) {
  if (!usages) return <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>加载中…</div>;
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
        在飞 outbox: <b style={{ color: "#374151" }}>{usages.inflightCount}</b> 个 pending/leased run.
        本列表按当前租户过滤; 系统级 admin 见全租户聚合.
      </div>
      {usages.pipelines.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          没有 pipeline 当前版本引用这个节点版本.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={th()}>Pipeline 名称</th>
              <th style={th()}>Task ID</th>
              <th style={th()}>租户</th>
            </tr>
          </thead>
          <tbody>
            {usages.pipelines.map((p) => (
              <tr key={p.task_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={td()}>
                  <Link to={`/admin/projects/${p.task_id}`} style={{ color: "#1d4ed8", textDecoration: "none" }}>
                    {p.name}
                  </Link>
                </td>
                <td style={{ ...td(), fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{p.task_id.slice(0, 8)}</td>
                <td style={{ ...td(), fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{p.tenant_id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatusPill({ status, style }: { status: "active" | "archived" | "paused"; style?: React.CSSProperties }) {
  const s = status === "active"
    ? { bg: "#dcfce7", color: "#166534" }
    : status === "paused"
    ? { bg: "#fef9c3", color: "#854d0e" }
    : { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
      background: s.bg, color: s.color, ...style,
    }}>{status}</span>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      {children}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#374151" }}>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  const text = useMemo(() => {
    if (data == null) return "—";
    try { return JSON.stringify(data, null, 2); } catch { return String(data); }
  }, [data]);
  return (
    <pre style={{
      margin: 0, padding: 10, background: "#fafafa",
      border: "1px solid #e5e7eb", borderRadius: 4,
      fontSize: 11, fontFamily: "ui-monospace, monospace",
      overflow: "auto", maxHeight: 320,
    }}>{text}</pre>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, marginTop: 4 }}>{children}</div>;
}

function th(): React.CSSProperties { return { textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#6b7280" }; }
function td(): React.CSSProperties { return { padding: "8px 12px", verticalAlign: "middle" }; }

// ── binding 解析 (与后端 node-config.ts resolveOne/resolveBindings 对齐) ──
// 支持 {{payload.xxx}} / {{outputs.step.field}} 整段或部分模板表达式
function _getPath(obj: unknown, path: string): unknown {
  const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
  return path.split(".").reduce<any>((cur, k) => {
    if (cur == null || typeof cur !== "object") return undefined;
    if (FORBIDDEN.has(k)) return undefined;
    return Object.hasOwn(cur, k) ? (cur as any)[k] : undefined;
  }, obj);
}
function _resolveOne(value: unknown, ctx: Record<string, unknown>): unknown {
  if (typeof value !== "string") return value;
  const m = value.match(/^\{\{([\w.]+)\}\}$/);
  if (m) return _getPath(ctx, m[1]);
  if (!value.includes("{{")) return value;
  return value.replace(/\{\{([\w.]+)\}\}/g, (_, p) => {
    const v = _getPath(ctx, p);
    return v == null ? "" : String(v);
  });
}
function resolveInputsForForm(inputsTxt: string, envelopeTxt: string): Record<string, unknown> {
  try {
    const inputs = JSON.parse(inputsTxt || "{}");
    if (typeof inputs !== "object" || inputs === null) return {};
    const env = JSON.parse(envelopeTxt || "{}");
    const ctx = { payload: env.payload ?? {}, outputs: env.outputs ?? {}, tags: env.tags ?? {} };
    return Object.fromEntries(
      Object.entries(inputs as Record<string, unknown>).map(([k, v]) => [k, _resolveOne(v, ctx)])
    );
  } catch { return {}; }
}
