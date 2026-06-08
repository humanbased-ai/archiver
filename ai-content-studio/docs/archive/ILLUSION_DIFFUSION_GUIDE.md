# 🎨 IllusionDiffusion 特效集成指南

## 📖 什么是 IllusionDiffusion？

IllusionDiffusion 是一个 AI 图像生成工具，可以为 Milady NFT 添加复杂的艺术特效。它使用 ControlNet 技术，在保持原图结构的同时添加自然语言描述的效果。

## 🚀 快速开始

### 基本命令格式

```
@机器人 /milady NFT编号 描述
```

### 示例

```
@机器人 /milady 5555 holding pizza, caption $XNY to $1
@机器人 /milady 1234 wearing sunglasses, neon lights, cyberpunk style
@机器人 /milady 9999 holding a sword, epic fantasy background
```

## 🎯 使用场景

### 场景 1: 添加道具
```
/milady 5555 holding pizza
/milady 1234 holding a cup of coffee
/milady 7890 holding balloons
```

### 场景 2: 添加文字标注
```
/milady 5555 caption $XNY to $1
/milady 1234 text saying WAGMI
/milady 9999 holding sign that says GM
```

### 场景 3: 改变风格
```
/milady 5555 cyberpunk neon style
/milady 1234 watercolor painting style
/milady 7890 retro 80s style
```

### 场景 4: 组合效果
```
/milady 5555 holding pizza, caption $XNY to $1, cyberpunk neon style
/milady 1234 wearing sunglasses, beach background, sunset
/milady 9999 holding sword, epic fantasy, dramatic lighting
```

## ⚙️ 技术原理

### 工作流程

1. **生成基础 NFT**: 首先生成指定编号的 Milady NFT 原图
2. **IllusionDiffusion 处理**: 使用 AI 根据描述添加特效
3. **返回结果**: 生成新的图片并发送到飞书

### API 参数

内部使用的参数（高级用户参考）：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `controlnet_conditioning_scale` | 0.8 | 特效强度 (0.0-5.0) |
| `guidance_scale` | 7.5 | 文本引导强度 (0.0-50.0) |
| `control_guidance_start` | 0.0 | ControlNet 开始时间 |
| `control_guidance_end` | 1.0 | ControlNet 结束时间 |
| `upscaler_strength` | 1.0 | 上采样强度 |
| `sampler` | "DPM++ Karras SDE" | 采样器 |

## 💡 实用技巧

### 技巧 1: 清晰描述
```
✅ 好的描述：holding pizza, caption $XNY to $1, cyberpunk style
❌ 模糊描述：cool effect
```

### 技巧 2: 分步骤描述
```
✅ 推荐：holding pizza, neon lights, dark background
❌ 避免：make it look awesome
```

### 技巧 3: 使用关键词
推荐的关键词：
- **道具**: holding, wearing, with
- **文字**: caption, text, sign
- **风格**: cyberpunk, neon, retro, fantasy, watercolor
- **背景**: background, scene, environment
- **光线**: neon lights, dramatic lighting, sunset, glow

### 技巧 4: 英文描述效果更好
虽然支持中文，但英文描述通常效果更好：
```
✅ /milady 5555 holding pizza, neon lights
⚠️ /milady 5555 拿着披萨，霓虹灯
```

## 🆚 与普通 /milady 的区别

### 普通 /milady（自然语言解析）
```
@机器人 milady #5555 戴 heart glasses，穿 shirt，caption WAGMI
```
- ✅ 快速生成
- ✅ 预设图层组合
- ❌ 功能受限于预设图层
- ❌ 无法添加复杂效果

### /milady (IllusionDiffusion)
```
@机器人 /milady 5555 holding pizza, caption $XNY to $1, cyberpunk style
```
- ✅ 强大的 AI 生成
- ✅ 支持任意自然语言描述
- ✅ 复杂效果（光线、风格、背景）
- ⚠️ 生成时间较长（30-60秒）
- ⚠️ 依赖外部服务（Hugging Face）

## ⚠️ 常见问题

### Q1: 为什么提示 "IllusionDiffusion 服务暂时不可用"？

**原因：**
- Hugging Face Space 正在休眠（Zero GPU）
- 服务器负载过高
- 网络连接问题

**解决方法：**
1. 稍等几分钟后重试
2. 访问 https://huggingface.co/spaces/AP123/IllusionDiffusion 唤醒服务
3. 使用其他梗图功能（`/memegen`）

### Q2: 生成时间多久？

通常 30-60 秒，取决于：
- Hugging Face 服务器负载
- 网络速度
- 图片复杂度

### Q3: 可以批量生成吗？

目前不支持批量生成，每次只能生成一张图片。

### Q4: 生成的图片保存在哪里？

本地保存路径：`output/lark/milady_{nft_id}_illusion.png`

### Q5: 如何提高生成质量？

1. 使用清晰、具体的描述
2. 使用英文关键词
3. 参考成功的示例
4. 避免过于复杂或矛盾的描述

## 📚 完整示例库

### 示例 1: 加密货币主题
```
/milady 5555 holding pizza, caption $XNY to $1, neon lights
/milady 1234 wearing sunglasses, holding money, rich lifestyle
/milady 7890 to the moon, rocket background, space theme
```

### 示例 2: 赛博朋克风格
```
/milady 5555 cyberpunk style, neon lights, dark background
/milady 1234 futuristic city, neon signs, night scene
/milady 9999 matrix style, digital rain, green glow
```

### 示例 3: 梦幻风格
```
/milady 5555 fantasy background, magical atmosphere
/milady 1234 watercolor style, soft pastel colors
/milady 7890 ethereal glow, dreamy lighting
```

### 示例 4: 动作场景
```
/milady 5555 holding sword, epic battle scene
/milady 1234 dancing, energetic pose, party lights
/milady 9999 flying, wings, sky background
```

## 🔗 相关链接

- **Hugging Face Space**: https://huggingface.co/spaces/AP123/IllusionDiffusion
- **Memegen 指南**: `LARK_MEMEGEN_GUIDE.md`
- **用户手册**: `MEMEGEN_USER_GUIDE.md`

## 🎉 开始创作

现在你已经掌握了 IllusionDiffusion 的使用方法，开始创作你的专属 Milady 艺术作品吧！

```
@机器人 /milady 5555 holding pizza, caption $XNY to $1, cyberpunk neon style
```

**注意**: 首次使用时会初始化 IllusionDiffusion 客户端，可能需要额外 10-20 秒。
