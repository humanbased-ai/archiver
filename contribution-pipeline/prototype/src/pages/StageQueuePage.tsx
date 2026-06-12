import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  ShieldAlert,
  Inbox,
  Filter,
  Edit3,
  ShieldCheck,
  Upload,
  Download,
  PlayCircle,
  X,
  Database,
} from "lucide-react";
import { useStore, STAGE_ROLE, ROLE_LABEL, type Role } from "../store/useStore";
import type { RunStageKey, RunItem } from "../run/types";

const STAGE_META: Record<RunStageKey, { label: string; icon: any; cls: string }> = {
  collect: { label: "采集", icon: Inbox, cls: "bg-sky-100 text-sky-700" },
  dedup: { label: "去重", icon: Filter, cls: "bg-amber-100 text-amber-700" },
  datasource: { label: "数据源", icon: Database, cls: "bg-sky-100 text-sky-700" },
  annotate: { label: "标注", icon: Edit3, cls: "bg-emerald-100 text-emerald-700" },
  review: { label: "审核", icon: ShieldCheck, cls: "bg-violet-100 text-violet-700" },
  export: { label: "导出", icon: Upload, cls: "bg-rose-100 text-rose-700" },
};

export default function StageQueuePage() {
  const { taskId = "", stage = "collect" } = useParams<{ taskId: string; stage: RunStageKey }>();
  const navigate = useNavigate();

  const task = useStore((s) => s.getTask(taskId));
  const project = useStore((s) => (task ? s.getProject(task.projectId) : undefined));
  const items = useStore((s) => s.getItems(taskId));
  const currentRole = useStore((s) => s.currentRole);

  if (!task || !project) {
    return (
      <div className="p-6">
        <div className="text-slate-600">任务不存在</div>
        <Link to="/projects" className="text-brand-600 text-sm">
          ← 回到项目列表
        </Link>
      </div>
    );
  }

  const stageKey = stage as RunStageKey;
  const meta = STAGE_META[stageKey];
  const requiredRole: Role | "system" = STAGE_ROLE[stageKey];
  const isSystemStage = requiredRole === "system";
  const canHandle =
    currentRole === "admin" || isSystemStage || currentRole === (requiredRole as Role);

  /** 任务的 pipeline 步骤顺序 */
  const pipelineKeys = task.pipeline.map((s) => s.key as RunStageKey);

  /** 当前阶段的待处理队列 */
  const queue = items.filter((i) => i.currentStage === stageKey);
  /** 已离开本阶段的 (历史) */
  const past = items.filter((i) => {
    if (i.currentStage === "done") return true;
    const idx = pipelineKeys.indexOf(i.currentStage as RunStageKey);
    const cur = pipelineKeys.indexOf(stageKey);
    return idx > -1 && idx > cur;
  });
  /** 去重命中的所有重复记录 (跨任务范围 = 全部) */
  const duplicates = items.filter((i) => i.kept === false && i.duplicateOf);
  /** 已通过去重的项 (kept=true 且至少进过 dedup) */
  const dedupedKept = items.filter((i) => i.kept && i.dedupKeys && i.dedupKeys.length > 0);

  return (
    <div className="h-full overflow-auto">
      {/* 顶栏 */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <Link
          to={`/tasks/${task.id}`}
          className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> {task.name}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${meta.cls}`}>
            <meta.icon className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{meta.label} 队列</span>
          </div>
          <span className="text-xs text-slate-500">
            执行角色:{" "}
            <span className="font-medium text-slate-700">
              {isSystemStage ? "系统自动" : ROLE_LABEL[requiredRole as Role]}
            </span>
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500">
            待处理 <span className="font-semibold text-slate-700">{queue.length}</span> / 已处理{" "}
            <span className="font-semibold text-slate-700">{past.length}</span> / 目标 {task.targetCount}
          </span>
        </div>
      </div>

      {/* 阶段切换 chips */}
      <div className="border-b border-slate-200 bg-white px-6 py-2.5 flex items-center gap-1.5">
        {pipelineKeys.map((k) => {
          const m = STAGE_META[k];
          const cnt = items.filter((i) => i.currentStage === k).length;
          const active = k === stageKey;
          return (
            <button
              key={k}
              className={`text-xs px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-colors ${
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              onClick={() => navigate(`/tasks/${task.id}/stages/${k}`)}
            >
              <m.icon className="w-3 h-3" />
              {m.label}
              <span
                className={`ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] ${
                  active ? "bg-white/25" : "bg-slate-100 text-slate-600"
                }`}
              >
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* 主体 */}
      <div className="px-6 py-5 max-w-5xl mx-auto">
        {!canHandle && (
          <div className="card p-4 mb-4 flex items-start gap-3 bg-amber-50 border-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              当前角色为「{ROLE_LABEL[currentRole]}」，此阶段需要「
              {isSystemStage ? "系统自动" : ROLE_LABEL[requiredRole as Role]}
              」处理。可在右上角切换角色查看处理界面。
            </div>
          </div>
        )}

        {/* 采集/数据源阶段: 显示新增按钮 */}
        {(stageKey === "collect" || stageKey === "datasource") && canHandle && (
          <div className="card p-5 mb-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-medium text-slate-800">新增任务实例</div>
              <div className="text-xs text-slate-500 mt-0.5">
                每提交 1 次 = 1 条数据 (1 个任务实例); 提交后自动进入下一阶段
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate(`/tasks/${task.id}/stages/${stageKey}/items/new`)}
            >
              <Plus className="w-4 h-4" /> 新增数据
            </button>
          </div>
        )}

        {/* 去重阶段: 自动节点说明 + 重复记录列表 (仅采集任务) */}
        {stageKey === "dedup" && pipelineKeys.includes("dedup") && (
          <DedupAutoView
            duplicates={duplicates}
            dedupedKept={dedupedKept.length}
            findById={(id) => items.find((i) => i.id === id)}
          />
        )}

        {/* 导出阶段: 批处理按钮 */}
        {stageKey === "export" && queue.length > 0 && (
          <SystemStageRunner taskId={task.id} stage={stageKey} queueCount={queue.length} />
        )}

        {/* 队列列表 (dedup 阶段不显示, 因为自动流转, 队列总是空) */}
        {stageKey !== "dedup" && (
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 flex items-center justify-between">
              <span>待处理队列</span>
              <span className="text-xs text-slate-500">{queue.length} 条</span>
            </div>
            {queue.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">
                {stageKey === "collect" || stageKey === "datasource"
                  ? "尚未添加任何数据，点击上方「新增数据」开始"
                  : "暂无待处理项 (上一阶段处理完后会自动流入)"}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {queue.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    canHandle={canHandle}
                    onOpen={() => navigate(`/tasks/${task.id}/stages/${stageKey}/items/${it.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 历史 (已离开本阶段) */}
        {stageKey !== "dedup" && past.length > 0 && (
          <details className="mt-4 card overflow-hidden">
            <summary className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer">
              已处理历史 ({past.length})
            </summary>
            <div className="divide-y divide-slate-100">
              {past.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  canHandle={false}
                  showStage
                  onOpen={() =>
                    navigate(
                      `/tasks/${task.id}/stages/${
                        it.currentStage === "done" ? "export" : it.currentStage
                      }/items/${it.id}`
                    )
                  }
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  canHandle,
  onOpen,
  showStage,
}: {
  item: RunItem;
  canHandle: boolean;
  onOpen: () => void;
  showStage?: boolean;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
      <img
        src={item.dataUrl}
        className="w-10 h-10 object-cover rounded border border-slate-200 bg-slate-50"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
          <span>{new Date(item.createdAt).toLocaleString()}</span>
          {showStage && (
            <span className="text-slate-400">
              · 当前: {item.currentStage === "done" ? "已完成" : STAGE_META[item.currentStage as RunStageKey]?.label}
            </span>
          )}
          {item.annotation && <span className="text-emerald-600">已标注</span>}
          {item.reviewStatus === "approved" && <span className="text-emerald-600">已通过</span>}
          {item.reviewStatus === "rejected" && <span className="text-rose-600">已打回</span>}
          {item.kept === false && <span className="text-rose-500">重复</span>}
        </div>
      </div>
      <button
        className={`text-xs px-3 py-1.5 rounded border ${
          canHandle
            ? "bg-brand-600 text-white border-brand-600 hover:bg-brand-700"
            : "border-slate-200 text-slate-500 hover:bg-slate-50"
        }`}
        onClick={onOpen}
      >
        {canHandle ? "处理" : "查看"}
      </button>
    </div>
  );
}

/** 系统阶段批处理: 一键运行 (仅导出, 去重已改为自动) */
function SystemStageRunner({
  taskId,
  stage,
  queueCount,
}: {
  taskId: string;
  stage: RunStageKey;
  queueCount: number;
}) {
  const navigate = useNavigate();
  return (
    <div className="card p-5 mb-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="font-medium text-slate-800 flex items-center gap-1.5">
          <PlayCircle className="w-4 h-4 text-slate-500" />
          系统自动处理
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          导出所有审核通过的任务实例; 队列内 {queueCount} 条
        </div>
      </div>
      <button
        className="btn-primary"
        onClick={() => navigate(`/tasks/${taskId}/stages/${stage}/items/_batch`)}
      >
        <Download className="w-4 h-4" /> 导出数据
      </button>
    </div>
  );
}

/** dedupInput 桶预览: 给定 item 进入 dedup 时的固定结构 */
function DedupInputPreview({
  input,
  onPreviewImage,
}: {
  input?: { images?: string[]; addresses?: string[] };
  onPreviewImage?: (src: string) => void;
}) {
  if (!input) return null;
  const hasImages = (input.images?.length ?? 0) > 0;
  const hasAddrs = (input.addresses?.length ?? 0) > 0;
  if (!hasImages && !hasAddrs) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
      {hasImages && (
        <div className="inline-flex items-center gap-1 text-[10px] text-slate-500">
          <span className="text-slate-400">images:</span>
          {input.images!.slice(0, 3).map((src, i) => {
            const isUrl = src.startsWith("data:") || src.startsWith("http");
            return (
              <img
                key={i}
                src={isUrl ? src : ""}
                className={`w-6 h-6 object-cover rounded border border-slate-200 bg-slate-50 ${
                  isUrl && onPreviewImage ? "cursor-zoom-in hover:ring-2 hover:ring-brand-300" : ""
                }`}
                title={isUrl ? "点击放大预览" : src}
                onClick={isUrl && onPreviewImage ? () => onPreviewImage(src) : undefined}
              />
            );
          })}
          {input.images!.length > 3 && (
            <span className="text-slate-400">+{input.images!.length - 3}</span>
          )}
        </div>
      )}
      {/* 闭合 images 块 */}
      {hasAddrs && (
        <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 flex-wrap">
          <span className="text-slate-400">addresses:</span>
          {input.addresses!.slice(0, 3).map((a, i) => (
            <code
              key={i}
              className="font-mono bg-slate-100 text-slate-600 rounded px-1 py-0.5"
              title={a}
            >
              {a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a}
            </code>
          ))}
          {input.addresses!.length > 3 && (
            <span className="text-slate-400">+{input.addresses!.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** 全屏图片预览蒙层 */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="关闭预览"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        className="max-w-full max-h-full object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/** 去重: 自动节点视图 - 说明 + 命中重复记录列表 */
function DedupAutoView({
  duplicates,
  dedupedKept,
  findById,
}: {
  duplicates: RunItem[];
  dedupedKept: number;
  findById: (id: string) => RunItem | undefined;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const open = (src: string) => () => setPreview(src);
  return (
    <div className="space-y-4">
      {preview && <ImageLightbox src={preview} onClose={() => setPreview(null)} />}
      <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Filter className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-slate-800">自动去重节点</div>
          <div className="text-xs text-slate-600 mt-0.5">
            采集提交时立即与历史样本比对; 通过 → 流入「标注」, 命中重复 → 直接终止 (不进入下游)
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
            <span>
              通过: <span className="font-semibold text-emerald-600">{dedupedKept}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span>
              重复打回: <span className="font-semibold text-rose-600">{duplicates.length}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 flex items-center justify-between">
          <span>被去重打回的记录</span>
          <span className="text-xs text-slate-500">{duplicates.length} 条</span>
        </div>
        {duplicates.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            暂无重复记录
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {duplicates.map((it) => {
              const canon = it.duplicateOf ? findById(it.duplicateOf) : undefined;
              return (
                <div key={it.id} className="px-4 py-3 flex items-center gap-3">
                  <img
                    src={it.dataUrl}
                    className="w-12 h-12 object-cover rounded border border-slate-200 bg-slate-50 cursor-zoom-in hover:ring-2 hover:ring-brand-300"
                    onClick={open(it.dataUrl)}
                    title="点击放大预览"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{it.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{new Date(it.createdAt).toLocaleString()}</span>
                      <span className="text-rose-600">重复</span>
                      {it.duplicateMatchKey && (
                        <span className="font-mono text-slate-400" title={it.duplicateMatchKey}>
                          命中 key: {it.duplicateMatchKey.slice(0, 12)}…
                        </span>
                      )}
                    </div>
                    {/* dedupInput 预览: 给到去重环节的固定结构 */}
                    <DedupInputPreview input={it.dedupInput} onPreviewImage={(src) => setPreview(src)} />
                    {canon && (
                      <div className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
                        <span>命中已有样本:</span>
                        <img
                          src={canon.dataUrl}
                          className="w-5 h-5 object-cover rounded border border-slate-200 cursor-zoom-in hover:ring-2 hover:ring-brand-300"
                          onClick={open(canon.dataUrl)}
                          title="点击放大预览"
                        />
                        <span className="font-medium text-slate-600 truncate max-w-[200px]">
                          {canon.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                    已终止
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
