import { Handle, Position, type NodeProps } from "reactflow";

export interface StepNodeData {
  label: string;
  stepKey: string;
  nodeKey: string;
  manual: boolean;
  selected: boolean;
  /** runtime: 当前 item 是否在这个 step */
  liveCurrent?: boolean;
  /** runtime: 当前 item 是否 stuck 在这个 step */
  liveStuck?: boolean;
}

export function StepNode({ data }: NodeProps<StepNodeData>) {
  const cls = [
    "step-node",
    data.selected && "selected",
    data.manual && "manual",
    data.liveCurrent && "live-current",
    data.liveStuck && "live-stuck",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Left} style={{ background: "#94a3b8" }} />
      <div className="label">{data.label}</div>
      <div className="key">{data.stepKey}</div>
      {data.manual && <div style={{ fontSize: 10, color: "#92400e", marginTop: 2 }}>人工</div>}
      <Handle type="source" position={Position.Right} style={{ background: "#94a3b8" }} />
    </div>
  );
}
