# 调度中心 · 节点分层架构

> 节点实现侧的分层方案: 公共壳 (lease / 心跳 / 校验 / 提交 / 异常归类) 沉到基类, 具体节点只实现 `handle(job)` 业务逻辑. 跟 06 篇 (协议层) 互补: 06 讲 "节点与调度中心之间的契约", 本篇讲 "节点内部实现怎么组织".
>
> **配图**:
>   - 类层次架构 [`assets/07-node-class-hierarchy.svg`](./assets/07-node-class-hierarchy.svg)
>   - 实例处理一个 job 的生命周期 [`assets/07-node-instance-lifecycle.svg`](./assets/07-node-instance-lifecycle.svg)
>
> **重要: SVG 是目标架构示意, 不代表 P1 全部实现范围. 实际落地按 §9 分阶段, P1 只做最小核心.**

---

## 0. 范围声明 (TL;DR)

本文档**显式分两层**, 看的人请先对号入座再读:

| 层 | 内容 | 状态 |
|---|---|---|
| **A. 目标架构** | §4 / §5 / §6 / §7 描述的 5 层结构 + 4 种 runMode 壳 | 长期形态, **不要求一次性落地** |
| **B. P1 最小落地** | §9 第一项: `BaseNode` + `ExternalWorkerNode` + `SandboxWorkerNode` 一个实例 | **本周可做**, 解决 sandbox-js 生产化 |
| **C. 延后实现** | `InProcessNode` / `HttpServiceNode` / `ManualNode` / 老 driver 平迁 | 等真实重复出现 / sandbox-worker 跑通后再做 |

**关键原则**:

1. 老的函数式 `Driver` 字面量 (`src/drivers/dedup.ts` 等) **不强制 class 化**. 新旧并存一段时间, 让基类经实战检验后再统一.
2. P1 落地**只解决一个问题**: 让 sandbox-worker 不重复造 lease / 心跳 / 退避 / 重试 / 优雅停机的轮子. 其它价值是顺带 / 长期收益.
3. 文档里描绘的 `OcrHttpNode` / `PythonInferNode` / `GpuTrainNode` 是**示意**, 不是 P1 排期. 这些 driver 等真有 2-3 个相似模式出现, 再回头抽 `HttpServiceNode` / `PyExternalWorker` 也来得及.
4. `ManualNode` 当前**留作概念占位**, 不进 P1. annotate/review 业务规则现在散在 `business.ts` 跑得稳, 不要为了"统一架构"动它.

带着这个范围读后面, 不会被"完整 5 层"吓到一次性重构.

---

## 1. 设计目标

| 目标 | 含义 |
|---|---|
| **公共逻辑单一源** | lease 轮询 / 退避 / 心跳 / 重试 / 输入校验 / 输出校验 / 结果提交 / 异常归类 / metrics, 这些跟业务无关的东西**只写一遍**, 在基类里 |
| **子类极简** | 写一个新节点 = 选个壳 + 写 `nodeDefinition` + 写 `handle(job)`; 不感知调度协议 / 不写 lease 循环 / 不处理租约 |
| **不破坏现状协议** | 调度核心 (scheduler-backend) 的 lease / heartbeat / result API 一字不改; 改造**只发生在节点实现侧** |
| **多 runMode 各自封装** | embedded / internal_http / external_worker / manual 4 种执行形态各有专门壳, 不混在一个万能基类里 |
| **生产化 sandbox 收益最大化** | `ExternalWorkerNode` 抽出来后, sandbox-worker / Python worker / GPU worker 共用一份 lease 循环 |

## 2. 跟 06 篇的关系

| | **06-node-design.md** | **本篇 (07)** |
|---|---|---|
| 视角 | 节点 ↔ 调度中心之间的**协议** | 节点**内部实现**的代码组织 |
| 关心 | schema / lease / result / version / 后台管理 | class 继承 / 公共壳 / 钩子 / 实例化 |
| 改谁 | DB schema / API endpoint / 编辑器 | `src/drivers/*.ts` 文件结构 / driver 注册流程 |

简单说: 06 是 "**节点对外长什么样**", 07 是 "**节点内部怎么写**".

## 3. 当前现状与痛点

### 3.1 现状回顾

调度核心已经把不少公共逻辑抽走了 (Phase 1-3 累计):

