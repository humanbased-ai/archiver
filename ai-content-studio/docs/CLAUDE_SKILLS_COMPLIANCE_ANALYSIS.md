# AI Content Studio - Claude Skills 符合性分析报告

**生成时间**: 2026-01-07
**分析对象**: ai-content-studio 项目
**参照标准**: Claude Skills 官方规范

---

## 执行摘要

AI Content Studio 是一个功能丰富的 Twitter 社交机器人 + Milady NFT 梗图生成系统。本报告分析了其现有功能如何符合 Claude Skills 的技术要求，并提供了具体的改进建议。

**总体评分**: 7.5/10

**关键发现**:
- ✅ 现有 SKILL.md 内容丰富，人格定义清晰
- ⚠️ 文件结构需要优化（渐进式披露）
- ⚠️ 缺少关键的 YAML frontmatter 字段
- ✅ 功能模块化设计良好
- ⚠️ 需要将功能明确映射为 Claude Skills

---

## 1. 现有 SKILL.md 符合性分析

### 1.1 YAML Frontmatter 检查

#### ✅ 现有字段
```yaml
name: ai-content-studio              # ✅ 符合规范
version: 4.0-final            # ℹ️ 非标准字段，但无害
mode: semi-autonomous         # ℹ️ 非标准字段，但有用
description: AI Content Studio 半自主运行系统 - 完整 Skills 指南
                              # ⚠️ 描述不够触发词友好
last_updated: 2025-12-28      # ℹ️ 非标准字段，但有用
```

#### ❌ 缺失的关键字段
```yaml
allowed-tools: 未定义          # ⚠️ 建议添加，限制工具使用
model: 未定义                  # ℹ️ 可选，但建议指定
```

### 1.2 Description 字段分析

**现有 description**:
```
"AI Content Studio 半自主运行系统 - 完整 Skills 指南"
```

**问题**:
- ❌ 不包含用户触发词
- ❌ 不说明具体功能
- ❌ Claude 无法判断何时使用此 Skill

**建议改进**:
```yaml
description: >
  AI Content Studio 是一个具有 Milady 文化风格的 Twitter 机器人助手。
  功能包括：监控 Twitter 账号、生成回复推文、创建原创推文、
  生成 Milady NFT 梗图（支持图层合成、文字添加、AI 特效）、
  飞书集成审批工作流。当需要管理 Twitter 互动、生成社交媒体内容、
  制作 Milady 风格梗图时使用。关键词：Twitter bot, social media,
  meme generation, Milady, NFT, Codatta, data ownership.
```

### 1.3 文件长度分析

**现状**:
- SKILL.md: 950 行（过长 ⚠️）
- 建议上限: 500 行

**问题**:
- 包含大量实现细节（伪代码、工作流程）
- 包含完整的账号列表（应该在单独文件）
- 包含详细的 Bot 判断逻辑（应该在代码或单独文档）

**改进方案**: 采用渐进式披露（见第 4 节）

---

## 2. 功能模块与 Skills 映射

### 2.1 核心功能清单

| 功能模块 | 实现文件 | 是否适合作为 Skill | 优先级 |
|---------|---------|------------------|--------|
| **Twitter 监控** | `src/twitter/monitor.py` | ✅ 是 | 高 |
| **生成推文回复** | `src/intelligence/claude_client.py` | ✅ 是 | 高 |
| **创建原创推文** | `scripts/create_tweet.py` | ✅ 是 | 高 |
| **Milady 图层合成** | `src/meme/milady_maker.py` | ✅ 是 | 高 |
| **Milady 文字梗图** | `src/meme/caption_meme.py` | ✅ 是 | 中 |
| **AI 配饰替换** | `src/meme/flux_fill_pro.py` | ✅ 是 | 中 |
| **SAM 智能检测** | `src/meme/sam_detector.py` | ✅ 是 | 中 |
| **视觉错觉特效** | `src/meme/illusion_diffusion.py` | ✅ 是 | 低 |
| **经典模板梗图** | `src/meme/memegen_api.py` | ✅ 是 | 低 |
| **飞书审批工作流** | `src/approval/lark_client.py` | ⚠️ 内部系统 | 低 |

### 2.2 建议的 Skills 结构

推荐将 ai-content-studio 拆分为多个独立的 Skills：

