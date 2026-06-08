# 🤖 Lark/飞书 Meme Bot 配置指南

**让同事在飞书里直接生成 Milady 梗图**

---

## 📋 前置准备

### 1. 安装依赖

```bash
pip3 install Flask requests Pillow
```

### 2. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录并创建企业自建应用
3. 获取以下信息：
   - **App ID**（应用凭证）
   - **App Secret**（应用凭证）
   - **Verification Token**（事件订阅）

---

## ⚙️ 配置步骤

### 步骤 1: 配置环境变量

编辑 `config/.env` 文件，添加飞书配置：

```bash
# Lark/飞书配置
LARK_APP_ID=cli_xxxxxxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxx
LARK_VERIFICATION_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
LARK_CHAT_ID=oc_xxxxxxxxxxxxxx  # 可选，测试群聊 ID
```

### 步骤 2: 配置飞书应用权限

在飞书开放平台 → 你的应用 → **权限管理**，添加以下权限：

**必需权限：**
- ✅ `im:message` - 获取与发送单聊、群组消息
- ✅ `im:message.group_at_msg` - 接收群聊中 @ 机器人的消息
- ✅ `im:message.group_at_msg:readonly` - 获取群组中 @ 机器人消息的内容
- ✅ `im:resource` - 上传图片、文件等资源

### 步骤 3: 配置事件订阅

在飞书开放平台 → 你的应用 → **事件订阅**：

1. **请求地址配置**：
   ```
   http://your-server.com/webhook
   ```
   或本地测试（使用内网穿透）：
   ```
   https://your-ngrok-url.ngrok.io/webhook
   ```

2. **订阅事件**：
   - ✅ `im.message.receive_v1` - 接收消息

3. 点击"保存"完成配置

### 步骤 4: 发布应用

在飞书开放平台 → 你的应用 → **版本管理与发布**：

1. 创建版本
2. 提交审核（或直接发布给测试用户）
3. 等待审核通过

---

## 🚀 启动服务器

### 方法 1: 本地测试（推荐用于开发）

```bash
# 启动 Flask 服务器
python3 lark_webhook_server.py
```

服务器将在 `http://localhost:5000` 运行

**使用 ngrok 进行内网穿透（本地测试）：**

```bash
# 安装 ngrok
brew install ngrok  # macOS
# 或从 https://ngrok.com/ 下载

# 启动内网穿透
ngrok http 5000
```

将 ngrok 提供的 HTTPS URL 配置到飞书的事件订阅地址。

### 方法 2: 生产环境部署

#### 使用 Gunicorn（推荐）

```bash
# 安装 gunicorn
pip3 install gunicorn

# 启动服务
gunicorn -w 4 -b 0.0.0.0:5000 lark_webhook_server:app
```

#### 使用 systemd（Linux 服务器）

创建 `/etc/systemd/system/lark-meme-bot.service`：

```ini
[Unit]
Description=Lark Meme Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ai-content-studio
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/python3 lark_webhook_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start lark-meme-bot
sudo systemctl enable lark-meme-bot
sudo systemctl status lark-meme-bot
```

#### 使用 Docker

创建 `Dockerfile`：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python3", "lark_webhook_server.py"]
```

构建并运行：

```bash
docker build -t lark-meme-bot .
docker run -d -p 5000:5000 --env-file config/.env lark-meme-bot
```

---

## 🎮 使用方法

### 基础命令

在飞书群聊中，直接发送命令：

#### 1. 生成随机梗图

```
/meme
```

自动生成一个随机 GM 梗图

#### 2. 生成指定类型的梗图

```
/meme gm
/meme crypto
/meme milady
/meme motivational
```

#### 3. 生成自定义文字梗图

```
/meme gm "GM BUILDERS" "LFG"
/meme crypto "WEN MOON" "SOON"
```

**注意**：文字需要用引号包裹

#### 4. 只生成 Milady（不加文字）

```
/milady
```

---

## 🎨 梗图模板类型

### GM 类（gm）
- "GM BUILDERS" / "LFG"
- "GM FRENS" / "WAGMI"
- "GOOD MORNING" / "TIME TO BUILD"
- "GM" / "LETS FUCKING GO"
- "RISE AND GRIND" / "GM"

### Crypto 类（crypto）
- "WEN MOON" / "SOON™"
- "DIAMOND HANDS" / "NEVER SELLING"
- "NGMI" / "HFSP"
- "BULLISH AF" / "TO THE MOON"
- "DYOR" / "NFA"

### Milady 类（milady）
- "MILADY SZNN" / "ALWAYS"
- "NOBODY TAKES MEMES" / "AS SERIOUSLY AS US"
- "NETWORK SPIRITUALITY" / "DIGITAL FOLKLORE"
- "REMILIA COLLECTIVE" / "CULT OF BEAUTY"

### Motivational 类（motivational）
- "KEEP BUILDING" / "NGMI OTHERWISE"
- "STAY FOCUSED" / "IGNORE FUD"
- "ONE MORE REP" / "THEN WE MOON"

---

## 🧪 测试

### 1. 测试服务器健康状态

```bash
curl http://localhost:5000/
```

应返回：
```json
{
  "status": "ok",
  "service": "Lark Meme Bot",
  "version": "1.0.0"
}
```

### 2. 测试梗图生成

```bash
curl -X POST http://localhost:5000/test \
  -H "Content-Type: application/json" \
  -d '{
    "command": "meme",
    "args": ["gm"],
    "chat_id": "test"
  }'