- **服务端 lease** 已经做 `mergeEffectiveParams` + `resolveBindings` — driver 拿到的 `job` 已是清洗好的形态
- **服务端 result** 已经做 `outputsSchema` 强校验 + 路由计算
- **autoworker.ts** 是同进程薄循环, 所有 InProcess driver 共享

`Driver` 接口当前长这样 (`src/drivers/registry.ts`):

```ts
export interface Driver {
  name: string;
  nodeKey: string;
  nodeDefinition?: DriverNodeDefinition;
  enable?: (job: DriverJob) => boolean;
  handle: (job: DriverJob) => Promise<DriverResult>;
}
```

函数式 + 字面量风格. 加节点 = 写 `{...}` + `registerDriver(...)`.

### 3.2 痛点

| # | 痛点 | 触发场景 |
|---|---|---|
| 1 | **没有 ExternalWorker 基类** | sandbox-js 生产化 (独立进程) 时, lease 循环 / 心跳 / 退避 / 重试 / 优雅停机 全部要重写一份; Python worker / GPU worker 同样要重写 |
| 2 | **lifecycle 钩子缺失** | driver 没有 `onInit / onShutdown`, 想建连接池 / 加载模型 / 释放资源, 只能放进 `handle` 里或自己起全局变量 |
| 3 | **状态散落** | driver 是无状态函数对象, 想缓存 / metrics / 限流 → 散在模块作用域全局变量, 实例隔离不干净 |
| 4 | **输入校验客户端缺失** | inputsSchema 当前只在服务端 lease 时校验; driver 本身没有"防御性校验"层, 集成测试 / dry-run 跳过校验时风险高 |
| 5 | **错误归类重复** | 每个 driver 自己 try/catch 决定 retryable=true/false; 没有标准异常类 |
| 6 | **HttpService 模式缺乏共享** | OCR / translate 等内网服务调用都重复 "fetch + timeout + retry + allowlist 校验" |
| 7 | **加新节点引导不足** | 新人/AI 写 driver 缺一个清晰骨架, 现状像"写一个对象字面量", 比"继承一个类"门槛低但形态散 |

## 4. 类层次架构 (5 层)

→ 详见 [`assets/07-node-class-hierarchy.svg`](./assets/07-node-class-hierarchy.svg)

```text
L0  INodeContract             (interface)     ← 抽象协议: nodeDefinition + handle
              ↑ 实现
L1  BaseNode                  (abstract)      ← 公共基类: 校验 / metrics / 钩子
              ↑ 继承
L2  4 种 runMode 壳 (abstract)                ← 按执行方式分化
     ┌─────────────────────────┬─────────────────────────┬──────────────────────────┬───────────────────┐
     │ InProcessNode (embedded) │ HttpServiceNode (http)  │ ExternalWorkerNode (ext) │ ManualNode (manual)│
     │ 主进程内 autoworker 派发 │ 主进程内转发到内网 URL  │ 独立进程自带 lease 循环  │ 业务层 UI claim+提交│
     └─────────────────────────┴─────────────────────────┴──────────────────────────┴───────────────────┘
              ↑ 继承
L3  具体节点类
     ┌─────────────────────────────┬──────────────────┬────────────────────────────┬───────────────────┐
     │ DedupNode / ExportNode      │ OcrHttpNode      │ SandboxWorkerNode          │ AnnotateNode      │
     │ ComputeNode / SandboxJsNode │ TranslateHttpNode│ PythonInferNode            │ ReviewNode        │
     │ LlmTranslateNode            │                  │ GpuTrainNode               │                   │
     └─────────────────────────────┴──────────────────┴────────────────────────────┴───────────────────┘
              ↓ new + register
L4  实例化
     主进程:    const dedup = new DedupNode(); register(dedup); ...
     独立进程:  const sandbox = new SandboxWorkerNode(cfg); await sandbox.start();
```

### 4.1 为什么不混成一个万能基类

`InProcessNode` 跑在主进程 autoworker 循环里, 不需要自己的 lease 循环; `ExternalWorkerNode` 必须自带循环 / 心跳 / 退避; `HttpServiceNode` 连 `handle` 都默认实现 (`fetch` 转发); `ManualNode` 没有 `handle`, 只有 `claim/submit`. 强行合并会出现一堆 `if (runMode === ...)` 分支, 分了反而清爽.

## 5. 公共壳 vs 子类分工

