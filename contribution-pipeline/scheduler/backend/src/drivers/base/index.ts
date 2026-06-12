/**
 * 节点基类公共导出 — 子类通过 `import { InProcessNode } from "../base"` 接入.
 */

export { BaseNode } from "./base-node.ts";
export { InProcessNode } from "./in-process-node.ts";
export { ExternalWorkerNode, type ExternalWorkerConfig } from "./external-worker-node.ts";
export {
  NodeValidationError,
  NodeTimeoutError,
  NodeNetworkError,
  NodeScriptError,
  NodeConfigError,
  classifyError,
  type ClassifiedError,
} from "./errors.ts";
export { resolveSecret } from "../../node-config.ts";
