# 程序入口指南

本项目有多个入口，取决于你想使用的功能。

## 🎯 主要入口

### 1. Lark Bot 服务器（推荐用于生产）

**入口文件**: `webhook_server.py`

**用途**: 启动 Lark/飞书机器人，接收和处理 Lark 消息

**启动方式**:
```bash
# 方式 1: 直接运行
python webhook_server.py

# 方式 2: 使用启动脚本（推荐）
./start_lark_bot.sh

# 方式 3: 后台运行
nohup python webhook_server.py > webhook.log 2>&1 &
```

**功能**:
- 接收 Lark 消息
- 处理 21 个机器人指令（`/milady`, `/tweet`, `/monitor` 等）
- 生成梗图并上传到 Lark
- 生成 Twitter 内容
- 监控社交媒体

**访问**:
- URL: `http://localhost:8000/webhook`
- 健康检查: `http://localhost:8000/health`

---

### 2. 配置和设置脚本

#### 2.1 首次配置向导

**入口文件**: `scripts/setup_config.py`

**用途**: 配置 API Keys（Twitter, Claude, Replicate, Lark）

**运行**:
```bash
python scripts/setup_config.py
```

**交互式配置**:
- 输入各个 API Key
- 自动生成 `config/.env` 文件
- 验证配置有效性

---

#### 2.2 测试配置

**入口文件**: `scripts/test_config.py`

**用途**: 测试所有 API 配置是否正确

**运行**:
```bash
python scripts/test_config.py
```

---

#### 2.3 下载 NFT 图片

**入口文件**: `scripts/download_milady_nfts.py`

**用途**: 下载 10,000 个 Milady NFT 图片（~12GB）

**运行**:
```bash
python scripts/download_milady_nfts.py

# 选择选项:
# 1 - 下载全部 (0-9999)
# 2 - 测试集 (前 10 个)
# 3 - 自定义范围
# 4 - 断点续传
```

---

### 3. 独立功能脚本

#### 3.1 生成每日推文

**入口文件**: `scripts/generate_daily_tweets.py`

**用途**: 批量生成 Twitter 内容

**运行**:
```bash
python scripts/generate_daily_tweets.py
```

---

#### 3.2 创建单条推文

**入口文件**: `scripts/create_tweet.py`

**用途**: 生成单条推文并发布

**运行**:
```bash
python scripts/create_tweet.py
```

---

#### 3.3 审批工作流

**入口文件**: `scripts/approve.py`

**用途**: 审批待发布的推文/回复

**运行**:
```bash
python scripts/approve.py
```

---

#### 3.4 训练数据管理

**入口文件**: `scripts/manage_training.py`

**用途**: 管理 AI 训练数据，更新样本

**运行**:
```bash
python scripts/manage_training.py
```

---

### 4. Skills 独立使用

每个 Skill 都可以独立使用：

#### 4.1 Milady Meme Generator

**位置**: `skills/milady-meme-generator/src/meme_generator_v2.py`

**使用**:
```python
from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2

generator = MemeGeneratorV2()
meme = generator.generate_meme(
    nft_id=5050,
    top_text="GM",
    bottom_text="WAGMI"
)
meme.save("output.png")
```

---

#### 4.2 Twitter Content AI

**位置**: `skills/twitter-content-ai/src/claude_client.py`

**使用**:
```python
from skills.twitter_content_ai.src.claude_client import ClaudeClient

client = ClaudeClient()
tweet = client.generate_gm_post()
print(tweet)
```

---

#### 4.3 Social Monitoring

**位置**: `skills/social-monitoring/src/twitter_monitor.py`

**使用**:
```python
from skills.social_monitoring.src.twitter_monitor import TwitterMonitor

monitor = TwitterMonitor()
mentions = monitor.check_mentions()
print(mentions)
```

---

## 📋 完整入口列表

### 根目录

| 文件 | 用途 | 命令 |
|------|------|------|
| `webhook_server.py` | Lark Bot 服务器 | `python webhook_server.py` |
| `start_lark_bot.sh` | 启动 Lark Bot | `./start_lark_bot.sh` |
| `start_tunnel.sh` | 启动 ngrok 隧道 | `./start_tunnel.sh` |

### scripts/ 目录

