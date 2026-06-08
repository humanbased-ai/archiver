# codatta/archiver

Graveyard for deprecated Codatta GitHub repositories. Every directory here is a verbatim snapshot of a standalone repo at the time it was retired. No active development happens here.

**Migration tracked in Linear:** [IN-210 — Codatta GitHub Repository Cleanup / Monorepo Migration](https://linear.app/inductive-network/issue/IN-210/codatta-github-repository-cleanup-monorepo-migration)

---

## Archived projects

| # | Repo | Description | Language | Created | Last active | Archived | Owner | Top contributors | Why archived |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [`codatta/developer-portal`](https://github.com/codatta/developer-portal) | Developer-facing portal for API key management, campaign creation, and billing. | TypeScript | 2026-03-22 | 2026-05-18 | 2026-05-18 | Yi Zhang | Yi Zhang — 234 · 316105wwll-sudo — 50 · JessieJiang2021 — 6 · zouqinghua — 4 | Superseded by `frontend/developer-portal-web` in the monorepo. |
| 2 | [`codatta/contributor-portal`](https://github.com/codatta/contributor-portal) | Contributor-facing portal for task browsing, campaign participation, and submission management. | TypeScript | 2026-04-15 | 2026-04-24 | 2026-05-18 | Yi Zhang | Yi Zhang — 33 (sole) | Superseded by `frontend/contributor-portal-web` in the monorepo. |
| 3 | [`codatta/attempt-index`](https://github.com/codatta/attempt-index) | Microservice for tracking and deduplicating contributor submission attempts. | Python | 2026-04-27 | 2026-04-27 | 2026-05-18 | Yi Zhang | Yi Zhang — 14 (sole) | Logic migrated into monorepo `backend/`. |
| 4 | [`codatta/codatta-frontier-standards`](https://github.com/codatta/codatta-frontier-standards) | Public JSON schema for multi-frontier data annotation. | Markdown | 2024-11-02 | 2024-11-02 | 2026-05-18 | Yi Zhang | Yi Zhang — 2 (sole) | Dormant 18+ months; schema never adopted downstream. |
| 5 | [`codatta/AI-Evolution-Game`](https://github.com/codatta/AI-Evolution-Game) | Browser-based game prototype built as an AI-assisted development experiment. | JavaScript | 2024-10-26 | 2024-10-27 | 2026-05-18 | Yi Zhang | Yi Zhang — 9 (sole) | Abandoned after 2 days; no downstream use. |
| 6 | [`codatta/rootdata-codatta-deck`](https://github.com/codatta/rootdata-codatta-deck) | RootData × Codatta 合作方案 · 29-page strategic partnership proposal deck. | HTML | 2026-04-28 | 2026-04-28 | 2026-05-28 | Max | Max — 1 (sole) | RootData partnership de-prioritized after CipherOwl Frontier pivot (2026-05-14); deck no longer in active use. |
| 7 | [`codatta/task-audit`](https://github.com/codatta/task-audit) | 任务的审核逻辑 — audit pipelines for Knob, OTC, cex_hot_wallet, home_activity_video, robotics_audit submissions. | Python | 2026-01-22 | 2026-05-29 | 2026-05-29 | Rain | KetteyMan — 26 · rain2004-rr — 6 | 审核代码迁移 |
| 8 | [`humanbased-ai/claudeAgentTeams`](https://github.com/humanbased-ai/claudeAgentTeams) | Claude Code 多 Agent 协作开发工作流（Lead/PM/UI/Dev/QA 五角色协作完成需求澄清到代码实现）。 | Markdown | 2026-04-24 | 2026-04-24 | 2026-06-07 | Trump-One | Trump-One — 4 (sole) | 整理仓库 |
| 9 | [`codatta/ifsci-server`](https://github.com/codatta/ifsci-server) | Twitter bot backend with cron schedulers (fresh_comment, twitter_reply, fresh_notice) and OpenAI integration. README documented as IFS (Intermittent Fasting Science) platform; actual code is Twitter automation. | Python | 2024-12-25 | 2025-01-08 | 2026-06-08 | Qinghua Zou | zouqone — 3 · paulhandle — 1 | Dormant 17 months; sole-maintainer Twitter prototype with no downstream consumers. |
| 10 | [`humanbased-ai/deRiskServer`](https://github.com/humanbased-ai/deRiskServer) | Risk evaluation backend with crypto data query API. | Python | 2024-11-13 | 2025-11-11 | 2026-06-08 | Qinghua Zou | zouqone — 69 · KetteyMan — 24 | Originally marked "保留" in IN-210, archived per maintainer decision. Real secrets (OpenAI key, MySQL prod credentials, GCP refresh token) redacted before publishing to public archiver. |
| 11 | [`humanbased-ai/ffs-server`](https://github.com/humanbased-ai/ffs-server) | FFS backend service with OAuth, scheduler, and AI integrations (OpenAI / QWEN / DeepSeek / LibLib / Tavily). | Python | 2024-12-25 | 2025-08-08 | 2026-06-08 | Qinghua Zou | zouqone — 373 · CodeYannick — 24 · KetteyMan — 9 · SuperMeowLord — 3 · markof — 1 | Originally planned for monorepo migration in IN-210, archived per maintainer decision. Real secrets (MySQL prod creds, multiple AI API keys, Tavily token, LibLib secrets, on-chain secret_key) redacted before publishing to public archiver. |
| 12 | [`humanbased-ai/ffs-admin`](https://github.com/humanbased-ai/ffs-admin) | Admin variant of ffs-server (forked codebase) — arena on-chain task admin filtering. | Python | 2025-07-07 | 2025-07-31 | 2026-06-08 | Qinghua Zou | zouqone — 7 (sole) | Originally planned for monorepo migration in IN-210, archived per maintainer decision. Same sanitized-credentials caveat as ffs-server. |
| 13 | [`humanbased-ai/cfp-greenfieid`](https://github.com/humanbased-ai/cfp-greenfieid) | CFP integration with BNB Greenfield testnet for resource storage. | Go | 2024-12-23 | 2024-12-25 | 2026-06-08 | wesley-zen | wesley-zen — 14 (sole) | Marked "迁移后删除" in IN-210, dormant 18 months. Real secrets redacted from `.env`: shared codatta MySQL password + ACCOUNT_PRIVATEKEY (ETH private key). |
| 14 | [`humanbased-ai/ffs_model`](https://github.com/humanbased-ai/ffs_model) | OpenAI fine-tuning data prep, model creation, and prediction scripts for FFS. | Python | 2025-01-15 | 2025-01-16 | 2026-06-08 | KetteyMan | KetteyMan — 3 (sole) | Marked "否" (不保留) in IN-210, dormant 17 months. No hardcoded secrets — all keys read from env vars properly. |
| 15 | [`humanbased-ai/slide-to-visitor`](https://github.com/humanbased-ai/slide-to-visitor) | Medical slide → visitor analytics pipeline (MongoDB + Aliyun OSS for medical image storage). | Python | 2024-11-25 | 2024-12-20 | 2026-06-08 | wuxuanyu2014 | wuxuanyu2014 — 35 · liudongg — 18 · yangke110 — 3 · wesley-zen — 1 | Dormant 18 months. Real secrets redacted: production MongoDB root password + Aliyun OSS ID/Secret for `codatta-medical-image` bucket. |
| 16 | [`humanbased-ai/annotation-medical-api`](https://github.com/humanbased-ai/annotation-medical-api) | Java/Spring multi-module REST API for medical image annotation (IMS + manager modules, MongoDB/Redis backend). | Java | 2024-11-13 | 2024-12-06 | 2026-06-08 | wuxuanyu2014 | wuxuanyu2014 — 32 · liudongg — 1 | No IN-210 marking, dormant 18 months. Test MongoDB credentials + internal IPs redacted. ⚠️ Code-quality note: `SysLoginService.java:125` hardcodes `password = "123456"` in auth flow (left intact — logic issue, not credential leak). |
| 17 | [`humanbased-ai/ai-content-studio`](https://github.com/humanbased-ai/ai-content-studio) | AI social media automation toolkit with 7 Claude Skills (Milady memes, Twitter content, Lark Bot integration). | Python | 2026-01-07 | 2026-01-08 | 2026-06-08 | modernchina123 | modernchina123 — 7 (sole) | Originally PUBLIC repo, dormant 5 months. Code-only snapshot — `assets/` (167 MB media files) excluded to keep archiver lean. No hardcoded secrets — env vars used properly. |
| 18 | [`humanbased-ai/airdrop-point-decuct`](https://github.com/humanbased-ai/airdrop-point-decuct) | Airdrop point deduction utility script (one-off DB cleanup). | Python | 2025-08-19 | 2025-08-20 | 2026-06-08 | SuperMeowLord | SuperMeowLord — 7 (sole) | Sole-author, dormant 10 months. Production DB credentials redacted from `.env.example` (`codatta_prod` user on `codatta-prod.rwlb.singapore.rds.aliyuncs.com`). |
| 19 | [`humanbased-ai/artometa-onchain-server`](https://github.com/humanbased-ai/artometa-onchain-server) | Artometa onchain Node.js server. | JavaScript | 2025-02-15 | 2025-02-18 | 2026-06-08 | SuperMeowLord | SuperMeowLord — 4 · markof — 1 | Dormant 16 months. No hardcoded secrets. |
| 20 | [`humanbased-ai/browser-ai-test`](https://github.com/humanbased-ai/browser-ai-test) | Browser automation AI experiments (Amazon search, file upload, prompt call tests). | Python | 2025-01-17 | 2025-01-21 | 2026-06-08 | yangke110 | yangke110 — 3 (sole) | 17 months dormant test/experiment code. No hardcoded secrets. |

---

## How to add to the archiver

When retiring a repo:

1. Clone the repo and copy its contents (excluding `.git/`) into a new subdirectory named after the original repo
2. Add a row to the table above
3. Commit directly to `main` (no PRs needed — this is an archive, not active code)
4. Delete the original GitHub repo
5. Update [IN-210](https://linear.app/inductive-network/issue/IN-210/codatta-github-repository-cleanup-monorepo-migration) with the completed status
