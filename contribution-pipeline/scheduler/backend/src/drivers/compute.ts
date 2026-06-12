/**
 * compute driver — 纯函数计算 (测试 / 调试占位节点)
 *
 * 定位:
 *   一段受限表达式做计算, 引用 inputs.* / params.*, 无外部副作用 (不写库, 不打外网).
 *   场景: 调试 pipeline 编排时占位 / 测试调度链路 / 验证 binding 表达式效果 /
 *         给新人或 AI 看 "一个最简 driver 长啥样".
 *
 * 与 script@1.0 (sandbox-js) 的分工:
 *   - script@1.0  生产用; 任意 JS, vm 沙箱跑, 有 OOM/CPU 风险
 *   - compute@1.0 测试用; 一段受限表达式, 完全无 eval, 真"纯函数"
 *
 * 安全模型:
 *   - 不用 eval / new Function / vm — 自带极简递归下降 evaluator
 *   - 只支持: 数字/字符串/布尔/null 字面量、算术/比较/逻辑、三元、inputs.X / params.X 路径
 *   - 没有函数调用、没有属性赋值、没有循环 — 解析阶段就拒掉
 *   - 路径解析屏蔽 __proto__/constructor/prototype (复用 getPath 的策略)
 *
 * "driver-first" 范式示范:
 *   节点协议 (nodeDefinition) 与 handle 实现在同一个文件, 启动时 auto-upsert 到 DB.
 *   改 schema = 改这个文件; 不在后台填 JSON, 不存在 "schema 漂移于实现" 的问题.
 */

import { registerDriver, type DriverJob, type DriverResult } from "./registry.ts";
import type { DriverNodeDefinition } from "../node-config.ts";
import { InProcessNode } from "./base/index.ts";

// ============ 节点能力声明 (driver = 真相源) ============

export const nodeDefinition: DriverNodeDefinition = {
  key: "compute",
  version: "1.0",
  displayName: "计算 Compute (测试节点)",
  category: "system",
  runMode: "embedded",
  description:
    "纯函数计算节点: 按 params.expression 求值, 引用 inputs.* / params.*, 无外部副作用. " +
    "用于测试 pipeline 编排 / 验证 binding 表达式 / 给 AI 编程示范一个最小 driver 形态. " +
    "生产任意 JS 场景请用 script@1.0 (vm 沙箱).",
  outputsSchema: {
    type: "object",
    properties: {
      result:     { description: "表达式求值结果 (数字 / 字符串 / 布尔 / null)" },
      expression: { type: "string", description: "回显使用的表达式" },
    },
  },
  paramsSchema: {
    type: "object",
    required: ["expression"],
    properties: {
      expression: {
        type: "string",
        description:
          "受限表达式. 支持: 数字/字符串/布尔/null 字面量, + - * / %, == != < > <= >=, " +
          "&& ||, ? :, inputs.X / params.X 路径. 没有函数调用 / 赋值 / 循环.",
      },
    },
  },
  uiSchema: {
    fields: {
      expression: {
        widget: "textarea",
        rows: 3,
        hint: "例: inputs.a + inputs.b   或   inputs.score >= params.threshold ? 'pass' : 'fail'",
      },
    },
  },
  inputsSchema: {
    type: "object",
    // 不预定义字段 — compute 接受任意 inputs, expression 自己引用什么算什么.
    // properties 留空意味着 lease resolver 不做 defaultBinding 兜底, step 完全自由.
    properties: {},
  },
  idempotent: true,
  defaultTimeoutMs: 1000,
  defaultMaxAttempts: 1,
  manual: false,
  // 没有任何 I/O, dry-run 与生产逻辑完全一致
  supportsDryRun: true,
  examples: [
    {
      title: "二元加法",
      description: "最简: 把两个数字输入相加",
      step: {
        params: { expression: "inputs.a + inputs.b" },
        inputs: { a: 1, b: 2 },
      },
      envelope: { payload: {}, outputs: {}, tags: {} },
    },
    {
      title: "阈值判定 → 路由",
      description: "用三元判定决策, 输出 'pass' / 'fail', 给 step.routes.on='result' 当分支字段",
      step: {
        params: { expression: "inputs.score >= params.threshold ? 'pass' : 'fail'" },
        inputs: { score: "{{outputs.review.score}}", threshold: 0.8 },
        routes: { on: "result", cases: { pass: "next", fail: { goto: "rework" } } },
      },
      envelope: { payload: {}, outputs: { review: { score: 0.92 } }, tags: {} },
    },
    {
      title: "字符串拼接 (链式上下文)",
      description: "把 payload 里的字段拼成展示字符串",
      step: {
        params: { expression: "payload.lastName + payload.firstName" },
        inputs: { payload: "{{payload}}" },
      },
      envelope: { payload: { firstName: "三", lastName: "张" }, outputs: {}, tags: {} },
    },
  ],
};

