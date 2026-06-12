# 09 — Python 后端方案 (1:1 还原 Node 版本)

> 目标：在 `scheduler/backend-py/` 目录下，用 Python 3.12 + FastAPI 完整复现现有
> TypeScript/Fastify 后端的全部接口、数据库操作、鉴权、调度逻辑和驱动体系，
> 保持**相同 HTTP 接口、相同 DB schema、相同业务语义**，前端/外部 worker 无感切换。

---

## 1. 技术栈对应

| 职责 | Node 版本 | Python 版本 |
|------|-----------|-------------|
| Web 框架 | Fastify 5 | FastAPI + Uvicorn |
| 数据库客户端 | postgres.js | asyncpg |
| 请求上下文 | @fastify/request-context (AsyncLocalStorage) | `contextvars.ContextVar` |
| 数据校验 | Zod | Pydantic v2 |
| 定时任务 | node-cron | APScheduler (AsyncIOScheduler) |
| 后台循环 | `setTimeout` 递归 | `asyncio.Task` 循环 |
| API key 哈希 | `crypto.createHash('sha256')` | `hashlib.sha256` |
| UUID | `crypto.randomUUID()` | `uuid.uuid4()` |
| JSON Schema 校验 | ajv 8 | jsonschema 4 |
| LLM | Anthropic Node SDK | Anthropic Python SDK |
| JS 沙箱 | `vm` / `worker_threads` | 调用 `node` 子进程 (保留) |
| 迁移工具 | node-pg-migrate (SQL 文件) | 原样复用同一批 SQL 迁移文件 |
| 环境变量 | dotenv / `process.env` | `python-dotenv` / `os.environ` |
| 测试 | Node `--test` runner | pytest + pytest-asyncio |

---

## 2. 目录结构

```
scheduler/backend-py/
├── pyproject.toml            # Poetry / uv 项目描述
├── .env.example
├── src/
│   └── scheduler/
│       ├── server.py         # FastAPI app + lifespan (对应 server.ts)
│       ├── db.py             # asyncpg pool + with_tenant / as_system (对应 db.ts)
│       ├── auth.py           # API key 鉴权 + RBAC (对应 auth.ts)
│       ├── types.py          # Pydantic 模型 (对应 types.ts)
│       ├── node_config.py    # mergeEffectiveParams / resolveBindings (对应 node-config.ts)
│       ├── result_core.py    # applyResult (对应 result-core.ts)
│       ├── output_validator.py  (对应 output-validator.ts)
│       ├── idempotency.py    (对应 idempotency.ts)
│       ├── audit.py          (对应 audit.ts)
│       ├── partition.py      (对应 partition.ts)
│       ├── step_rules.py     (对应 step-rules.ts)
│       ├── env_check.py      (对应 env-check.ts)
│       ├── reconciler.py     (对应 reconciler.ts)
│       ├── autoworker.py     (对应 autoworker.ts)
│       ├── api.py            # 调度核心路由 (对应 api.ts)
│       ├── business.py       # 业务层路由 (对应 business.ts)
│       ├── events.py         # 事件流路由 (对应 events.ts)
│       └── drivers/
│           ├── registry.py   (对应 drivers/registry.ts)
│           ├── _client.py    (对应 drivers/_client.ts)
│           ├── _upsert.py    (对应 drivers/_upsert.ts)
│           ├── base/
│           │   ├── base_node.py        (对应 base/base-node.ts)
│           │   ├── in_process_node.py  (对应 base/in-process-node.ts)
│           │   ├── external_worker_node.py
│           │   └── errors.py
│           ├── dedup.py
│           ├── export.py
│           ├── collect.py
│           ├── ingest.py
│           ├── compute.py
│           ├── http.py
│           ├── sandbox_js.py
│           └── llm_translate.py
└── test/
    ├── conftest.py
    ├── test_api_e2e.py
    ├── test_auth.py
    ├── test_drivers.py
    ├── test_multitenant.py
    └── ...
```

---

## 3. 核心模块映射

### 3.1 `db.py` — 数据库层

```python
# asyncpg 连接池 + 3 个事务辅助函数，与 db.ts 1:1

pool: asyncpg.Pool  # 全局单例，lifespan 初始化

async def with_tenant(tenant_id: str, fn):
    """开事务 + SET LOCAL app.tenant_id → RLS 生效"""
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(f"SELECT set_config('app.tenant_id', $1, true)", tenant_id)
            return await fn(conn)

async def as_system(fn):
    """SET LOCAL app.role='system' → 跳 RLS，仅供 reconciler/autoworker"""
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("SELECT set_config('app.role', 'system', true)")
            return await fn(conn)

async def with_caller_tx(caller: CallerInfo, fn):
    if caller.is_system_actor:
        return await as_system(fn)
    return await with_tenant(caller.tenant_id, fn)
```

