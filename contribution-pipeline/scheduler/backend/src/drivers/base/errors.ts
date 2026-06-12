/**
 * 节点标准错误类 — 子类 handle 里 throw 这些, 基类 classifyError 自动归类成
 * retryable / non-retryable 上报给调度中心.
 *
 * 设计:
 *   - 子类抛业务可读异常 (ValidationError("text 缺失") 比 throw new Error("oops") 强百倍)
 *   - 基类按异常类型决定 retryable, 子类不用感知调度协议
 *   - 兜底: 未识别的 Error → retryable=true (网络抖动/瞬时故障当成可重试)
 *
 * 注: 跟 06-node-design §5.4 的"校验错误分类"对齐
 */

/** 输入数据不符 inputsSchema / 业务前置校验失败 — 重试无意义, retryable=false */
export class NodeValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  readonly retryable = false;
  constructor(message: string) { super(message); this.name = "NodeValidationError"; }
}

/** 外部服务超时 — 通常可重试 */
export class NodeTimeoutError extends Error {
  readonly code = "TIMEOUT";
  readonly retryable = true;
  constructor(message: string) { super(message); this.name = "NodeTimeoutError"; }
}

/** 网络 / 连接错误 — 可重试 */
export class NodeNetworkError extends Error {
  readonly code = "NETWORK_ERROR";
  readonly retryable = true;
  constructor(message: string) { super(message); this.name = "NodeNetworkError"; }
}

/** 用户脚本错误 / 表达式语法错 — 不可重试 (重试也是同样脚本) */
export class NodeScriptError extends Error {
  readonly code = "SCRIPT_ERROR";
  readonly retryable = false;
  constructor(message: string) { super(message); this.name = "NodeScriptError"; }
}

/** Secret 缺失 / 配置错误 — 不可重试, 要管理员介入 */
export class NodeConfigError extends Error {
  readonly code: string;
  readonly retryable = false;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "NodeConfigError";
  }
}

export interface ClassifiedError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * 把任意异常归类成 DriverResult.error 形态.
 * 已知标准错误类 → 透传它们的 code + retryable.
 * 未知 Error → 视为 retryable=true (网络/瞬时故障兜底), code='DRIVER_EXCEPTION'.
 */
export function classifyError(e: unknown): ClassifiedError {
  const message = e instanceof Error ? e.message : String(e);

  if (e instanceof NodeValidationError) return { code: e.code, message, retryable: e.retryable };
  if (e instanceof NodeTimeoutError)    return { code: e.code, message, retryable: e.retryable };
  if (e instanceof NodeNetworkError)    return { code: e.code, message, retryable: e.retryable };
  if (e instanceof NodeScriptError)     return { code: e.code, message, retryable: e.retryable };
  if (e instanceof NodeConfigError)     return { code: e.code, message, retryable: e.retryable };

  // 一些常见 native 错误名也归类一下 — fetch AbortError / DNS / TLS 等
  const name = (e as Error)?.name ?? "";
  if (name === "AbortError")  return { code: "TIMEOUT",       message, retryable: true };
  if (name === "TypeError" && /fetch/i.test(message)) return { code: "NETWORK_ERROR", message, retryable: true };

  // 兜底: 未识别 → 默认 retryable=true. 偏向"重试一次再说", 避免错过瞬时故障恢复
  return { code: "DRIVER_EXCEPTION", message, retryable: true };
}
