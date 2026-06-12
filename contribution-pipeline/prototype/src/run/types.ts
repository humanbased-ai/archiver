export type RunItemKind = "image" | "form";

export type RunStageKey = "collect" | "dedup" | "datasource" | "annotate" | "review" | "export";

/**
 * Dedup 输入 (固定结构): 采集环节把复杂的 formData 抽取到这里, dedup 节点只消费这个对象.
 *
 * 设计目标:
 *   - 解耦: dedup 不关心来源 schema, 只对桶里的字符串做 hash 比较
 *   - 可扩展: 加新字段类型 = 加新桶 + 加新 dedup handler
 *   - 多值: 每个桶都是数组, 元素任一命中即判重
 */
export interface DedupInput {
  /** 图片 (data: URL 或 http(s) URL) */
  images?: string[];
  /** 链上钱包/交易地址 */
  addresses?: string[];
}

/** 任务实例的当前所处阶段 (done = 已完成全流程) */
export type ItemStage = RunStageKey | "done";

export interface RunItem {
  id: string;
  taskId: string;
  name: string;
  size: number;
  dataUrl: string;                // image preview (form 时为占位 SVG)
  kind?: RunItemKind;             // 默认 "image", 兼容老数据
  templateId?: string;            // 表单模板 id (kind = "form" 时)
  formData?: Record<string, unknown>; // 表单提交的数据 (kind = "form" 时)
  /** 当前所处阶段; 处理完成自动推进到下一阶段 */
  currentStage: ItemStage;
  /**
   * 采集环节在 item 入 dedup 前, 按 template.dedupMapping 抽取出的固定结构.
   * dedup 节点只读这个对象, 不读 formData.
   */
  dedupInput?: DedupInput;
  /**
   * dedup 阶段为该 item 计算的"指纹"列表 (多值, 与 dedupInput 桶里值数量对应).
   * dedupKeys 是按算法收窄后的对比 key.
   */
  hashes?: string[];
  dedupKeys?: string[];
  /** 命中的"原始样本"id (任一 dedupKey 命中即可) */
  duplicateOf?: string | null;
  /** 命中时是哪条 dedupKey 触发的 (调试/审计) */
  duplicateMatchKey?: string;
  kept: boolean;                  // dedup 结果; 默认 true
  annotation?: {
    labels: string[];
    conf?: number;
  };
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewReason?: string;
  createdAt: string;
}
