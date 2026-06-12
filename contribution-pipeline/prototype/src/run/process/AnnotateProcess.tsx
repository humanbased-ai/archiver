import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useStore } from "../../store/useStore";
import type { StepConfig } from "../../types";

interface Props {
  taskId: string;
  itemId: string;
  stageConfig: StepConfig;
  onDone: () => void;
}

/** 标注单条: 选择标签 + 置信度 → 推进到 review */
export function AnnotateProcess({ taskId, itemId, stageConfig, onDone }: Props) {
  const item = useStore((s) => (s.itemsByTask[taskId] ?? []).find((i) => i.id === itemId));
  const updateItem = useStore((s) => s.updateItem);
  const advanceItem = useStore((s) => s.advanceItem);

  const labels: string[] = Array.isArray(stageConfig.params.labels) ? stageConfig.params.labels : [];
  const [picked, setPicked] = useState<string[]>(item?.annotation?.labels ?? []);
  const [conf, setConf] = useState<number>(item?.annotation?.conf ?? 0.85);

  if (!item) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        未找到任务实例 <code>{itemId}</code>; 可能已被处理。
      </div>
    );
  }

  const toggle = (l: string) => {
    setPicked((ps) => (ps.includes(l) ? ps.filter((x) => x !== l) : [...ps, l]));
  };

  const aiPrefill = () => {
    const count = 1 + Math.floor(Math.random() * Math.min(2, labels.length));
    const pool = [...labels].sort(() => Math.random() - 0.5).slice(0, count);
    setPicked(pool);
    setConf(+(0.5 + Math.random() * 0.5).toFixed(2));
  };

  const submit = () => {
    if (picked.length === 0) {
      alert("请至少选择一个标签");
      return;
    }
    updateItem(taskId, itemId, { annotation: { labels: picked, conf } });
    advanceItem(taskId, itemId); // → review
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
            <div className="text-sm font-medium mb-2">标签 (可多选)</div>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => {
                const active = picked.includes(l);
                return (
                  <button
                    key={l}
                    onClick={() => toggle(l)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-brand-600 border-brand-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {active && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">置信度: {conf.toFixed(2)}</div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={conf}
              onChange={(e) => setConf(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-outline" onClick={aiPrefill}>
              <Sparkles className="w-4 h-4" /> AI 预标
            </button>
            <button className="btn-primary flex-1" onClick={submit}>
              提交并进入审核
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