```
.claude/skills/
├── jessie-twitter/          # Twitter 互动 Skill
│   ├── SKILL.md
│   ├── accounts.json
│   └── persona.md
├── milady-meme/             # Milady 梗图生成 Skill
│   ├── SKILL.md
│   ├── layers-reference.md
│   └── examples/
└── ai-content-studio-core/         # 核心人格 Skill（可选）
    └── SKILL.md
```

**优点**:
- 每个 Skill 聚焦单一功能
- 更好的触发精确度
- 更容易维护和测试
- 用户可以单独启用/禁用功能

---

## 3. 各功能模块的 Skills 规范符合性

### 3.1 Twitter 监控与回复

**现状**: 功能在 SKILL.md 中描述详细，包含伪代码

**符合性评分**: 6/10

**问题**:
- ⚠️ 包含过多实现细节（`should_interact()` 伪代码）
- ⚠️ 账号列表应该在单独的 JSON 文件（已经有 `accounts.json`，但未在 SKILL.md 中引用方式优化）
- ✅ 人格定义清晰
- ✅ 互动策略明确

**改进建议**:
```markdown
# skills/jessie-twitter/SKILL.md
---
name: jessie-twitter
description: >
  AI Content Studio Twitter 互动助手。监控指定 Twitter 账号，
  生成符合 Milady 文化风格的回复。支持优先级分级、
  自动回复生成、飞书审批工作流。关键词：Twitter monitoring,
  reply generation, social media automation, Milady style, Codatta.
allowed-tools: Read, Bash, WebFetch
model: claude-sonnet-4-5-20250929
---

## 功能概览

AI Content Studio 监控 Twitter 账号并生成高质量回复：
- 监控 151 个账号（Founders、Base 生态、AI 行业等）
- 3 种优先级：must_interact、high、medium
- 生成 3 个版本回复（short/medium/long）
- 所有回复需飞书审批

## Jessie 人格特征

Milady 风格 + Codatta 使命：
- 🎀 邪教式能量推广数据所有权
- 🧹 Janitor 身份，真实不装
- 对线风格批评 AI 行业不公平
- Community > Corp

详见：[persona.md](./persona.md)

## 监控账号

配置文件：[accounts.json](./accounts.json)

**优先级分类**:
- Must Interact (4 accounts): @drtwo101, @qiw, @codatta_io, @ddcrying
- High Priority (100+ accounts): Base ecosystem, x402/8004, AI industry
- Medium Priority: VCs, Media, Other

## 互动策略

### 判断是否值得互动

1. **Founders 推文** → 必须互动（1-2 小时内）
2. **@提及 Codatta** → 立即响应
3. **高优先级 + 相关话题** → 深度互动
   - 关键词：data ownership, AI training, labeling, Base, AI Agent
4. **GM posts** → 展示活跃（简短回复）
5. **热门相关讨论**（likes > 500）→ 参与

### 回复风格示例

详见：[examples.md](./examples.md)

## 使用工具

生成回复后，通过以下方式发送审批：
```bash
python scripts/create_tweet.py --reply-to TWEET_ID
```
```

**优点**:
- 简洁清晰（<150 行）
- 引用外部文件（渐进式披露）
- 包含触发关键词
- 限制工具使用（`allowed-tools`）

### 3.2 Milady 梗图生成

**现状**: 功能完整但未作为独立 Skill 描述

**符合性评分**: 5/10

**问题**:
- ❌ 没有独立的 Skill 定义
- ❌ 功能散落在多个文档中
- ✅ 有详细的技术文档（`docs/reference/`）
- ✅ 有清晰的命令参考（`docs/guides/COMMAND_REFERENCE.md`）