**差异说明**：postgres.js 的 tagged template literal (`sql\`...\``) 换成 asyncpg 的
`conn.execute("... $1 ...", value)` 参数化查询，语义等价，安全性相同。

---

### 3.2 `auth.py` — 鉴权与 RBAC

```python
# FastAPI Middleware + Dependency

API_KEY_HEADER = "x-api-key"
TENANT_ID_HEADER = "x-tenant-id"
DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"
INTERNAL_KEY = str(uuid.uuid4())  # 进程启动时生成，与 Node 版完全等价

def hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()

@dataclass
class CallerInfo:
    id: str
    name: str
    scope: str
    tenant_id: str
    is_system_actor: bool
    permissions: set[str]  # {"*"} = 通配
```

鉴权中间件注册为 `app.middleware("http")`，在路由前执行，把 `CallerInfo` 存入
`request.state.caller`（FastAPI 的请求状态对象，等价于 Fastify 的 `req.caller`）。

RBAC 集中式路由权限表 (`ROUTE_PERMISSIONS: dict[str, str]`) 与 Node 版完全一致，
作为 `Depends(require_permission(...))` 注入到每条路由。

---

### 3.3 `types.py` — Pydantic 模型

TypeScript 接口一一转为 Pydantic v2 `BaseModel`：

```python
class StepConfig(BaseModel):
    key: str
    node_key: str
    node_version: str | None = None
    label: str | None = None
    params: dict[str, Any] = {}
    inputs: dict[str, Any] | None = None
    routes: Routes | None = None
    policy: StepPolicy | None = None

class Envelope(BaseModel):
    payload: dict[str, Any] = {}
    outputs: dict[str, Any] = {}
    tags: dict[str, str] = {}

class OutboxRow(BaseModel):
    run_id: str
    tenant_id: str
    item_id: str
    task_id: str
    step_key: str
    node_key: str
    status: Literal["pending", "leased", "done", "failed"]
    attempt: int
    ...
```

---

### 3.4 `node_config.py` — 绑定解析

`mergeEffectiveParams`、`resolveBindings`、`resolveOne`、`getPath` 直接翻译：

```python
FORBIDDEN_KEYS = {"__proto__", "constructor", "prototype"}

def get_path(obj: Any, path: str) -> Any:
    for k in path.split("."):
        if k in FORBIDDEN_KEYS:
            return None
        if not isinstance(obj, dict) or k not in obj:
            return None
        obj = obj[k]
    return obj

FULL_EXPR = re.compile(r'^\{\{([\w.]+)\}\}$')
PARTIAL_EXPR = re.compile(r'\{\{([\w.]+)\}\}')

def resolve_one(value: Any, ctx: dict) -> Any:
    if not isinstance(value, str):
        return value
    m = FULL_EXPR.match(value)
    if m:
        return get_path(ctx, m.group(1))
    if "{{" not in value:
        return value
    def replace(m):
        v = get_path(ctx, m.group(1))
        return "" if v is None else str(v)
    return PARTIAL_EXPR.sub(replace, value)
```

---

### 3.5 `server.py` — 启动与 lifespan

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 生产环境门禁
    check_production_env()
    # 初始化 asyncpg pool
    await init_db_pool()
    # 启动后台任务
    reconciler_task = asyncio.create_task(reconciler_loop())
    autoworker_task = asyncio.create_task(autoworker_loop())
    yield
    # Graceful shutdown: 停循环 → 释放 lease → 关 pool
    reconciler_task.cancel()
    autoworker_task.cancel()
    await release_autoworker_leases()
    await close_db_pool()

app = FastAPI(lifespan=lifespan)
app.add_middleware(AuthMiddleware)
app.include_router(core_router)      # api.py
app.include_router(business_router)  # business.py
app.include_router(events_router)    # events.py
```

请求上下文用 `contextvars.ContextVar` 替代 AsyncLocalStorage：

```python
_req_id_var:   ContextVar[str | None] = ContextVar("req_id",    default=None)
_tenant_id_var: ContextVar[str | None] = ContextVar("tenant_id", default=None)
```

---

### 3.6 `reconciler.py` — 过期 lease 回收

```python
async def reconciler_loop():
    while True:
        try:
            await reconcile_tick()
        except Exception as e:
            logger.error(f"[reconciler] tick error: {e}")
        await asyncio.sleep(30)
