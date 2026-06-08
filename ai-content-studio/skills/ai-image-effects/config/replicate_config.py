#!/usr/bin/env python3
"""
Replicate ControlNet 参数配置模板
完整的参数配置系统

使用方法:
1. 取消注释你想用的配置
2. 或者直接修改 EFFECT_STRENGTH, POSITIVE_PROMPT_TEMPLATE, NEGATIVE_PROMPT
3. 重启 webhook 服务器
"""

# ====================
# 方式 1: 直接配置三个核心参数
# ====================

# 1. Effect Strength (特效强度)
# 范围: 0.0 - 2.5
# 推荐: 0.8 (温和) | 1.1 (适中) | 1.5 (强烈)
# 注意: Milady NFT 建议使用较低值以保留人物特征
EFFECT_STRENGTH = 0.9

# 2. Positive Prompt 模板
# 必须包含 {description} 占位符
# 格式: "前缀, {description}, 后缀"
# 注意: Milady NFT 专用模板，强调保持相同人物和特征
POSITIVE_PROMPT_TEMPLATE = "same character, {description}, high quality, detailed, maintaining identity and features"

# 3. Negative Prompt
# 告诉 AI 要避免什么
# 注意: 明确禁止改变人物身份和面部特征
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted, different person, different character, different face, wrong identity"

# 4. Guidance Scale (文本引导强度)
# 范围: 1.0 - 20.0
# 推荐: 6.0 (自由) | 7.0 (平衡) | 9.0 (严格)
GUIDANCE_SCALE = 7.0

# 5. Inference Steps (推理步数)
# 范围: 20 - 100
# 推荐: 30 (快) | 40 (平衡) | 50 (高质量)
NUM_INFERENCE_STEPS = 40


# ====================
# 方式 2: 使用预设模板（更简单）
# ====================
# 取消下面的注释来使用预设

# 预设 1: 温和版 - 最大保留原图
# EFFECT_STRENGTH = 0.8
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}"
# NEGATIVE_PROMPT = "low quality, blurry"
# GUIDANCE_SCALE = 6.0
# NUM_INFERENCE_STEPS = 35

# 预设 2: 平衡版 - 推荐默认 (已启用)
# EFFECT_STRENGTH = 1.1
# POSITIVE_PROMPT_TEMPLATE = "milady nft character, {description}, high quality, detailed, preserving original features"
# NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"
# GUIDANCE_SCALE = 7.0
# NUM_INFERENCE_STEPS = 40

# 预设 3: 强烈版 - 明显风格转换
# EFFECT_STRENGTH = 1.5
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, masterpiece, best quality, highly detailed, sharp focus"
# NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted, watermark, text, signature, extra limbs, missing limbs"
# GUIDANCE_SCALE = 8.0
# NUM_INFERENCE_STEPS = 45

# 预设 4: 艺术版 - 艺术化处理
# EFFECT_STRENGTH = 1.3
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, digital art, vibrant colors, artistic, highly detailed, beautiful"
# NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, watermark, text, signature, ugly, deformed"
# GUIDANCE_SCALE = 7.5
# NUM_INFERENCE_STEPS = 40

# 预设 5: 赛博朋克专用
# EFFECT_STRENGTH = 1.4
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, cyberpunk style, neon lights, futuristic, sci-fi, digital art, vibrant colors, glowing"
# NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, natural, organic, vintage, old"
# GUIDANCE_SCALE = 8.0
# NUM_INFERENCE_STEPS = 40

# 预设 6: 高质量版 - 追求极致质量（慢）
# EFFECT_STRENGTH = 1.2
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, masterpiece, best quality, ultra detailed, 8k, professional, sharp focus, high resolution"
# NEGATIVE_PROMPT = "low quality, worst quality, blurry, out of focus, bad anatomy, deformed, ugly, distorted, watermark, text, signature, jpeg artifacts, compression, noise, grain"
# GUIDANCE_SCALE = 7.5
# NUM_INFERENCE_STEPS = 50

# 预设 7: 快速版 - 追求速度
# EFFECT_STRENGTH = 1.0
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality"
# NEGATIVE_PROMPT = "low quality, blurry"
# GUIDANCE_SCALE = 6.5
# NUM_INFERENCE_STEPS = 30


# ====================
# 方式 3: 完全自定义（高级用法）
# ====================

