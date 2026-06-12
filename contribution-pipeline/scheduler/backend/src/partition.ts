/**
 * audit_log 月度分区维护
 *
 * 调用方: reconciler tick 内, 每次走一次轻量检查 (PG 操作 IF NOT EXISTS, 没新建就秒回)
 * 行为: 确保 [当月, 下月] 两张分区存在; 缺则建
 * 不做: 老分区归档/drop — 那是基础设施侧的 cron + S3 export, 不在调度核心职责内
 *
 * 命名约定: audit_log_<YYYY>_<MM> (与初始迁移一致)
 */

import { asSystem } from "./db.ts";

function partitionName(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `audit_log_${y}_${m}`;
}

function monthBoundary(d: Date): { start: string; end: string } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export async function ensureAuditPartitions(now: Date = new Date()): Promise<void> {
  const targets = [now, new Date(now.getTime() + 30 * 86400 * 1000)];
  await asSystem(async (tx) => {
    for (const t of targets) {
      const name = partitionName(t);
      const { start, end } = monthBoundary(t);
      // PostgreSQL 的 PARTITION OF 不支持参数化, 必须拼字符串; name/边界由内部生成不来自用户输入, 安全
      await tx.unsafe(`
        CREATE TABLE IF NOT EXISTS ${name}
          PARTITION OF audit_log
          FOR VALUES FROM ('${start}') TO ('${end}')
      `);
    }
  });
}