```

`reconcile_tick` 内部逻辑与 Node 版 1:1：advisory lock → 扫 expired leases →
写 timeout attempt → 判 canRetry → 新增 pending run 或推 stuck。

---

### 3.7 `autoworker.py` — 自动执行器

```python
async def autoworker_loop():
    await bootstrap_drivers()
    consecutive_empty = 0
    while True:
        tick_jobs = 0
        for node_key in auto_node_keys():
            tick_jobs += await process_one(node_key)
        if tick_jobs > 0:
            consecutive_empty = 0
        else:
            consecutive_empty += 1
        delay = 10.0 if consecutive_empty >= IDLE_THRESHOLD else 2.0
        await asyncio.sleep(delay)
```

同步等价于 Node 版的 `setTimeout` 递归退避逻辑。

---

### 3.8 `drivers/` — 驱动体系

#### `registry.py`

```python
@dataclass
class Driver:
    name: str
    node_key: str
    handle: Callable[[DriverJob], Awaitable[DriverResult]]
    enable: Callable[[DriverJob], bool] | None = None
    node_definition: DriverNodeDefinition | None = None
    skip_auto_lease: bool = False

_drivers: list[Driver] = []

def register_driver(d: Driver) -> None:
    _drivers.append(d)

def pick_driver(job: DriverJob) -> Driver | None:
    # 三轮派发：精确版本 → nodeKey 兜底 → 通配 "*"
    ...

def auto_node_keys() -> list[str]:
    return list({d.node_key for d in _drivers if d.node_key != "*" and not d.skip_auto_lease})
```

#### `base/base_node.py`

```python
class BaseNode(ABC):
    @property
    @abstractmethod
    def node_definition(self) -> DriverNodeDefinition: ...

    @abstractmethod
    async def handle(self, job: DriverJob) -> DriverResult: ...

    async def invoke(self, job: DriverJob) -> DriverResult:
        try:
            await self.before_handle(job)
            out = await self.handle(job)
            await self.after_handle(job, out)
            # outputsSchema 校验
            if out["status"] == "success":
                v = validate_node_output(...)
                if v and self.node_definition.outputs_validation == "strict":
                    return {"status": "failed", "error": {...}}
            return out
        except Exception as e:
            c = classify_error(e)
            return {"status": "failed", "error": c}

    def as_driver(self) -> Driver:
        return Driver(
            name=self.name,
            node_key=self.node_definition.key,
            node_definition=self.node_definition,
            enable=self.enable if hasattr(self, 'enable') else None,
            handle=self.invoke,
        )
```

各 driver（`DeduplicateNode`、`ExportNode`、`CollectNode`、`IngestNode`、
`ComputeNode`、`HttpNode`、`SandboxJsNode`、`LlmTranslateNode`）
继承 `InProcessNode(BaseNode)`，只实现 `handle()`，逻辑与 TypeScript 版逐行对应。

---

### 3.9 JS 沙箱节点 (`sandbox_js.py`)

Node 版依赖 `vm`/`worker_threads` 跑 JavaScript，Python 无法直接替代。
方案：**保留子进程调用**——`SandboxJsNode.handle()` 启动 `node sandbox-worker.js`
子进程（通过 `asyncio.create_subprocess_exec`），通过 stdin/stdout JSON 协议通信，
与现有 `sandbox-worker-main.ts` 接口不变。

```python
proc = await asyncio.create_subprocess_exec(
    "node", SANDBOX_WORKER_PATH,
    stdin=PIPE, stdout=PIPE, stderr=PIPE
)
stdout, _ = await asyncio.wait_for(proc.communicate(input=payload_json), timeout=10)
```

---

## 4. 接口层映射

所有路由路径、HTTP 方法、请求/响应体与 Node 版完全相同。
Fastify 的 `reply.code(N).send({...})` → FastAPI 的 `raise HTTPException(status_code=N, detail={...})`
或直接 `return JSONResponse(content={...}, status_code=N)`。

Fastify 的 `req.body` / `req.params` / `req.query` →
FastAPI 的 Path 参数、`Body(...)` Pydantic 模型、`Query(...)` 参数。

幂等键中间件 (`idempotency.py`) 注册为 FastAPI `Middleware`，
拦截相同 URL 列表，逻辑与 `idempotency.ts` 完全等价。

全局错误翻译（Zod → Pydantic ValidationError → 400 BAD_REQUEST）：

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(status_code=400, content={
        "error": {"code": "BAD_REQUEST", "message": str(exc)}
    })
```

---

## 5. 多租户与 RLS

