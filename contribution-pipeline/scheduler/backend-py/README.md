# backend-py — Python/FastAPI 实现

Node 端 `../backend/` 的 1:1 等价实现。同库、同 schema、同 HTTP 接口,前端 / worker 切换无感。
迁移背景与映射表见 [`../docs/09-python-backend.md`](../docs/09-python-backend.md)。

## 快速上手

```bash
cd scheduler/backend-py
uv sync                                    # 安装依赖 (uv ≥ 0.4)
cp .env.example .env                       # 配 DATABASE_URL 等
uv run scheduler-migrate                   # 应用 ../backend/migrations/*.sql
uv run scheduler-seed                      # 注册节点 + 三个示例 pipeline
uv run scheduler-serve                     # uvicorn http://localhost:4000
```

## 测试

```bash
# 1. .env.test 指向 *_test / *_e2e 后缀的库 (conftest 强校验, 防误删生产)
# 2. conftest 自动起 uvicorn (端口已占则复用)
uv run pytest -q                           # 期望 231 passed
```

## 与 Node 端 (`../backend/`) 共存

| 维度 | 状态 |
|------|------|
| HTTP 接口 / DB schema / 业务语义 | 两端一致 (e2e 测试同形态) |
| in-process driver 体系 | 两端各有完整实现 (registry + 8 个 driver) |
| 独立 worker 进程 (ExternalWorkerNode) | 两端均已实现 (`base/external_worker_node.py` / `base/external-worker-node.ts`) |
| worker_threads 隔离沙箱 (SandboxWorkerNode) | **仅 Node** — Node 原生能力, Python 业务需要时自实现独立进程 worker |
| JS 沙箱子进程 | Python 通过 `tsx ../backend/src/sandbox-runner.ts` 一次性子进程 |
| 迁移文件 | 共享 `../backend/migrations/*.sql`, 双端任一可跑 |

**当前推荐**: dev / 测试用 backend-py;Node 端继续作为参考实现 + JS sandbox 子进程提供方。三路径接入(in-process / HTTP / 独立 worker)的"独立 worker"基类两端已对齐。

## 目录

```
backend-py/
├── pyproject.toml
├── migrations/           README only — 实际 SQL 在 ../backend/migrations/
├── src/scheduler/
│   ├── server.py         FastAPI app + lifespan
│   ├── db.py             asyncpg pool + with_tenant / as_system / with_caller_tx
│   ├── auth.py           API key 鉴权 + RBAC
│   ├── audit.py          审计 (4 KiB 截断 / trace_id / request_id / as_system 跨 RLS)
│   ├── api.py            调度核心路由
│   ├── business.py       业务层路由
│   ├── events.py         事件流路由
│   ├── reconciler.py     过期 lease 回收
│   ├── autoworker.py     in-process driver 执行器
│   └── drivers/          dedup / export / collect / ingest / compute / http / sandbox_js / llm_translate
│       └── base/         BaseNode / InProcessNode / ExternalWorkerNode + classify_error
└── test/                 14 个 pytest 文件 (与 Node 端 e2e 同形态)
```