// ============ Driver 实现 ============

export class ComputeNode extends InProcessNode {
  readonly nodeDefinition = nodeDefinition;

  public override get name(): string { return "builtin:compute"; }

  protected async handle(job: DriverJob): Promise<DriverResult> {
    const expression = typeof job.params.expression === "string" ? job.params.expression : "";
    if (!expression.trim()) {
      return { status: "failed", error: { code: "NO_EXPRESSION", message: "params.expression 必填", retryable: false } };
    }
    try {
      const result = evalExpression(expression, { inputs: job.inputs ?? {}, params: job.params });
      return { status: "success", output: { result, expression } };
    } catch (e: any) {
      return { status: "failed", error: { code: "EXPR_ERROR", message: String(e?.message ?? e), retryable: false } };
    }
  }
}

export function registerComputeDriver(): void {
  registerDriver(new ComputeNode().asDriver());
}

// ============ 极简受限表达式 evaluator ============
//
// 不用 eval / new Function / vm; 自己写 tokenizer + 递归下降, 解析阶段就限定语法.
// 文法:
//   ternary := orExpr ('?' ternary ':' ternary)?
//   orExpr  := andExpr ('||' andExpr)*
//   andExpr := eqExpr  ('&&' eqExpr)*
//   eqExpr  := relExpr (('=='|'!=') relExpr)*
//   relExpr := addExpr (('<'|'<='|'>'|'>=') addExpr)*
//   addExpr := mulExpr (('+'|'-') mulExpr)*
//   mulExpr := unary   (('*'|'/'|'%') unary)*
//   unary   := ('-'|'!') unary | primary
//   primary := number | string | bool | null | path | '(' ternary ')'
//   path    := IDENT ('.' IDENT)*

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

type Token =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ident"; v: string }
  | { t: "op"; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    // number
    if ((c >= "0" && c <= "9") || (c === "." && src[i + 1] >= "0" && src[i + 1] <= "9")) {
      let j = i;
      while (j < src.length && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j++;
      out.push({ t: "num", v: Number(src.slice(i, j)) });
      i = j; continue;
    }
    // string (single or double quote, no escapes — keep simple)
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) j++;
      if (j >= src.length) throw new Error(`unterminated string at ${i}`);
      out.push({ t: "str", v: src.slice(i + 1, j) });
      i = j + 1; continue;
    }
    // identifier (letters, digits, _, dot will be handled in path)
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_") {
      let j = i;
      while (j < src.length && ((src[j] >= "a" && src[j] <= "z") || (src[j] >= "A" && src[j] <= "Z") || (src[j] >= "0" && src[j] <= "9") || src[j] === "_")) j++;
      out.push({ t: "ident", v: src.slice(i, j) });
      i = j; continue;
    }
    // 2-char ops first
    const two = src.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "&&" || two === "||") {
      out.push({ t: "op", v: two }); i += 2; continue;
    }
    if ("+-*/%<>!?:.,()".includes(c)) {
      out.push({ t: "op", v: c }); i++; continue;
    }
    throw new Error(`unexpected char '${c}' at ${i}`);
  }
  return out;
}

interface Cursor { i: number; tokens: Token[] }

function peek(c: Cursor): Token | undefined { return c.tokens[c.i]; }
function eat(c: Cursor, t: string, v?: string): boolean {
  const k = peek(c);
  if (!k) return false;
  if (k.t !== t) return false;
  if (v !== undefined && k.v !== v) return false;
  c.i++; return true;
}
function expectOp(c: Cursor, v: string) {
  if (!eat(c, "op", v)) throw new Error(`expected '${v}' at token ${c.i}`);
}

function getPath(obj: unknown, parts: string[]): unknown {
  let cur: any = obj;
  for (const k of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    if (FORBIDDEN_KEYS.has(k)) return undefined;
    cur = Object.hasOwn(cur, k) ? cur[k] : undefined;
  }
  return cur;
}

function parsePrimary(c: Cursor, env: { inputs: any; params: any }): unknown {
  const tk = peek(c);
  if (!tk) throw new Error("unexpected end");
  if (tk.t === "num") { c.i++; return tk.v; }
  if (tk.t === "str") { c.i++; return tk.v; }
  if (tk.t === "ident") {
    if (tk.v === "true")  { c.i++; return true;  }
    if (tk.v === "false") { c.i++; return false; }
    if (tk.v === "null")  { c.i++; return null;  }
    // path: ident ('.' ident)*
    const parts = [tk.v]; c.i++;
    while (eat(c, "op", ".")) {
      const id = peek(c);
      if (!id || id.t !== "ident") throw new Error(`expected ident after '.'`);
      parts.push(id.v); c.i++;
    }
    const head = parts[0];
    if (head === "inputs") return getPath(env.inputs, parts.slice(1));
    if (head === "params") return getPath(env.params, parts.slice(1));
    // payload / outputs / tags 也允许 — 但 inputs 已经是 resolveBindings 的产物, 通常够用
    if (head === "payload" || head === "outputs" || head === "tags") {
      // compute step 用 inputs.payload = "{{payload}}" 显式传入, 这里 fallback 也支持顶级
      return getPath((env.inputs as any)?.[head], parts.slice(1));
    }
    throw new Error(`unknown identifier '${head}' (allowed: inputs, params, payload, outputs, tags)`);
  }
  if (tk.t === "op" && tk.v === "(") {
    c.i++;
    const v = parseTernary(c, env);
    expectOp(c, ")");
    return v;
  }
  throw new Error(`unexpected token ${tk.t}:${tk.v}`);
}