→ 详见 [`assets/07-node-instance-lifecycle.svg`](./assets/07-node-instance-lifecycle.svg) 中"单 job 处理流程".

| 责任 | 由谁实现 | 说明 |
|---|---|---|
| `nodeDefinition` 静态字段 | **子类** | key / version / paramsSchema / inputsSchema / outputsSchema / presets / examples 等 |
| `handle(job)` 业务逻辑 | **子类 abstract** | 唯一必填. 给定 inputs/params, 返回 output |
| `validateInputs(job)` | 基类 final | 按 `inputsSchema.required` 校验; 不符 → 直接 submitFailed |
| `validateOutput(output)` | 基类 final | ajv 跑 `outputsSchema`; strict 翻 failed, warn 仅记 audit (06 §4.4) |
| `classifyError(e)` | 基类 final | 异常 → retryable 判定 (TimeoutError/Network=true, ValidationError=false) |
| `emitMetrics(job, ms)` | 基类 final | 耗时 / 成功率 / 节点维度 metrics |
| `lease 循环` | ExternalWorkerNode | 仅 external. start/stop/leaseLoop/退避 |
| `heartbeat(runId)` | ExternalWorkerNode | 长任务并发触发, handle 进行中按 leaseSeconds×0.5 续 |
| `submitResult(runId, r)` | 基类 / ExternalWorkerNode | POST /result, 含网络失败重试 |
| `release(runId)` | ExternalWorkerNode | 优雅停机时释放在飞 lease |
| `onInit() / onShutdown()` | 子类 hook (可选) | 建连接池 / 加载模型 / 释放资源 |
| `beforeHandle / afterHandle` | 子类 hook (可选) | dryRun 短路 / 鉴权 / 脱敏 |

**经验法则**: 子类只关心 ① `nodeDefinition` ② `handle` ③ 4 个可选 hook. 凡是"跟调度协议相关"的全在基类.

## 6. 类型定义草图

> 设计上采用**模板方法模式**: 公共流程封装在 `public` 入口里 (`invoke` / `processJob`), 子类只实现 `protected abstract handle`. TypeScript 没有 `final` 关键字, 这里靠"公共方法用 `public` + private 内部跑流程"约束子类不能改流程, 不要靠注释承诺.
>
> 另: 校验语义跟服务端的关系: **服务端校验是权威, 节点端校验是 defense-in-depth** — 给 dry-run / 测试绕过服务端路径时兜底. 两端**必须共用同一个 `outputsValidation` 语义** (strict/warn/off), 避免出现"节点说 success / 服务端说 failed" 的撕裂.