```

### 3. 查看帮助信息

```bash
curl http://localhost:5000/help
```

### 4. 在飞书群聊中测试

1. 将机器人添加到测试群聊
2. 在群聊中发送 `/meme`
3. 应该会收到一个 Milady 梗图

---

## 🔧 常见问题

### Q1: 飞书事件订阅验证失败？

**解决方案：**
1. 确保服务器可以被外网访问
2. 检查 Webhook URL 是否正确
3. 查看服务器日志是否有错误

### Q2: 机器人没有响应？

**解决方案：**
1. 确认机器人已添加到群聊
2. 检查权限是否正确配置
3. 查看服务器日志：
   ```bash
   tail -f logs/lark_bot.log
   ```

### Q3: 图片上传失败？

**解决方案：**
1. 检查 `im:resource` 权限是否已添加
2. 确认 access_token 有效
3. 检查图片大小（飞书限制 10MB）

### Q4: Token 过期？

**解决方案：**
Lark Bot 会自动刷新 token，如果还是报错：
1. 检查 App ID 和 App Secret 是否正确
2. 重启服务器

### Q5: 生成的图片不好看？

**解决方案：**
1. 等待完整图层下载完成（400+ 个文件）
2. 当前只有 54 个核心图层，完整版会有更多样式

---

## 📊 架构说明

```
用户在飞书发送 /meme
    ↓
飞书服务器发送事件到你的 Webhook
    ↓
lark_webhook_server.py 接收事件
    ↓
LarkMemeBot 处理命令
    ↓
MemeGenerator 生成梗图
    ↓
上传图片到飞书
    ↓
发送图片消息到群聊
    ↓
用户收到梗图 🎉
```

---

## 🔐 安全建议

1. **不要泄露凭证**
   - 不要将 `.env` 文件提交到 Git
   - 使用环境变量存储敏感信息

2. **使用 HTTPS**
   - 生产环境必须使用 HTTPS
   - 使用 Nginx 反向代理配置 SSL

3. **验证请求来源**
   - 启用 Verification Token 验证
   - 检查请求 IP 是否来自飞书服务器

4. **限流保护**
   - 添加 rate limiting
   - 防止滥用和 DDoS

---

## 📈 进阶功能（可选）

### 1. 添加交互式卡片

让用户通过点击按钮选择图层，而不是输入命令：

```python
# 发送卡片消息，包含按钮选择
card = {
    "elements": [
        {
            "tag": "action",
            "actions": [
                {
                    "tag": "button",
                    "text": {"tag": "plain_text", "content": "GM 梗图"},
                    "type": "primary",
                    "value": {"command": "meme", "category": "gm"}
                }
            ]
        }
    ]
}
```

### 2. 添加图层自定义

让用户选择特定的 Milady 图层：

```
/milady custom skin:Pale eyes:Heart hair:Pink
```

### 3. 批量生成

一次生成多个梗图：

```
/meme batch 5 gm
```

### 4. 保存用户偏好

记住每个用户喜欢的风格，自动生成符合偏好的梗图。

---

## 📝 日志和监控

### 查看日志

```bash
# 实时查看日志
tail -f logs/lark_bot.log

# 查看错误日志
grep ERROR logs/lark_bot.log
```

### 监控指标

建议监控：
- 请求数量
- 生成成功率
- 响应时间
- 错误率

---

## 🎉 完成！

现在同事可以在飞书里直接生成 Milady 梗图了！

**快速测试：**
1. 将机器人添加到飞书群聊
2. 发送 `/meme`
3. 等待几秒
4. 收到梗图 🎨

**需要帮助？**
- 查看日志：`logs/lark_bot.log`
- 运行测试：`python3 lark_webhook_server.py`
- 查看文档：`LARK_BOT_SETUP.md`

---

**Powered by AI Content Studio** 🤖✨
