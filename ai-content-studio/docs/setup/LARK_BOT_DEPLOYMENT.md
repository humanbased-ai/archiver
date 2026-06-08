# 🚀 Lark Bot 部署指南

## ✅ 权限已通过

恭喜！飞书 Bot 的所有权限已获批准，现在可以正常使用了！

---

## 📋 快速启动

### 1. 测试权限（可选）

```bash
python3 test_lark_permissions.py
```

这将自动测试：
- ✅ Access Token 获取
- ✅ Meme 生成（V2 引擎）
- ✅ 图片上传（im:resource 权限）
- ✅ 所有字体风格（Impact, Glow, Chinese, Angelic）
- ✅ 图层叠加功能

### 2. 启动 Webhook 服务器

```bash
python3 lark_webhook_server.py
```

服务器将在 `http://localhost:5000` 启动

**重要端点：**
- `POST /webhook` - 飞书事件接收端点
- `GET /help` - 获取使用帮助
- `POST /test` - 测试接口
- `GET /` - 健康检查

### 3. 在飞书中使用

在已添加机器人的群聊中发送：

```
@Milady_Bot /meme gm
```

---

## 🎨 V2 功能特性

### 已实现功能

✅ **NFT 基础系统**
- 9,955+ NFT 原图作为基础（接近 10,000 个）
- 可指定 NFT ID (0-9999)
- 随机选择功能

✅ **图层叠加系统**
- 324 个图层装饰
- 6 大类别：Hat, Glasses, Earrings, Necklaces, Face Decoration, Overlay
- 支持多图层组合

✅ **字体系统**
- **Impact**: 经典 Meme 粗体字
- **Glow**: 赛博朋克发光效果
- **Chinese**: 中文粗体（自动检测）
- **Angelic**: 优雅天使字体

✅ **文字模板**
- GM: "GM BUILDERS / LFG"
- Crypto: "WEN MOON / SOON™"
- Milady: "MILADY SZNN / ALWAYS"
- Motivational: "KEEP BUILDING / NGMI OTHERWISE"

✅ **中文支持**
- 自动检测中文字符
- 自动切换中文字体
- 支持混合中英文

✅ **飞书集成**
- im:resource 权限（图片上传）✅
- im:message 权限（消息发送）✅
- Webhook 事件处理
- 斜杠命令解析

---

## 📝 命令格式详解

### 基础语法

```
/meme [模板] [NFT_ID] [图层...] [选项...]
```

所有参数都是可选的，可以任意组合！

### 参数说明

| 参数类型 | 格式 | 示例 | 说明 |
|---------|------|------|------|
| 模板 | `gm/crypto/milady/motivational` | `/meme gm` | 预设文字模板 |
| NFT ID | `数字` | `/meme 1234` | 选择特定 NFT (0-9999) |
| 图层 | `类别:文件名` | `Hat:Beret.png` | 添加装饰图层 |
| 字体 | `font:风格` | `font:glow` | 选择字体风格 |
| 大写 | `caps:on/off` | `caps:off` | 控制大写转换 |
| 文字 | `"文本"` | `"Hello World"` | 自定义文字 |

---

## 🎯 使用示例

### 1. 简单使用

```bash
# 最简单 - 使用 GM 模板
/meme gm

# 使用其他模板
/meme crypto
/meme milady
/meme motivational
```

### 2. 指定 NFT

```bash
# 使用 NFT #1234
/meme gm 1234

# 使用 NFT #5678 + Crypto 模板
/meme crypto 5678
```

### 3. 添加图层装饰

```bash
# 添加贝雷帽
/meme gm Hat:Beret.png

# 添加墨镜
/meme gm Glasses:Sunglasses.png

# 组合多个图层
/meme gm Hat:Beret.png Glasses:Heart Glasses.png

# NFT + 图层
/meme gm 1234 Hat:Blue Cap.png
```

### 4. 选择字体风格

```bash
# 发光字体（赛博朋克）
/meme gm font:glow

# 优雅字体
/meme gm font:angelic

# 经典粗体（默认）
/meme gm font:impact
```

### 5. 中文梗图

```bash
# 中文会自动使用中文字体
/meme "早安" "建设者们"

# 中文 + NFT
/meme "GM 建设者" "冲冲冲" 1234

# 中文小写（关闭大写转换）
/meme "早安 建设者" "WAGMI" caps:off
```

### 6. 高级组合