```ts
// 实现路径: src/drivers/base/  (P1 落地范围)

// ─── L0 协议接口 (概念锚点, 可选) ─────────────────────────────
// 当前 Driver 接口 (src/drivers/registry.ts) 已经能用. INodeContract 仅作教学说明,
// 不强制单独定义 — BaseNode 提供 .asDriver() 适配老 registry, 避免重复协议.
//
// export interface INodeContract {
//   readonly nodeDefinition: DriverNodeDefinition;
//   handle(job: DriverJob): Promise<DriverResult>;
// }

// ─── L1 公共基类 ───────────────────────────────────────────────
export abstract class BaseNode {
  abstract readonly nodeDefinition: DriverNodeDefinition;

  /** 子类唯一必填. 给定 inputs/params, 返回 output. 不关心 lease/心跳/校验. */
  protected abstract handle(job: DriverJob): Promise<DriverResult>;

  // ── 框架方法 (模板方法 — public 接口由子类壳调用, 内部流程私有, 子类不应重写) ──

  /**
   * 跑完整流程: validateInputs → beforeHandle → handle → afterHandle → validateOutput.
   * 在 InProcessNode (autoworker 派发) 和 ExternalWorkerNode (processJob 内部) 两处调用.
   */
  public async invoke(job: DriverJob): Promise<DriverResult> {
    this.validateInputs(job);
    await this.beforeHandle(job);
    try {
      const out = await this.handle(job);
      await this.afterHandle(job, out);
      if (out.status === "success") {
        const v = this.validateOutput(out.output);
        if (v && this.shouldFailOnViolation()) return this.toViolationFail(v);
      }
      return out;
    } catch (e) {
      const { code, retryable } = this.classifyError(e);
      return { status: "failed", error: { code, message: String((e as Error)?.message ?? e), retryable } };
    }
  }

  // ── 框架内部 — 子类不应重写 (private 强制, 没有 final 但靠可见性约束) ──
  private validateInputs(job: DriverJob): void {
    // ajv 跑 nodeDefinition.inputsSchema; 校验失败抛 ValidationError → classifyError 翻 retryable=false
    // 这是 defense-in-depth, 跟服务端 lease 时的 resolveBindings 校验互为冗余 (服务端是权威)
  }
  private validateOutput(out: unknown): OutputViolation | null {
    // 复用 src/output-validator.ts 的 validateNodeOutput, 跟服务端 result 校验同一套 ajv 规则
    // outputsValidation 模式 (strict/warn/off) 完全跟随 nodeDefinition, 不与服务端撕裂
  }
  private shouldFailOnViolation(): boolean { return this.nodeDefinition.outputsValidation === "strict"; }
  private toViolationFail(v: OutputViolation): DriverResult { /* 转 OUTPUT_SCHEMA_VIOLATION failed */ }
  private classifyError(e: unknown): { code: string; retryable: boolean } { /* 标准异常类 → retryable */ }
  private emitMetrics(job: DriverJob, ms: number, ok: boolean): void { /* metrics */ }

  // ── 子类可选钩子 (protected, 默认 noop) ──
  protected async onInit(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
  protected async beforeHandle(_job: DriverJob): Promise<void> {}
  protected async afterHandle(_job: DriverJob, _out: DriverResult): Promise<void> {}

  // ── 跟老 Driver 协议互通 ──
  /** 把 class 适配成现有 src/drivers/registry.ts 的 Driver 字面量, 让 registerDriver 仍可用 */
  asDriver(): Driver {
    return {
      name: `class:${this.nodeDefinition.key}`,
      nodeKey: this.nodeDefinition.key,
      nodeDefinition: this.nodeDefinition,
      handle: (job) => this.invoke(job),
    };
  }
}

// ─── L2 ExternalWorkerNode (external_worker) — P1 重点壳 ─────
export abstract class ExternalWorkerNode extends BaseNode {
  constructor(protected cfg: { schedulerBaseUrl: string; workerApiKey: string; workerId?: string }) { super(); }

  async start(): Promise<void> {
    await this.onInit();
    this.leaseLoop().catch(this.onFatalError.bind(this));
  }
  async stop(): Promise<void> { /* 停 loop + release in-flight + onShutdown */ }

  // 私有: lease 循环, 子类不重写
  private async leaseLoop(): Promise<void> {
    while (!this.stopped) {
      const jobs = await this.leaseOnce();
      if (jobs.length === 0) { await this.backoff(); continue; }
      for (const job of jobs) this.processJob(job).catch(/* log + 继续 */);
    }
  }

  private async processJob(job: DriverJob): Promise<void> {
    const hb = this.startHeartbeat(job.runId);
    try {
      const out = await this.invoke(job);  // 走基类模板方法
      await this.submitResult(job.runId, out);
    } finally {
      hb.stop();
    }
  }

  private async leaseOnce(): Promise<DriverJob[]> { /* POST /queue/:nk/lease */ }
  private startHeartbeat(runId: string) { /* setInterval, leaseSeconds × 0.5 */ }
  private async submitResult(runId: string, r: DriverResult): Promise<void> { /* POST /result, 网络失败重试 */ }
  private async backoff(): Promise<void> { /* 同 autoworker 的退避策略, 2s ↔ 10s */ }
  private async onFatalError(e: unknown): Promise<void> { /* log + 进程级降级 */ }
  private stopped = false;
}

// ─── L2 InProcessNode (P2 延后) ─────────────────────────────
// 现有 5 个内置 driver 已经函数式跑通, 短期不立刻 class 化. P2 抽这条主要是统一风格 + 提供 lifecycle 钩子.
// 写法对照: 把 class 实例 .asDriver() 注册即可, autoworker 调 driver.handle = invoke(job).
// export abstract class InProcessNode extends BaseNode { /* 无新行为, 只是壳上的语义标签 */ }

// ─── L2 HttpServiceNode (P3 延后) ───────────────────────────
// 当前 http.ts 只有 1 个实例, 没到抽象时机. 等 OCR/translate/classifier 三个 HTTP 节点出现再抽.
// 设计要点 (供 P3 参考):
//   - serviceUrl 不从 step.params.url 取 (那是 06 §6.3 老 step.params.driver=http 模式),
//     而是从 nodeDefinition.presets.constants + pin 取 — 节点级常量, pipeline 作者不能改
//   - SANDBOX_URL_ALLOWLIST 在 BaseNode 构造时校验一次, 不进热路径

// ─── L2 ManualNode (P4 暂缓, 设计占位) ──────────────────────
// 人工节点本质不是"自动执行器", handle 永远 throw 是继承体系的异味.
// 暂不进 BaseNode 子树. 等 annotate/review 业务规则 (claim/submit/quota/role) 稳定后,
// 单独设计 ManualTaskAdapter — 它跟 BaseNode 是组合关系, 不是继承.
// 也可能完全不需要继承, 保留 business.ts 里的现状即可.
```