**改进建议**:
```markdown
# skills/milady-meme/SKILL.md
---
name: milady-meme
description: >
  生成 Milady NFT 风格梗图。支持 9,955 个 NFT 原图、324 个图层素材、
  文字叠加（4 种字体）、AI 特效（FLUX Fill Pro、SAM-2、Illusion Diffusion）、
  经典模板（207 个）。当需要制作 Milady 梗图、NFT 艺术、社交媒体图片时使用。
  关键词：meme generation, Milady NFT, image composition, AI effects.
allowed-tools: Read, Bash
model: claude-sonnet-4-5-20250929
---

## 功能概览

### 1. 基础图层合成
- **9,955 个 NFT 原图**（1000x1250px）
- **324 个图层素材**（16 类：Hat, Glasses, Face Decoration 等）
- 支持 3 种模式：纯图层、NFT+图层、NFT 重新合成

### 2. 文字梗图
- 4 种字体：Impact、Angelic、Chinese、Glow
- 自动识别中文
- 顶部/底部文字、描边、阴影

### 3. AI 特效
- **FLUX Fill Pro**: 智能配饰替换（$0.05/张）
- **SAM-2**: 自动检测配饰区域（<$0.01/次）
- **Illusion Diffusion**: 视觉错觉风格（$0.006/张）

### 4. 经典模板
- 207 个模板（Drake、Distracted Boyfriend 等）
- 可用 Milady NFT 替换模板图片

## 快速开始

### 基础梗图
```bash
# 生成 Milady #5050
python scripts/generate_meme.py --nft 5050

# 添加文字
python scripts/generate_meme.py --nft 5050 --top "GM" --bottom "LFG"

# 添加图层
python scripts/generate_meme.py --nft 5050 --layers Hat:Beret.png Glasses:Sunglasses.png
```

### AI 特效
```bash
# AI 配饰替换（SAM-2 + FLUX Fill Pro）
python scripts/generate_meme.py --nft 5050 --replace hat="red baseball cap"

# 视觉错觉
python scripts/generate_meme.py --nft 5050 --illusion "cyberpunk neon lights"
```

## 详细文档

- 图层完整列表：[layers-reference.md](./layers-reference.md)
- 使用示例：[examples/](./examples/)
- API 文档：[reference.md](./reference.md)
- 成本估算：[billing-guide.md](./billing-guide.md)

## 飞书集成

在飞书中使用（需要先启动 webhook 服务器）：
```
@机器人 /milady 5050 top:"GM" bottom:"LFG"
@机器人 /milady_replace_sam 5050 hat cool sunglasses
```
```

**优点**:
- 功能清晰分类
- 包含成本信息
- 快速开始示例
- 引用详细文档

### 3.3 AI 智能配饰替换（SAM + FLUX）

**现状**: 技术文档完善，但未作为 Skill 突出

**符合性评分**: 6/10

**亮点**: 这是项目的技术创新点，值得单独作为 Skill

**改进建议**:
```markdown
# skills/milady-accessory-ai/SKILL.md
---
name: milady-accessory-ai
description: >
  使用 AI 智能替换 Milady NFT 配饰。结合 SAM-2 自动检测和
  FLUX Fill Pro 生成，精确替换帽子、眼镜等配饰。适用于
  NFT 个性化、梗图创作、艺术实验。关键词：AI image editing,
  accessory replacement, SAM-2, FLUX Fill Pro, NFT customization.
allowed-tools: Read, Bash
model: claude-sonnet-4-5-20250929
---

## 技术原理

**工作流程**:
```
1. 输入：Milady NFT + 配饰类型 + 新配饰描述
2. SAM-2 自动检测配饰区域（生成 mask）
3. FLUX Fill Pro 根据 mask 替换配饰
4. 输出：新图片（保留原风格）
```

**支持的配饰类型**:
- Hat（帽子）
- Glasses（眼镜）
- Earrings（耳环）
- Necklaces（项链）
- Face Decoration（面部装饰）

## 精度和成本

| 配饰类型 | SAM-2 IoU | 成本 |
|---------|-----------|------|
| Hat | 0.60-0.65 | $0.05-0.06 |
| Glasses | 0.55-0.60 | $0.05-0.06 |
| Earrings | 0.50-0.55 | $0.05-0.06 |

**成本优化**:
- 缓存机制节省 50-70% 成本
- 仅首次检测需要 SAM-2

## 快速开始

### 基础用法
```bash
# 替换帽子
python scripts/replace_accessory.py --nft 5050 --type hat --prompt "red baseball cap"

# 替换眼镜
python scripts/replace_accessory.py --nft 5050 --type glasses --prompt "cool sunglasses"
```

### 高级选项
```bash
# 自定义 SAM-2 参数
python scripts/replace_accessory.py --nft 5050 --type hat \
  --prompt "red cap" \
  --sam-threshold 0.5 \
  --sam-dilation 5
```

## 测试报告

详细测试结果：[docs/sam/SAM_PHASE2_TEST_REPORT.md](../../docs/sam/SAM_PHASE2_TEST_REPORT.md)
```

### 3.4 飞书集成工作流

