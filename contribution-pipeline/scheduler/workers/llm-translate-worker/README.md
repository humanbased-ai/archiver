# llm_translate · 独立 worker 进程 (Path C)

主动调调度核心 4 个公开接口(lease/heartbeat/release/result),自带心跳与优雅停机。横向扩 N 个 = 起 N 个进程,`WORKER_ID` 各自唯一,`SKIP LOCKED` 自动分摊。

## 一次性准备

```bash
# 1. 跑 migration 注册节点能力 (A/B/C 共用)
cd ../../backend && npm run migrate

# 2. 签出 worker-only API key (RBAC 角色 = worker, 含 queue.lease / queue.result)
npm run keys:create -- --name=llm-translate-worker --tenant=<slug> --roles=worker
# → 输出一条 sk_... 记下来当 SCHEDULER_API_KEY
```

## 运行

```bash
SCHEDULER_URL=http://localhost:4000 \
SCHEDULER_API_KEY=sk_xxx \
ANTHROPIC_API_KEY=sk-ant-... \
WORKER_ID=llm-translate-1 \
python worker.py

# 容器
docker build -t llm-translate-worker .
docker run --rm \
  -e SCHEDULER_URL=http://scheduler:4000 \
  -e SCHEDULER_API_KEY=sk_xxx \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e WORKER_ID=llm-translate-1 \
  llm-translate-worker
```

## Pipeline 引用

```json
{ "key": "translate", "nodeKey": "llm_translate",
  "params": { "targetLang": "zh", "model": "claude-haiku-4-5-20251001" },
  "policy": { "timeoutMs": 90000, "maxAttempts": 3 } }
```

注意:**不要**写 `"driver": "http"` —— 那是 Path B。Path C 的 worker 直接按 nodeKey 拉队列,不需要任何派发提示。

## 跟 Path A 的关系

A (autoworker 内置 driver) 和 C (独立 worker) 都按 `nodeKey="llm_translate"` 拉同一队列,`SKIP LOCKED` 保证不会双发。两者**可同时存在**(autoworker 当兜底,独立 worker 横向扩主力),也可任选其一关掉:
- 关 A:autoworker 不设 `ANTHROPIC_API_KEY` → `registerLlmTranslateDriver()` 自动跳过
- 关 C:停 worker 进程即可

## 配置项

| Env | 默认 | 说明 |
|---|---|---|
| `LEASE_SECONDS` | 90 | 长任务推荐 ≥60;心跳每 LEASE_SECONDS/3 一次 |
| `BATCH_SIZE` | 5 | 单次 lease 拉几条 |
| `WORKER_ID` | 随机 | 集群内必须唯一 |