**关键说明 (跟评估报告对齐)**:
- `invoke()` 是模板方法 — 公共流程在 public 入口、私有方法里, 子类只能 implement `handle`, 想"挂逻辑"只能通过 4 个钩子
- `classifyError` / `validateOutput` 改 `private`, TS 编译期就拒绝子类重写, 比"// final 注释"更硬
- `BaseNode.asDriver()` 把 class 实例适配回老 Driver 字面量, **不强制改 registry 协议** — 新旧并存
- 节点端校验是 defense-in-depth, 服务端是权威; 两端共用 `outputsValidation` 语义不撕裂

## 7. L3 具体节点示例

### 7.1 InProcess 派生 (现状 5 个 driver 平迁)

```ts
// src/drivers/nodes/compute.ts
export class ComputeNode extends InProcessNode {
  readonly nodeDefinition: DriverNodeDefinition = {
    key: "compute", version: "1.0", displayName: "计算 Compute (测试节点)",
    paramsSchema: { /* … */ },
    inputsSchema: { properties: {} },
    outputsSchema: { type: "object", properties: { result: {}, expression: { type: "string" } } },
    runMode: "embedded", idempotent: true, supportsDryRun: true,
    outputsValidation: "strict",
    examples: [ /* … */ ],
  };
  async handle(job: DriverJob): Promise<DriverResult> {
    const result = evalExpression(String(job.params.expression), { inputs: job.inputs, params: job.params });
    return { status: "success", output: { result, expression: String(job.params.expression) } };
  }
}
```

### 7.2 ExternalWorker 派生 (生产化 sandbox)

```ts
// services/sandbox-worker/src/sandbox-node.ts
export class SandboxWorkerNode extends ExternalWorkerNode {
  readonly nodeDefinition: DriverNodeDefinition = {
    key: "script", version: "1.0", runMode: "external_worker",
    paramsSchema: { required: ["script"], properties: { script: { type: "string" } } },
    /* … */
  };

  private threadPool!: WorkerPool;

  protected async onInit() {
    this.threadPool = new WorkerPool({ maxOldGenerationSizeMb: 128 });
  }
  protected async onShutdown() { await this.threadPool.terminate(); }

  async handle(job: DriverJob): Promise<DriverResult> {
    // 实际跑用户脚本: worker_threads + resourceLimits + vm
    const out = await this.threadPool.run({ script: job.params.script, env: pickEnv(job) });
    return { status: "success", output: out };
  }
}

// services/sandbox-worker/src/main.ts (容器入口)
const node = new SandboxWorkerNode({
  schedulerBaseUrl: process.env.SCHEDULER_URL!,
  workerApiKey:     process.env.WORKER_API_KEY!,
});
await node.start();
process.on("SIGTERM", () => node.stop());
```

## 8. 加新节点的最短路径 (5 步)

```ts
// 1. 选个壳 (90% 走 InProcess 或 ExternalWorker)
export class MyNode extends ExternalWorkerNode {

  // 2. 写 nodeDefinition (Driver-first, 代码即真相源)
  readonly nodeDefinition: DriverNodeDefinition = {
    key: "my_node", version: "1.0", displayName: "...",
    paramsSchema: { /* JSON Schema */ },
    inputsSchema: { properties: { foo: { type: "string" } } },
    outputsSchema: { type: "object", required: ["result"], properties: { result: { type: "string" } } },
    runMode: "external_worker", outputsValidation: "strict", supportsDryRun: true,
    examples: [ /* 给后台调试面板 */ ],
  };

  // 3. (可选) 钩子 — 资源
  protected async onInit() { /* 建连接池 */ }
  protected async onShutdown() { /* 释放 */ }

  // 4. handle — 业务逻辑, 只关心 inputs/params → output
  async handle(job: DriverJob): Promise<DriverResult> {
    const result = await doBusinessThing(job.inputs.foo, job.params);
    return { status: "success", output: { result } };
  }
}

// 5. 实例化 + start (容器入口)
const node = new MyNode({ schedulerBaseUrl, workerApiKey });
await node.start();
```