**现状**: 作为内部系统，不适合作为独立 Skill

**符合性评分**: N/A（内部工具）

**建议**: 保持在主 Skill 中简要提及，详细文档放在 `docs/setup/`

---

## 4. 推荐的文件结构（渐进式披露）

### 4.1 现有结构
```
skills/
├── SKILL.md              # 950 行（过长）
└── accounts.json         # 账号列表
```

### 4.2 推荐结构
```
.claude/skills/
├── jessie-twitter/
│   ├── SKILL.md                    # 150 行（概览）
│   ├── persona.md                  # 人格定义
│   ├── accounts.json               # 监控账号
│   ├── interaction-strategy.md    # 互动策略详细说明
│   └── examples.md                 # 回复示例
│
├── milady-meme/
│   ├── SKILL.md                    # 200 行（概览）
│   ├── layers-reference.md         # 324 个图层详细列表
│   ├── billing-guide.md            # 成本估算
│   ├── reference.md                # API 文档
│   └── examples/
│       ├── basic-composition.md
│       ├── text-memes.md
│       └── ai-effects.md
│
├── milady-accessory-ai/
│   ├── SKILL.md                    # 100 行（概览）
│   ├── technical-details.md        # SAM-2 + FLUX 技术细节
│   └── test-reports.md             # 测试报告汇总
│
└── scripts/                        # 辅助脚本（零上下文消耗）
    ├── validate_tweet.py
    ├── estimate_cost.py
    └── check_account_status.py
```

### 4.3 文件大小目标

| 文件类型 | 推荐行数 | 理由 |
|---------|---------|------|
| SKILL.md | < 200 行 | Claude 快速理解 |
| Reference 文档 | < 500 行 | 按需加载 |
| 示例文档 | < 300 行 | 聚焦示例 |
| 脚本 | 任意 | 仅执行不读取 |

---

## 5. YAML Frontmatter 改进建议

### 5.1 主 Skill（jessie-twitter）

```yaml
---
name: jessie-twitter
description: >
  AI Content Studio Twitter 互动助手，具有 Milady 文化风格。
  监控 Twitter 账号（Founders、Base、AI、x402），生成回复推文，
  创建原创推文，飞书审批工作流。当需要 Twitter 监控、社交媒体回复、
  Codatta 内容创作、Milady 风格互动时使用。关键词：Twitter bot,
  social media, reply generation, Milady, Codatta, data ownership,
  Base ecosystem, AI agents.
allowed-tools: Read, Bash, WebFetch
model: claude-sonnet-4-5-20250929
---
```

**改进点**:
- ✅ 添加了 `allowed-tools`（限制为读取和命令执行）
- ✅ 指定了 `model`（使用最新的 Sonnet）
- ✅ `description` 包含大量触发关键词
- ✅ 说明了具体功能和使用场景

### 5.2 梗图生成 Skill（milady-meme）

```yaml
---
name: milady-meme
description: >
  生成 Milady NFT 风格梗图和社交媒体图片。支持 9,955 个 NFT 原图、
  324 个图层素材、文字叠加（中英文）、AI 特效（FLUX Fill Pro、
  SAM-2、Illusion Diffusion）、207 个经典模板。当需要制作梗图、
  NFT 艺术、社交媒体配图、Milady 文化内容时使用。关键词：meme generator,
  Milady NFT, image composition, text overlay, AI effects, social media graphics.
allowed-tools: Read, Bash
model: claude-sonnet-4-5-20250929
---
```

### 5.3 AI 配饰替换 Skill（milady-accessory-ai）

```yaml
---
name: milady-accessory-ai
description: >
  使用 AI 智能替换 Milady NFT 配饰（帽子、眼镜、耳环等）。
  结合 SAM-2 自动物体检测和 FLUX Fill Pro 图像生成，精确替换配饰
  同时保留原图风格。适用于 NFT 个性化、梗图创作、艺术实验。
  关键词：AI image editing, accessory replacement, SAM-2, FLUX Fill Pro,
  NFT customization, object detection, inpainting.
allowed-tools: Read, Bash
model: claude-sonnet-4-5-20250929
---
```

---

## 6. allowed-tools 字段建议

### 6.1 工具限制原则

**安全性考虑**:
- Twitter 互动 Skill：不应该有 `Write`、`Edit` 权限（防止误改代码）
- 梗图生成 Skill：不应该有 `WebFetch` 权限（不需要访问网络）
- 只读分析 Skill：仅允许 `Read`、`Grep`、`Glob`

