# Claude Agent Teams

**基于 Claude Code 的多 Agent 协作开发工作流**

通过 Lead、PM、UI、Dev、QA 五个 Agent 协作，自动完成从需求澄清到代码实现的完整开发流程。

---

## 快速开始

### 1. 下载核心文件到你的项目

#### Mac / Linux

```bash
# 在项目根目录创建 requirements 目录
mkdir -p requirements

# 下载流程协议
curl -o requirements/_protocol.md \
  https://raw.githubusercontent.com/codatta/claudeAgentTeams/main/requirements/_protocol.md

# 下载 QA 规则库
curl -o requirements/_qa-rules.md \
  https://raw.githubusercontent.com/codatta/claudeAgentTeams/main/requirements/_qa-rules.md
```

#### Windows (PowerShell)

```powershell
# 在项目根目录创建 requirements 目录
New-Item -ItemType Directory -Force -Path requirements

# 下载流程协议
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/codatta/claudeAgentTeams/main/requirements/_protocol.md" -OutFile "requirements\_protocol.md"

# 下载 QA 规则库
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/codatta/claudeAgentTeams/main/requirements/_qa-rules.md" -OutFile "requirements\_qa-rules.md"
```

#### Windows (Git Bash / WSL)

```bash
# 与 Mac/Linux 命令相同
mkdir -p requirements
curl -o requirements/_protocol.md https://raw.githubusercontent.com/codatta/claudeAgentTeams/main/requirements/_protocol.md
curl -o requirements/_qa-rules.md https://raw.githubusercontent.com/codatta/claudeAgentTeams/main/requirements/_qa-rules.md
```

### 2. 配置 CLAUDE.md

在项目根目录的 `CLAUDE.md` 文件末尾添加：

```markdown
## AI Team Workflow

详细协议见 `requirements/_protocol.md`。
```

### 3. 开始使用

在 Claude Code 中直接描述需求：

```
"新增一个 bug 报告页面，用户可以提交 bug，选择优先级，自动发邮件给团队"
```

Lead 会自动判断复杂度，启动对应流程级别。

---

## 核心特性

✅ **智能触发** — Lead 根据 6 个维度自动判断走哪个流程（Level 1-4）  
✅ **冲突检查** — PM 自动搜索现有功能，发现冲突提前询问  
✅ **快速原型** — UI 生成独立 HTML，双击预览，零依赖  
✅ **Pre-QA** — Dev 编码前审查计划，问题前移，避免返工  
✅ **历史学习** — QA 参考历史报告，避免重复犯错  
✅ **规则积累** — 每次功能完成，提炼新规则到规则库  

---

## 四个流程级别

Lead 根据 6 个维度自动判断走哪个流程：

| 级别 | 适用场景 | 耗时 | 流程 |
|------|---------|------|------|
| **Level 1** | 纯文案/样式/配置 | 3-5min | Lead 直接实现 |
| **Level 2** | 单文件小功能，有参考 | 10-12min | PM 简化 → Dev → QA 简化 |
| **Level 3** | 中等功能，有历史参考 | 18-20min | PM → UI → Dev → QA |
| **Level 4** | 复杂功能，新类型 | 25-30min | PM → UI → Pre-QA → Dev → QA |

**判断维度**：
1. 代码改动规模
2. 是否涉及 UI 设计
3. 是否需要产品澄清
4. 是否有历史参考
5. 业务逻辑复杂度
6. 是否可能有冲突

---

## 使用示例

### Level 1（3 分钟）— 简单修改

```
你："把登录页面的标题改成'欢迎回来'"
→ Lead 直接修改代码 → commit → push → 创建 PR
```

### Level 3（20 分钟）— 中等功能

```
你："bug 报告页面加个优先级选择（Urgent/Critical/General）"
→ PM 澄清需求 → UI 生成原型 → 你确认 → Dev 实现 → QA 验证 → 创建 PR
```

### Level 4（30 分钟）— 复杂功能

```
你："新增完整的用户管理页面，支持邀请、编辑、删除、权限管理"
→ PM 深度探索 + 冲突检查 → UI 生成原型 → Pre-QA 审查计划 → Dev 实现 → QA 验证 → 创建 PR
```

---

## 五个节点

1. **产品澄清（PM）** — 结构化需求 + 探索现有功能检查冲突 + 输出验收标准
2. **UI 原型（UI）** — 生成独立原型 standalone-demo.html，人类预览确认
3. **开发实现（Dev）** — 创建 feature 分支 → Pre-QA 审查计划 → 实现功能
4. **自动化验证（QA）** — 代码审查 + 回归风险评估 + 测试覆盖检查 + 生成验收清单
5. **交付（Lead）** — 创建分支 + 提交 + 推送 + 创建 PR

**人类参与点（仅 2 个）：**
- 节点一：PM 澄清 + 冲突检查（多轮对话，不限问题数）
- 节点二：UI 原型预览确认

---

## 文件结构

```
你的项目/
├── CLAUDE.md                   # 添加 AI Team Workflow 配置
└── requirements/
    ├── _protocol.md            # ✅ 从本仓库下载
    ├── _qa-rules.md            # ✅ 从本仓库下载
    └── {feature-slug}/         # 自动创建
        ├── 00-input.md
        ├── 01-prd.md
        ├── 02-prototype/
        │   └── standalone-demo.html
        ├── 03-dev-plan.md
        ├── 03-pre-qa.md
        └── 04-qa-report.md
```

---

## 常见问题

**Q: 如何强制走完整流程？**  
A: 说 "这个走完整流程" 或 "这个是 Level 4"

**Q: 如何跳过 UI 原型？**  
A: 说 "不需要 UI 原型"

**Q: QA 规则库从哪里开始？**  
A: 先复制本仓库的基础规则（12 条），后续根据你的项目积累

**Q: 能否自定义流程？**  
A: 可以，编辑 `requirements/_protocol.md` 调整节点和判断标准

**Q: 适用于哪些项目？**  
A: 任何使用 Claude Code 的软件项目（Web、移动端、API、CLI 等）

**Q: 需要什么前置条件？**  
A: 项目已使用 Claude Code，根目录有 `CLAUDE.md` 文件

---

## 贡献

欢迎提交 Issue 和 PR：
- Bug 报告：[Issues](https://github.com/codatta/claudeAgentTeams/issues)
- 新 QA 规则：编辑 `requirements/_qa-rules.md` 并提交 PR

---

## 许可证

MIT License