**完成了**. 自动获得: lease 循环 / 退避 / 心跳 / 输入校验 / 输出校验 / 错误归类 / 结果提交 / metrics / 优雅停机 / auto-upsert 到 `node_definitions`.

## 9. 迁移分阶段

### P1 · 最小核心 (本周可做)

**只做这三件**, 不动其它:

1. **`BaseNode` 基类** (`src/drivers/base/base-node.ts`) — 模板方法 `invoke` + `validateInputs/Output` (复用 `output-validator.ts`) + `classifyError` + 4 个钩子 + `asDriver()` 适配老协议
2. **`ExternalWorkerNode` 壳** (`src/drivers/base/external-worker-node.ts`) — `start/stop/leaseLoop/heartbeat/submitResult/backoff/release`
3. **首个实例: `SandboxWorkerNode`** (`services/sandbox-worker/`) — 独立进程, 用 `worker_threads + resourceLimits` 跑 vm 沙箱; 解决 sandbox-js 生产化

**明确不在 P1**:
- ❌ 不抽 `InProcessNode` — 现有 5 个 driver 字面量保持不动, 跑得稳
- ❌ 不抽 `HttpServiceNode` — `http.ts` 只有 1 个实例, 没到抽象时机
- ❌ 不动 `ManualNode` — annotate/review 业务规则散在 business.ts, 不重构
- ❌ 不强制 `INodeContract` 接口 — 通过 `BaseNode.asDriver()` 复用现有 `Driver` 协议
- ❌ 不发独立 SDK 包 — 都在 monorepo `scheduler/backend/src/drivers/base/`, sandbox-worker 通过 workspace 引用

**收益**: 直接解决"独立 worker 重复 lease 循环"问题, 给 sandbox-js 生产化铺底. 工作量 ~1 天.

### P2 · 老 driver 渐进 class 化 (有真实需求再做)

触发条件: P1 跑通生产 ≥1 周, sandbox-worker 验证基类设计 OK 后, 再考虑这步.

实施:
- 抽 `InProcessNode` (无新行为, 只是 BaseNode 的语义标签)
- 现有 driver **不强制改写** — 谁需要加 lifecycle 钩子 / 复杂状态, 谁先 class 化; 其它继续字面量
- `BaseNode.asDriver()` 让两种形态共存于同一 registry

工作量 ~0.5 天 (基类), 单个 driver 迁移 ~半小时.

### P3 · HttpServiceNode (出现 2-3 个 HTTP 节点后再做)

触发条件: 实际项目里出现 OCR / translate / classifier 等 ≥2 个 HTTP 节点, 重复 `fetch+timeout+retry+allowlist` 模板, 再抽.

设计要点 (供未来参考):
- `serviceUrl` 从 `nodeDefinition.presets.constants + pin` 取, 不让 step.params 任意覆盖 (防 SSRF + 节点级稳定性)
- 跟 06 §6.3 现有 `step.params.driver=http` 模式同时支持, 转换路径明确
- SSRF allowlist 校验进基类构造期, 不进 hot path

工作量 ~0.5 天 + 现有 `http.ts` 迁移.

### P4 · ManualNode 暂缓

**当前判断: ManualNode 不进继承体系**.

原因:
- 人工节点本质不是"自动执行器", `BaseNode.handle` 在 manual 场景永远 throw — 这是继承异味
- annotate/review 现状 (`business.ts` + 业务路由) 跑得稳, 没出现"重复模板代码"的痛点
- 配额 / 互斥 / 角色规则跟业务深耦, 抽出来基类很可能后续被业务规则倒逼推翻

未来需求时再考虑两种路径之一:
- (a) `ManualTaskAdapter` — 组合而非继承, 跟 BaseNode 平级
- (b) 完全保留 business.ts 现状, 不进类层次

P4 不排期, 等真实需求.

