"""
启动配置 fail-fast 校验 (M3) — 与 env-check.ts 1:1.

仅在 NODE_ENV=production 时严格. 单测可直接传入 env 调用.

三类必查:
  1. AUTH_REQUIRED 必须显式 true — 防止 dev 模式上线
  2. 部署模式显式: SCHEDULER_INPROCESS_OK=true (同进程), 或 SCHEDULER_BASE_URL=... (拆服务)
  3. 拆服务下 SCHEDULER_API_KEY 必填且 ≥16 字符
"""
from __future__ import annotations


def validate_production_env(env: dict[str, str | None]) -> list[str]:
    if env.get("NODE_ENV") != "production":
        return []
    fatals: list[str] = []

    auth_required = (env.get("AUTH_REQUIRED") or "true").lower() != "false"
    if not auth_required:
        fatals.append("AUTH_REQUIRED!=true; 请在生产 env 显式设 AUTH_REQUIRED=true")

    remote_sched = (env.get("SCHEDULER_BASE_URL") or "").strip()
    inprocess_ok = (env.get("SCHEDULER_INPROCESS_OK") or "").lower() == "true"
    if not remote_sched and not inprocess_ok:
        fatals.append(
            "未设 SCHEDULER_BASE_URL 且 SCHEDULER_INPROCESS_OK!=true; "
            "如确认同进程部署请显式设 SCHEDULER_INPROCESS_OK=true, 否则请配 SCHEDULER_BASE_URL"
        )

    if remote_sched:
        remote_key = (env.get("SCHEDULER_API_KEY") or "").strip()
        if not remote_key:
            fatals.append("SCHEDULER_BASE_URL 已设但缺 SCHEDULER_API_KEY (拆服务必须有服务间 key)")
        elif len(remote_key) < 16:
            fatals.append("SCHEDULER_API_KEY 长度 <16, 拒绝启动")

    return fatals
