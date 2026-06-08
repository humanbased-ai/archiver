# 🚀 Milady Bot 快速参考

## 📋 所有可用命令

### 1️⃣ 基础 Milady 生成
```
@我是机器人 /milady NFT编号
@我是机器人 /milady NFT编号 overlay图层
@我是机器人 /milady NFT编号 overlay图层1 overlay图层2 ...
```

**示例:**
```
@我是机器人 /milady 5050
@我是机器人 /milady 5050 overlay lasereyespurple
@我是机器人 /milady 5050 overlay wizardhat overlay lasereyesred
```

---

### 2️⃣ AI 风格转换（Illusion Diffusion）
```
@我是机器人 /milady NFT编号
effect_strength: 0.9
positive_prompt: 你的描述
negative_prompt: 负面词（可选）
```

**示例:**
```
@我是机器人 /milady 5050
effect_strength: 0.9
positive_prompt: countryside sunrise, golden hour lighting, peaceful atmosphere, misty fields, warm colors, cinematic photography
negative_prompt: low quality, blurry, bad anatomy
```

**查看帮助:**
```
@我是机器人 /milady help
```

**费用:** ~$0.007/张

---

### 3️⃣ AI 配饰替换（FLUX Fill Pro）⭐ 新功能
```
@我是机器人 /milady_replace NFT编号 配饰类型 新描述
```

**示例:**
```
@我是机器人 /milady_replace 5050 glasses cyberpunk sunglasses with purple neon glow

@我是机器人 /milady_replace 1234 hat holographic cap with LED display

@我是机器人 /milady_replace 8888 clothes black leather jacket with neon patches
```

**支持的配饰类型:**
- `hat` - 帽子
- `glasses` - 眼镜
- `earrings` - 左耳环
- `earrings_right` - 右耳环
- `necklace` - 项链
- `clothes` - 衣服

**高级格式:**
```
@我是机器人 /milady_replace 5050
accessory: glasses
description: cyberpunk sunglasses with purple neon glow, futuristic, highly detailed
guidance: 35.0
steps: 30
```

**查看帮助:**
```
@我是机器人 /milady_replace
```

**费用:** ~$0.05/张

---

### 4️⃣ 经典梗图（Memegen）
```
@我是机器人 /memegen 模板名 上方文字 下方文字
```

**示例:**
```
@我是机器人 /memegen drake 旧方案 新方案
@我是机器人 /memegen buzz 到处都是 bug
```

**查看模板列表:**
```
@我是机器人 /templates
```

**高级选项:**
```
@我是机器人 /memegen+ drake 上文 下文 --font=comic --color=red,blue --size=800x600
```

---

## 🎨 功能对比

| 功能 | 命令 | 用途 | 价格 | 速度 |
|------|------|------|------|------|
| **基础生成** | `/milady` | 原始 NFT + 图层叠加 | 免费 | 极快 |
| **风格转换** | `/milady` + prompt | 整体风格转换 | $0.007/张 | 20-40秒 |
| **配饰替换** | `/milady_replace` | 精准替换配饰 | $0.05/张 | 30-60秒 |
| **梗图生成** | `/memegen` | 经典梗图模板 | 免费 | 极快 |

---

## 💡 使用建议

### 场景 1: 快速预览
**需求:** 想快速看看某个 Milady NFT 长什么样
```
@我是机器人 /milady 5050
```
✅ 免费，极快

---

### 场景 2: 添加装饰
**需求:** 给 Milady 加个帽子或激光眼
```
@我是机器人 /milady 5050 overlay wizardhat overlay lasereyesred
```
✅ 免费，极快，预制图层

---

### 场景 3: 风格转换
**需求:** 把 Milady 放到不同场景/风格
```
@我是机器人 /milady 5050
effect_strength: 0.9
positive_prompt: cyberpunk cityscape, neon lights, rainy night, cinematic
negative_prompt: low quality, blurry
```
✅ 便宜（$0.007/张），效果好

---

### 场景 4: 配饰替换
**需求:** 想给 Milady 换个眼镜/帽子/衣服
```
@我是机器人 /milady_replace 5050 glasses futuristic holographic sunglasses with neon glow
```
✅ 精准替换（不是叠加），质量高
⚠️ 稍贵（$0.05/张）

---

## 🎯 最佳实践

### Illusion Diffusion (风格转换)

**✅ 推荐:**
```
effect_strength: 0.9  # 平衡
positive_prompt: 详细的场景描述 + 风格关键词 + 质量词
negative_prompt: low quality, blurry, bad anatomy
```

**❌ 不推荐:**
```
effect_strength: 1.5  # 太高，可能改变人物
positive_prompt: good  # 太简单
```

---

### FLUX Fill Pro (配饰替换)

**✅ 推荐:**
```
accessory: glasses  # 明确配饰类型
description: cyberpunk sunglasses with purple neon glow, futuristic design, highly detailed, glowing edges
guidance: 30-35  # 适中强度
```

**❌ 不推荐:**
```
accessory: something  # 不支持的类型
description: glasses  # 描述太简单
guidance: 50  # 太高，可能失真
```

---

## 🔧 参数调优

### Effect Strength (Illusion)

| 数值 | 效果 | 适用 |
|------|------|------|
| 0.6-0.8 | 微调 | 最保留原图 |
| 0.9 | **推荐** | 平衡效果 |
| 1.0-1.1 | 明显 | 风格转换 |
| 1.2+ | 强烈 | ⚠️ 可能改变人物 |

### Guidance (FLUX Fill Pro)

| 数值 | 效果 | 适用 |
|------|------|------|
| 20-25 | 温和 | 微调 |
| 30 | **推荐** | 平衡 |
| 35-40 | 强烈 | 明显转换 |
| 40+ | 极强 | ⚠️ 可能失真 |

---

## 📚 详细文档

- **Illusion 指南**: [MILADY_ADVANCED_MODE_ONLY.md](MILADY_ADVANCED_MODE_ONLY.md)
- **FLUX Fill Pro 指南**: [FLUX_FILL_PRO_GUIDE.md](FLUX_FILL_PRO_GUIDE.md)
- **Replicate 计费**: [REPLICATE_BILLING_GUIDE.md](REPLICATE_BILLING_GUIDE.md)
- **实现总结**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## ⚠️ 常见错误

### "Unknown slash command: milady"
**原因:** 消息格式问题
**解决:** 确保 @ 提及机器人后紧跟命令

---

### "必须提供 positive_prompt 参数"
**原因:** 使用 Illusion 时未提供 prompt
**解决:** 添加 positive_prompt 行

---

### "不支持的配饰类型"
**原因:** 配饰类型拼写错误
**解决:** 只使用: hat, glasses, earrings, earrings_right, necklace, clothes

---

### "REPLICATE_API_TOKEN 未配置"
**原因:** 环境变量未设置
**解决:** 联系管理员配置 Token

---

## 🎉 总结

| 需求 | 推荐命令 |
|------|---------|
| 快速查看 NFT | `/milady NFT编号` |
| 添加图层装饰 | `/milady NFT编号 overlay图层` |
| 风格转换/场景 | `/milady` + prompt（Illusion） |
| 精准替换配饰 | `/milady_replace` (FLUX Fill Pro) |
| 经典梗图 | `/memegen 模板 文字` |

**更新日期:** 2026-01-07
