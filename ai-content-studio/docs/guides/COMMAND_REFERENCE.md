# 🎯 Milady Bot 命令参考手册

## 📋 命令总览

| 命令 | 功能 | 费用 | 速度 |
|------|------|------|------|
| `/milady` | Milady 基础生成 | 免费 | 极快 |
| `/meme` / `/memegen` | 通用梗图模板 | 免费 | 极快 |
| `/milady_illusion` | AI 风格转换 | ~$0.007/张 | 20-40秒 |
| `/milady_replace` | AI 配饰替换 | ~$0.05/张 | 30-60秒 |

---

## 1️⃣ `/milady` - Milady 基础生成

**功能：** NFT 原图 + 图层叠加 + 文字

### 基本用法

```bash
# 生成纯净的 NFT 原图
@我是机器人 /milady 1234

# NFT + overlay 图层
@我是机器人 /milady 1234 Overlay:lasereyespurple

# NFT + 多个图层
@我是机器人 /milady 1234 Overlay:lasereyespurple Hat:Beret.png

# NFT + 文字
@我是机器人 /milady 1234 top:GM bottom:LFG

# NFT + 图层 + 文字
@我是机器人 /milady 1234 Overlay:lasereyesred top:WAGMI bottom:LFG
```

### 支持的图层类型

| 图层类型 | 说明 | 示例 |
|---------|------|------|
| `Overlay` | 叠加特效 | `Overlay:lasereyespurple` |
| `Hat` | 帽子 | `Hat:Beret.png` |
| `Glasses` | 眼镜 | `Glasses:Heart Glasses.png` |
| `Earrings` | 耳环 | `Earrings:Gold Hoops.png` |
| `Necklaces` | 项链 | `Necklaces:Pearl Necklace.png` |
| `Face Decoration` | 脸部装饰 | `Face Decoration:Heart Tattoo.png` |

### 文字参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `top:xxx` | 上方文字 | `top:GM` |
| `bottom:xxx` | 下方文字 | `bottom:LFG` |
| `font:xxx` | 字体样式 | `font:glow` |
| `caps:off` | 关闭大写 | `caps:off` |

### 支持的字体

- `impact` - 经典 Impact 字体（默认）
- `angelic` - 圆润可爱字体
- `chinese` - 中文字体
- `glow` - 发光效果字体

---

## 2️⃣ `/meme` 或 `/memegen` - 通用梗图模板

**功能：** 使用 Memegen.link 的 207 个经典梗图模板

### 基本用法

```bash
# Drake 梗图
@我是机器人 /memegen drake 旧方案 新方案

# 分心男友
@我是机器人 /memegen 分心男友 老功能 新功能

# Buzz Lightyear
@我是机器人 /memegen buzz 到处都是 bug
```

### 查看所有模板

```bash
@我是机器人 /templates
```

---

## 3️⃣ `/milady_illusion` - AI 风格转换

**功能：** 使用 Illusion Diffusion 进行整体风格转换

**费用：** ~$0.007 USD / 张

### 基本用法

```bash
@我是机器人 /milady_illusion 5050
effect_strength: 0.9
positive_prompt: cyberpunk cityscape, neon lights, rainy night, cinematic
negative_prompt: low quality, blurry
```

### 参数说明

| 参数 | 必需 | 范围 | 说明 |
|------|------|------|------|
| `effect_strength` | 必需 | 0.0-2.5 | 风格强度（推荐 0.8-1.2） |
| `positive_prompt` | 必需 | - | 想要的场景/风格描述 |
| `negative_prompt` | 可选 | - | 不想要的元素 |

### Effect Strength 参考

| 数值 | 效果 | 适用场景 |
|------|------|----------|
| 0.6-0.8 | 微调 | 最保留原图 ⭐ 推荐新手 |
| 0.9-1.1 | 适中 | 平衡效果和保留度 |
| 1.2-1.5 | 强烈 | 明显风格转换 |
| 1.5+ | 极强 | ⚠️ 可能改变人物 |

### 示例

**乡村日出：**
```
@我是机器人 /milady_illusion 3274
effect_strength: 1.2
positive_prompt: Beautiful countryside sunrise over rolling hills covered in thick morning fog. Warm golden light illuminating the mist. A rustic wooden fence line cutting diagonally across the landscape caught in the sunlight. Dew on grass, silhouettes of oak trees, ethereal, dreamy atmosphere, landscape photography.
negative_prompt: low quality
```

**纽约日落：**
```
@我是机器人 /milady_illusion 3261
effect_strength: 1.2
positive_prompt: A spectacular sunset sky over New York City streets, capturing the Manhattanhenge phenomenon. The setting sun is perfectly aligned with the street grid, casting intense molten gold and fiery orange light down the urban canyon. Clouds are ablaze with vibrant reds, purples, and pinks. Silhouetted skyscrapers like the Empire State Building frame the dramatic sky. Cinematic lighting, photorealistic, wide angle landscape.
negative_prompt: clear sky, boring sky, low quality, blurry, pixelated, painting, cartoon, ugly, text, watermark
```