### 6.2 推荐配置

| Skill | allowed-tools | 理由 |
|-------|--------------|------|
| jessie-twitter | `Read, Bash, WebFetch` | 需要读配置、执行脚本、抓取推文 |
| milady-meme | `Read, Bash` | 需要读图层列表、执行生成脚本 |
| milady-accessory-ai | `Read, Bash` | 需要读配置、调用 Replicate API |
| ai-content-studio-analysis（新）| `Read, Grep, Glob` | 仅分析代码，不执行 |

**重要**：避免给 Skills 不必要的权限，遵循最小权限原则。

---

## 7. 与 Subagent 集成建议

### 7.1 当前问题

现有系统是完整的应用程序，而非 Claude Skills。需要决定：

**选项 A：作为 Skills 运行**
- 优点：Claude 自动选择合适的 Skill
- 缺点：需要重构代码为 Claude 可调用的形式

**选项 B：作为独立应用 + Skills 文档**
- 优点：保持现有架构
- 缺点：Skills 仅作为"使用指南"

### 7.2 推荐方案：混合模式

```yaml
# .claude/agents/ai-content-studio/AGENT.md
---
name: ai-content-studio
description: >
  AI Content Studio 管理助手。管理 Twitter 监控、生成推文、制作梗图。
skills:
  - jessie-twitter
  - milady-meme
  - milady-accessory-ai
---

## 功能

AI Content Studio Agent 可以：
1. 监控 Twitter 账号并生成回复（jessie-twitter skill）
2. 创建 Milady 梗图（milady-meme skill）
3. AI 配饰替换（milady-accessory-ai skill）

## 启动服务

在使用前，确保后台服务运行：
```bash
# 启动 Twitter 监控
python src/twitter/monitor.py &

# 启动 Lark Webhook 服务器
python webhook_server.py &
```

## 使用示例

```
# 生成推文回复
"为 @jessepollak 关于 AI on Base 的推文生成回复"

# 制作梗图
"生成一个 Milady #5050 的梗图，顶部文字 'GM'，底部 'LFG'"

# AI 配饰替换
"用 AI 把 Milady #5050 的帽子替换成红色棒球帽"
```
```

---

## 8. 改进优先级和实施路线图

### 阶段 1：基础优化（1-2 天）

**优先级：高**

1. **拆分 SKILL.md**
   - 创建 `jessie-twitter/SKILL.md`（150 行）
   - 移动人格定义到 `persona.md`
   - 移动互动策略到 `interaction-strategy.md`
   - 保留 `accounts.json`

2. **修复 YAML Frontmatter**
   - 添加 `allowed-tools` 字段
   - 添加 `model` 字段
   - 改进 `description`（包含触发关键词）

3. **测试触发**
   - 用不同的用户输入测试 Claude 是否正确触发 Skill

### 阶段 2：功能拆分（3-5 天）

**优先级：中**

1. **创建 milady-meme Skill**
   - `SKILL.md`（200 行概览）
   - `layers-reference.md`（324 个图层详细列表）
   - `examples/`（使用示例）

2. **创建 milady-accessory-ai Skill**
   - `SKILL.md`（100 行概览）
   - `technical-details.md`（SAM + FLUX 技术细节）

3. **辅助脚本**
   - `scripts/validate_tweet.py`（验证推文安全性）
   - `scripts/estimate_cost.py`（估算梗图生成成本）

### 阶段 3：高级集成（可选）

**优先级：低**

1. **创建 Subagent**
   - `.claude/agents/ai-content-studio/AGENT.md`
   - 集成所有 Skills

2. **添加 Hooks**
   - Post-tool-use hook（记录所有操作）
   - Pre-commit hook（检查敏感信息）

3. **文档完善**
   - 添加更多示例
   - 添加故障排查指南

---

## 9. 最佳实践建议

### 9.1 Description 编写

**❌ 不好的 description**:
```yaml
description: AI Content Studio 完整指南
```

**✅ 好的 description**:
```yaml
description: >
  AI Content Studio Twitter 互动助手，监控账号、生成回复、创作推文。
  具有 Milady 文化风格，专注 Codatta 数据所有权话题。
  关键词：Twitter bot, social media, Milady, Codatta, data ownership.
```

