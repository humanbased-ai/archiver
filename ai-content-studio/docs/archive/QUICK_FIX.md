# 🚨 飞书 Bot 快速修复指南

## 当前状态

✅ **Webhook 服务器正在运行**（端口 5001）
✅ **功能测试通过**（本地测试成功）
✅ **机器人名称已更新**（@我是机器人）
❌ **飞书无法访问** Webhook（需要公网 URL）

## 🎯 核心问题

**飞书开放平台需要一个公网可访问的 Webhook URL**

你当前的服务器地址：
- `http://localhost:5001/webhook` - ❌ 飞书无法访问
- `http://192.168.0.111:5001/webhook` - ❌ 飞书无法访问

## 🔧 解决方案（3选1）

### 方案 1: localhost.run（最简单，无需安装）

**在新终端运行**：
```bash
ssh -R 80:localhost:5001 localhost.run
```

会输出类似：
```
Connect to http://abc123.localhost.run or https://abc123.localhost.run
```

复制这个 HTTPS URL，配置到飞书：
```
https://abc123.localhost.run/webhook
```

### 方案 2: ngrok（如果已安装）

查找 ngrok：
```bash
# 尝试这些命令
/usr/local/bin/ngrok http 5001
/opt/homebrew/bin/ngrok http 5001
~/ngrok http 5001
```

如果找到了，会显示：
```
Forwarding: https://abc123.ngrok.io -> http://localhost:5001
```

配置到飞书：
```
https://abc123.ngrok.io/webhook
```

### 方案 3: Cloudflare Tunnel（推荐生产环境）

```bash
# 如果没安装
brew install cloudflare/cloudflare/cloudflared

# 启动隧道
cloudflared tunnel --url http://localhost:5001
```

会得到公网 URL，配置到飞书。

## 📋 飞书开放平台配置步骤

### 1. 访问飞书开放平台

https://open.feishu.cn/app

### 2. 进入你的应用

找到「我是机器人」应用

### 3. 配置 Webhook URL

**路径**：事件订阅 → 请求地址配置

**填入**：
```
https://YOUR_TUNNEL_URL/webhook
```

例如：
```
https://abc123.localhost.run/webhook
```

### 4. 订阅事件

**路径**：事件订阅 → 添加事件

**必须订阅**：
- ✅ `im.message.receive_v1` - 接收消息

### 5. 配置权限

**路径**：权限管理

**必须开启**：
- ✅ `im:message` - 获取与发送消息
- ✅ `im:message:send_as_bot` - 以应用身份发送消息
- ✅ `im:resource` - 上传图片（可选）

### 6. 测试

在飞书群聊中：
```
@我是机器人 生成一张 GM 的梗图，NFT #1234，加个墨镜，liminal space illusion 风格
```

## 🔍 如何验证配置成功

### 查看 Webhook 服务器日志

如果配置正确，在你 @ 机器人后，服务器终端会显示：

```
📩 收到消息: '生成一张 GM 的梗图...' (chat_id: xxx)
🎨 检测到视觉风格: ['liminal', 'illusion']
✨ 将使用 Prompt Enhancer 增强描述
📸 使用 NFT #1234 作为基础
✅ 图片生成成功
```

### 如果没有日志

说明飞书没有发送请求到你的服务器，检查：
1. Webhook URL 是否正确
2. 隧道是否正在运行
3. 事件是否已订阅

## 🎯 推荐流程

1. **打开两个终端**

**终端 1** - Webhook 服务器（已运行）：
```bash
cd /Users/pengsun/ai-content-studio
./start_lark_bot.sh
```

**终端 2** - 内网穿透：
```bash
ssh -R 80:localhost:5001 localhost.run
```

2. **复制公网 URL**

从终端 2 复制 HTTPS URL

3. **配置到飞书**

在飞书开放平台配置 Webhook URL

4. **测试**

在飞书群聊 @ 机器人

5. **查看日志**

在终端 1 查看请求日志

## 💡 快速诊断

### 测试 Webhook 服务器是否正常

```bash
curl http://localhost:5001/
```

应该返回：
```json
{
  "status": "ok",
  "service": "Lark Meme Bot",
  "version": "1.0.0"
}
```

### 测试公网访问（配置隧道后）

```bash
curl https://YOUR_TUNNEL_URL/
```

应该返回同样的 JSON

## ❓ 常见问题

### Q: localhost.run 连接失败
**解决**：检查 SSH 配置，或使用其他方案

### Q: 飞书 Webhook 验证失败
**原因**：URL 不可访问或服务器未响应
**解决**：确认隧道正在运行，访问 URL 能返回正确响应

### Q: @ 机器人没反应
**检查**：
1. 机器人名称是否正确（@我是机器人）
2. Webhook URL 是否配置
3. 事件是否订阅
4. 查看服务器日志是否有请求

## 📞 获取帮助

如果以上方法都不行，提供以下信息：

1. Webhook 服务器日志
2. 隧道工具输出
3. 飞书开放平台配置截图
4. 在飞书中 @ 机器人的截图

---

**立即行动**：

1. 打开新终端
2. 运行：`ssh -R 80:localhost:5001 localhost.run`
3. 复制 HTTPS URL
4. 配置到飞书开放平台
5. 测试 @ 机器人
