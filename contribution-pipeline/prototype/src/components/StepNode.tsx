import { memo } from "react";
import { Handle, Position } from "reactflow";
import * as LucideIcons from "lucide-react";
import type { StepKey } from "../types";
import { getStepSchema, getImplSchema } from "../config/steps";

interface Data {
  stepKey: StepKey;
  implementation: string;
  selected: boolean;
}

function StepNode({ data }: { data: Data }) {
  const schema = getStepSchema(data.stepKey);
  const impl = getImplSchema(data.stepKey, data.implementation);
  const Icon = (LucideIcons as any)[schema.icon] ?? LucideIcons.Circle;

  return (
    <div
      className={`rounded-lg border-2 px-3 py-2.5 w-[180px] cursor-pointer transition-all bg-white
        ${data.selected ? "border-brand-500 shadow-lg ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-400"}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded flex items-center justify-center ${schema.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-400 uppercase tracking-wide">{schema.label}</div>
        </div>
      </div>
      <div className="text-sm font-medium text-slate-800 truncate">
        {impl?.label ?? "未配置"}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
        {impl?.description}
      </div>
    </div>
  );
}

export default memo(StepNode);