**要点**:
- 第一句说明"是什么"
- 第二句说明"何时用"
- 包含用户可能说的关键词
- 1-2 句话，不要太长

### 9.2 渐进式披露

**原则**:
- SKILL.md：概览 + 快速开始（< 200 行）
- Reference 文档：详细 API、参数、配置（< 500 行）
- Examples 文档：具体示例、场景（< 300 行）
- Scripts：辅助工具（零上下文消耗）

**引用方式**:
```markdown
详细 API 文档：[reference.md](./reference.md)
使用示例：[examples/basic.md](./examples/basic.md)
```

### 9.3 工具限制

**最小权限原则**:
- 只读分析：`Read, Grep, Glob`
- 脚本执行：`Read, Bash`
- 网络访问：`Read, WebFetch`
- 文件修改：`Read, Write, Edit`（谨慎使用）

**不推荐**:
```yaml
allowed-tools: "*"  # ❌ 过于宽松
```

### 9.4 命名规范

**Skill 名称**:
- 使用 kebab-case（小写-连字符）
- 最多 64 字符
- 描述性：`jessie-twitter` 而非 `jt`

**文件名称**:
- `SKILL.md`（大写，必需）
- `reference.md`（小写，可选）
- `examples.md`（小写，可选）

---

## 10. 潜在问题和解决方案

### 问题 1：Skill 未被触发

**原因**:
- `description` 缺少关键词
- 用户输入与 description 不匹配

**解决方案**:
1. 在 `description` 中添加更多触发词
2. 测试不同的用户输入
3. 使用 `claude --debug` 查看 Skill 选择过程

### 问题 2：文件过长导致上下文溢出

**原因**:
- SKILL.md 包含太多详细信息
- 多个 Skills 同时加载

**解决方案**:
1. 拆分为多个文件（渐进式披露）
2. 使用脚本而非文档（scripts 仅执行不读取）
3. 限制 Skills 数量（一个项目 3-5 个）

### 问题 3：工具权限不足

**原因**:
- `allowed-tools` 限制过严

**解决方案**:
1. 根据实际需求调整 `allowed-tools`
2. 测试确认所需权限
3. 记录在 SKILL.md 的"使用工具"部分

---

## 11. 检查清单

在提交 Skills 之前，请确认：

### YAML Frontmatter
- [ ] `name` 字段符合 kebab-case 规范
- [ ] `description` 包含触发关键词（< 1024 字符）
- [ ] `allowed-tools` 已定义（如适用）
- [ ] `model` 已指定（如需要特定版本）

### 文件结构
- [ ] SKILL.md < 200 行（核心内容）
- [ ] 详细文档已拆分到单独文件
- [ ] 引用链接正确（相对路径）
- [ ] 脚本有执行权限（`chmod +x`）

### 内容质量
- [ ] 功能描述清晰
- [ ] 包含快速开始示例
- [ ] 有使用场景说明
- [ ] 引用了详细文档

### 测试
- [ ] 用不同输入测试触发
- [ ] 验证工具权限正确
- [ ] 检查引用链接可访问

---

## 12. 总结和下一步

### 当前状态

**优点**:
- ✅ 功能完整且强大
- ✅ 技术文档详细
- ✅ 人格定义清晰
- ✅ 代码模块化良好

**改进空间**:
- ⚠️ SKILL.md 过长（950 行 → 目标 < 200 行）
- ⚠️ 缺少关键 YAML 字段
- ⚠️ 功能未拆分为独立 Skills
- ⚠️ `description` 不够触发词友好

### 推荐行动

**立即执行（1 天）**:
1. 修复 YAML frontmatter（添加 `allowed-tools`、`model`、改进 `description`）
2. 拆分 SKILL.md（创建 `persona.md`、`interaction-strategy.md`）

**短期执行（1 周）**:
3. 创建独立 Skills（`milady-meme`、`milady-accessory-ai`）
4. 编写快速开始指南
5. 测试触发和功能

**长期优化（可选）**:
6. 创建 Subagent 集成
7. 添加 Hooks（自动化工作流）
8. 完善文档和示例

### 预期效果

完成优化后：
- 🎯 Claude 能精确选择合适的 Skill
- 🚀 上下文消耗降低 70%（从 950 行 → <300 行）
- 🔒 工具权限更安全（最小权限原则）
- 📚 文档更清晰易懂（渐进式披露）
- 🧪 更容易测试和维护

