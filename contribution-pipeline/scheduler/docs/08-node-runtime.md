# 08 — 节点运行机制

> 面向新接入开发者和 PMO。解释节点从注册到执行的全链路，以及关键设计选择的原因。

---

## 1. 节点是什么

节点（Node）是 pipeline 的执行单元。pipeline 作者把若干 step 串联成有向图，每个 step 指向一个 `(nodeKey, nodeVersion)`，由调度器在运行时把 step 派发给对应节点处理。

节点的元数据存在 `node_definitions` 表，包含：参数 schema、UI 渲染配置、运行模式、状态。**节点本身是全局共享的**，不属于任何一个租户；租户看到同一份节点目录，通过各自的 pipeline 使用。

---

## 2. 节点如何进入系统

### 内置节点（in-process）

服务启动时自动 upsert 进 `node_definitions`：

```
npm run dev
  └─ registerBuiltinDrivers()
       └─ db.upsert("node_definitions", { key:"script", status:"active", ... })
```

代码里的 `nodeDefinition` 字段就是 DB 里那行记录的来源。改代码，重启服务，DB 自动同步。

### 外部节点

通过 `POST /api/v1/admin/nodes` 手动注册，可指定 `runMode`（`internal_http` / `external_worker` / `manual`）。

---

## 3. 节点的运行模式

```
node_definitions.run_mode
  ├── embedded          → 主进程内执行（InProcessNode）
  ├── external_worker   → 独立进程通过 HTTP lease 拉活（ExternalWorkerNode）
  ├── internal_http     → 调度器主动 POST 到内部 URL
  └── manual            → 无 driver，等人工确认
```

### embedded（SandboxJsNode）

脚本在主进程内、`node:vm` 上下文里同步执行：

```
autoworker 扫 outbox
  └─ lease(nodeKey="script")
  └─ SandboxJsNode.handle(job)
       └─ vm.createContext(sandbox)    ← 每 job 新建独立 V8 Context
       └─ vm.runInContext(script, ctx) ← 脚本在沙箱里跑
       └─ submitResult(output)
```

**为什么每 job 新建 Context：** V8 Context 是有状态的。如果复用，上一个 job 在沙箱里写的变量会泄漏到下一个 job。新建的代价是 ~1.5 MB/job，GC 后立即释放，在低并发下可以接受。

### external_worker（SandboxWorkerNode）

Worker 进程独立部署，通过 HTTP 轮询调度器拿任务：

```
npm run sandbox-worker
  └─ SandboxWorkerNode.leaseLoop()
       └─ POST /queue/script/lease     ← 问调度器拿 job
       └─ new Worker(THREAD_SCRIPT)    ← 每 job 新建 worker_threads 线程
            └─ vm.runInContext(script) ← 脚本在独立线程+独立 V8 Isolate 里跑
       └─ POST /queue/script/result    ← 把结果交回调度器
```

**为什么用 worker_threads 而不是主进程跑：** 用户脚本可能 OOM。OOM 在主进程里会打垮整个服务和所有并发 job；在独立线程里只杀当前 Worker，主进程和其他 job 不受影响。代价是每个线程 ~15–25 MB 固定开销。

---

## 4. 数据隔离：不同 pipeline 的 job 互不污染

每次 `handle()` 的 sandbox 是通过 `structuredClone` 深拷贝构造的：

```typescript
const sandbox = {
  inputs:  structuredClone(job.inputs),
  params:  structuredClone(job.params),
  payload: structuredClone(job.envelope.payload),
  outputs: structuredClone(job.envelope.outputs),
};
```

脚本修改的是这份副本，原始 envelope 不受影响。Pipeline A 和 Pipeline B 的 job 即使同时执行，各自拿到的是完全独立的数据副本。

另一层隔离是 **inputs binding**：脚本只能读 `inputs.*`，而 `inputs` 是 lease 时由调度器把 `step.inputs.{{表达式}}` 解析成字面量后注入的。脚本不知道自己在哪个 pipeline 里，也访问不到其他 step 的数据。

---

## 5. 调试任务与生产任务隔离

调试走 `POST /api/v1/admin/nodes/:key/:version/debug/run`，不经过 outbox：

| | 生产 job | 调试 dry-run |
|---|---|---|
| 触发来源 | outbox lease | HTTP 直接调用 |
| itemId / taskId | 真实 DB 记录 | 随机 UUID，不入库 |
| envelope 数据 | 真实 item | 调试面板填写的假数据 |
| 写 DB | outbox、attempts、audit | 不写（仅记 dry-run 审计行） |
| ctx.dryRun | false | true（driver 可据此跳过外网调用）|
| 超时保护 | step policy.timeoutMs | 额外加 5 s 兜底 |

调试任务和生产任务调用同一个 `driver.handle()` 函数，但构造的 `DriverJob` 完全独立，互不干扰。

---

## 6. 节点状态与生命周期

```
active ──暂停──► paused ──启动──► active
  │                                  │
  └─────────归档────────► archived ──激活──► active
```

| 状态 | pipeline 可引用 | 接收新 lease | 已在飞 job |
|------|:-:|:-:|---|
| `active` | ✓ | ✓ | 正常 |
| `paused` | ✓（不推荐） | ✗ | 已 lease 的跑完，pending 停止积压 |
| `archived` | ✗（409 拒绝） | ✗ | 已 lease 的跑完，pending 停止积压 |

**关键设计选择**：lease SQL 直接 `JOIN node_definitions WHERE nd.status = 'active'`，节点状态变更立即生效，不需要重启服务或清空队列。archived 之后，pipeline 发布时 `checkArchivedNodeRefs()` 会拒绝任何引用已 archived 节点的新版本。

---

## 7. 内存开销小结

| 路径 | 每 job 新分配 | 释放时机 | 并发 10 job 峰值 |
|------|------|------|------|
| SandboxJsNode（vm.createContext）| ~1.5 MB Context + 数据副本 | handle() 返回后 GC | ~15–20 MB |
| SandboxWorkerNode（new Worker）| ~15–25 MB OS 线程 + V8 Isolate | job 完成线程退出 | ~150–250 MB |

SandboxWorkerNode 开销更大，换来的是：脚本 OOM 只杀本线程，主进程和其他 job 安全。在 `batchSize=1`（当前默认）下峰值可控；如果未来需要高吞吐，可以引入固定大小的 Worker Pool，以降低隔离级别（Isolate 共享，Context 独立）为代价消除线程启动延迟。
