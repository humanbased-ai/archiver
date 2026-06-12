/**
 * 字段路径解析: **JSON Pointer (RFC 6901) + `*` 通配扩展**.
 *
 * 语法:
 *   ""                  -> 整个文档
 *   "/foo"              -> 顶层 foo
 *   "/foo/bar"          -> 嵌套属性
 *   "/foo/0"            -> 数组下标 0
 *   "/foo/-"            -> 数组末尾 (RFC 6901)
 *   "/foo/*"            -> 数组所有元素 (扩展)
 *   "/items/*\/url"     -> 嵌套通配
 *
 * 转义 (RFC 6901):
 *   ~1  -> /
 *   ~0  -> ~
 *
 * 始终返回 unknown[]:
 *   - 命中标量 → [value]
 *   - 命中数组 (经 *) → 展平
 *   - 路径不存在 → []
 */
export function getFieldValues(obj: unknown, pointer: string): unknown[] {
  if (pointer === "" || pointer == null) return [obj];
  if (!pointer.startsWith("/")) pointer = "/" + pointer; // 容错
  const tokens = pointer.slice(1).split("/").map(unescapeToken);

  let current: unknown[] = [obj];
  for (const tok of tokens) {
    const next: unknown[] = [];
    for (const c of current) {
      if (c == null) continue;
      next.push(...stepInto(c, tok));
    }
    current = next;
  }
  return current.filter((v) => v !== undefined);
}

/** RFC 6901: ~1 → /,  ~0 → ~ (顺序先 ~1 再 ~0) */
function unescapeToken(tok: string): string {
  return tok.replace(/~1/g, "/").replace(/~0/g, "~");
}

function stepInto(value: unknown, token: string): unknown[] {
  // 数组通配
  if (token === "*") {
    return Array.isArray(value) ? value.slice() : [];
  }
  // 数组末尾 (RFC 6901 -)
  if (token === "-") {
    return Array.isArray(value) && value.length > 0 ? [value[value.length - 1]] : [];
  }
  // 数组下标
  if (Array.isArray(value)) {
    if (/^\d+$/.test(token)) {
      const idx = Number(token);
      return idx < value.length ? [value[idx]] : [];
    }
    return [];
  }
  // 对象属性
  if (typeof value === "object" && value !== null) {
    return [(value as Record<string, unknown>)[token]];
  }
  return [];
}

/** 把任意 unknown[] 转为 string[] (跳过 null/undefined; 非字符串 JSON 序列化) */
export function valuesToStrings(values: unknown[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (v == null) continue;
    if (typeof v === "string") out.push(v);
    else if (typeof v === "number" || typeof v === "boolean") out.push(String(v));
    else {
      try {
        out.push(JSON.stringify(v));
      } catch {
        // skip
      }
    }
  }
  return out;
}