---

## 附录 A：完整示例

### 示例 1：jessie-twitter/SKILL.md（优化后）

```markdown
---
name: jessie-twitter
description: >
  AI Content Studio Twitter 互动助手，具有 Milady 文化风格。监控 Twitter 账号
  （Founders、Base、AI、x402），生成回复推文，创建原创推文，飞书审批工作流。
  当需要 Twitter 监控、社交媒体回复、Codatta 内容创作、Milady 风格互动时使用。
  关键词：Twitter bot, social media, reply generation, Milady, Codatta,
  data ownership, Base ecosystem, AI agents.
allowed-tools: Read, Bash, WebFetch
model: claude-sonnet-4-5-20250929
---

# Jessie Twitter Bot

## 核心功能

AI Content Studio 监控 Twitter 并生成高质量互动：
- 监控 151 个账号（4 个必须互动，100+ 高优先级）
- 生成符合 Milady 风格的回复（3 个版本：short/medium/long）
- 创建原创推文（每周 7-10 条）
- 飞书审批工作流（所有内容人工审核后发布）

## Jessie 人格

**公式**: Milady 风格 + Codatta 话题 = Jessie's Voice

- 🎀 **Milady 文化**：邪教感、meme、对线、真实不装
- 🧹 **Codatta 使命**：数据所有权、AI 公平、贡献者权益
- 👩‍💼 **Janitor 身份**：数据清洁工视角，批评行业不公

详见：[persona.md](./persona.md)

## 监控账号

配置：[accounts.json](./accounts.json)

**优先级**:
- **Must Interact**: @drtwo101, @qiw, @codatta_io（1-2 小时响应）
- **High Priority**: Base、x402、AI 行业（6-10 次/周互动）
- **Medium Priority**: VCs、Media、其他（2-4 次/周互动）

## 互动策略

### 判断是否值得互动

1. **Founders** → 必须（学习、传播、放大）
2. **@提及** → 立即响应
3. **高优先级 + 相关话题** → 深度互动
   - 关键词：data ownership, AI training, Base, AI Agent
4. **GM posts** → 简短回复（展示活跃）
5. **热门讨论**（> 500 likes）→ 参与

详见：[interaction-strategy.md](./interaction-strategy.md)

## 内容类型

**主动创作**（40%）:
- 85% Codatta 相关（数据所有权、产品、行业批评）
- 15% 社区真实感（GM、Milady 观察、memes）

**被动互动**（40%）:
- 贡献数据视角
- Builder solidarity
- 自然提及 Codatta

详见：[content-strategy.md](./content-strategy.md)

## 快速开始

### 生成推文回复

```bash
# 为特定推文生成回复
python scripts/create_tweet.py --reply-to TWEET_ID

# 检查待审核回复
python scripts/approve.py --list
```

### 创建原创推文

```bash
# 根据今天主题生成推文
python scripts/generate_daily_tweets.py

# 手动指定主题
python scripts/create_tweet.py --original --theme "data ownership"
```

### 监控 Twitter

```bash
# 启动监控（后台运行）
python src/twitter/monitor.py &

# 检查监控状态
python scripts/check_monitor_status.py
```

## 审批工作流

所有内容通过飞书审批：
1. Bot 生成内容 → 发送到飞书
2. 查看交互式卡片（3 个版本）
3. 点击 Approve / Edit / Skip
4. Bot 自动发布到 Twitter

详见：[docs/setup/LARK_BOT_SETUP.md](../../docs/setup/LARK_BOT_SETUP.md)

## 回复示例

详见：[examples.md](./examples.md)

## 配置

环境变量（`.env`）:
```bash
TWITTER_API_KEY=***
TWITTER_ACCESS_TOKEN=***
CLAUDE_API_KEY=***
LARK_APP_ID=***
```

---

**Version**: 5.0
**Last Updated**: 2026-01-07
```

### 示例 2：milady-meme/SKILL.md（新建）