function parseUnary(c: Cursor, env: { inputs: any; params: any }): unknown {
  if (eat(c, "op", "-")) {
    const v = parseUnary(c, env);
    return -(Number(v));
  }
  if (eat(c, "op", "!")) {
    const v = parseUnary(c, env);
    return !v;
  }
  return parsePrimary(c, env);
}

function parseMul(c: Cursor, env: { inputs: any; params: any }): unknown {
  let left = parseUnary(c, env);
  while (true) {
    const tk = peek(c);
    if (!tk || tk.t !== "op" || (tk.v !== "*" && tk.v !== "/" && tk.v !== "%")) break;
    c.i++;
    const right = parseUnary(c, env);
    if (tk.v === "*") left = Number(left) * Number(right);
    else if (tk.v === "/") left = Number(left) / Number(right);
    else left = Number(left) % Number(right);
  }
  return left;
}

function parseAdd(c: Cursor, env: { inputs: any; params: any }): unknown {
  let left = parseMul(c, env);
  while (true) {
    const tk = peek(c);
    if (!tk || tk.t !== "op" || (tk.v !== "+" && tk.v !== "-")) break;
    c.i++;
    const right = parseMul(c, env);
    if (tk.v === "+") {
      // '+' 字符串拼接或数值相加: 任一端是 string 则拼接 (与 JS 语义一致)
      if (typeof left === "string" || typeof right === "string") {
        left = String(left) + String(right);
      } else {
        left = Number(left) + Number(right);
      }
    } else {
      left = Number(left) - Number(right);
    }
  }
  return left;
}

function parseRel(c: Cursor, env: { inputs: any; params: any }): unknown {
  let left = parseAdd(c, env);
  while (true) {
    const tk = peek(c);
    if (!tk || tk.t !== "op" || (tk.v !== "<" && tk.v !== "<=" && tk.v !== ">" && tk.v !== ">=")) break;
    c.i++;
    const right = parseAdd(c, env);
    if (tk.v === "<")  left = (left as any) <  (right as any);
    if (tk.v === "<=") left = (left as any) <= (right as any);
    if (tk.v === ">")  left = (left as any) >  (right as any);
    if (tk.v === ">=") left = (left as any) >= (right as any);
  }
  return left;
}

function parseEq(c: Cursor, env: { inputs: any; params: any }): unknown {
  let left = parseRel(c, env);
  while (true) {
    const tk = peek(c);
    if (!tk || tk.t !== "op" || (tk.v !== "==" && tk.v !== "!=")) break;
    c.i++;
    const right = parseRel(c, env);
    // 严格等价语义 — 表达式调试场景不要 JS 的 == 强转坑
    left = tk.v === "==" ? left === right : left !== right;
  }
  return left;
}

function parseAnd(c: Cursor, env: { inputs: any; params: any }): unknown {
  let left = parseEq(c, env);
  while (eat(c, "op", "&&")) {
    const right = parseEq(c, env);
    left = (left as any) && (right as any);
  }
  return left;
}

function parseOr(c: Cursor, env: { inputs: any; params: any }): unknown {
  let left = parseAnd(c, env);
  while (eat(c, "op", "||")) {
    const right = parseAnd(c, env);
    left = (left as any) || (right as any);
  }
  return left;
}

function parseTernary(c: Cursor, env: { inputs: any; params: any }): unknown {
  const cond = parseOr(c, env);
  if (eat(c, "op", "?")) {
    const then = parseTernary(c, env);
    expectOp(c, ":");
    const els = parseTernary(c, env);
    return cond ? then : els;
  }
  return cond;
}

export function evalExpression(expr: string, env: { inputs: any; params: any }): unknown {
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error("empty expression");
  const c: Cursor = { i: 0, tokens };
  const result = parseTernary(c, env);
  if (c.i !== tokens.length) {
    const rest = tokens.slice(c.i).map((t) => `${t.t}:${t.v}`).join(" ");
    throw new Error(`trailing tokens: ${rest}`);
  }
  return result;
}