# 📝 Prompt 模板编写指南:
#
# 结构: "基础描述, {description}, 质量词, 风格词, 效果词"
#
# 示例 1: 简洁模板
# POSITIVE_PROMPT_TEMPLATE = "{description}"
#
# 示例 2: 基础模板（推荐新手）
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality"
#
# 示例 3: 完整模板（专业）
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, masterpiece, best quality, highly detailed, vibrant colors, sharp focus, professional lighting"
#
# 示例 4: 特定风格模板
# POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, watercolor painting, soft colors, artistic, dreamy atmosphere"
#
# 示例 5: 写实风格
# POSITIVE_PROMPT_TEMPLATE = "realistic anime girl, {description}, photorealistic, detailed lighting, high resolution, professional photography"

# 📝 Negative Prompt 编写指南:
#
# 常用负面词分类:
#
# 质量类: low quality, worst quality, bad quality, blurry, out of focus
# 解剖类: bad anatomy, deformed, distorted, disfigured, extra limbs, missing limbs
# 美观类: ugly, gross, disgusting, bad proportions
# 技术类: watermark, text, signature, username, jpeg artifacts, compression, noise
# 其他类: duplicate, mutation, mutated, poorly drawn
#
# 示例 1: 基础版
# NEGATIVE_PROMPT = "low quality, blurry"
#
# 示例 2: 标准版（推荐）
# NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"
#
# 示例 3: 完整版（严格）
# NEGATIVE_PROMPT = "low quality, worst quality, blurry, out of focus, bad anatomy, deformed, ugly, distorted, watermark, text, signature, extra limbs, missing limbs, bad proportions, jpeg artifacts"


# ====================
# 常用关键词库（复制粘贴使用）
# ====================

# 质量提升词:
# masterpiece, best quality, high quality, ultra detailed, highly detailed
# sharp focus, crisp, professional, 8k, 4k, high resolution

# 风格词:
# digital art, concept art, illustration, anime style, manga style
# watercolor, oil painting, pencil drawing, sketch
# cyberpunk, fantasy, sci-fi, retro, vintage, modern

# 光线词:
# dramatic lighting, soft lighting, ambient light, natural lighting
# neon lights, glowing, luminous, sparkle, shiny
# sunset, sunrise, golden hour, night scene, moonlight
# rim lighting, backlighting, studio lighting

# 色彩词:
# vibrant colors, muted colors, pastel colors, bright colors
# monochrome, black and white, sepia, colorful
# saturated, desaturated, vivid

# 氛围词:
# magical, dreamy, ethereal, mysterious, enchanting
# dark, moody, bright, cheerful, happy
# cinematic, epic, dramatic, peaceful, calm

# 画面效果词:
# detailed background, simple background, gradient background
# bokeh, depth of field, motion blur
# particles, sparkles, glowing effects


# ====================
# 预设场景配置（兼容旧版）
# ====================
# ====================

# 你可以为不同场景定义不同的参数组合
PRESETS = {
    "default": {
        "effect_strength": 1.1,
        "guidance_scale": 7.0,
        "num_inference_steps": 40,
        "positive_prompt_template": "milady nft character, {description}, high quality, detailed, preserving original features",
        "negative_prompt": "low quality, blurry, bad anatomy, deformed, ugly, distorted",
    },
    "subtle": {  # 微妙效果，最大保留原图
        "effect_strength": 0.8,
        "guidance_scale": 6.0,
        "num_inference_steps": 35,
        "positive_prompt_template": "anime girl, {description}",
        "negative_prompt": "low quality, blurry",
    },
    "strong": {  # 强烈效果，明显风格转换
        "effect_strength": 1.5,
        "guidance_scale": 8.0,
        "num_inference_steps": 45,
        "positive_prompt_template": "anime girl, {description}, masterpiece, best quality, highly detailed",
        "negative_prompt": "low quality, blurry, bad anatomy, deformed, ugly, distorted, watermark",
    },
    "artistic": {  # 艺术风格
        "effect_strength": 1.2,
        "guidance_scale": 7.5,
        "num_inference_steps": 40,
        "positive_prompt_template": "anime girl, {description}, digital art, vibrant colors, artistic",
        "negative_prompt": "low quality, blurry, bad anatomy, watermark, text",
    },
}


# ====================
# 📖 完整使用指南
# ====================

