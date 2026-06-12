/**
 * Driver Registry — autoworker 与具体节点实现的解耦层
 *
 * 设计:
 *   - autoworker 是"瘦循环": 列出所有 auto/hybrid 节点 → lease → 派发到 driver → 上报 result
 *   - 具体节点逻辑全部封装为 Driver, register 进表
 *   - 同一 nodeKey 可有多个 driver, 用 enable(job) 二级派发 (例: ingest 按 params.source 选 manual/form/script/http)
 *
 * 加新节点类型 = registerDriver({...}) 一处, 不动 autoworker
 * 加新执行后端 = 写新 driver (e.g. python sandbox sidecar) 不动调度核心
 */

import type { ApplyResultBody } from "../result-core.ts";
import type { DriverNodeDefinition } from "../node-config.ts";

export interface DriverJob {
  runId: string;
  itemId: string;
  taskId: string;
  tenantId: string;
  stepKey: string;
  nodeKey: string;
  /** pipeline step 钉死的节点版本 (Phase 2 之后服务端 lease 时填入); 无则视为 "1.0" */
  nodeVersion?: string;
  /** 服务端 merge 后的 effective params (defaults + step.params + pin); Phase 2 之前是 stepConfig.params 原样 */
  params: Record<string, unknown>;
  /**
   * Phase 3+ 服务端 resolveBindings 解析后的运行时输入. driver 优先从这里取数据, 不再直接读 envelope.
   * step.inputs 缺省字段会走 inputsSchema.properties.<k>.defaultBinding 兜底.
   */
  inputs: Record<string, unknown>;
  envelope: { payload: Record<string, unknown>; outputs: Record<string, unknown>; tags: Record<string, unknown> };
  ctx: {
    runId: string;
    attempt: number;
    deadline: string | null;
    /**
     * true = 当前 job 是管理后台 dry-run 派发的; driver 必须跳过持久化/外网调用, 返回 mock output.
     * 正式 lease 路径下永远是 false/undefined. nodeDefinition.supportsDryRun 是声明, 这里是运行期信号.
     */
    dryRun?: boolean;
  };
}

/** Driver 处理结果 — 直接喂给 /result 接口的 body 形态 */
export type DriverResult =
  | { status: "success"; output: Record<string, unknown>; nextHint?: string }
  | { status: "failed"; error: { code: string; message: string; retryable?: boolean } };

export interface Driver {
  /** 人类可读名 (日志 / 监控用) */
  name: string;
  /** 必匹配 nodeKey; "*" 表示通配 (永远在精确匹配之后才查, 避免覆盖内置) */
  nodeKey: string;
  /** 可选: 二级筛选 (return false 跳过, 让其它 driver 接) */
  enable?: (job: DriverJob) => boolean;
  /** 处理一个 job; 抛异常视为 retryable failed */
  handle: (job: DriverJob) => Promise<DriverResult>;
  /**
   * 节点能力声明; auto-upsert 启动时按此 UPSERT 到 node_definitions 表.
   * 通配 driver ("*") 不填; 具体 nodeKey 的 driver 强烈建议填 — driver 就是 (key, version) 的实现.
   */
  nodeDefinition?: DriverNodeDefinition;
  /**
   * true = 仅用于 nodeDefinition upsert + dry-run 调用; autoworker 不把此 nodeKey 加入 lease 循环.
   * 适用场景:
   *   - external_worker 节点: 真实 job 由独立 worker 进程拉取, 调度器只需 dry-run 能力
   *   - manual 节点: 真实 job 由 C 端 claim/submit, 调度器不介入 lease
   */
  skipAutoLease?: boolean;
}

const drivers: Driver[] = [];

export function registerDriver(d: Driver): void {
  drivers.push(d);
}

export function pickDriver(job: DriverJob): Driver | null {
  // 三轮派发:
  //   1. 精确 (nodeKey, nodeVersion) — driver 必须有 nodeDefinition 且 version 匹配
  //   2. nodeKey only 兜底 — 向后兼容无 nodeDefinition 或不关心版本的 driver
  //   3. 通配 "*" — http driver 最后接
  if (job.nodeVersion) {
    for (const d of drivers) {
      if (d.nodeKey === "*") continue;
      if (d.nodeKey !== job.nodeKey) continue;
      if (d.nodeDefinition?.version !== job.nodeVersion) continue;
      if (d.enable && !d.enable(job)) continue;
      return d;
    }
  }
  for (const d of drivers) {
    if (d.nodeKey === "*") continue;
    if (d.nodeKey !== job.nodeKey) continue;
    if (d.enable && !d.enable(job)) continue;
    return d;
  }
  for (const d of drivers) {
    if (d.nodeKey !== "*") continue;
    if (d.enable && !d.enable(job)) continue;
    return d;
  }
  return null;
}

/**
 * 当前注册的所有 (具体) nodeKey 去重列表 — autoworker 用它决定 lease 哪些队列。
 * 通配 driver ("*") 不能用于决定 lease 队列, 因为 lease 是按 node_key 拉的;
 * 通配 driver 要生效, 该 nodeKey 必须有至少一个 (具体或通配前提) 注册者来出现在列表中。
 *
 * 实际做法: 通配 driver (如 http) 通过节点定义的 driver=http 字段触发,
 * 所以 lease 列表来自 node_definitions, 不是 drivers 表。autoworker 启动时拉两边取并集。
 */
export function autoNodeKeys(): string[] {
  return [...new Set(
    drivers.filter((d) => d.nodeKey !== "*" && !d.skipAutoLease).map((d) => d.nodeKey),
  )];
}

/** 仅给监控 / debug; 生产代码不应基于此分支 */
export function listDrivers(): { name: string; nodeKey: string; hasEnable: boolean }[] {
  return drivers.map((d) => ({ name: d.name, nodeKey: d.nodeKey, hasEnable: !!d.enable }));
}

/**
 * 收集所有已注册 driver 携带的 nodeDefinition, 给 auto-upsert 用.
 * 同 (key, version) 多次注册时, 后者覆盖前者 — driver 加载顺序由 bootstrapDrivers 决定.
 */
export function collectedNodeDefinitions(): DriverNodeDefinition[] {
  const map = new Map<string, DriverNodeDefinition>();
  for (const d of drivers) {
    if (!d.nodeDefinition) continue;
    map.set(`${d.nodeDefinition.key}@${d.nodeDefinition.version}`, d.nodeDefinition);
  }
  return [...map.values()];
}

/** Driver 异常统一翻译为 DriverResult, 让 autoworker 主循环不用 try/catch 散落 */
export function toFailedResult(err: unknown, code = "DRIVER_ERROR"): DriverResult {
  const message = err instanceof Error ? err.message : String(err);
  return { status: "failed", error: { code, message, retryable: true } };
}

/** Body 形态适配: DriverResult → /result POST body */
export function toResultBody(runId: string, r: DriverResult): ApplyResultBody {
  if (r.status === "success") {
    return { runId, status: "success", output: r.output, nextHint: r.nextHint };
  }
  return { runId, status: "failed", error: r.error };
}
