import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { StepConfig, TaskType } from "../../types";
import type { RunItem, ItemStage } from "../types";
import { SchemaForm, TEMPLATES } from "../../schema-form";
import type { FormResult } from "../../schema-form/types";
import { dedupAgainst, buildDedupInput } from "../dedup";

interface Props {
  taskId: string;
  stageConfig: StepConfig;
  /** dedup 节点配置 (采集任务有; 标注任务为 undefined) */
  dedupConfig?: StepConfig;
  /** 任务类型, 决定跳过 dedup 还是执行 */
  taskType?: TaskType;
  onDone: () => void;
}

/**
 * 采集/数据源阶段单条创建:
 * - 采集任务: 上传 → dedup 判重 → kept → review; duplicate → done
 * - 标注任务: 上传 → 跳过 dedup → annotate
 */
export function CollectProcess({ taskId, stageConfig, dedupConfig, taskType = "collect", onDone }: Props) {
  const impl = stageConfig.implementation;
  const addItem = useStore((s) => s.addItem);
  const existing = useStore((s) => s.itemsByTask[taskId] ?? []);

  const submitNew = async (
    item: Omit<RunItem, "taskId" | "createdAt" | "currentStage" | "kept">
  ) => {
    let nextItemStage: ItemStage;
    let dedupInput: ReturnType<typeof buildDedupInput> | undefined;
    let verdict: { kept: boolean; hashes: string[]; dedupKeys: string[]; duplicateOf: string | null; duplicateMatchKey?: string } = { kept: true, hashes: [], dedupKeys: [], duplicateOf: null };

    if (taskType === "annotate" || !dedupConfig) {
      // 标注任务: 跳过去重, 直接进入标注
      nextItemStage = "annotate";
    } else {
      // 采集任务: 执行去重
      dedupInput = buildDedupInput(
        { dataUrl: item.dataUrl, kind: item.kind, formData: item.formData },
        dedupConfig
      );
      verdict = await dedupAgainst(dedupInput, existing, dedupConfig);
      // 采集任务 dedup 后: kept → review, duplicate → done
      nextItemStage = verdict.kept ? "review" : "done";
    }

    addItem({
      ...item,
      taskId,
      createdAt: new Date().toISOString(),
      currentStage: nextItemStage,
      kept: verdict.kept,
      dedupInput,
      hashes: verdict.hashes,
      dedupKeys: verdict.dedupKeys,
      duplicateOf: verdict.duplicateOf,
      duplicateMatchKey: verdict.duplicateMatchKey,
    });
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        采集实现: <span className="font-medium text-slate-700">{labelOf(impl)}</span>
        {impl === "form_submit" && (
          <span className="ml-2">
            模板 = <code>{String(stageConfig.params.template_id ?? "—")}</code>
          </span>
        )}
      </div>

      {impl === "form_submit" ? (
        <FormCollect stageConfig={stageConfig} onSubmit={submitNew} />
      ) : (
        <ImageCollect onSubmit={submitNew} />
      )}
    </div>
  );
}

function ImageCollect({
  onSubmit,
}: {
  onSubmit: (item: Omit<RunItem, "taskId" | "createdAt" | "currentStage" | "kept">) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    // 每次只处理第一张, 一条数据一个任务实例
    const f = arr[0];
    const reader = new FileReader();
    reader.onload = () => {
      onSubmit({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        dataUrl: reader.result as string,
        kind: "image",
        duplicateOf: null,
      });
    };
    reader.readAsDataURL(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInput.current?.click()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
        ${dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-slate-400 bg-white"}`}
    >
      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
      <div className="text-sm font-medium text-slate-700">点击或拖拽图片到此处</div>
      <div className="text-xs text-slate-500 mt-1">PNG / JPG / WEBP · 一次提交 1 条</div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}

function FormCollect({
  stageConfig,
  onSubmit,
}: {
  stageConfig: StepConfig;
  onSubmit: (item: Omit<RunItem, "taskId" | "createdAt" | "currentStage" | "kept">) => void;
}) {
  const templateId = String(stageConfig.params.template_id ?? "real_world_photo_collection");
  const tpl = TEMPLATES[templateId];

  if (!tpl) {
    return (
      <div className="card p-4 text-sm text-rose-600">
        未找到模板 <code>{templateId}</code>
      </div>
    );
  }

  const handleSubmit = (result: FormResult) => {
    onSubmit({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${tpl.title} - ${new Date().toLocaleTimeString()}`,
      size: JSON.stringify(result.data).length,
      dataUrl: makeFormPlaceholder(tpl.title),
      kind: "form",
      templateId: tpl.id,
      formData: result.data,
      duplicateOf: null,
    });
  };

  return (
    <div className="card p-5">
      <SchemaForm
        id={tpl.id}
        schema={tpl.schema}
        uiSchema={tpl.uiSchema}
        submitText={tpl.submitText}
        onSubmit={handleSubmit}
      />
      <p className="mt-4 text-xs text-slate-500">
        提交后该条数据将作为 1 个任务实例进入「去重」队列
      </p>
    </div>
  );
}

function makeFormPlaceholder(title: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#eef2ff"/>
      <rect x="20" y="20" width="160" height="14" rx="3" fill="#c7d2fe"/>
      <rect x="20" y="44" width="120" height="10" rx="3" fill="#e0e7ff"/>
      <rect x="20" y="62" width="140" height="10" rx="3" fill="#e0e7ff"/>
      <rect x="20" y="80" width="100" height="10" rx="3" fill="#e0e7ff"/>
      <rect x="20" y="110" width="160" height="68" rx="6" fill="#ffffff" stroke="#a5b4fc"/>
      <text x="100" y="195" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#6366f1">${escapeXml(title)}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)
  );
}

function labelOf(impl: string) {
  return (
    {
      local_upload: "本地上传",
      s3: "S3 拉取",
      api_push: "API 推送",
      form_submit: "表单填写",
    } as Record<string, string>
  )[impl] ?? impl;
}
