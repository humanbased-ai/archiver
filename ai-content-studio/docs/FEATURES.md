# AI Content Studio - 功能文档索引

本文档提供项目所有功能的快速索引。

---

## 🤖 核心功能

### 1. Twitter Bot（主功能）
**文档**: `../README.md`

- 自动监听 Twitter（Founders、Base、x402、AI/Data）
- Claude AI 智能生成回复
- Lark 通知审核
- 半自主模式（你批准后发送）
- 完整的 Skills 系统

---

## 🎨 Meme 生成功能

### 2. Lark Meme Bot
**文档**: `LARK_WEBHOOK_TUTORIAL.md`

在 Lark/飞书中通过命令生成和处理 meme。

#### 可用命令

##### 基础 Meme 生成
- `/meme <主题>` - 生成纯文本 meme
- `/memegen <主题>` - 生成图片版 meme

##### Milady NFT 相关
- `/milady <编号>` - 显示指定编号的 Milady NFT
- `/milady random` - 随机显示 Milady NFT
- `/milady_replace <编号> <配饰> <描述>` - 使用预定义区域替换配饰
- `/milady_replace_sam <编号> <配饰> <描述>` - **新功能** 使用 SAM 自动检测替换配饰

---

## 🔍 SAM 自动配饰检测（新功能）

### 3. SAM (Segment Anything Model) 集成
**主文档**: `sam/SAM_PRODUCTION_RELEASE.md` 📌
**技术文档**: `sam/SAM_INTEGRATION_COMPLETE.md`
**测试指南**: `sam/SAM_LARK_TEST_GUIDE.md`
**文档索引**: `sam/README.md`

#### 功能概述

自动检测 Milady NFT 中的配饰位置，实现精确替换。

**支持的配饰类型:**
- 帽子 (hat)
- 眼镜 (glasses)
- 耳环 (earrings)
- 项链 (necklace)
- 面部配饰 (face_accessories)
- 其他 (other)

#### 使用示例

**简单使用:**
```
/milady_replace_sam 5050 hat cyberpunk cap with neon blue lights
```

**中文支持:**
```
/milady_replace_sam 5050 帽子 未来主义全息帽子
```

**高级格式:**
```
/milady_replace_sam 5050
accessory: glasses
description: cyberpunk sunglasses with purple glow, futuristic, highly detailed
guidance: 30.0
steps: 28
```

#### SAM vs 普通模式对比

| 特性 | 普通模式 | SAM 模式 |
|-----|---------|----------|
| 命令 | `/milady_replace` | `/milady_replace_sam` |
| 检测方式 | 预定义固定区域 | SAM 自动检测 |
| 精确度 | 中等 | 高 |
| 成本 | $0.050/张 | $0.061/张 |
| 适配性 | 有限 | 所有 NFT |
| 推荐用途 | 成本优先 | 精度优先 |

#### 成本明细

- SAM 检测: $0.011/次
- FLUX Fill Pro: $0.050/次
- **总计: $0.061/张**
- 缓存命中后: $0.050/张（节省 $0.011）

#### 技术特点

- ✅ 智能匹配算法（IoU + 位置分数）
- ✅ 自动缓存（7 天 TTL）
- ✅ 中英文配饰名称支持
- ✅ Fallback 到预定义区域（当检测失败时）
- ✅ 详细的检测日志

#### 快速链接

- **如何使用?** → `sam/SAM_PRODUCTION_RELEASE.md` - 用户文档部分
- **成本分析?** → `sam/SAM_PRODUCTION_RELEASE.md` - 成本分析部分
- **技术细节?** → `sam/SAM_INTEGRATION_COMPLETE.md`
- **在 Lark 测试?** → `sam/SAM_LARK_TEST_GUIDE.md`

---

## 📚 其他文档

### 4. 训练指南
**文档**: `TRAINING_GUIDE.md`

如何训练和调整 Bot 的行为。

### 5. 告警设置
**文档**: `ALERT_SETUP.md`

配置 Lark 告警通知。

### 6. Lark Webhook 教程
**文档**: `LARK_WEBHOOK_TUTORIAL.md`

如何设置和使用 Lark Webhook。

---

## 🚀 快速开始

### 新用户推荐顺序

1. **Twitter Bot** - 阅读 `../README.md`
2. **Lark Meme Bot** - 阅读 `LARK_WEBHOOK_TUTORIAL.md`
3. **SAM 配饰替换** - 阅读 `sam/SAM_PRODUCTION_RELEASE.md`

### 开发者推荐顺序

1. **项目架构** - 阅读 `../README.md`
2. **SAM 技术文档** - 阅读 `sam/SAM_INTEGRATION_COMPLETE.md`
3. **训练指南** - 阅读 `TRAINING_GUIDE.md`

---

## 📁 项目结构

```
ai-content-studio/
├── README.md                    # 主项目文档（Twitter Bot）
├── docs/
│   ├── FEATURES.md             # 📌 本文件 - 功能索引
│   ├── LARK_WEBHOOK_TUTORIAL.md
│   ├── TRAINING_GUIDE.md
│   ├── ALERT_SETUP.md
│   └── sam/                     # SAM 功能文档
│       ├── README.md            # SAM 文档索引
│       ├── SAM_PRODUCTION_RELEASE.md  # 📌 正式版发布说明
│       ├── SAM_INTEGRATION_COMPLETE.md
│       ├── SAM_LARK_TEST_GUIDE.md
│       └── SAM_PHASE2_TEST_REPORT.md
├── src/
│   ├── meme/
│   │   ├── sam_detector.py      # SAM 检测模块
│   │   └── flux_fill_pro.py     # FLUX Fill Pro + SAM
│   └── bots/
│       └── lark_meme_bot.py     # Lark Meme Bot
├── tests/
│   └── test_sam_integration.py  # SAM 自动化测试
└── skills/                      # Twitter Bot Skills
```

---

## 🆕 最新更新

### 2026-01-07 - SAM 正式版发布 (v1.0.0)

- ✅ SAM 自动配饰检测功能上线
- ✅ 新增 `/milady_replace_sam` 命令
- ✅ 支持 6 种配饰类型
- ✅ 智能缓存机制
- ✅ 完整的文档和测试

详见: `sam/SAM_PRODUCTION_RELEASE.md`

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
