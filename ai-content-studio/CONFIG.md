# AI Content Studio 配置指南

完整的配置指南，帮助你设置所有 API keys 和环境变量。

---

## 🚀 快速开始

### 方法 1：使用配置向导（推荐）

```bash
# 运行交互式配置向导
python scripts/setup_config.py

# 测试配置
python scripts/test_config.py
```

### 方法 2：手动配置

```bash
# 1. 复制示例配置文件
cp config/.env.example config/.env

# 2. 编辑配置文件
nano config/.env  # 或使用你喜欢的编辑器

# 3. 填入你的 API keys

# 4. 测试配置
python scripts/test_config.py
```

---

## 📋 所有 API Keys

### 1. Twitter API（社交媒体监控）

**用途：**
- `/monitor` 命令 - 监控 Twitter 账号
- Twitter 发推功能
- 提及检测

**获取方式：**
1. 访问 [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. 创建一个新应用
3. 生成 API keys 和 Bearer Token

**需要的 Keys：**
```bash
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
TWITTER_BEARER_TOKEN=your_bearer_token
```

**成本：** FREE（基础层）

**注意事项：**
- 基础层有速率限制（15 请求/15分钟）
- 如果需要发推，需要申请 Elevated access
- Bearer Token 用于只读操作（监控）

---

### 2. Claude API（内容生成）

**用途：**
- `/tweet` 命令 - 生成推文内容
- Twitter 内容创作
- 回复生成

**获取方式：**
1. 访问 [Anthropic Console](https://console.anthropic.com/settings/keys)
2. 登录你的账号
3. 创建新的 API Key

**需要的 Keys：**
```bash
CLAUDE_API_KEY=sk-ant-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here  # 同一个 key
```

**成本：**
- Claude Sonnet 4.5: ~$0.015-0.03/推文
- Claude Haiku: ~$0.002-0.005/推文（便宜 10 倍）

**重要：Claude Pro 订阅 vs Claude API**

| 特性 | Claude Pro ($20/月) | Claude API (按量付费) |
|------|---------------------|----------------------|
| **用途** | 网页版聊天 | 程序调用（API） |
| **无限使用** | ✅ 网页版 | ❌ 按 token 计费 |
| **可自动化** | ❌ | ✅ |
| **成本** | 固定 $20/月 | ~$0.01-0.05/次调用 |

**关键点：**
- ⚠️  **Claude Pro 会员不包含 API 调用额度**
- 💡 即使你有 Claude Pro，API 仍需单独付费
- 🎯 如果只是偶尔用，API 可能更便宜

**选择更便宜的模型：**
```bash
# 使用 Haiku（便宜 10 倍，质量略低）
CLAUDE_MODEL=claude-3-5-haiku-20241022

# 使用 Sonnet（最高质量，当前默认）
CLAUDE_MODEL=claude-sonnet-4-20250514
```

---

### 3. Replicate API（AI 图像特效）

**用途：**
- `/milady_illusion` - Illusion Diffusion 特效
- `/milady_replace` - FLUX Fill Pro 配饰替换
- `/milady_replace_sam` - SAM-2 自动检测 + 替换

**获取方式：**
1. 访问 [Replicate](https://replicate.com/account/api-tokens)
2. 注册账号
3. 创建 API Token

**需要的 Keys：**
```bash
REPLICATE_API_TOKEN=r8_your-token-here
```

**成本：**
- Illusion Diffusion: $0.006/图片
- FLUX Fill Pro: $0.05/图片
- SAM-2 Detection: <$0.01/次

**注意事项：**
- Replicate 按使用量计费
- 新用户有少量免费额度
- Token 格式：r8_xxxxx
- 查看余额：https://replicate.com/account/billing

---

### 4. Lark Bot（团队协作）

**用途：**
- Lark (飞书) Bot 集成
- 团队内使用所有功能
- 图片上传到 Lark

**获取方式：**
1. 访问 [Lark Open Platform](https://open.larksuite.com/app)
2. 创建一个新应用
3. 配置 Bot 权限
4. 获取 App ID 和 Secret

**需要的 Keys：**
```bash
LARK_APP_ID=cli_your-app-id
LARK_APP_SECRET=your-app-secret
LARK_CHAT_ID=oc_your-chat-id
LARK_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook
LARK_VERIFICATION_TOKEN=your-verification-token
```

**成本：** FREE

**注意事项：**
- 需要审核权限（im:message, im:resource）
- Webhook URL 可以从 Bot 设置获取
- Chat ID 可以通过 scripts/get_chat_id.py 获取

---

## 🎯 按功能配置

### 只想生成 Memes（免费）

**不需要任何 API keys！**

可用功能：
- ✅ 本地 Milady NFT 生成
- ✅ 图层叠加
- ✅ 文字覆盖
- ✅ Memegen 模板（207+）

```bash
# 无需配置，直接使用
python -c "
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2
gen = MemeGeneratorV2()
meme = gen.generate_meme(nft_id=5050, top_text='GM', bottom_text='WAGMI')
meme.save('meme.png')
"
```

---

### 想用 Twitter 监控（需要 Twitter API）

**需要配置：**
- ✅ Twitter API (FREE)

```bash
# .env 文件
TWITTER_BEARER_TOKEN=your_bearer_token
```

**可用功能：**
- ✅ `/monitor mentions` - 检查提及
- ✅ `/monitor account` - 监控账号
- ✅ `/monitor opportunities` - 互动机会

---

### 想用 Twitter 内容生成（需要 Claude API）

**需要配置：**
- ✅ Claude API (~$0.01-0.05/推文)

```bash
# .env 文件
CLAUDE_API_KEY=sk-ant-your-key
```

**可用功能：**
- ✅ `/tweet gm` - 生成 GM 推文
- ✅ `/tweet insight` - 生成洞察
- ✅ `/tweet casual` - 生成休闲内容

**免费替代方案：**
- 可以使用本地 Ollama (完全免费)
- 或者手动在 claude.ai 生成（利用你的 Pro 会员）

---

### 想用 AI 图像特效（需要 Replicate API）

**需要配置：**
- ✅ Replicate API ($0.006-0.05/图片)

```bash
# .env 文件
REPLICATE_API_TOKEN=r8_your-token
```

**可用功能：**
- ✅ `/milady_illusion` - 幻觉特效
- ✅ `/milady_replace` - AI 配饰替换
- ✅ `/milady_replace_sam` - SAM 智能替换

---

### 想用 Lark Bot（需要 Lark API）

**需要配置：**
- ✅ Lark App ID & Secret (FREE)

```bash
# .env 文件
LARK_APP_ID=cli_your-app-id
LARK_APP_SECRET=your-app-secret
```

**可用功能：**
- ✅ 所有命令都可以在 Lark 中使用
- ✅ 图片自动上传到 Lark
- ✅ 团队协作

---

## 💡 配置建议

### 新手配置（最小成本）

```bash
# 只配置免费的
TWITTER_BEARER_TOKEN=your_token  # FREE

# 其他功能暂不配置
# Claude API - 暂不配置（可以手动生成）
# Replicate API - 暂不配置（不用 AI 特效）
```

**可用功能：**
- ✅ 本地 Meme 生成
- ✅ Twitter 监控
- ✅ 训练数据管理

**月度成本：** $0

---

### 推荐配置（平衡）

```bash
# 免费功能
TWITTER_BEARER_TOKEN=your_token

# 便宜的内容生成
CLAUDE_API_KEY=your_key
CLAUDE_MODEL=claude-3-5-haiku-20241022  # 使用便宜的 Haiku

# 可选：AI 特效
# REPLICATE_API_TOKEN=your_token  # 按需开启
```

**可用功能：**
- ✅ 所有监控功能
- ✅ Twitter 内容生成（便宜版）
- ✅ 本地 Meme 生成

**月度成本：** ~$0.50-2

---

### 完整配置（全功能）

```bash
# 所有 API 都配置
TWITTER_BEARER_TOKEN=your_token
CLAUDE_API_KEY=your_key
REPLICATE_API_TOKEN=your_token
LARK_APP_ID=your_app_id
LARK_APP_SECRET=your_app_secret
```

**可用功能：**
- ✅ 所有功能

**月度成本：** ~$5-15（取决于使用量）

---

## 🔒 安全最佳实践

### 1. 不要泄露 API Keys

```bash
# ❌ 错误：提交到 Git
git add config/.env  # 不要这样做！

# ✅ 正确：.env 已在 .gitignore 中
cat .gitignore | grep .env
# config/.env
```

### 2. 使用环境变量

```bash
# 生产环境
export CLAUDE_API_KEY="sk-ant-xxx"
export REPLICATE_API_TOKEN="r8_xxx"
```

### 3. 定期轮换 Keys

```bash
# 每 3-6 个月更新一次
# 1. 在 API 控制台生成新 key
# 2. 更新 .env 文件
# 3. 删除旧 key
```

### 4. 限制 API 权限

- Twitter：只给需要的权限（只读 vs 读写）
- Claude：设置使用限额
- Replicate：监控成本

---

## 🧪 测试配置

### 运行配置测试

```bash
# 测试所有 API
python scripts/test_config.py

# 输出示例：
# ✅ Twitter API 配置正确
# ✅ Claude API 配置正确
# ✅ Replicate API Token 格式正确
# ✅ Lark Bot 配置正确
```

### 查看配置状态

```python
from src.core.config import Config

# 打印当前配置状态
Config.print_status()

# 输出：
# ✅ Twitter API - 社交媒体监控、发推 (FREE)
# ✅ Claude API - Twitter 内容生成 (~$0.01-0.05/推文)
# ❌ Replicate API - AI 图像特效 (未配置)
```

---

## ❓ 常见问题

### Q: 我有 Claude Pro 会员，还需要 Claude API key 吗？

**A:** 是的。Claude Pro 和 Claude API 是两个独立的服务：
- Claude Pro = 网页版无限使用（$20/月）
- Claude API = 程序调用，按量付费

你可以：
1. 使用免费的 Llama 替代（完全免费）
2. 手动在 claude.ai 生成内容（利用你的会员）
3. 购买 Claude API 额度（如果需要自动化）

---

### Q: Replicate 有免费额度吗？

**A:** 新用户有少量免费额度（~$5）。用完后按量付费。

---

### Q: 我能只配置部分 API 吗？

**A:** 可以！所有 API 都是可选的：
- 不配置 Twitter API → 监控功能不可用
- 不配置 Claude API → 内容生成功能不可用
- 不配置 Replicate API → AI 特效功能不可用
- 本地 Meme 生成永远可用（不需要任何 API）

---

### Q: 如何降低成本？

**A:**
1. **使用 Claude Haiku** 而不是 Sonnet（便宜 10 倍）
2. **使用免费的 Llama** 替代 Claude
3. **手动生成重要推文**（利用 Claude Pro 会员）
4. **缓存结果**，避免重复调用
5. **按需开启 AI 特效**

---

## 📚 更多资源

- **配置向导**：`python scripts/setup_config.py`
- **配置测试**：`python scripts/test_config.py`
- **API 文档**：
  - [Twitter API](https://developer.twitter.com/en/docs)
  - [Claude API](https://docs.anthropic.com/claude/reference)
  - [Replicate API](https://replicate.com/docs)
  - [Lark API](https://open.larksuite.com/document)

---

## 🆘 需要帮助？

**配置问题：**
1. 运行 `python scripts/setup_config.py`
2. 运行 `python scripts/test_config.py`
3. 查看错误信息

**API 问题：**
1. 检查 API key 是否正确
2. 检查余额是否充足
3. 查看 API 文档

**功能问题：**
1. 查看 SKILL.md 文档
2. 运行示例代码
3. 提交 Issue

---

**配置完成后，你就可以开始使用 AI Content Studio 了！** 🎉

```bash
# 启动 Lark Bot
python webhook_server.py

# 或测试单个功能
python -c "from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2; ..."
```
