# 🎨 Milady AI 特效命令指南

## 📋 两种使用模式

### 模式 1: 简单模式（推荐新手）

**格式:**
```
@我是机器人 /milady NFT编号 描述
```

**示例:**
```
@我是机器人 /milady 5555 holding pizza, cyberpunk style
@我是机器人 /milady 1234 neon lights, futuristic cityscape
@我是机器人 /milady 9999 wearing sunglasses, beach sunset
```

**特点:**
- ✅ 最简单，一行搞定
- ✅ 使用默认参数（已优化）
- ✅ 适合大部分场景

---

### 模式 2: 高级模式（精细控制）

**格式:**
```
@我是机器人 /milady NFT编号
effect_strength: 数值
positive_prompt: 详细描述
negative_prompt: 负面词
```

**完整示例:**
```
@我是机器人 /milady 3456
effect_strength: 1.2
positive_prompt: winter wonderland, snowy street view, residential neighborhood, cozy houses, christmas lights on trees, glowing lights, heavy snow, snow covered road, realistic, photorealistic, cinematic lighting, highly detailed, 8k, masterpiece
negative_prompt: low quality, blurry, bad anatomy, deformed, ugly, distorted, watermark, text
```

**参数说明:**

1. **effect_strength** (特效强度)
   - `0.8` = 温和（最保留原图）
   - `1.1` = 适中（推荐默认）⭐
   - `1.5` = 强烈（明显风格转换）
   - 范围: 0.0 - 2.5

2. **positive_prompt** (正向提示词)
   - 描述你想要的效果
   - 可以很详细！越详细效果越好
   - 用英文描述更准确
   - 必填项

3. **negative_prompt** (负向提示词)
   - 描述你想避免的问题
   - 可选，留空则使用默认值
   - 默认值: `low quality, blurry, bad anatomy, deformed, ugly, distorted`

**可选高级参数:**

4. **guidance_scale** (文本引导强度)
   - 推荐: 7.0
   - 范围: 1.0 - 20.0

5. **num_inference_steps** (推理步数)
   - 推荐: 40
   - 范围: 20 - 100

---

## 💡 实际使用案例

### 案例 1: 赛博朋克风格

**简单模式:**
```
@我是机器人 /milady 5555 cyberpunk style, neon lights
```

**高级模式:**
```
@我是机器人 /milady 5555
effect_strength: 1.4
positive_prompt: cyberpunk style, neon lights, futuristic city, digital art, vibrant colors, glowing, highly detailed
negative_prompt: low quality, blurry, bad anatomy, natural, vintage
```

---

### 案例 2: 冬季雪景

**简单模式:**
```
@我是机器人 /milady 1234 winter snow scene
```

**高级模式:**
```
@我是机器人 /milady 1234
effect_strength: 1.1
positive_prompt: winter wonderland, heavy snow, snow covered trees, cozy atmosphere, soft lighting, peaceful, photorealistic, highly detailed
negative_prompt: low quality, blurry, summer, warm colors
```

---

### 案例 3: 温和效果（保留原图）

**高级模式（推荐）:**
```
@我是机器人 /milady 9999
effect_strength: 0.8
positive_prompt: soft lighting, gentle colors, subtle enhancement
negative_prompt: low quality, blurry
```

---

### 案例 4: 强烈艺术风格

**高级模式:**
```
@我是机器人 /milady 7777
effect_strength: 1.6
positive_prompt: oil painting style, artistic, vibrant colors, dramatic lighting, masterpiece, highly detailed, professional art
negative_prompt: low quality, blurry, bad anatomy, photorealistic, simple
```

---

## 🎨 Prompt 编写技巧

### Positive Prompt 常用关键词:

**质量提升:**
```
masterpiece, best quality, highly detailed, sharp focus, professional
8k, 4k, ultra detailed
```

**风格:**
```
cyberpunk, fantasy, watercolor, oil painting, digital art
photorealistic, anime style, concept art
```

**光线:**
```
neon lights, glowing, soft lighting, dramatic lighting
sunset, sunrise, golden hour, cinematic lighting
```

**色彩:**
```
vibrant colors, muted colors, pastel colors
warm colors, cool colors, monochrome
```

**氛围:**
```
magical, dreamy, peaceful, dramatic, epic
dark moody, bright cheerful, mysterious
```

### Negative Prompt 常用关键词:

**质量问题:**
```
low quality, worst quality, blurry, out of focus
poorly drawn, bad art, pixelated
```

**解剖问题:**
```
bad anatomy, deformed, distorted, extra limbs, missing limbs
bad proportions
```

**技术问题:**
```
watermark, text, signature, jpeg artifacts
compression, noise, grain
```

---

## 📊 参数对照表

| Effect Strength | 效果 | 适用场景 | 示例 |
|----------------|------|----------|------|
| 0.5 - 0.7 | 极微妙 | 仅调色/加光效 | 轻微美化 |
| 0.8 - 1.0 | 温和 | 保留大部分原图 | 柔和增强 |
| 1.1 - 1.3 | 适中 | 平衡效果（推荐）⭐ | 标准转换 |
| 1.4 - 1.6 | 强烈 | 明显风格转换 | 艺术创作 |
| 1.7 - 2.5 | 极强 | 大幅改变原图 | 完全重绘 |

---

## ✅ 使用建议

### 新手推荐:
1. **从简单模式开始** - 一行命令即可
2. **使用默认参数** - 已经过优化
3. **逐步尝试** - 先了解基础效果

### 高级用户:
1. **使用高级模式** - 完全控制参数
2. **详细描述** - positive_prompt 越详细越好
3. **参数调优** - 根据需求调整 effect_strength

### 最佳实践:
- ✅ 用英文描述效果
- ✅ 描述具体而非抽象
- ✅ 从默认参数开始测试
- ✅ 逐步调整找到最佳效果

---

## ❓ 常见问题

**Q: 简单模式和高级模式有什么区别？**
A: 简单模式使用预设参数，高级模式可以自定义所有参数。大部分情况下简单模式已足够。

**Q: effect_strength 设置多少合适？**
A:
- 想保留原图特征 → 0.8
- 平衡效果（推荐）→ 1.1
- 明显风格转换 → 1.5

**Q: positive_prompt 可以写多长？**
A: 没有限制，越详细越好！可以包含质量词、风格词、光线词等。

**Q: negative_prompt 可以留空吗？**
A: 可以，留空会使用默认值（推荐质量控制词）

**Q: 生成一张图需要多久？**
A: 约 7-10 秒（使用 Replicate ControlNet）

**Q: 如何查看帮助？**
A: 发送 `@我是机器人 /milady help`

---

## 🎉 快速开始

**第一次使用（推荐）:**
```
@我是机器人 /milady 5555 holding pizza, cyberpunk style
```

**想要精细控制时:**
```
@我是机器人 /milady 3456
effect_strength: 1.2
positive_prompt: winter wonderland, snowy street, cozy houses, christmas lights, realistic, highly detailed
negative_prompt: low quality, blurry, bad anatomy
```

---

**提示:** 所有命令都需要 @我是机器人 才能触发！