```bash
# GM 模板 + NFT #5678 + 贝雷帽 + 发光字体
/meme gm 5678 Hat:Beret.png font:glow

# Crypto 模板 + NFT #100 + 墨镜 + 心形特效
/meme crypto 100 Glasses:Sunglasses.png Overlay:Heart Meme.png

# 自定义中文 + NFT #2000 + 保持小写
/meme "早安 建设者" "一起冲" 2000 caps:off

# Milady 模板 + 帽子 + 眼镜 + 项链 + Angelic 字体
/meme milady Hat:Pink Bonnet.png Glasses:Heart Glasses.png Necklaces:Pearl.png font:angelic
```

---

## 🎨 可用图层速查

### 帽子 (Hat:)

```
Beret.png
Blue Cap.png
Brown Cowboy Hat.png
White Cowboy Hat.png
Pink Bonnet.png
Trucker Anime.png
Bear Hat.png
```

**查看所有**: `ls assets/milady_layers/Hat/`

### 眼镜 (Glasses:)

```
Sunglasses.png
Heart Glasses.png
3D Glasses.png
Robotic Shades.png
Round Shades.png
```

**查看所有**: `ls assets/milady_layers/Glasses/`

### 特效 (Overlay:)

```
Heart Meme.png
Stars.png
Birthday Hat.png
Love Is Violence.png
Clippy.png
```

**查看所有**: `ls assets/milady_layers/Overlay/`

### 其他类别

- `Earrings:` - 耳环（16 种）
- `Necklaces:` - 项链（12 种）
- `Face Decoration:` - 脸部装饰（12 种）

---

## 🔧 故障排除

### Q: 机器人没反应？

**A**: 检查以下几点：
1. 确保在命令前加 `/`
2. 确保 @ 了机器人（或在群聊中）
3. 检查 Webhook 服务器是否运行
4. 查看服务器日志

### Q: 图片上传失败？

**A**: 检查权限：
- im:resource 权限是否已审核通过
- Access Token 是否有效
- 网络连接是否正常

### Q: 中文显示不正常？

**A**: 系统会自动检测并使用中文字体，无需手动设置。如果仍有问题：
1. 检查字体文件是否存在
2. 查看 CaptionMeme 初始化日志

### Q: 想看所有可用图层？

**A**: 运行以下命令：
```bash
ls assets/milady_layers/Hat/
ls assets/milady_layers/Glasses/
ls assets/milady_layers/Overlay/
```

### Q: 图层名称不对？

**A**:
- 检查大小写和空格
- 文件名必须完全匹配（包括 .png）
- 参考 `assets/milady_layers/` 目录

---

## 📊 系统状态

### NFT 原图
- ✅ **已下载**: 9,955/10,000 (99.55%)
- 📍 **位置**: `assets/milady_nfts/images/`
- 📏 **尺寸**: 1000x1250 px
- 💾 **大小**: ~15 GB

### 图层素材
- ✅ **已下载**: 324/327 (99.1%)
- 📍 **位置**: `assets/milady_layers/`
- 📏 **尺寸**: 2000x2500 px（自动缩放）
- 💾 **大小**: 346 MB

### 权限状态
- ✅ **im:resource**: 已通过（图片上传）
- ✅ **im:message**: 已通过（消息发送）
- ✅ **Access Token**: 正常获取

---

## 🚀 生产部署建议

### 1. 使用 systemd 管理服务（Linux）

创建 `/etc/systemd/system/lark-meme-bot.service`:

```ini
[Unit]
Description=Lark Meme Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/ai-content-studio
ExecStart=/usr/bin/python3 lark_webhook_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl enable lark-meme-bot
sudo systemctl start lark-meme-bot
sudo systemctl status lark-meme-bot
```

### 2. 使用 nohup 后台运行（macOS/Linux）

```bash
nohup python3 lark_webhook_server.py > lark_bot.log 2>&1 &
```

查看日志：
```bash
tail -f lark_bot.log
```

### 3. 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. 环境变量配置

创建 `.env` 文件：

```bash
LARK_APP_ID=your_app_id
LARK_APP_SECRET=your_app_secret
LARK_VERIFICATION_TOKEN=your_token
```

---

## 📚 相关文档

- **用户使用指南**: `LARK_BOT_USAGE.md` - 详细的用户手册
- **系统架构**: `MILADY_MEME_SYSTEM_V2.md` - V2 系统设计
- **API 文档**: `src/bots/lark_meme_bot.py` - 代码注释

---

## 🎉 成功部署！

您的 Milady Meme Bot 现在已经完全就绪：

✅ 权限已通过
✅ V2 系统运行正常
✅ 所有功能测试通过
✅ 9,955+ NFT 可用
✅ 324 个图层装饰
✅ 4 种字体风格
✅ 中文完整支持

**开始使用**: 在飞书群里发送 `/meme gm` 🚀

---

**技术支持**: AI Content Studio Team
**文档更新**: 2025-12-30
