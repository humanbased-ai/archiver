/**
 * 启动配置 fail-fast 校验 (M3)
 *
 * 仅在 NODE_ENV=production 时严格. 单测可直接传入 env 调用。
 *
 * 三类必查:
 *   1. AUTH_REQUIRED 必须显式 true — 防止 dev 模式上线
 *   2. 部署模式显式: SCHEDULER_INPROCESS_OK=true (同进程), 或 SCHEDULER_BASE_URL=... (拆服务)
 *   3. 拆服务下 SCHEDULER_API_KEY 必填且 ≥16 字符
 */
export function validateProductionEnv(env: NodeJS.ProcessEnv): string[] {
  if (env.NODE_ENV !== "production") return [];
  const fatals: string[] = [];

  const authRequired = (env.AUTH_REQUIRED ?? "true").toLowerCase() !== "false";
  if (!authRequired) {
    fatals.push("AUTH_REQUIRED!=true; 请在生产 env 显式设 AUTH_REQUIRED=true");
  }

  const remoteSched = env.SCHEDULER_BASE_URL?.trim();
  const inprocessOk = (env.SCHEDULER_INPROCESS_OK ?? "").toLowerCase() === "true";
  if (!remoteSched && !inprocessOk) {
    fatals.push(
      "未设 SCHEDULER_BASE_URL 且 SCHEDULER_INPROCESS_OK!=true; " +
      "如确认同进程部署请显式设 SCHEDULER_INPROCESS_OK=true, 否则请配 SCHEDULER_BASE_URL",
    );
  }

  if (remoteSched) {
    const remoteKey = env.SCHEDULER_API_KEY?.trim() ?? "";
    if (!remoteKey) {
      fatals.push("SCHEDULER_BASE_URL 已设但缺 SCHEDULER_API_KEY (拆服务必须有服务间 key)");
    } else if (remoteKey.length < 16) {
      fatals.push("SCHEDULER_API_KEY 长度 <16, 拒绝启动");
    }
  }

  return fatals;
}
