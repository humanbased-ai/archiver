import { useMemo } from "react";
import { Download, FileJson } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { StepConfig } from "../../types";
import type { RunItem } from "../types";

interface Props {
  taskId: string;
  stageConfig: StepConfig;
  onDone: () => void;
}

/** 导出批处理: 把 currentStage=export 的全部 approved 项打包下载, 完成后推进到 done */
export function ExportBatchProcess({ taskId, stageConfig, onDone }: Props) {
  const items = useStore((s) => s.itemsByTask[taskId] ?? []);
  const advanceItem = useStore((s) => s.advanceItem);

  const queue = items.filter((i) => i.currentStage === "export");
  const impl = stageConfig.implementation;
  const payload = useMemo(() => buildPayload(impl, queue), [impl, queue]);
  const filename = String(stageConfig.params.output_path ?? "export").split("/").pop() || "export";

  const download = () => {
    const blob = new Blob([payload.content], { type: payload.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(payload.ext) ? filename : `export${payload.ext}`;
    a.click();
    URL.revokeObjectURL(url);
    queue.forEach((it) => advanceItem(taskId, it.id, "done"));
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        格式: <span className="font-medium text-slate-700">{labelOf(impl)}</span> · 队列{" "}
        {queue.length} 条
      </div>

      <div className="card p-5 text-center bg-gradient-to-br from-brand-50 to-white border-brand-200">
        <Download className="w-10 h-10 mx-auto text-brand-600 mb-2" />
        <div className="font-medium text-slate-800">准备导出 {queue.length} 条审核通过的数据</div>
        <button
          className="btn-primary mt-4"
          onClick={download}
          disabled={queue.length === 0}
        >
          <Download className="w-4 h-4" /> 下载 {payload.label}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-50 border-b border-slate-200 flex items-center gap-1">
          <FileJson className="w-3.5 h-3.5" /> 导出预览 ({payload.label})
        </div>
        <pre className="bg-slate-900 text-slate-100 text-xs p-3 overflow-auto max-h-[40vh] whitespace-pre">
{payload.content.length > 4000 ? payload.content.slice(0, 4000) + "\n... (truncated)" : payload.content}
        </pre>
      </div>
    </div>
  );
}

function buildPayload(
  impl: string,
  approved: RunItem[]
): { content: string; mime: string; ext: string; label: string } {
  if (impl === "coco") {
    const images = approved.map((it, i) => ({ id: i + 1, file_name: it.name }));
    const annotations: any[] = [];
    approved.forEach((it, i) => {
      (it.annotation?.labels ?? []).forEach((l, j) => {
        annotations.push({ id: i * 10 + j + 1, image_id: i + 1, category_name: l, score: it.annotation?.conf });
      });
    });
    const categories = Array.from(new Set(annotations.map((a) => a.category_name))).map((n, i) => ({
      id: i + 1,
      name: n,
    }));
    return {
      content: JSON.stringify({ images, annotations, categories }, null, 2),
      mime: "application/json",
      ext: ".json",
      label: "COCO JSON",
    };
  }
  if (impl === "yolo") {
    const lines = approved.map((it) => `${it.name}\t${(it.annotation?.labels ?? []).join(",")}`);
    return {
      content: lines.join("\n") || "(empty)",
      mime: "text/plain",
      ext: ".txt",
      label: "YOLO 文件清单",
    };
  }
  if (impl === "csv") {
    const header = "name,labels,conf,review";
    const rows = approved.map((it) =>
      [it.name, (it.annotation?.labels ?? []).join("|"), it.annotation?.conf ?? "", it.reviewStatus].join(",")
    );
    return {
      content: [header, ...rows].join("\n"),
      mime: "text/csv",
      ext: ".csv",
      label: "CSV",
    };
  }
  // jsonl
  const lines = approved.map((it) =>
    JSON.stringify({
      name: it.name,
      labels: it.annotation?.labels,
      conf: it.annotation?.conf,
      review: it.reviewStatus,
      formData: it.formData,
    })
  );
  return {
    content: lines.join("\n") || "(empty)",
    mime: "application/x-ndjson",
    ext: ".jsonl",
    label: "JSONL",
  };
}

function labelOf(impl: string) {
  return (
    { coco: "COCO", yolo: "YOLO", jsonl: "JSONL", csv: "CSV" } as Record<string, string>
  )[impl] ?? impl;
}