"""
╔═══════════════════════════════════════════════════════════════════╗
║                    Replicate ControlNet 配置指南                    ║
╚═══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 快速配置（3 步完成）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

第 1 步: 设置特效强度
------------------------------
EFFECT_STRENGTH = 1.1

推荐值:
  0.8 = 温和（最保留原图）
  1.1 = 适中（推荐默认）⭐
  1.5 = 强烈（明显风格转换）

第 2 步: 设置 Positive Prompt 模板
------------------------------
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"

必须包含 {description} 占位符！

常用模板:
  简洁: "{description}"
  基础: "anime girl, {description}, high quality"
  完整: "anime girl, {description}, masterpiece, best quality, highly detailed"

第 3 步: 设置 Negative Prompt
------------------------------
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"

常用配置:
  简洁: "low quality, blurry"
  标准: "low quality, blurry, bad anatomy, deformed, ugly, distorted" ⭐
  完整: "low quality, worst quality, blurry, bad anatomy, deformed, watermark, text"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 参数详解
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  EFFECT_STRENGTH (特效强度)
   范围: 0.0 - 2.5
   作用: 控制 AI 对原图的改变程度

   数值对照表:
   ┌─────────┬──────────┬────────────────────────┐
   │  数值   │   效果   │       适用场景         │
   ├─────────┼──────────┼────────────────────────┤
   │ 0.5-0.7 │ 极微妙   │ 只想调色/加光效        │
   │ 0.8-1.0 │ 温和     │ 保留原图细节           │
   │ 1.1-1.3 │ 适中     │ 平衡效果（推荐）⭐     │
   │ 1.4-1.6 │ 强烈     │ 明显风格转换           │
   │ 1.7-2.5 │ 极强     │ 艺术创作               │
   └─────────┴──────────┴────────────────────────┘

2️⃣  GUIDANCE_SCALE (文本引导强度)
   范围: 1.0 - 20.0
   作用: 控制 AI 对你输入描述的遵循度

   推荐值:
   6.0  = 自由发挥，AI 更有创造力
   7.0  = 平衡模式（推荐）⭐
   9.0  = 严格遵循你的描述
   12.0+ = 极度严格（可能过度拟合）

3️⃣  NUM_INFERENCE_STEPS (推理步数)
   范围: 20 - 100
   作用: 生成质量，步数越多质量越高但越慢

   推荐值:
   30 = 快速模式（约 5-7 秒）
   40 = 平衡模式（约 7-10 秒）⭐
   50 = 高质量模式（约 10-15 秒）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 Prompt 编写完全指南
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Positive Prompt 结构:
------------------------------
"基础描述, {description}, 质量词, 风格词, 效果词"

示例分析:
------------------------------
"anime girl, {description}, masterpiece, best quality, vibrant colors"
 ↑           ↑              ↑                          ↑
 基础        用户输入        质量提升                  色彩效果

实际案例:
------------------------------
用户输入: neon lights cyberpunk
模板:     milady nft character, {description}, high quality, detailed, preserving original features
最终:     milady nft character, neon lights cyberpunk, high quality, detailed, preserving original features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔤 关键词完全手册（复制粘贴使用）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 质量提升词:
   masterpiece, best quality, high quality, ultra detailed
   highly detailed, sharp focus, crisp, professional
   8k, 4k, high resolution, ultra high res

🎭 风格词:
   • 艺术类: digital art, concept art, illustration, painting
   • 画风类: anime style, manga style, comic style, cartoon
   • 媒介类: watercolor, oil painting, pencil drawing, sketch
   • 时代类: modern, retro, vintage, futuristic, cyberpunk
   • 题材类: fantasy, sci-fi, steampunk, gothic

💡 光线词:
   • 基础: dramatic lighting, soft lighting, natural lighting
   • 特效: neon lights, glowing, luminous, sparkle, shiny
   • 时间: sunset, sunrise, golden hour, night scene, moonlight
   • 专业: rim lighting, backlighting, studio lighting, ambient light

🌈 色彩词:
   • 饱和度: vibrant colors, muted colors, pastel colors
   • 色调: warm colors, cool colors, monochrome, sepia
   • 状态: saturated, desaturated, colorful, vivid, bright

🎬 氛围词:
   • 梦幻: magical, dreamy, ethereal, enchanting, mystical
   • 情绪: dark, moody, bright, cheerful, mysterious
   • 效果: cinematic, epic, dramatic, peaceful, calm

📷 画面效果词:
   • 背景: detailed background, simple background, blurred background
   • 景深: bokeh, depth of field, shallow focus
   • 特效: motion blur, particles, sparkles, glowing effects

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Negative Prompt 完全手册
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📉 质量类（必须）:
   low quality, worst quality, bad quality
   blurry, out of focus, soft focus
   poorly drawn, bad art

👤 解剖类（推荐）:
   bad anatomy, deformed, distorted, disfigured
   extra limbs, missing limbs, fused limbs
   bad proportions, elongated body, twisted limbs

😱 美观类:
   ugly, gross, disgusting, unattractive
   bad face, bad eyes, bad hands

🖼️ 技术类:
   watermark, text, signature, username, logo
   jpeg artifacts, compression, noise, grain
   pixelated, low resolution

🔄 其他类:
   duplicate, mutation, mutated, malformed
   cropped, cut off, out of frame

推荐组合:
------------------------------
基础版:
  "low quality, blurry"

标准版（推荐）:
  "low quality, blurry, bad anatomy, deformed, ugly, distorted"

完整版:
  "low quality, worst quality, blurry, out of focus, bad anatomy,
   deformed, ugly, distorted, watermark, text, signature,
   extra limbs, missing limbs, bad proportions"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💼 实战场景配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

场景 1: 你觉得渲染太强，想保留更多原图
------------------------------
EFFECT_STRENGTH = 0.8
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}"
NEGATIVE_PROMPT = "low quality, blurry"
GUIDANCE_SCALE = 6.0

预期效果: Milady 原始特征非常明显，AI 改动很克制

场景 2: 想要明显的艺术风格转换
------------------------------
EFFECT_STRENGTH = 1.5
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, masterpiece, best quality, highly detailed, vibrant colors"
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted, watermark"
GUIDANCE_SCALE = 8.0

预期效果: 强烈的艺术化处理，明显的风格变化

场景 3: 赛博朋克风格专用
------------------------------
EFFECT_STRENGTH = 1.4
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, cyberpunk style, neon lights, futuristic, digital art, vibrant colors, glowing"
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, natural, organic, vintage"
GUIDANCE_SCALE = 8.0

预期效果: 强烈的赛博朋克氛围

场景 4: 极致质量优先（较慢）
------------------------------
EFFECT_STRENGTH = 1.2
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, masterpiece, ultra detailed, 8k, sharp focus, professional"
NEGATIVE_PROMPT = "low quality, worst quality, blurry, bad anatomy, watermark, jpeg artifacts, noise"
NUM_INFERENCE_STEPS = 50

预期效果: 最高质量，细节丰富，但生成时间约 10-15 秒

场景 5: 速度优先
------------------------------
EFFECT_STRENGTH = 1.0
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality"
NEGATIVE_PROMPT = "low quality, blurry"
NUM_INFERENCE_STEPS = 30

预期效果: 快速生成（约 5-7 秒），质量略降

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 测试与调优流程
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

步骤 1: 基线测试
   使用默认参数生成一张图，了解基准效果

步骤 2: 调整特效强度
   渲染太强? EFFECT_STRENGTH 降到 0.8
   效果太弱? EFFECT_STRENGTH 提到 1.5

步骤 3: 优化 Prompt
   想要更鲜艳? 加 "vibrant colors"
   想要更细致? 加 "highly detailed, sharp focus"
   想要特定风格? 加风格词

步骤 4: 完善 Negative Prompt
   有瑕疵? 添加对应的负面词
   质量不稳定? 加强质量类负面词

步骤 5: 微调参数
   需要更遵循描述? 提高 GUIDANCE_SCALE
   想要更快? 降低 NUM_INFERENCE_STEPS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ 常见问题 FAQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: 修改配置后如何生效？
A: 重启 webhook 服务器:
   pkill -f webhook_server.py
   nohup python3 webhook_server.py > webhook.log 2>&1 &

Q: 必须包含 {description} 吗？
A: 是的！{description} 会被替换为用户输入的描述

Q: 可以移除 "anime girl" 吗？
A: 可以，但建议保留基础风格词以保证稳定性

Q: 如何快速对比不同参数？
A: 运行 python3 test_custom_params.py

Q: 生成失败怎么办？
A: 检查 Replicate 余额，查看 webhook.log 日志

Q: 如何恢复默认设置？
A: 将 EFFECT_STRENGTH=1.1, GUIDANCE_SCALE=7.0 等恢复为默认值

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 推荐工作流
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 从默认参数开始 → 了解基线效果
2. 调整 EFFECT_STRENGTH → 找到合适的强度
3. 优化 Prompt 模板 → 微调风格和质量
4. 测试多个描述 → 验证稳定性
5. 固化配置 → 应用到生产

提示: 每次修改后在飞书测试，快速迭代找到最佳参数！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
