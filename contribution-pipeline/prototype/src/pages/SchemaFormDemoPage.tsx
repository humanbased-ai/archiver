import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileJson, Eye, Code2 } from "lucide-react";
import { SchemaForm, TEMPLATES } from "../schema-form";
import type { FormResult } from "../schema-form/types";

// Demo 任务上下文 (在实际应用中由后端提供)
const DEMO_TASK_DATA: Record<string, Record<string, unknown>> = {
  image_classification: {
    imageUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&q=80",
  },
  object_detection: {
    imageUrl:
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80",
  },
  text_classification: {
    text:
      "这家餐厅服务态度真的太差了, 上菜慢就算了, 服务员还很冷漠, 完全不会再来。",
  },
};

export default function SchemaFormDemoPage() {
  const [templateId, setTemplateId] = useState<string>("image_classification");
  const [view, setView] = useState<"form" | "schema" | "result">("form");
  const [result, setResult] = useState<FormResult | null>(null);

  const tpl = TEMPLATES[templateId];
  const taskData = DEMO_TASK_DATA[templateId] ?? {};

  const handleSubmit = async (res: FormResult) => {
    setResult(res);
    setView("result");
  };

  return (
    <div className="h-full overflow-auto px-6 py-5">
      <Link
        to="/projects"
        className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </Link>

      <header className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileJson className="w-5 h-5 text-brand-600" /> JSON Schema 表单 Demo
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          通过 JSON 配置快速生成数据采集与标注表单, 无需修改代码
        </p>
      </header>

      {/* 模板选择 */}
      <div className="card p-4 mb-5">
        <label className="label">选择模板</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPLATES).map(([id, tpl]) => (
            <button
              key={id}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                templateId === id
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-700 border-slate-300 hover:border-brand-400"
              }`}
              onClick={() => {
                setTemplateId(id);
                setView("form");
                setResult(null);
              }}
            >
              {tpl.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 左: 表单 / Schema 切换 */}
        <div className="card p-5">
          <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
            <TabButton
              active={view === "form"}
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => setView("form")}
            >
              表单预览
            </TabButton>
            <TabButton
              active={view === "schema"}
              icon={<Code2 className="w-3.5 h-3.5" />}
              onClick={() => setView("schema")}
            >
              JSON Schema
            </TabButton>
            <TabButton
              active={view === "result"}
              icon={<FileJson className="w-3.5 h-3.5" />}
              onClick={() => setView("result")}
            >
              提交结果
            </TabButton>
          </div>

          {view === "form" && (
            <SchemaForm
              key={templateId}
              id={tpl.id}
              schema={tpl.schema}
              uiSchema={tpl.uiSchema}
              taskData={taskData}
              submitText={tpl.submitText}
              onSubmit={handleSubmit}
            />
          )}

          {view === "schema" && (
            <pre className="text-xs bg-slate-900 text-slate-100 rounded p-4 overflow-auto max-h-[600px]">
              {JSON.stringify({ schema: tpl.schema, uiSchema: tpl.uiSchema }, null, 2)}
            </pre>
          )}

          {view === "result" && (
            <pre className="text-xs bg-slate-900 text-slate-100 rounded p-4 overflow-auto max-h-[600px]">
              {result
                ? JSON.stringify(result, null, 2)
                : "尚未提交, 请先在表单视图填写并提交"}
            </pre>
          )}
        </div>

        {/* 右: 任务上下文 + 说明 */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-medium text-slate-800 mb-2">任务上下文 (formContext)</h3>
            <p className="text-xs text-slate-500 mb-3">
              通过 <code className="text-brand-600">ui:options.sourceField</code>{" "}
              在自定义 widget 中读取此对象, 类似 Label Studio 中的 <code>$variable</code>
            </p>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-auto">
              {JSON.stringify(taskData, null, 2)}
            </pre>
          </div>

          <div className="card p-5 text-sm text-slate-700 space-y-2">
            <h3 className="font-medium text-slate-800">使用说明 (基于 @rjsf/core)</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>
                <b>schema</b>: 标准 JSON Schema (Draft 7), 描述数据结构与校验规则
              </li>
              <li>
                <b>uiSchema</b>: 通过 <code>ui:widget</code> / <code>ui:options</code> 控制控件
              </li>
              <li>
                <b>dependencies</b>: 字段联动 (如 category=animal 时显示 subCategory)
              </li>
              <li>
                <b>formContext</b> (= taskData): 自定义 widget 通过 <code>ui:options.sourceField</code>{" "}
                读取上下文 (图片 URL/文本等)
              </li>
              <li>
                自定义 widget: <code>image-upload</code> / <code>image-display</code> /{" "}
                <code>image-bbox</code> / <code>text-display</code> / <code>tags</code>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
        active
          ? "border-brand-600 text-brand-600 font-medium"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
