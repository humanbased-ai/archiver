import postgres from "postgres";

const url =
  process.env.DATABASE_URL ??
  "postgres://scheduler:scheduler@localhost:5433/scheduler";

export const sql = postgres(url, {
  max: 50,                  // 业务层 + 调度核心 + reconciler + autoworker 共用
  idle_timeout: 30,         // 空闲 30s 关掉, 顺便释放任何残留的会话级状态
  connect_timeout: 10,
  max_lifetime: 60 * 30,    // 30 分钟轮换, 防长连接泄漏
  onnotice: () => {},
});

export type SQL = typeof sql;
// 在事务回调中, postgres.js 的 tx 与 sql 同形 (tagged template + sql.json),
// 项目内统一用 SQL 类型(参考 result-core.ts 的现有约定)。

/**
 * 在租户上下文中执行一组查询。
 *
 * 行为:
 *   - 开事务 + SET LOCAL app.tenant_id=<tenantId>
 *   - 事务内所有 SQL 受 RLS 策略约束 (1715000100000_tenant_rls.sql),
 *     行级过滤兜底防止应用层漏写 WHERE
 *   - 应用层仍应显式 WHERE tenant_id = <tenantId> 走索引快路径
 *
 * 典型用法:
 *   app.get(..., async (req) => withTenant(req.caller!.tenantId, async (tx) => {
 *     const rows = await tx`SELECT * FROM pipelines WHERE tenant_id = ${tid}`;
 *     return rows;
 *   }));
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: SQL) => Promise<T>,
): Promise<T> {
  return (await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx as unknown as SQL);
  })) as T;
}

/**
 * 系统级 actor (reconciler / autoworker / migrations) 跳过 RLS。
 *
 * 行为: SET LOCAL app.role='system'; RLS 策略放行所有行。
 * 限制: 仅供调度核心内部、跨租户的"系统职责"使用 (扫过期 lease / 拉自动队列 / 后台清理),
 *      绝不能用在 HTTP handler 处理普通用户请求。
 */
export async function asSystem<T>(fn: (tx: SQL) => Promise<T>): Promise<T> {
  return (await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.role', 'system', true)`;
    return fn(tx as unknown as SQL);
  })) as T;
}

/**
 * 根据 caller 自动选择: scope='system' 或 id='internal' 走 system 模式, 否则走租户模式。
 * 通用 handler 包装入口, 减少分支重复。
 */
export async function withCallerTx<T>(
  caller: { tenantId: string; isSystemActor: boolean } | undefined,
  fn: (tx: SQL) => Promise<T>,
): Promise<T> {
  if (!caller) throw new Error("withCallerTx: missing caller");
  return caller.isSystemActor ? asSystem(fn) : withTenant(caller.tenantId, fn);
}
