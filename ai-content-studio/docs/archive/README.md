# AI Content Studio - 半自主 Twitter Bot

用 Milady 风格谈 Codatta 话题的 AI Twitter Bot

## 🎯 功能

- ✅ 自动监听 Twitter（Founders、Base、x402、AI/Data）
- ✅ Claude AI 智能生成回复
- ✅ Lark 通知审核
- ✅ 半自主模式（你批准后发送）
- ✅ 完整的 Skills 系统

## 📁 项目结构

```
ai-content-studio/
├── skills/              # Skills 文档
│   ├── SKILL.md        # Bot 的大脑
│   └── accounts.json   # 账号配置
├── src/
│   ├── core/           # 配置和日志
│   ├── twitter/        # Twitter API
│   ├── intelligence/   # Claude AI
│   ├── approval/       # Lark 审核
│   └── storage/        # 数据库
├── config/             # 配置文件
├── main.py             # 主程序
└── approve.py          # 审核工具
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制示例文件
cp config/.env.example config/.env

# 编辑 .env 填入你的 API keys
# - Twitter API credentials
# - Claude API key
# - Lark Webhook URL
```

### 3. 运行 Bot

```bash
python main.py
```

Bot 会开始：
- ✅ 每 5 分钟检查 Founders 推文
- ✅ 每 10 分钟检查高优先级账号
- ✅ 每 15 分钟检查 @提及
- ✅ 每天 10:00 生成原创内容

## 📱 审核流程

### 收到 Lark 通知

你会收到卡片：
```
🔔 新推文需要互动 - HIGHEST

作者: @drtwo101
优先级: highest
原因: Founders (must interact)

原推文: ...
建议回复: ...

Tweet ID: 1234567890
```

### 审核推文

#### 方法 1: 列出所有待审核

```bash
python approve.py list list
```

#### 方法 2: 批准发送

```bash
python approve.py <tweet_id> approve
```

#### 方法 3: 拒绝

```bash
python approve.py <tweet_id> reject
```

## 🎯 Bot 工作流程

```
1. 监听 Twitter
   ↓
2. 发现新推文
   ↓
3. 判断是否值得互动
   ├─ Founders? → 是
   ├─ @提及? → 是
   ├─ GM post? → 是
   ├─ 相关话题? → 检查关键词
   └─ 社区时刻? → 是
   ↓
4. 调用 Claude 生成回复
   ├─ 读取 SKILL.md
   ├─ 读取 accounts.json
   └─ 生成内容
   ↓
5. 保存到数据库
   ↓
6. 发送 Lark 通知
   ↓
7. 等待你审核
   ↓
8. 你批准后发送
```

## 📊 技术栈

- **Python 3.11+**
- **Twitter API v2** (tweepy)
- **Claude API** (anthropic)
- **Lark Webhook**
- **SQLite** (数据库)
- **SQLAlchemy** (ORM)

## 🎨 Skills 系统

Bot 的行为由两个文件控制：

### skills/SKILL.md
- 完整的风格指南
- Milady 文化使用方式
- 内容策略
- 互动判断标准

### skills/accounts.json
- 130+ 账号配置
- 优先级设置
- 关键词列表
- 频率限制

## 📝 日志

日志保存在 `logs/` 目录：
- `main.log` - 主程序日志
- `twitter_client.log` - Twitter API
- `claude_client.log` - Claude AI
- `database.log` - 数据库操作

## 🔧 常用命令

### 查看待审核列表
```bash
python approve.py list list
```

### 批准推文
```bash
python approve.py 1234567890 approve
```

### 拒绝推文
```bash
python approve.py 1234567890 reject
```

### 查看日志
```bash
tail -f logs/main.log
```

## 💡 提示

### 每天你需要做的

1. 收到 Lark 通知（3-5 个）
2. 查看生成的内容
3. 运行 `python approve.py list list`
4. 批准或拒绝：`python approve.py <id> approve`
5. 总计 5-10 分钟

### Bot 自动完成的

- ✅ 监听 Twitter
- ✅ 判断是否互动
- ✅ 生成高质量回复
- ✅ 发送审核通知
- ✅ 记录所有数据

## 🆘 故障排除

### Twitter API 问题

```python
python -c "from src.twitter.client import TwitterClient; client = TwitterClient(); print('Twitter OK')"
```

### Claude API 问题

```python
python -c "from src.intelligence.claude_client import ClaudeClient; client = ClaudeClient(); print('Claude OK')"
```

### Lark Webhook 问题

```python
python -c "from src.approval.lark_client import LarkClient; client = LarkClient(); client.send_notification('Test'); print('Lark OK')"
```

## 📈 下一步

Phase 2 功能（可选）：
- [ ] Web Dashboard
- [ ] Lark 按钮回调
- [ ] 自动发送已批准推文
- [ ] 数据统计和分析

## 📄 License

MIT

---

**Milady style + Codatta topics = Jessie 🎀🧹**