```markdown
---
name: milady-meme
description: >
  生成 Milady NFT 风格梗图和社交媒体图片。支持 9,955 个 NFT 原图、
  324 个图层素材、文字叠加（中英文）、AI 特效（FLUX Fill Pro、SAM-2、
  Illusion Diffusion）、207 个经典模板。当需要制作梗图、NFT 艺术、
  社交媒体配图、Milady 文化内容时使用。关键词：meme generator, Milady NFT,
  image composition, text overlay, AI effects, social media graphics.
allowed-tools: Read, Bash
model: claude-sonnet-4-5-20250929
---

# Milady Meme Generator

## 功能概览

### 1. 基础图层合成

**资源规模**:
- 9,955 个 Milady NFT 原图（1000x1250px）
- 324 个图层素材（PNG，透明背景）
- 16 类图层：Hat (89)、Glasses (24)、Earrings (21)、Face Decoration (134) 等

**合成模式**:
- 纯图层生成：从零组合图层
- NFT + 图层：在 NFT 上添加装饰
- NFT 重新合成：基于元数据替换图层

### 2. 文字梗图

**字体支持**:
- Impact（经典梗图字体）
- Angelic（可爱风格）
- Chinese（中文支持）
- Glow（发光效果）

**特性**:
- 自动识别中文
- 顶部/底部文字
- 描边、阴影效果

### 3. AI 特效

| 特效 | 模型 | 成本 | 用途 |
|------|------|------|------|
| **Illusion** | ControlNet | $0.006 | 视觉错觉风格 |
| **配饰替换** | FLUX Fill Pro + SAM-2 | $0.05 | 智能替换帽子/眼镜 |

### 4. 经典模板

- 207 个模板（Memegen.link API）
- 可用 Milady NFT 替换模板图片
- 示例：Drake、Distracted Boyfriend、Expanding Brain

## 快速开始

### 基础梗图

```bash
# 生成 Milady #5050
python scripts/generate_meme.py --nft 5050

# 添加文字
python scripts/generate_meme.py --nft 5050 \
  --top "GM" \
  --bottom "LFG"

# 添加图层
python scripts/generate_meme.py --nft 5050 \
  --layers Hat:Beret.png Glasses:Sunglasses.png
```

### AI 特效

```bash
# AI 配饰替换
python scripts/generate_meme.py --nft 5050 \
  --replace hat="red baseball cap"

# 视觉错觉
python scripts/generate_meme.py --nft 5050 \
  --illusion "cyberpunk neon lights"
```

### 飞书集成

```
@机器人 /milady 5050 top:"GM" bottom:"LFG"
@机器人 /milady_replace_sam 5050 hat cool sunglasses
@机器人 /milady_illusion 5050 cyberpunk
```

## 详细文档

- **图层完整列表**: [layers-reference.md](./layers-reference.md)
- **使用示例**: [examples/](./examples/)
- **API 文档**: [reference.md](./reference.md)
- **成本估算**: [billing-guide.md](./billing-guide.md)

## 成本估算

| 操作 | 成本 |
|------|------|
| 基础图层合成 | $0（本地） |
| 文字梗图 | $0（本地） |
| Illusion 特效 | $0.006/张 |
| AI 配饰替换 | $0.05/张 |
| SAM-2 检测 | <$0.01/次（可缓存） |

**优化建议**:
- 缓存 SAM-2 mask（节省 70% 成本）
- 批量生成梗图
- 优先使用本地合成

---

**Version**: 1.0
**Last Updated**: 2026-01-07
```

---

## 附录 B：关键资源链接

### 官方文档
- [Claude Skills 文档](https://code.claude.com/docs/en/skills.md)
- [Agent Skills 最佳实践](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Agent Skills 概述](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)

### AI Content Studio 文档
- 项目主 README: `/Users/pengsun/ai-content-studio/README.md`
- 功能列表: `/Users/pengsun/ai-content-studio/docs/FEATURE_LIST.md`
- 快速开始: `/Users/pengsun/ai-content-studio/docs/guides/QUICK_START.md`
- 命令参考: `/Users/pengsun/ai-content-studio/docs/guides/COMMAND_REFERENCE.md`

### 技术细节
- SAM 集成报告: `/Users/pengsun/ai-content-studio/docs/sam/SAM_INTEGRATION_COMPLETE.md`
- FLUX Fill Pro 指南: `/Users/pengsun/ai-content-studio/docs/reference/FLUX_FILL_PRO_GUIDE.md`
- 图层参考: `/Users/pengsun/ai-content-studio/docs/reference/LAYER_GUIDE.md`

---

**报告版本**: 1.0
**生成日期**: 2026-01-07
**分析工具**: Claude Sonnet 4.5
**状态**: 待审核