`with_tenant` / `as_system` / `with_caller_tx` 在 Python 里完全等价。
DB schema 和 RLS 策略（`1715000100000_tenant_rls.sql`）原封不动复用——
Python 只是换了连接库，SQL 层不改。

---

## 6. 迁移

**迁移文件不变**：`scheduler/backend/migrations/` 下的 SQL 文件同时供两个后端使用。
Python 版的迁移命令改用 `python -m scheduler.migrate up` 或直接用 `alembic`
按 raw SQL 执行（推荐按原 node-pg-migrate 脚本格式封装一个薄包装，保持文件路径一致）。

---

## 7. 依赖清单 (`pyproject.toml`)

```toml
[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.115"
uvicorn = {extras = ["standard"], version = "^0.32"}
asyncpg = "^0.30"
pydantic = "^2.10"
pydantic-settings = "^2.7"
apscheduler = "^3.11"
jsonschema = "^4.23"
anthropic = "^0.40"
python-dotenv = "^1.0"
httpx = "^0.27"        # HTTP driver + 测试客户端

[tool.poetry.group.dev.dependencies]
pytest = "^8.3"
pytest-asyncio = "^0.24"
pytest-httpx = "^0.32"
ruff = "^0.8"
mypy = "^1.13"
```

---

## 8. 测试策略

Node 版的 e2e 测试（`test/api.e2e.test.ts` 等 13 个文件）1:1 翻译为 pytest 文件，
使用相同的测试 DB（`.env.test`）、相同的 seed 数据、相同的断言逻辑。

`conftest.py` 提供：
- `async_client` fixture（httpx AsyncClient 封装 FastAPI testclient）
- `db_pool` fixture（测试前跑迁移 + seed，测试后 TRUNCATE）
- `internal_auth_headers` fixture（等价于 Node 版的 INTERNAL_KEY 注入）

---

## 9. 实施步骤

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| P0 | 搭骨架：`server.py` + `db.py` + `auth.py` + `/health` | 先跑起来 |
| P1 | 调度核心路由（`api.py`）：pipeline/item/queue/result | 覆盖核心链路 |
| P2 | 驱动体系：`registry.py` + `base_node.py` + autoworker + reconciler | 自动节点跑通 |
| P3 | 业务层路由（`business.py`）：batch/collect/review | 完整 C 端链路 |
| P4 | 各 driver 翻译（dedup/export/compute/http/llm/collect/ingest） | 节点功能完整 |
| P5 | 测试翻译（13 个测试文件 → pytest）+ CI 接入 | 回归验证 |

---

## 10. 设计选择 (落槌)

- **sandbox_js**: 保留 Node 子进程。`tsx ../backend/src/sandbox-runner.ts` 一次性 stdin/stdout JSON RPC, 与 `drivers/sandbox-js.ts` 同源, 共享 vm globals 屏蔽规则。RestrictedPython / Pyodide 与 Node 端 vm 语义差异过大, 复用 Node 沙箱跨端共享攻击面更可控。
- **迁移工具**: 直接 asyncpg + `schema_migrations` 表薄包装 (`src/scheduler/migrate.py`), 跑 `../backend/migrations/*.sql`。Alembic 的 Python 模型 / autogen 在这套"SQL 才是真相"的迁移流里反而是负担。
- **运行器**: dev / staging 用 uvicorn 单进程 (`uv run scheduler-serve`)。生产横向扩容时多副本部署 (reconciler 用 `pg_advisory_lock` 互斥, 多副本安全), 单副本内不开 workers (autoworker / reconciler 在 lifespan 起的 asyncio task 假设单进程, 多 worker 会重复执行 — 真要并发先把它们抽到独立 worker 进程)。
- **包管理**: uv。fast, lockfile 内嵌, scripts 入口走 `[project.scripts]`。

## 11. 当前进度 (与 Node 端的差异)

- **已落齐**: 全部 HTTP 路由 / driver 体系 (BaseNode / InProcessNode / ExternalWorkerNode) / RLS / RBAC / audit (4 KiB 截断 + trace_id + request_id + as_system) / idempotency / events / 14 个 e2e 测试文件 → 231 passed / 0 skipped
- **仅 Node 端有**: `SandboxWorkerNode` (worker_threads 隔离, Node 原生能力) 与 `sandbox-worker-main.ts` 启动脚本。Python 端的 `ExternalWorkerNode` 基类已对齐, 业务方可在 Python 进程里自实现独立 worker 子类 (子进程 / 协程池 / GPU 节点)。
- **共用**: SQL 迁移文件 (`backend/migrations/*.sql`)、`sandbox-runner.ts` 子进程入口 (sandbox_js driver 借道)。
