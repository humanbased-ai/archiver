# 🌐 ngrok 安装和配置指南

## 方式 1: 使用 Homebrew 安装（推荐）

```bash
# 安装 ngrok
brew install ngrok/ngrok/ngrok

# 验证安装
ngrok version
```

## 方式 2: 手动下载安装

1. 访问 ngrok 官网：https://ngrok.com/download
2. 下载 macOS 版本
3. 解压到 `/usr/local/bin/`：
   ```bash
   sudo mv ~/Downloads/ngrok /usr/local/bin/ngrok
   sudo chmod +x /usr/local/bin/ngrok
   ```

## 配置 ngrok

### 1. 注册 ngrok 账号（免费）

访问：https://dashboard.ngrok.com/signup

### 2. 获取 Authtoken

1. 登录后访问：https://dashboard.ngrok.com/get-started/your-authtoken
2. 复制你的 authtoken

### 3. 配置 Authtoken

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## 启动 ngrok 隧道

```bash
# 启动隧道（映射到端口 5001）
ngrok http 5001
```

你会看到类似这样的输出：

```
ngrok

Session Status                online
Account                       your@email.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok-free.app -> http://localhost:5001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

## 配置飞书 Webhook URL

**重要信息**：
- 📍 公网 URL: `https://abc123xyz.ngrok-free.app`（每次启动会变化）
- 🔗 Webhook 端点: `https://abc123xyz.ngrok-free.app/webhook`

在飞书开放平台配置：
```
https://abc123xyz.ngrok-free.app/webhook
```

## 监控请求（可选）

ngrok 提供了一个 Web 界面来监控所有请求：

访问：http://127.0.0.1:4040

可以看到：
- 所有进入的 HTTP 请求
- 请求和响应的详细内容
- 请求时间和状态码

## 使用技巧

### 保持隧道在后台运行

```bash
# 使用 nohup 在后台运行
nohup ngrok http 5001 > ngrok.log 2>&1 &

# 查看日志
tail -f ngrok.log
```

### 查看当前 ngrok URL

```bash
# 使用 ngrok API
curl http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'
```

### 固定域名（付费功能）

免费版每次启动 URL 都会变化。如果需要固定域名：
1. 升级到付费计划
2. 配置自定义域名
3. 使用命令：`ngrok http --domain=your-domain.ngrok.app 5001`

## 替代方案

如果不想使用 ngrok，可以考虑：

### 1. localhost.run（免费，无需注册）

```bash
ssh -R 80:localhost:5001 nokey@localhost.run
```

### 2. Cloudflare Tunnel（免费）

```bash
# 安装
brew install cloudflare/cloudflare/cloudflared

# 启动隧道
cloudflared tunnel --url http://localhost:5001
```

### 3. 部署到云服务器

如果是生产环境，建议：
- 部署到 AWS/阿里云/腾讯云
- 使用 Docker 容器
- 配置域名和 HTTPS

## 故障排查

### Q: ngrok 启动后立即关闭

**原因**：可能是端口被占用或 authtoken 未配置

**解决**：
```bash
# 检查端口
lsof -i :5001

# 重新配置 authtoken
ngrok config add-authtoken YOUR_TOKEN
```

### Q: 飞书 Webhook 验证失败

**原因**：URL 配置错误或服务器未响应

**解决**：
1. 确认 ngrok 隧道正在运行
2. 访问 http://127.0.0.1:4040 查看请求日志
3. 检查 Webhook 服务器日志

### Q: 每次重启 URL 都变化

**说明**：这是免费版的限制

**解决方案**：
- 使用付费版固定域名
- 或每次更新飞书配置（不推荐）

## 完整工作流程

### 步骤 1: 安装 ngrok

```bash
brew install ngrok/ngrok/ngrok
```

### 步骤 2: 配置 Authtoken

```bash
ngrok config add-authtoken YOUR_TOKEN
```

### 步骤 3: 启动服务器和隧道

**终端 1 - Webhook 服务器**：
```bash
cd /Users/pengsun/ai-content-studio
./start_lark_bot.sh
```

**终端 2 - ngrok 隧道**：
```bash
ngrok http 5001
```

### 步骤 4: 配置飞书

1. 复制 ngrok 显示的 HTTPS URL
2. 在飞书开放平台配置 Webhook URL：
   ```
   https://YOUR_NGROK_URL.ngrok-free.app/webhook
   ```
3. 订阅事件：`im.message.receive_v1`
4. 配置权限：`im:message`, `im:message:send_as_bot`, `im:resource`

### 步骤 5: 测试

在飞书群聊中：
```
@Milady_Bot 生成一张 GM 的梗图
```

### 步骤 6: 监控

- Webhook 服务器日志：查看终端 1
- HTTP 请求日志：访问 http://127.0.0.1:4040
- 飞书开放平台：查看事件推送记录

## 下一步

安装 ngrok 后，运行：

```bash
# 启动隧道
ngrok http 5001
```

然后复制显示的 HTTPS URL 并配置到飞书开放平台！
