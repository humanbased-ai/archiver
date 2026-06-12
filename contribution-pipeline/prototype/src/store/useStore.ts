import { create } from "zustand";
import type { Project, Task, StepConfig, TaskType } from "../types";
import type { RunItem, ItemStage, RunStageKey } from "../run/types";
import { seedProjects, seedTasks } from "../mock/data";
import { buildPipeline, getStepOrder } from "../config/steps";

/** 角色: 简化的权限模型 */
export type Role = "admin" | "collector" | "annotator" | "reviewer";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "管理员",
  collector: "采集员",
  annotator: "标注员",
  reviewer: "审核员",
};

/** 阶段 → 该阶段需要的角色 (admin 始终可见) */
export const STAGE_ROLE: Record<RunStageKey, Role | "system"> = {
  collect: "collector",
  dedup: "system",
  datasource: "collector",
  annotate: "annotator",
  review: "reviewer",
  export: "system",
};

/** 给定 stage 和任务类型, 推进到下一阶段 */
export function nextStage(current: ItemStage, taskType: TaskType = "collect"): ItemStage {
  if (current === "done") return "done";
  const order = getStepOrder(taskType);
  const idx = order.indexOf(current as RunStageKey);
  if (idx < 0 || idx === order.length - 1) return "done";
  return order[idx + 1] as ItemStage;
}

interface State {
  projects: Project[];
  tasks: Task[];
  /** 任务实例 (每条数据), 按 taskId 分组 */
  itemsByTask: Record<string, RunItem[]>;
  /** 当前角色 (原型: 单点切换, 真实场景由登录态决定) */
  currentRole: Role;
  setRole: (r: Role) => void;

  createProject: (p: Omit<Project, "id" | "createdAt">) => Project;
  deleteProject: (id: string) => void;

  createTask: (projectId: string, t: Pick<Task, "name" | "description" | "targetCount"> & { taskType?: TaskType }) => Task;
  deleteTask: (id: string) => void;
  updateTaskPipeline: (id: string, pipeline: StepConfig[]) => void;
  getTask: (id: string) => Task | undefined;
  getProject: (id: string) => Project | undefined;
  tasksOfProject: (projectId: string) => Task[];

  /** 任务实例操作 */
  getItems: (taskId: string) => RunItem[];
  getItem: (taskId: string, itemId: string) => RunItem | undefined;
  itemsAtStage: (taskId: string, stage: ItemStage) => RunItem[];
  addItem: (item: RunItem) => void;
  updateItem: (taskId: string, itemId: string, patch: Partial<RunItem>) => void;
  /** 推进到下一阶段; 可指定目标阶段 (例如 review 打回 → annotate) */
  advanceItem: (taskId: string, itemId: string, to?: ItemStage) => void;
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const useStore = create<State>((set, get) => ({
  projects: seedProjects,
  tasks: seedTasks,
  itemsByTask: {},
  currentRole: "admin",
  setRole: (r) => set({ currentRole: r }),

  createProject: (p) => {
    const project: Project = {
      ...p,
      id: uid("p"),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  deleteProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
    })),

  createTask: (projectId, t) => {
    const taskType: TaskType = t.taskType ?? "collect";
    const task: Task = {
      id: uid("t"),
      projectId,
      taskType,
      name: t.name,
      description: t.description ?? "",
      status: "draft",
      targetCount: t.targetCount,
      pipeline: buildPipeline(taskType),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  deleteTask: (id) =>
    set((s) => {
      const next = { ...s.itemsByTask };
      delete next[id];
      return { tasks: s.tasks.filter((t) => t.id !== id), itemsByTask: next };
    }),

  updateTaskPipeline: (id, pipeline) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, pipeline } : t)),
    })),

  getTask: (id) => get().tasks.find((t) => t.id === id),
  getProject: (id) => get().projects.find((p) => p.id === id),
  tasksOfProject: (projectId) => get().tasks.filter((t) => t.projectId === projectId),

  getItems: (taskId) => get().itemsByTask[taskId] ?? [],
  getItem: (taskId, itemId) => (get().itemsByTask[taskId] ?? []).find((i) => i.id === itemId),
  itemsAtStage: (taskId, stage) =>
    (get().itemsByTask[taskId] ?? []).filter((i) => i.currentStage === stage),

  addItem: (item) =>
    set((s) => ({
      itemsByTask: {
        ...s.itemsByTask,
        [item.taskId]: [...(s.itemsByTask[item.taskId] ?? []), item],
      },
    })),

  updateItem: (taskId, itemId, patch) =>
    set((s) => ({
      itemsByTask: {
        ...s.itemsByTask,
        [taskId]: (s.itemsByTask[taskId] ?? []).map((i) =>
          i.id === itemId ? { ...i, ...patch } : i
        ),
      },
    })),

  advanceItem: (taskId, itemId, to) =>
    set((s) => {
      const taskType = s.tasks.find((t) => t.id === taskId)?.taskType ?? "collect";
      return {
        itemsByTask: {
          ...s.itemsByTask,
          [taskId]: (s.itemsByTask[taskId] ?? []).map((i) =>
            i.id === itemId ? { ...i, currentStage: to ?? nextStage(i.currentStage, taskType) } : i
          ),
        },
      };
    }),
}));

