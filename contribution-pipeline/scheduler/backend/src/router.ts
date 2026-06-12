import type { Pipeline, RouteAction } from "./types.ts";

export interface RouteResult {
  /** 'done' | 'stuck' | 某个 step.key */
  nextStepKey: string;
  loopIncrement?: { stepKey: string; value: number };
}

export function computeNextStep(
  pipeline: Pipeline,
  currentStepKey: string,
  output: Record<string, unknown>,
  nextHint: string | undefined,
  loopCounts: Record<string, number>,
): RouteResult {
  // 1. nextHint 优先
  if (nextHint) {
    if (nextHint === "done" || nextHint === "stuck") return { nextStepKey: nextHint };
    if (pipeline.some((s) => s.key === nextHint)) return { nextStepKey: nextHint };
  }

  // 2. routes 配置
  const cur = pipeline.find((s) => s.key === currentStepKey);
  if (cur?.routes) {
    const value = String(getByPath(output, cur.routes.on) ?? "");
    const action = cur.routes.cases[value] ?? cur.routes.default;
    if (action !== undefined) {
      return resolveAction(pipeline, currentStepKey, action, loopCounts);
    }
  }

  // 3. pipeline 默认下一项
  return defaultNext(pipeline, currentStepKey);
}

function defaultNext(pipeline: Pipeline, currentKey: string): RouteResult {
  const idx = pipeline.findIndex((s) => s.key === currentKey);
  if (idx < 0 || idx === pipeline.length - 1) return { nextStepKey: "done" };
  return { nextStepKey: pipeline[idx + 1].key };
}

function resolveAction(
  pipeline: Pipeline,
  currentKey: string,
  action: RouteAction,
  loopCounts: Record<string, number>,
): RouteResult {
  if (action === "next") return defaultNext(pipeline, currentKey);
  if (action === "done") return { nextStepKey: "done" };
  // goto
  const lc = (loopCounts[currentKey] ?? 0) + 1;
  if (action.maxLoops && lc > action.maxLoops) {
    return { nextStepKey: "stuck" };
  }
  if (!pipeline.some((s) => s.key === action.goto)) {
    return { nextStepKey: "stuck" };
  }
  return {
    nextStepKey: action.goto,
    loopIncrement: { stepKey: currentKey, value: 1 },
  };
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<any>((acc, k) => (acc == null ? acc : (acc as any)[k]), obj);
}
