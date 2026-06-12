// 业务规则: 同 item 不同 step 之间的"操作人互斥"配置.
//
// 数据形态 (在 step.params 上):
//   disallowedFromSteps: string[]  — 显式列出"本步骤的操作人不能 = 这些 step 的操作人"
//   disallowSelfReview: true       — 兼容糖 (老配置), 等价于把 reviewedStepKey 加入上面
//
// 强制点: review.decide / collect.claim 都查 — 任一 disallowed step 上有当前 user 的
// submission 行 → 拒. 此规则要求 review 也插 submission 行 (在 review.decide 里做),
// 不然 reviewer 没历史可查, 反向限制 (e.g. "审核人不能再下一轮采集") 不生效.

export interface StepLike {
  params?: Record<string, unknown>;
}

export function expandDisallowedSteps(step: StepLike | null | undefined): string[] {
  if (!step) return [];
  const p = (step.params ?? {}) as Record<string, unknown>;
  const out = new Set<string>();
  if (Array.isArray(p.disallowedFromSteps)) {
    for (const s of p.disallowedFromSteps) if (typeof s === "string") out.add(s);
  }
  if (p.disallowSelfReview === true && typeof p.reviewedStepKey === "string") {
    out.add(p.reviewedStepKey);
  }
  return [...out];
}
