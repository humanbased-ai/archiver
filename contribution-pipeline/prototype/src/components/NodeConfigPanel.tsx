import { useState } from "react";
import { X, Plus, FileJson, Eye } from "lucide-react";
import type { StepConfig, StepKey, FieldSchema } from "../types";
import { getStepSchema, getImplSchema } from "../config/steps";
import { TEMPLATES } from "../schema-form";
import { SchemaForm } from "../schema-form";

interface Props {
  stepConfig: StepConfig;
  onChange: (updated: StepConfig) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ stepConfig, onChange, onClose }: Props) {
  const schema = getStepSchema(stepConfig.key);
  const impl = getImplSchema(stepConfig.key, stepConfig.implementation);

  const switchImpl = (implKey: string) => {
    const newImpl = schema.implementations.find((i) => i.key === implKey)!;
    const params: Record<string, any> = {};
    newImpl.fields.forEach((f) => {
      if (f.default !== undefined) params[f.key] = f.default;
    });
    onChange({ ...stepConfig, implementation: implKey, params });
  };

  const updateParam = (key: string, value: any) => {
    onChange({ ...stepConfig, params: { ...stepConfig.params, [key]: value } });
  };

  return (
    <aside className="w-[360px] shrink-0 border-l border-slate-200 bg-white h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">{schema.label}</div>
          <div className="font-semibold text-sm mt-0.5">节点配置</div>
        </div>
        <button className="text-slate-400 hover:text-slate-700" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">
        {/* 实现选择 */}
        <div>
          <label className="label">选择实现</label>
          <div className="space-y-1.5">
            {schema.implementations.map((i) => (
              <label
                key={i.key}
                className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-colors
                  ${stepConfig.implementation === i.key
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:bg-slate-50"}`}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  checked={stepConfig.implementation === i.key}
                  onChange={() => switchImpl(i.key)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{i.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{i.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 参数编辑 */}
        {impl && (
          <div>
            <div className="label">参数</div>
            <div className="space-y-3">
              {impl.fields.map((f) => (
                <FieldEditor
                  key={f.key}
                  field={f}
                  value={stepConfig.params[f.key] ?? f.default}
                  onChange={(v) => updateParam(f.key, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 表单 Schema 预览 (form_submit) */}
        {stepConfig.implementation === "form_submit" && (
          <FormSchemaPreview templateId={String(stepConfig.params.template_id ?? "")} />
        )}
      </div>
    </aside>
  );
}

/**
 * 当采集实现为 form_submit 时, 展示已配置的 JSON Schema 字段列表 + 实时表单预览
 * 让用户直观确认"配好后"运行时会渲染什么
 */
function FormSchemaPreview({ templateId }: { templateId: string }) {
  const [view, setView] = useState<"fields" | "form" | "json">("fields");
  const tpl = TEMPLATES[templateId];
  if (!tpl) return null;

  // 从 JSON Schema 中读取字段元数据用于"字段"列表
  const properties = (tpl.schema.properties ?? {}) as Record<string, { title?: string; type?: string }>;
  const requiredSet = new Set<string>(Array.isArray(tpl.schema.required) ? tpl.schema.required : []);
  const uiSchema = tpl.uiSchema ?? {};
  const getWidget = (name: string): string => {
    const ui = uiSchema[name] as Record<string, unknown> | undefined;
    return (ui?.["ui:widget"] as string) || (properties[name]?.type ?? "text");
  };

  return (
    <div>
      <div className="label flex items-center gap-1.5">
        <FileJson className="w-3.5 h-3.5" /> 表单 Schema
      </div>
      <div className="rounded border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs">
          <PreviewTab active={view === "fields"} onClick={() => setView("fields")}>
            字段
          </PreviewTab>
          <PreviewTab active={view === "form"} onClick={() => setView("form")}>
            <Eye className="w-3 h-3" /> 表单预览
          </PreviewTab>
          <PreviewTab active={view === "json"} onClick={() => setView("json")}>
            JSON
          </PreviewTab>
        </div>
        <div className="p-3 max-h-[360px] overflow-auto">
          {view === "fields" && (
            <ul className="space-y-1.5">
              {Object.entries(properties).map(([name, prop]) => (
                <li
                  key={name}
                  className="text-xs flex items-start gap-2 py-1 border-b border-slate-100 last:border-0"
                >
                  <span className="font-mono text-brand-600 shrink-0">{name}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-700 truncate">{prop.title || "—"}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                    {getWidget(name)}
                  </span>
                  {requiredSet.has(name) && <span className="text-rose-500 text-[10px]">必填</span>}
                </li>
              ))}
            </ul>
          )}
          {view === "form" && (
            <div className="text-sm">
              <SchemaForm
                id={tpl.id}
                schema={tpl.schema}
                uiSchema={tpl.uiSchema}
                submitText={tpl.submitText}
                onSubmit={() => {}}
              />
              <p className="mt-2 text-[11px] text-slate-400">
                ↑ 这是采集运行时呈现的表单 (此处仅预览, 提交无效)
              </p>
            </div>
          )}
          {view === "json" && (
            <pre className="text-[11px] bg-slate-900 text-slate-100 rounded p-2 overflow-auto leading-relaxed">
              {JSON.stringify({ schema: tpl.schema, uiSchema: tpl.uiSchema }, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 transition-colors ${
        active
          ? "bg-white text-brand-600 font-medium border-b-2 border-brand-500 -mb-px"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div>
      <label className="label">{field.label}</label>
      {field.type === "text" && (
        <input className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      )}
      {field.type === "number" && (
        <input type="number" className="input" value={value ?? ""} step="any" onChange={(e) => onChange(parseFloat(e.target.value))} />
      )}
      {field.type === "textarea" && (
        <textarea className="input font-mono text-xs" rows={4} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "select" && (
        <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {field.type === "multiselect" && (
        <MultiSelect options={field.options ?? []} value={Array.isArray(value) ? value : []} onChange={onChange} />
      )}
      {field.type === "tags" && (
        <TagsInput value={Array.isArray(value) ? value : []} onChange={onChange} placeholder={field.placeholder} />
      )}
      {field.help && <div className="text-[11px] text-slate-400 mt-1">{field.help}</div>}
    </div>
  );
}

function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => toggle(o.value)}
          className={`text-xs px-2 py-1 rounded border transition-colors
            ${value.includes(o.value)
              ? "bg-brand-100 border-brand-400 text-brand-700"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200"
          >
            {t}
            <button className="text-slate-400 hover:text-rose-600" onClick={() => onChange(value.filter((x) => x !== t))}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "输入后回车"}
        />
        <button className="btn-outline" type="button" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
