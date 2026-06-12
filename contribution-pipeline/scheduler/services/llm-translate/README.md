# llm_translate · HTTP driver service (Path B)

`scheduler/backend/src/drivers/http.ts` 通配 driver 把 step.params.driver="http" 的 job 转发到本服务。本服务调 Anthropic Messages API 完成翻译,封成 DriverResult 协议返回。

## 运行

```bash
# 本地
ANTHROPIC_API_KEY=sk-ant-... uvicorn main:app --port 8080
# 容器
docker build -t llm-translate . && docker run -p 8080:8080 -e ANTHROPIC_API_KEY=... llm-translate
```

## 接入清单

1. 跑过 migration `1715000260000_node_def_llm_translate.sql`(节点能力入表,A/B/C 共用)
2. 调度核心 env 加 `SANDBOX_URL_ALLOWLIST=http://<your-host>:8080`(否则被 `URL_NOT_ALLOWED` 拒)
3. Pipeline step:
   ```json
   { "key": "translate", "nodeKey": "llm_translate",
     "params": { "driver": "http", "url": "http://<host>:8080/run",
                 "targetLang": "zh", "model": "claude-haiku-4-5-20251001", "timeoutMs": 60000 } }
   ```

## 协议

- 入参 `POST /run`:DriverJob,见 `scheduler/backend/src/drivers/registry.ts:15-30`
- 返回:`{status:"success", output:{translated, targetLang, model}}` 或 `{status:"failed", error:{code, message, retryable}}`
- 响应体 ≤ 1 MiB(调度核心 `RESPONSE_CAP_BYTES`),否则被截断为 `HTTP_RESPONSE_TOO_LARGE`