### P5 · 文档同步

P1 落地后给 06 §13.2 加交叉引用, 文档 `assets/07-*.svg` 加"已实现 / P2 延后 / P4 暂缓"标注 (本次提交一并做了).

**关键纪律**:
- **P1 单独 PR**, 不夹带 P2 改动. PR 大小 ≤500 行新代码 + 测试.
- P1 跑通生产 ≥1 周再开 P2. 早期抽象错误会被沉淀代价淹没.
- 任何 P2+ 改动需要先在群里展示"具体重复模板出现 2 次以上"再开做.

## 10. 决策点 (P1 实施前确认)

**已经决策的 (按评估报告对齐, 不再讨论)**:

| # | 决策 | 落点 |
|---|---|---|
| 1 | L2 形态壳分几个 | **目标 4 个, P1 只做 ExternalWorkerNode** (其它延后) |
| 2 | 用 TS class vs 函数式 | **abstract class + 模板方法** (`invoke` 公共, `handle` abstract) |
| 3 | 用 TS `final` 关键字 | **不用** (TS 没有), 改用 `private` 强制 + 模板方法 |
| 4 | `INodeContract` 单独接口 | **不强制**, BaseNode 提供 `asDriver()` 复用现有 Driver 协议 |
| 5 | ManualNode 进继承 | **不进** — handle 永远 throw 是异味, P4 等真实需求再单独设计 |
| 6 | 老 in-process driver 迁移 | **不迁** — 新旧并存, 通过 `asDriver()` 兼容现有 registry |
| 7 | P1 是否含 HttpServiceNode 抽象 | **不含** — 只 1 个实例, P3 等出现 2-3 个再抽 |
| 8 | 基类放包还是源码目录 | **`src/drivers/base/`** — 不发独立 npm 包, monorepo workspace 引用 |
| 9 | ExternalWorker 配置来源 | **构造参数** (容器入口从 env 读再传, 可测试) |

**P1 落地前还需要拍的**:

| # | 决策 | 选项 | 我的倾向 |
|---|---|---|---|
| A | sandbox-worker 部署形态 | (a) docker-compose 单容器 (b) k8s deployment 多副本 | **(a) 先单容器**, 验证完再上多副本 |
| B | sandbox-worker 跟 scheduler 通信 | (a) HTTP REST 走当前 lease/result 协议 (b) gRPC | **(a) HTTP** — 协议已成熟, 不额外引入 |
| C | sandbox-worker 用 worker_threads 还是 isolated-vm | (a) worker_threads + resourceLimits (b) isolated-vm npm | **(a) worker_threads** — 内置, resourceLimits 够用, 不引第三方依赖 |
| D | sandbox-worker 是否也支持 dry-run | (a) 跑 sandbox 真 HTTP /debug/run (b) admin 调主进程 in-process sandbox 兜底 | **(a) 走真 worker** — 行为跟生产一致, 但 P1 可先 (b) 简化 |
| E | sandbox-worker SDK 跟主进程 sandbox-js driver 是否完全等价 | (a) 等价 (能直接替换) (b) 仅生产路径用 | **(b) 仅生产** — admin/调试仍走 in-process, 减少切换风险 |

## 11. 关键结论

- **6 篇是协议 / 7 篇是实现**: 协议层 (node_definitions / lease / result) 一字不改, 实现层渐进 OO 化
- **目标架构 vs 落地范围明确隔离**: §4-§7 是长期形态 (设计图), §9 P1 是本周落地 (3 个文件 / 一个进程)
- **P1 只做最小核心**: `BaseNode` + `ExternalWorkerNode` + `SandboxWorkerNode`. 其它都是延后, 不一次性重构
- **新旧并存**: 老的 5 个函数式 driver 保持现状, 通过 `BaseNode.asDriver()` 在同一 registry 共存
- **校验语义不撕裂**: 服务端校验是权威, 节点端是 defense-in-depth, 两端共用 `outputsValidation` 配置
- **ManualNode 暂缓**: 业务规则不稳定, 抽出来基类大概率被推翻; 等真实需求再单独设计
- **不改调度核心**: 调度中心 API / DB schema / 服务端 lease/result 一字不改, 重构对外完全透明

---

## 变更记录

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-05-13 | 初版: 5 层架构 + 4 种 runMode 壳 + 单 job 生命周期; 配两张 SVG. |
