import type { Project, Task } from "../types";
import { buildPipeline } from "../config/steps";

export const seedProjects: Project[] = [
  {
    id: "p-1",
    name: "城市监控目标检测",
    type: "image_detection",
    description: "对路口监控图像做 person/car/truck 检测",
    createdAt: "2025-04-20T10:00:00Z",
  },
  {
    id: "p-2",
    name: "商品评论情感分析",
    type: "text_classification",
    description: "电商评论三分类: positive/negative/neutral",
    createdAt: "2025-04-22T15:30:00Z",
  },
];

export const seedTasks: Task[] = [
  {
    id: "t-1",
    projectId: "p-1",
    taskType: "collect",
    name: "采集-2025-04-25 (500张)",
    description: "早高峰东三环路口",
    status: "running",
    targetCount: 500,
    pipeline: buildPipeline("collect"),
    stats: { total: 500, annotated: 0, reviewed: 280, exported: 0 },
    createdAt: "2025-04-25T09:00:00Z",
  },
  {
    id: "t-2",
    projectId: "p-1",
    taskType: "annotate",
    name: "标注-2025-04-26 (夜间批次)",
    description: "夜间低光照场景, 从已采集数据集导入",
    status: "draft",
    targetCount: 200,
    pipeline: buildPipeline("annotate"),
    createdAt: "2025-04-26T08:00:00Z",
  },
  {
    id: "t-3",
    projectId: "p-2",
    taskType: "annotate",
    name: "Q2 评论标注",
    description: "4月商品评论 3000 条",
    status: "completed",
    targetCount: 3000,
    pipeline: buildPipeline("annotate"),
    stats: { total: 3000, annotated: 3000, reviewed: 3000, exported: 3000 },
    createdAt: "2025-04-18T11:20:00Z",
  },
];