| 文件 | 用途 | 命令 |
|------|------|------|
| `setup_config.py` | 配置 API Keys | `python scripts/setup_config.py` |
| `test_config.py` | 测试配置 | `python scripts/test_config.py` |
| `download_milady_nfts.py` | 下载 NFT 图片 | `python scripts/download_milady_nfts.py` |
| `download_milady_layers.py` | 下载图层 | `python scripts/download_milady_layers.py` |
| `generate_daily_tweets.py` | 生成每日推文 | `python scripts/generate_daily_tweets.py` |
| `create_tweet.py` | 创建单条推文 | `python scripts/create_tweet.py` |
| `approve.py` | 审批推文 | `python scripts/approve.py` |
| `manage_training.py` | 管理训练数据 | `python scripts/manage_training.py` |
| `get_chat_id.py` | 获取 Lark Chat ID | `python scripts/get_chat_id.py` |
| `setup_lark_webhook.py` | 设置 Lark Webhook | `python scripts/setup_lark_webhook.py` |
| `check_balance.py` | 检查余额 | `python scripts/check_balance.py` |
| `check_replicate_credit.py` | 检查 Replicate 余额 | `python scripts/check_replicate_credit.py` |

---

## 🚀 快速开始流程

### 首次使用

```bash
# 1. 配置 API Keys
python scripts/setup_config.py

# 2. 测试配置
python scripts/test_config.py

# 3. 下载 NFT 图片（可选，仅用于 Milady Meme Generator）
python scripts/download_milady_nfts.py
# 选择选项 2（测试集）进行快速测试

# 4. 启动 Lark Bot（如果需要）
python webhook_server.py
```

### 测试 Milady Meme Generator

```bash
# 使用 Python 交互式
python3
>>> from skills.milady_meme_generator.src.meme_generator_v2 import MemeGeneratorV2
>>> gen = MemeGeneratorV2()
>>> meme = gen.generate_random_meme()
>>> meme.save("test_meme.png")
```

### 测试 Twitter Content AI

```bash
# 生成一条 GM 推文
python3 -c "
from skills.twitter_content_ai.src.claude_client import ClaudeClient
client = ClaudeClient()
print(client.generate_gm_post())
"
```

---

## 🎯 使用场景对应入口

| 场景 | 入口 |
|------|------|
| **我想在 Lark 里用机器人** | `python webhook_server.py` |
| **我想配置 API Keys** | `python scripts/setup_config.py` |
| **我想下载 NFT 图片** | `python scripts/download_milady_nfts.py` |
| **我想生成梗图** | 使用 `MemeGeneratorV2` 类 |
| **我想生成 Twitter 内容** | 使用 `ClaudeClient` 类 |
| **我想监控 Twitter** | 使用 `TwitterMonitor` 类 |
| **我想批量生成推文** | `python scripts/generate_daily_tweets.py` |
| **我想管理训练数据** | `python scripts/manage_training.py` |

---

## ❓ 常见问题

### Q: 我是第一次使用，应该从哪里开始？
A:
1. 运行 `python scripts/setup_config.py` 配置 API Keys
2. 运行 `python scripts/test_config.py` 测试配置
3. 根据需求选择对应功能

### Q: Lark Bot 无法启动？
A:
1. 检查端口 8000 是否被占用：`lsof -i :8000`
2. 检查 LARK_APP_ID 和 LARK_APP_SECRET 是否配置
3. 查看日志：`tail -f webhook.log`

### Q: 如何在后台运行 Lark Bot？
A:
```bash
# 使用 nohup
nohup python webhook_server.py > webhook.log 2>&1 &

# 或使用 screen
screen -S lark-bot
python webhook_server.py
# Ctrl+A, D 分离会话
```

### Q: 如何停止后台运行的 Bot？
A:
```bash
# 查找进程
ps aux | grep webhook_server

# 停止进程
kill <PID>
```

---

## 📚 相关文档

- [README.md](README.md) - 项目总览
- [LARK_COMMANDS_GUIDE.md](LARK_COMMANDS_GUIDE.md) - Lark 指令完整指南
- [CONFIG.md](CONFIG.md) - 配置说明
- [ARCHITECTURE.md](ARCHITECTURE.md) - 系统架构

---

**Made with 🎀 for the Milady community**
