# 工具脚本

这个目录包含各种管理和开发工具脚本。

## 🔧 管理工具

### check_replicate_credit.py
查看 Replicate API 余额和使用情况。

**用法:**
```bash
python3 scripts/check_replicate_credit.py
```

### check_balance.py
检查账户余额（旧版本，推荐使用 check_replicate_credit.py）。

## 📝 Twitter 相关

### create_tweet.py
创建推文的命令行工具。

**用法:**
```bash
python3 scripts/create_tweet.py
```

### approve.py
审批待发送的推文。

**用法:**
```bash
python3 scripts/approve.py
```

### generate_daily_tweets.py
批量生成每日推文。

**用法:**
```bash
python3 scripts/generate_daily_tweets.py
```

### manage_training.py
管理 AI 模型训练。

**用法:**
```bash
python3 scripts/manage_training.py
```

## ⚙️ 飞书设置

### setup_lark_webhook.py
设置飞书 Webhook 的辅助脚本。

**用法:**
```bash
python3 scripts/setup_lark_webhook.py
```

### get_chat_id.py
获取飞书群聊 ID。

**用法:**
```bash
python3 scripts/get_chat_id.py
```

**输出示例:**
```
Chat ID: oc_xxxxxxxxxxxxx
```

## 📊 使用场景

### 场景 1: 检查 API 余额
```bash
python3 scripts/check_replicate_credit.py
```

### 场景 2: 创建并发送推文
```bash
# 1. 创建推文
python3 scripts/create_tweet.py

# 2. 审批推文
python3 scripts/approve.py
```

### 场景 3: 设置飞书机器人
```bash
# 1. 设置 Webhook
python3 scripts/setup_lark_webhook.py

# 2. 获取群聊 ID
python3 scripts/get_chat_id.py
```

---

**注意:** 运行这些脚本前，请确保已配置相应的环境变量（API Keys 等）。
