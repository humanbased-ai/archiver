"""
compute driver — 纯函数计算 (无 eval, 递归下降 evaluator)
与 compute.ts 1:1, 包括 tokenize / parseTernary 等完整实现。
"""
from __future__ import annotations
import re
from typing import Any

from .registry import register_driver, DriverJob, DriverResult
from .base import InProcessNode

FORBIDDEN_KEYS: set[str] = {"__proto__", "constructor", "prototype"}

NODE_DEFINITION = {
    "key": "compute", "version": "1.0", "displayName": "计算 Compute (测试节点)",
    "category": "system", "runMode": "embedded",
    "description": "纯函数计算节点: 按 params.expression 求值, 引用 inputs.* / params.*, 无外部副作用。",
    "outputsSchema": {
        "type": "object",
        "properties": {
            "result":     {},
            "expression": {"type": "string"},
        },
    },
    "paramsSchema": {
        "type": "object", "required": ["expression"],
        "properties": {"expression": {"type": "string"}},
    },
    "uiSchema": {"fields": {"expression": {"widget": "textarea", "rows": 3}}},
    "inputsSchema": {"type": "object", "properties": {}},
    "idempotent": True, "defaultTimeoutMs": 1000, "defaultMaxAttempts": 1,
    "manual": False, "supportsDryRun": True,
    "examples": [
        {"title": "二元加法", "step": {"params": {"expression": "inputs.a + inputs.b"}, "inputs": {"a": 1, "b": 2}},
         "envelope": {"payload": {}, "outputs": {}, "tags": {}}},
        {"title": "阈值判定", "step": {"params": {"expression": "inputs.score >= params.threshold ? 'pass' : 'fail'"},
                                       "inputs": {"score": "{{outputs.review.score}}", "threshold": 0.8}},
         "envelope": {"payload": {}, "outputs": {"review": {"score": 0.92}}, "tags": {}}},
    ],
}

# ── Tokenizer ──────────────────────────────────────────────────────────────────

Token = tuple[str, Any]  # (type, value)  type ∈ {"num","str","ident","op"}


def tokenize(src: str) -> list[Token]:
    tokens: list[Token] = []
    i = 0
    while i < len(src):
        c = src[i]
        if c in " \t\n\r":
            i += 1; continue
        if c.isdigit() or (c == "." and i + 1 < len(src) and src[i + 1].isdigit()):
            j = i
            while j < len(src) and (src[j].isdigit() or src[j] == "."):
                j += 1
            tokens.append(("num", float(src[i:j]) if "." in src[i:j] else int(src[i:j])))
            i = j; continue
        if c in ("'", '"'):
            j = i + 1
            while j < len(src) and src[j] != c:
                j += 1
            if j >= len(src):
                raise ValueError(f"unterminated string at {i}")
            tokens.append(("str", src[i + 1:j]))
            i = j + 1; continue
        if c.isalpha() or c == "_":
            j = i
            while j < len(src) and (src[j].isalnum() or src[j] == "_"):
                j += 1
            tokens.append(("ident", src[i:j]))
            i = j; continue
        two = src[i:i + 2]
        if two in ("==", "!=", "<=", ">=", "&&", "||"):
            tokens.append(("op", two)); i += 2; continue
        if c in "+-*/%<>!?:.,()":
            tokens.append(("op", c)); i += 1; continue
        raise ValueError(f"unexpected char '{c}' at {i}")
    return tokens


class _Cursor:
    def __init__(self, tokens: list[Token]) -> None:
        self.tokens = tokens
        self.i = 0

    def peek(self) -> Token | None:
        return self.tokens[self.i] if self.i < len(self.tokens) else None

    def eat(self, t: str, v: Any = None) -> bool:
        k = self.peek()
        if not k or k[0] != t or (v is not None and k[1] != v):
            return False
        self.i += 1; return True

    def expect_op(self, v: str) -> None:
        if not self.eat("op", v):
            raise ValueError(f"expected '{v}' at token {self.i}")


def _get_path(obj: Any, parts: list[str]) -> Any:
    for k in parts:
        if k in FORBIDDEN_KEYS:
            return None
        if not isinstance(obj, dict) or k not in obj:
            return None
        obj = obj[k]
    return obj


