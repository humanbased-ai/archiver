/**
 * InProcessNode — 主进程内建节点的语义壳 (runMode = embedded)
 *
 * 当前阶段不引入新行为, 仅作为 BaseNode 的"标识子类" — 让 dedup/export/compute/...
 * 这种跑在 scheduler 主进程的节点跟 ExternalWorkerNode (独立进程) 在类型层明确区分.
 *
 * 派发路径: autoworker 调 node.asDriver().handle(job) → invoke() → handle()
 *           不需要 lease 循环 (主进程 autoworker 已经统一拉活)
 *
 * 未来扩展位 (P2+):
 *   - 进程级生命周期编排 (统一 onInit/onShutdown 时机)
 *   - in-process 限流 / 并发上限
 */

import { BaseNode } from "./base-node.ts";

export abstract class InProcessNode extends BaseNode {
  // 暂无新成员; 子类直接继承 BaseNode 的 abstract handle + 4 个钩子 + asDriver
}
