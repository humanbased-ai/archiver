// 数据模型

export type TaskType = "collect" | "annotate";

export type StepKey = "collect" | "dedup" | "datasource" | "annotate" | "review" | "export";

export type FieldType = "text" | "number" | "select" | "multiselect" | "textarea" | "tags";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  default?: any;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface ImplementationSchema {
  key: string;
  label: string;
  description: string;
  fields: FieldSchema[];
}

export interface StepSchema {
  key: StepKey;
  label: string;
  description: string;
  icon: string;            // lucide icon name
  color: string;           // tailwind bg color class
  implementations: ImplementationSchema[];
}

/** 某个节点的配置实例 */
export interface StepConfig {
  key: StepKey;
  implementation: string;    // 当前选择的实现 key
  params: Record<string, any>;
}

export interface Task {
  id: string;
  projectId: string;
  taskType: TaskType;          // 采集任务 | 标注任务
  name: string;
  description: string;
  status: "draft" | "running" | "paused" | "completed" | "failed";
  /** 目标数量 (达到后任务完成) */
  targetCount: number;
  pipeline: StepConfig[];      // 采集: collect→dedup→review→export; 标注: datasource→annotate→review→export
  stats?: {
    total: number;
    annotated: number;
    reviewed: number;
    exported: number;
  };
  createdAt: string;
}

export type ProjectType = "image_detection" | "image_segmentation" | "text_classification" | "custom";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  description: string;
  createdAt: string;
}