def _parse_primary(c: _Cursor, env: dict[str, Any]) -> Any:
    tk = c.peek()
    if not tk:
        raise ValueError("unexpected end")
    if tk[0] == "num":
        c.i += 1; return tk[1]
    if tk[0] == "str":
        c.i += 1; return tk[1]
    if tk[0] == "ident":
        if tk[1] == "true":  c.i += 1; return True
        if tk[1] == "false": c.i += 1; return False
        if tk[1] == "null":  c.i += 1; return None
        parts = [tk[1]]; c.i += 1
        while c.eat("op", "."):
            nxt = c.peek()
            if not nxt or nxt[0] != "ident":
                raise ValueError("expected ident after '.'")
            parts.append(nxt[1]); c.i += 1
        head = parts[0]
        if head in ("inputs", "params"):
            return _get_path(env.get(head), parts[1:])
        if head in ("payload", "outputs", "tags"):
            return _get_path((env.get("inputs") or {}).get(head), parts[1:])
        raise ValueError(f"unknown identifier '{head}'")
    if tk[0] == "op" and tk[1] == "(":
        c.i += 1
        v = _parse_ternary(c, env)
        c.expect_op(")")
        return v
    raise ValueError(f"unexpected token {tk}")


def _parse_unary(c: _Cursor, env: dict[str, Any]) -> Any:
    if c.eat("op", "-"): return -_parse_unary(c, env)
    if c.eat("op", "!"): return not _parse_unary(c, env)
    return _parse_primary(c, env)


def _parse_mul(c: _Cursor, env: dict[str, Any]) -> Any:
    left = _parse_unary(c, env)
    while True:
        tk = c.peek()
        if not tk or tk[0] != "op" or tk[1] not in ("*", "/", "%"):
            break
        op = tk[1]; c.i += 1
        right = _parse_unary(c, env)
        if op == "*": left = float(left) * float(right)
        elif op == "/": left = float(left) / float(right)
        else: left = float(left) % float(right)
    return left


def _parse_add(c: _Cursor, env: dict[str, Any]) -> Any:
    left = _parse_mul(c, env)
    while True:
        tk = c.peek()
        if not tk or tk[0] != "op" or tk[1] not in ("+", "-"):
            break
        op = tk[1]; c.i += 1
        right = _parse_mul(c, env)
        if op == "+":
            left = str(left) + str(right) if isinstance(left, str) or isinstance(right, str) else float(left) + float(right)
        else:
            left = float(left) - float(right)
    return left


def _parse_rel(c: _Cursor, env: dict[str, Any]) -> Any:
    left = _parse_add(c, env)
    while True:
        tk = c.peek()
        if not tk or tk[0] != "op" or tk[1] not in ("<", "<=", ">", ">="):
            break
        op = tk[1]; c.i += 1
        right = _parse_add(c, env)
        if op == "<":  left = left < right
        elif op == "<=": left = left <= right
        elif op == ">":  left = left > right
        else: left = left >= right
    return left


def _parse_eq(c: _Cursor, env: dict[str, Any]) -> Any:
    left = _parse_rel(c, env)
    while True:
        tk = c.peek()
        if not tk or tk[0] != "op" or tk[1] not in ("==", "!="):
            break
        op = tk[1]; c.i += 1
        right = _parse_rel(c, env)
        left = (left == right) if op == "==" else (left != right)
    return left


def _parse_and(c: _Cursor, env: dict[str, Any]) -> Any:
    left = _parse_eq(c, env)
    while c.eat("op", "&&"):
        right = _parse_eq(c, env)
        left = left and right
    return left


def _parse_or(c: _Cursor, env: dict[str, Any]) -> Any:
    left = _parse_and(c, env)
    while c.eat("op", "||"):
        right = _parse_and(c, env)
        left = left or right
    return left


def _parse_ternary(c: _Cursor, env: dict[str, Any]) -> Any:
    cond = _parse_or(c, env)
    if c.eat("op", "?"):
        then = _parse_ternary(c, env)
        c.expect_op(":")
        els = _parse_ternary(c, env)
        return then if cond else els
    return cond


def eval_expression(expr: str, env: dict[str, Any]) -> Any:
    tokens = tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    c = _Cursor(tokens)
    result = _parse_ternary(c, env)
    if c.i != len(tokens):
        raise ValueError(f"trailing tokens at {c.i}")
    return result


class ComputeNode(InProcessNode):
    node_definition = NODE_DEFINITION

    @property
    def name(self) -> str:
        return "builtin:compute"

    async def handle(self, job: DriverJob) -> DriverResult:
        expression = str(job.params.get("expression") or "")
        if not expression:
            return {"status": "failed", "error": {"code": "NO_EXPRESSION", "message": "params.expression 未设置", "retryable": False}}
        try:
            result = eval_expression(expression, {"inputs": job.inputs, "params": job.params})
        except Exception as e:
            return {"status": "failed", "error": {"code": "EVAL_ERROR", "message": str(e), "retryable": False}}
        output: dict = {"result": result, "expression": expression}
        if job.ctx.get("dryRun"):
            output["dryRun"] = True
        return {"status": "success", "output": output}


def register_compute_driver() -> None:
    register_driver(ComputeNode().as_driver())
