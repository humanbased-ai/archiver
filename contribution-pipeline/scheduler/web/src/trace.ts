// 极简 pub/sub: 把每次 API 调用的 request/response 推到一个内存环形缓冲
// 只在前端,服务端无感知

export interface TraceEvent {
  id: number;
  ts: number;            // epoch ms
  method: string;
  url: string;
  reqBody: unknown;      // 已 parse 过的 JSON,如果不是 JSON 就是 string
  status?: number;       // HTTP 状态码 (网络失败时为 undefined)
  resBody?: unknown;
  durationMs: number;
  error?: string;        // 网络错误 / 抛出的异常文本
  group?: string;        // 调用方标签 (业务/调度),便于 UI 上着色
}

const MAX_EVENTS = 200;
let seq = 0;
const buf: TraceEvent[] = [];
const listeners = new Set<(events: TraceEvent[]) => void>();

function emit() {
  const snapshot = buf.slice();
  for (const fn of listeners) fn(snapshot);
}

export const trace = {
  push(ev: Omit<TraceEvent, "id">): TraceEvent {
    const full: TraceEvent = { id: ++seq, ...ev };
    buf.unshift(full);
    if (buf.length > MAX_EVENTS) buf.length = MAX_EVENTS;
    emit();
    return full;
  },
  list(): TraceEvent[] {
    return buf.slice();
  },
  clear() {
    buf.length = 0;
    emit();
  },
  subscribe(fn: (events: TraceEvent[]) => void): () => void {
    listeners.add(fn);
    fn(buf.slice());
    return () => listeners.delete(fn);
  },
};

// 包一层 fetch: 发请求前后落 trace, 不改变上层语义
// 顺手挂上 x-api-key (如果 localStorage 里设过). 调度器在 γ 模式下会强制要求这个 key.
// 注意:浏览器存 key 不是真正"安全",这只是把鉴权点固定下来,
// 真正的生产形态应当是前端只调 business, business 用服务凭证调度.
function readApiKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  return (localStorage.getItem("scheduler-api-key") || "").trim() || null;
}

export async function tracedFetch(
  input: string,
  init: RequestInit | undefined,
  group: string,
): Promise<Response> {
  const t0 = performance.now();
  const method = (init?.method ?? "GET").toUpperCase();
  let reqBody: unknown = undefined;
  if (init?.body && typeof init.body === "string") {
    try {
      reqBody = JSON.parse(init.body);
    } catch {
      reqBody = init.body;
    }
  }

  const apiKey = readApiKey();
  const finalInit: RequestInit | undefined = apiKey
    ? { ...init, headers: { ...(init?.headers ?? {}), "x-api-key": apiKey } }
    : init;

  let res: Response;
  try {
    res = await fetch(input, finalInit);
  } catch (e: any) {
    trace.push({
      ts: Date.now(),
      method,
      url: input,
      reqBody,
      durationMs: Math.round(performance.now() - t0),
      error: String(e?.message ?? e),
      group,
    });
    throw e;
  }

  // 复制 response 以免消费 body 影响调用方
  const cloned = res.clone();
  let resBody: unknown;
  try {
    const text = await cloned.text();
    try {
      resBody = JSON.parse(text);
    } catch {
      resBody = text;
    }
  } catch {
    resBody = "(unable to read body)";
  }

  trace.push({
    ts: Date.now(),
    method,
    url: input,
    reqBody,
    status: res.status,
    resBody,
    durationMs: Math.round(performance.now() - t0),
    group,
  });

  return res;
}
