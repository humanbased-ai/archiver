# 🚀 Lark Meme Bot 快速开始（5分钟配置）

## 📋 准备工作

### 1. 获取飞书凭证（2分钟）

1. 访问 https://open.feishu.cn/
2. 登录 → 创建应用 → 企业自建应用
3. 复制以下信息：
   - **App ID**
   - **App Secret**
   - **Verification Token**（在"事件订阅"页面）

### 2. 配置环境变量（1分钟）

编辑 `config/.env`，添加：

```bash
LARK_APP_ID=cli_xxxxxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxx
LARK_VERIFICATION_TOKEN=xxxxxxxxxxxxxxxxxxxxx
```

### 3. 配置飞书权限（1分钟）

在飞书开放平台 → 你的应用 → **权限管理**，勾选：

- ✅ `im:message`
- ✅ `im:message.group_at_msg`
- ✅ `im:message.group_at_msg:readonly`
- ✅ `im:resource`

点击"保存"。

---

## 🎯 本地测试（推荐）

### 方法 1: 使用 ngrok（最简单）

```bash
# 终端 1: 启动服务器
python3 lark_webhook_server.py

# 终端 2: 启动 ngrok
ngrok http 5000
```

复制 ngrok 提供的 HTTPS URL（如 `https://abc123.ngrok.io`）

### 方法 2: 使用启动脚本

```bash
./scripts/start_lark_bot.sh
```

---

## ⚙️ 配置飞书事件订阅（1分钟）

1. 飞书开放平台 → 你的应用 → **事件订阅**
2. 填入请求地址：
   ```
   https://abc123.ngrok.io/webhook
   ```
3. 勾选事件：
   - ✅ `im.message.receive_v1`
4. 点击"保存"

---

## 🎮 使用

### 1. 添加机器人到群聊

在飞书创建测试群 → 添加你的应用机器人

### 2. 发送命令

在群聊中输入：

```
/meme
```

等待几秒，会收到一个 Milady 梗图！🎨

### 3. 更多命令

```bash
/meme gm                    # GM 梗图
/meme crypto                # Crypto 梗图
/meme gm "TOP" "BOTTOM"     # 自定义文字
/milady                     # 纯 Milady（不加文字）
```

---

## ✅ 验证配置

### 测试 1: 健康检查

```bash
curl http://localhost:5000/
```

应返回：`{"status": "ok", ...}`

### 测试 2: 生成梗图

```bash
curl -X POST http://localhost:5000/test \
  -H "Content-Type: application/json" \
  -d '{"command": "meme", "args": ["gm"], "chat_id": "test"}'
```

应返回：`{"code": 0, "image_path": "output/lark/..."}`

### 测试 3: 在飞书测试

群聊中发送 `/meme`，应收到图片

---

## ❌ 常见问题

### Q: 机器人没有响应？

**解决：**
1. 检查服务器是否运行：`curl http://localhost:5000/`
2. 查看日志：终端输出
3. 确认机器人在群聊中

### Q: 事件订阅验证失败？

**解决：**
1. 确保 ngrok 正在运行
2. URL 必须是 HTTPS（ngrok 自动提供）
3. 检查 `LARK_VERIFICATION_TOKEN` 是否配置

### Q: 上传图片失败？

**解决：**
1. 检查 `im:resource` 权限
2. 重新获取 access_token（重启服务器）

---

## 📚 完整文档

查看详细配置：`LARK_BOT_SETUP.md`

---

## 🎉 完成！

现在同事可以在飞书里生成梗图了！

**测试命令：**
```
/meme              → 随机 GM 梗图
/meme crypto       → 随机 Crypto 梗图
/meme gm "GM" "LFG" → 自定义文字
/milady            → 纯 Milady
```

**下一步：**
- 生产环境部署？查看 `LARK_BOT_SETUP.md`
- 添加更多功能？修改 `src/bots/lark_meme_bot.py`
- 自定义文字模板？编辑 `src/meme/meme_generator.py`

---

**有问题？查看日志或重启服务器** 🤖✨
