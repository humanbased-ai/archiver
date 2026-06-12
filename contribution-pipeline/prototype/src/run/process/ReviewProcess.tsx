import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { StepConfig, TaskType } from "../../types";

interface Props {
  taskId: string;
  itemId: string;
  stageConfig: StepConfig;
  taskType?: TaskType;
  onDone: () => void;
}

/**
 * 审核单条:
 * - 通过 → export
 * - 打回 → 标注任务退回 annotate; 采集任务标记 rejected (done)
 */
export function ReviewProcess({ taskId, itemId, stageConfig, taskType = "collect", onDone }: Props) {
  const item = useStore((s) => (s.itemsByTask[taskId] ?? []).find((i) => i.id === itemId));
  const updateItem = useStore((s) => s.updateItem);
  const advanceItem = useStore((s) => s.advanceItem);

  const [reason, setReason] = useState("");

  if (!item) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        未找到任务实例 <code>{itemId}</code>; 可能已被处理。
      </div>
    );
  }

  const approve = () => {
    updateItem(taskId, itemId, { reviewStatus: "approved", reviewReason: reason || "通过" });
    advanceItem(taskId, itemId); // → export
    onDone();
  };

  const reject = () => {
    if (!reason.trim()) {
      alert("打回需要填写原因");
      return;
    }
    updateItem(taskId, itemId, { reviewStatus: "rejected", reviewReason: reason });
    if (taskType === "annotate") {
      advanceItem(taskId, itemId, "annotate"); // 退回标注
    } else {
      // 采集任务: 审核不通过 → 直接终止
      advanceItem(taskId, itemId, "done");
    }
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        实现: <span className="font-medium text-slate-700">{stageConfig.implementation}</span>
      </div>

      <div className="card overflow-hidden">
        <img src={item.dataUrl} className="w-full max-h-[40vh] object-contain bg-slate-50" />
        <div className="p-4 space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">标注结果</div>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {(item.annotation?.labels ?? []).map((l) => (
                <span
                  key={l}
                  className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {l}
                </span>
              ))}
            </div>
            <div className="text-xs text-slate-500">
              置信度 {item.annotation?.conf?.toFixed(2) ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">审核备注 (打回必填)</div>
            <textarea
              className="input"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如: 标签错误 / 置信度过低"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={reject}
            >
              <ThumbsDown className="w-4 h-4" />
              {taskType === "annotate" ? "打回 (回到标注)" : "拒绝 (终止)"}
            </button>
            <button
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={approve}
            >
              <ThumbsUp className="w-4 h-4" /> 通过 (进入导出)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