---

## 4️⃣ `/milady_replace` - AI 配饰替换

**功能：** 使用 FLUX Fill Pro 精准替换配饰

**费用：** ~$0.05 USD / 张

### 基本用法

```bash
# 简单格式
@我是机器人 /milady_replace 5050 帽子 全息帽子，LED显示屏

# 高级格式
@我是机器人 /milady_replace 5050
accessory: 帽子
description: 全息帽子，LED显示屏，未来风格
guidance: 35.0
steps: 30
```

### 支持的配饰类型

| 英文 | 中文 | 区域 |
|------|------|------|
| `hat` | 帽子 | 头顶 |
| `glasses` | 眼镜 | 眼睛 |
| `earrings` | 耳环/左耳环 | 左耳 |
| `earrings_right` | 右耳环 | 右耳 |
| `necklace` | 项链 | 脖子 |
| `clothes` | 衣服/上衣/外套 | 上身 |

### 参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `accessory` | 必需 | - | 配饰类型（支持中文） |
| `description` | 必需 | - | 新配饰的详细描述 |
| `guidance` | 可选 | 30.0 | 引导强度（20-40） |
| `steps` | 可选 | 28 | 推理步数（20-40） |

### 示例

```bash
# 替换帽子
@我是机器人 /milady_replace 5050 帽子 未来主义全息帽子，LED显示屏

# 替换眼镜
@我是机器人 /milady_replace 1234 眼镜 赛博朋克紫色霓虹墨镜

# 替换衣服
@我是机器人 /milady_replace 8888 衣服 黑色皮夹克，霓虹补丁
```

---

## 🎯 使用场景对照

### 场景 1: 快速查看 NFT
**需求：** 我想看看某个 Milady NFT 长什么样

**命令：**
```
@我是机器人 /milady 5050
```

---

### 场景 2: 添加装饰和文字
**需求：** 给 Milady 加个激光眼和 GM 文字

**命令：**
```
@我是机器人 /milady 5050 Overlay:lasereyespurple top:GM bottom:LFG
```

---

### 场景 3: 制作通用梗图
**需求：** 用 Drake 模板做个梗图

**命令：**
```
@我是机器人 /memegen drake Web2 Web3
```

---

### 场景 4: AI 风格转换
**需求：** 把 Milady 放到赛博朋克城市场景

**命令：**
```
@我是机器人 /milady_illusion 5050
effect_strength: 0.9
positive_prompt: cyberpunk cityscape, neon lights, rainy night, cinematic
negative_prompt: low quality, blurry
```

---

### 场景 5: 精准替换配饰
**需求：** 把 Milady 的帽子换成全息帽子

**命令：**
```
@我是机器人 /milady_replace 5050 帽子 全息帽子，LED显示屏
```

---

## 💡 组合使用建议

### 方案 A: 先替换配饰，再添加特效
```bash
# 步骤 1: 替换帽子
@我是机器人 /milady_replace 5050 帽子 赛博朋克帽子

# 步骤 2: 添加激光眼
@我是机器人 /milady 5050 Overlay:lasereyespurple
```

### 方案 B: 先风格转换，再添加文字
```bash
# 步骤 1: 风格转换
@我是机器人 /milady_illusion 5050
effect_strength: 0.9
positive_prompt: cyberpunk style

# 步骤 2: 添加文字（需要手动合成）
```

---

## 📚 相关文档

- [FLUX Fill Pro 详细指南](FLUX_FILL_PRO_GUIDE.md)
- [Illusion 高级模式指南](MILADY_ADVANCED_MODE_ONLY.md)
- [Replicate 计费说明](REPLICATE_BILLING_GUIDE.md)
- [中文支持说明](CHINESE_SUPPORT_UPDATE.md)

---

## ❓ 常见问题

### Q: `/milady` 和 `/milady_illusion` 有什么区别？
**A:**
- `/milady` - 快速生成，免费，支持图层叠加和文字
- `/milady_illusion` - AI 风格转换，$0.007/张，可以改变整体场景和风格

### Q: `/milady_replace` 和图层叠加有什么区别？
**A:**
- **图层叠加** (`/milady`) - 在原图上叠加图层，不改变原配饰
- **AI 替换** (`/milady_replace`) - 完全移除原配饰，用 AI 生成新的

### Q: 哪个命令最适合新手？
**A:** 推荐从 `/milady` 开始：
```
@我是机器人 /milady 5050 Overlay:lasereyespurple top:GM
```
简单、快速、免费！

---

**更新日期：** 2026-01-07
**版本：** v2.0 - 命令重构版
