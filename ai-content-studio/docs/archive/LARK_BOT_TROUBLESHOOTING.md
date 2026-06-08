# 🔧 飞书 Meme Bot 故障排查指南

## 问题：在飞书里 @ 机器人没有反应

### ✅ 1. 确认 Webhook 服务器正在运行

**启动服务器**：
```bash
cd /Users/pengsun/ai-content-studio
./start_lark_bot.sh
```

或者：
```bash
python3 lark_webhook_server.py
```

**检查是否成功启动**：
应该看到类似输出：
```
🎨 Lark Meme Bot Server 启动中...
======================================================================
📍 Webhook URL: http://localhost:5001/webhook
📖 帮助信息: http://localhost:5001/help
🧪 测试接口: POST http://localhost:5001/test
======================================================================
```

### ✅ 2. 测试本地功能

**快速测试**：
```bash
python3 test_specific_prompt.py
```

这会测试你的具体提示词：
- "生成一张 GM 的梗图，NFT #1234，加个墨镜，liminal space illusion 风格"

如果这个测试通过，说明**功能本身没问题**，问题在于飞书配置。

### ✅ 3. 检查飞书开放平台配置

**需要配置的地方**：

#### 3.1 配置 Webhook URL

1. 登录飞书开放平台：https://open.feishu.cn/
2. 进入你的应用
3. 找到「事件订阅」→「请求地址配置」
4. 填入：
   - **本地测试**：`http://localhost:5001/webhook`
   - **生产环境**：`https://your-domain.com/webhook`（需要公网可访问）

⚠️ **注意**：本地测试需要使用内网穿透工具（如 ngrok）

#### 3.2 订阅事件

在「事件订阅」中添加：
- `im.message.receive_v1` - 接收消息

#### 3.3 配置权限

在「权限管理」中添加：
- `im:message` - 获取与发送单聊、群组消息
- `im:message:send_as_bot` - 以应用的身份发消息
- `im:resource` - 上传图片文件资源（可选）

### ✅ 4. 使用内网穿透（本地测试）

如果要在本地测试飞书 Bot，需要使用内网穿透工具：

**使用 ngrok**：
```bash
# 安装 ngrok
brew install ngrok

# 启动内网穿透
ngrok http 5001
```

会得到一个公网 URL，例如：
```
https://abc123.ngrok.io
```

然后在飞书开放平台配置：
```
https://abc123.ngrok.io/webhook
```

### ✅ 5. 确认 @ 机器人的方式

**正确的使用方式**：

在飞书群聊中：
```
@我是机器人 生成一张 GM 的梗图，NFT #1234，加个墨镜，liminal space illusion 风格
```

**检查机器人名称**：
1. 在飞书开放平台查看你的应用名称
2. 确保 @ 的是正确的机器人名称
3. 如果不确定，可以在群聊中输入 `@`，会弹出机器人列表

### ✅ 6. 查看 Webhook 日志

当 Webhook 服务器运行时，所有接收到的请求都会在终端显示：

```
📩 收到消息: 'xxx' (chat_id: xxx)
🎯 处理命令: meme, 参数: ['gm']
✅ 图片生成成功: output/lark/meme_xxx.png
```

如果**没有看到任何日志**，说明：
- Webhook URL 配置不正确
- 事件订阅没有生效
- 或者消息没有发送到服务器

### ✅ 7. 测试 Webhook 端点

**使用 curl 测试**：
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

### ✅ 8. 检查环境变量

确认 `.env` 文件中的配置：

```bash
cat config/.env | grep LARK
```

应该包含：
```
LARK_APP_ID=cli_xxx
LARK_APP_SECRET=xxx
LARK_VERIFICATION_TOKEN=xxx
```

## 🎯 完整排查流程

1. **本地测试通过** → 功能正常 ✅
   ```bash
   python3 test_specific_prompt.py
   ```

2. **启动 Webhook 服务器**
   ```bash
   ./start_lark_bot.sh
   ```

3. **使用 ngrok 暴露到公网**（本地测试）
   ```bash
   ngrok http 5001
   ```

4. **在飞书开放平台配置 Webhook URL**
   ```
   https://xxx.ngrok.io/webhook
   ```

5. **订阅事件**
   - `im.message.receive_v1`

6. **配置权限**
   - `im:message`
   - `im:message:send_as_bot`
   - `im:resource`

7. **在群聊中 @ 机器人测试**
   ```
   @我是机器人 liminal space illusion
   ```

8. **查看 Webhook 服务器日志**
   - 应该看到接收到的消息和处理日志

## 🐛 常见问题

### Q1: @ 机器人没反应
**原因**：
- Webhook URL 没配置或配置错误
- 事件没有订阅
- 机器人名称不对

**解决**：
- 检查飞书开放平台的 Webhook 配置
- 确认事件订阅列表
- 确认 @ 的机器人名称

### Q2: Webhook 服务器没有收到请求
**原因**：
- 本地服务器没有公网访问
- ngrok 没有启动
- Webhook URL 配置错误

**解决**：
- 使用 ngrok 进行内网穿透
- 确认 ngrok 的 URL 已经配置到飞书
- 查看 ngrok 的访问日志

### Q3: 收到请求但没有回复
**原因**：
- 权限不足（im:message:send_as_bot）
- access_token 过期
- 图片上传权限不足

**解决**：
- 检查权限配置
- 重新获取 access_token
- 添加 im:resource 权限

### Q4: 端口被占用
**原因**：
- 系统的 ControlCenter 占用了 5000 端口

**解决**：
- 使用 5001 端口（已经修改）
- 或者使用环境变量指定端口：
  ```bash
  PORT=8080 python3 lark_webhook_server.py
  ```

## 📚 相关文档

- [飞书开放平台](https://open.feishu.cn/)
- [飞书机器人开发文档](https://open.feishu.cn/document/home/develop-a-bot-in-5-minutes/create-an-app)
- [事件订阅](https://open.feishu.cn/document/ukTMukTMukTM/uUTNz4SN1MjL1UzM)
- [ngrok 文档](https://ngrok.com/docs)

## 💡 下一步

如果以上步骤都完成了但还是不工作，请提供：
1. Webhook 服务器的日志
2. 飞书开放平台的配置截图
3. ngrok 的日志（如果使用）
4. 在飞书中 @ 机器人的截图

这样可以更精准地定位问题！
