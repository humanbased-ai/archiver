import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useStore, STAGE_ROLE, ROLE_LABEL, type Role } from "../store/useStore";
import type { RunStageKey } from "../run/types";
import { CollectProcess } from "../run/process/CollectProcess";
import { AnnotateProcess } from "../run/process/AnnotateProcess";
import { ReviewProcess } from "../run/process/ReviewProcess";
import { ExportBatchProcess } from "../run/process/ExportBatchProcess";

export default function StageProcessPage() {
  const { taskId = "", stage = "collect", itemId = "" } = useParams<{
    taskId: string;
    stage: RunStageKey;
    itemId: string;
  }>();
  const navigate = useNavigate();

  const task = useStore((s) => s.getTask(taskId));
  const project = useStore((s) => (task ? s.getProject(task.projectId) : undefined));
  const currentRole = useStore((s) => s.currentRole);
  const items = useStore((s) => s.getItems(taskId));
  // 重新计算依赖于 items 的 selectors 时, 通过 hook 订阅 items 而非每次调 getItem
  const item = useMemo(
    () => (itemId === "new" || itemId === "_batch" ? undefined : items.find((i) => i.id === itemId)),
    [items, itemId]
  );

  const stageKey = stage as RunStageKey;
  const requiredRole = STAGE_ROLE[stageKey];
  const canHandle =
    currentRole === "admin" ||
    requiredRole === "system" ||
    currentRole === (requiredRole as Role);

  const stageConfig = task?.pipeline.find((s) => s.key === stageKey);
  const dedupConfig = task?.pipeline.find((s) => s.key === "dedup");

  if (!task || !project || !stageConfig) {
    return (
      <div className="p-6">
        <div className="text-slate-600">任务不存在</div>
        <Link to="/projects" className="text-brand-600 text-sm">
          ← 回到项目列表
        </Link>
      </div>
    );
  }

  const backToQueue = () => navigate(`/tasks/${task.id}/stages/${stageKey}`);

  return (
    <div className="h-full flex flex-col">
      {/* 顶栏 */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <button
          onClick={backToQueue}
          className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> 返回队列
        </button>
        <div className="font-semibold mt-0.5">
          {task.name}
          <span className="text-xs font-normal text-slate-500 ml-2">
            · {stageLabel(stageKey)}
            {item && ` · ${item.name}`}
            {itemId === "new" && " · 新增任务实例"}
            {itemId === "_batch" && " · 批量处理"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="max-w-3xl mx-auto">
          {!canHandle ? (
            <PermissionDenied currentRole={currentRole} requiredRole={requiredRole} />
          ) : (
            <ProcessRouter
              stage={stageKey}
              taskId={task.id}
              itemId={itemId}
              stageConfig={stageConfig}
              dedupConfig={dedupConfig}
              taskType={task.taskType}
              onDone={backToQueue}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessRouter({
  stage,
  taskId,
  itemId,
  stageConfig,
  dedupConfig,
  taskType,
  onDone,
}: {
  stage: RunStageKey;
  taskId: string;
  itemId: string;
  stageConfig: any;
  dedupConfig: any;
  taskType: "collect" | "annotate";
  onDone: () => void;
}) {
  if ((stage === "collect" || stage === "datasource") && itemId === "new") {
    return (
      <CollectProcess
        taskId={taskId}
        stageConfig={stageConfig}
        dedupConfig={dedupConfig}
        taskType={taskType}
        onDone={onDone}
      />
    );
  }
  if (stage === "export" && itemId === "_batch") {
    return <ExportBatchProcess taskId={taskId} stageConfig={stageConfig} onDone={onDone} />;
  }
  if (stage === "annotate") {
    return (
      <AnnotateProcess
        taskId={taskId}
        itemId={itemId}
        stageConfig={stageConfig}
        onDone={onDone}
      />
    );
  }
  if (stage === "review") {
    return (
      <ReviewProcess
        taskId={taskId}
        itemId={itemId}
        stageConfig={stageConfig}
        taskType={taskType}
        onDone={onDone}
      />
    );
  }
  return (
    <div className="card p-6 text-sm text-slate-600">
      该阶段暂无单项处理界面 (item: <code>{itemId}</code>)。
    </div>
  );
}

function PermissionDenied({
  currentRole,
  requiredRole,
}: {
  currentRole: Role;
  requiredRole: Role | "system";
}) {
  return (
    <div className="card p-6 flex items-start gap-3 bg-amber-50 border-amber-200">
      <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
      <div>
        <div className="font-medium text-amber-900">无权处理此阶段</div>
        <div className="text-sm text-amber-800 mt-1">
          当前角色「{ROLE_LABEL[currentRole]}」, 该阶段要求「
          {requiredRole === "system" ? "系统自动" : ROLE_LABEL[requiredRole as Role]}」处理。
          可在右上角切换角色。
        </div>
      </div>
    </div>
  );
}

function stageLabel(s: RunStageKey): string {
  return { collect: "采集", dedup: "去重", datasource: "数据源", annotate: "标注", review: "审核", export: "导出" }[s];
}
