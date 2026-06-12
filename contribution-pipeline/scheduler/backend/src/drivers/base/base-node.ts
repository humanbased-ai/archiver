/**
 * BaseNode — 节点公共基类 (07-node-class-hierarchy.md §6)
 *
 * 模板方法模式: 公共流程封装在 public `invoke(job)` 里, 子类只 implement `protected abstract handle(job)`.
 *
 * 提供的公共能力:
 *   ① 输入校验 (validateInputs) — defense-in-depth, 服务端校验仍是权威
 *   ② 输出校验 (validateOutput) — 跟 src/output-validator.ts 同套 ajv 规则, 不撕裂
 *   ③ 异常归类 (classifyError) — 标准错误类 → retryable 翻译, 子类只管 throw
 *   ④ 4 个可选钩子: onInit / beforeHandle / afterHandle / onShutdown
 *   ⑤ asDriver() — 适配现有 src/drivers/registry.ts 的 Driver 字面量, 新旧并存
 *
 * 子类约束:
 *   - 必填: nodeDefinition (字段), handle (方法)
 *   - 可选: 4 个钩子, enable (二级派发), name (默认 'class:<key>')
 *   - 不可重写: invoke / validateInputs / validateOutput / classifyError (private 限制)
 */

import { validateNodeOutput } from "../../output-validator.ts";
import { resolveSecret } from "../../node-config.ts";  // 子类常用工具, 这里 re-export 不必要
import type { DriverNodeDefinition } from "../../node-config.ts";
import type { Driver, DriverJob, DriverResult } from "../registry.ts";
import { classifyError } from "./errors.ts";

export abstract class BaseNode {
  /** 子类必填: 节点元数据 + 3 份 schema + presets + 行为标志 */
  abstract readonly nodeDefinition: DriverNodeDefinition;

  /** 子类唯一抽象方法: 业务逻辑. 给定 inputs/params, 返回 output. */
  protected abstract handle(job: DriverJob): Promise<DriverResult>;

  /** 子类可选: 二级派发条件 (返回 false 跳过, 让其它 driver 接). 默认 always-enabled. */
  public enable?(job: DriverJob): boolean;

  /** 子类可选: driver 注册名 (日志/监控). 默认 `class:<key>`. */
  public get name(): string {
    return `class:${this.nodeDefinition.key}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 模板方法 — public 入口, 走完 validate → hook → handle → hook → validate 全流程
  // ═══════════════════════════════════════════════════════════════════
  public async invoke(job: DriverJob): Promise<DriverResult> {
    try {
      // P1 注: 基类 validateInputs 当前不启用 — 服务端 lease 已经做 resolveBindings 兜底,
      // 现有 driver 各自手写 inputs.X 检查 (e.g. llm-translate NO_TEXT). 启用基类校验会让
      // 行为发生变化 (转为 VALIDATION_ERROR), 留到 P2 全网迁移时统一打开.
      //   this.validateInputs(job);

      await this.beforeHandle(job);
      const out = await this.handle(job);
      await this.afterHandle(job, out);

      // 节点端 outputsSchema 校验 — defense-in-depth, 服务端 result-core 仍会再校一遍
      if (out.status === "success") {
        const v = validateNodeOutput({
          nodeKey: this.nodeDefinition.key,
          nodeVersion: this.nodeDefinition.version,
          outputsSchema: this.nodeDefinition.outputsSchema ?? null,
          outputsValidation: this.nodeDefinition.outputsValidation ?? "strict",
          output: out.output,
        });
        if (v && (this.nodeDefinition.outputsValidation ?? "strict") === "strict") {
          const sample = v.errors.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join("; ");
          return {
            status: "failed",
            error: {
              code: "OUTPUT_SCHEMA_VIOLATION",
              message: `节点 ${this.nodeDefinition.key}@${this.nodeDefinition.version} 输出不符 outputsSchema: ${sample}${v.errors.length > 3 ? " ..." : ""}`,
              retryable: false,
            },
          };
        }
        // warn 模式: 留给服务端记 audit, 这里照常返回 success
      }

      return out;
    } catch (e) {
      const c = classifyError(e);
      return { status: "failed", error: { code: c.code, message: c.message, retryable: c.retryable } };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 框架内部 — private 强制可见性约束, 子类不能重写
  // ═══════════════════════════════════════════════════════════════════
  private validateInputs(job: DriverJob): void {
    // inputsSchema.required 列出的字段必须在 job.inputs 里存在 (服务端 lease resolver 已经
    // 兜过 defaultBinding, 但用户写错 binding 表达式时 inputs[key]=undefined 仍可能漏过去)
    const schema = this.nodeDefinition.inputsSchema;
    const required = (schema as { required?: string[] } | null | undefined)?.required ?? [];
    if (required.length === 0) return;
    const missing = required.filter((k) => job.inputs[k] === undefined);
    if (missing.length > 0) {
      // 抛业务可读异常, invoke 的 try/catch 会归类成 VALIDATION_ERROR retryable=false
      // (即使是 ExternalWorker 也会被 invoke 抓住, 不会泄漏到 leaseLoop)
      throw new Error(`inputs.${missing.join(",")} 缺失 (inputsSchema.required)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 子类可选钩子 — 默认 noop, 子类按需重写 (跟 invoke 流程位置对应)
  // ═══════════════════════════════════════════════════════════════════
  /** 注册时调用. 建连接池 / 加载模型 / 校验环境. ExternalWorker 在 start() 内调. */
  protected async onInit(): Promise<void> {}
  /** 停机时调用. 关连接池 / flush 缓存. */
  protected async onShutdown(): Promise<void> {}
  /** 每个 job 处理前. 鉴权 / 限流 / dryRun 短路. */
  protected async beforeHandle(_job: DriverJob): Promise<void> {}
  /** 每个 job 处理后. 脱敏 / metrics 上报. 不影响 invoke 返回值. */
  protected async afterHandle(_job: DriverJob, _out: DriverResult): Promise<void> {}

  // ═══════════════════════════════════════════════════════════════════
  // 兼容老 Driver 协议 — 把 class 实例适配回 src/drivers/registry.ts 的 Driver 字面量
  // 让 registerDriver(node.asDriver()) 仍走老 autoworker 派发路径; 新旧并存
  // ═══════════════════════════════════════════════════════════════════
  public asDriver(): Driver {
    return {
      name: this.name,
      nodeKey: this.nodeDefinition.key,
      nodeDefinition: this.nodeDefinition,
      enable: this.enable?.bind(this),
      handle: (job) => this.invoke(job),
    };
  }
}

// re-export 给子类常用
export { resolveSecret } from "../../node-config.ts";
