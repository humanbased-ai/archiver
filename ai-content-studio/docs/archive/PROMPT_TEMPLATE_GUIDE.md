# 🎨 Replicate ControlNet Prompt 模板指南

## 📝 快速开始

你只需要修改 `/Users/pengsun/ai-content-studio/replicate_config.py` 这一个文件即可。

### 三个核心参数：

```python
# 1. Effect Strength (特效强度)
EFFECT_STRENGTH = 1.1

# 2. Positive Prompt 模板
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"

# 3. Negative Prompt
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"
```

---

## 🎯 调整策略

### 场景 1: 渲染太强，想保留更多原图

```python
# 降低特效强度
EFFECT_STRENGTH = 0.8  # 从 1.1 降到 0.8

# 简化 Positive Prompt
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}"

# 简化 Negative Prompt
NEGATIVE_PROMPT = "low quality, blurry"
```

**预期效果**: Milady 原始特征更明显，AI 改动更克制

---

### 场景 2: 想要更强的风格转换

```python
# 提高特效强度
EFFECT_STRENGTH = 1.5  # 从 1.1 提到 1.5

# 增强 Positive Prompt
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, masterpiece, best quality, highly detailed, vibrant colors"

# 增强 Negative Prompt
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted, watermark, text, extra limbs"
```

**预期效果**: 更明显的艺术化处理，更强的风格转换

---

### 场景 3: 追求极致质量

```python
# 中等特效强度
EFFECT_STRENGTH = 1.2

# 质量导向的 Prompt
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, masterpiece, best quality, ultra detailed, sharp focus, professional, 8k"

# 严格的质量控制
NEGATIVE_PROMPT = "low quality, worst quality, blurry, out of focus, bad anatomy, deformed, ugly, distorted, watermark, text, signature, jpeg artifacts, compression, noise"

# 提高推理步数
NUM_INFERENCE_STEPS = 50  # 从 40 提到 50
```

**预期效果**: 最高质量，但生成速度稍慢

---

### 场景 4: 追求生成速度

```python
# 降低推理步数
NUM_INFERENCE_STEPS = 30  # 从 40 降到 30

# 简化 Prompt
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality"
NEGATIVE_PROMPT = "low quality, blurry"
```

**预期效果**: 生成更快，质量略有下降

---

## 📊 参数对照表

| 参数 | 范围 | 推荐值 | 影响 |
|------|------|--------|------|
| **EFFECT_STRENGTH** | 0.0 - 2.5 | 0.8 - 1.3 | 特效强度 |
| **GUIDANCE_SCALE** | 1.0 - 20.0 | 6.0 - 8.0 | 对描述的遵循度 |
| **NUM_INFERENCE_STEPS** | 20 - 100 | 35 - 50 | 生成质量 vs 速度 |

### Effect Strength 对照

| 数值 | 效果 | 适用场景 |
|------|------|----------|
| 0.5 - 0.7 | 极微妙 | 只想加点光效/色彩 |
| 0.8 - 1.0 | 温和 | 保留原图，轻度风格化 |
| 1.1 - 1.3 | 适中 | **默认推荐** |
| 1.4 - 1.6 | 强烈 | 明显风格转换 |
| 1.7 - 2.5 | 极强 | 艺术创作，大幅改变 |

---

## 🔤 常用 Prompt 关键词库

### 质量词（提升画质）
```
masterpiece, best quality, high quality, ultra detailed
highly detailed, sharp focus, crisp, professional
8k, 4k, high resolution
```

### 风格词
```
digital art, concept art, illustration, anime style
watercolor, oil painting, pencil drawing
cyberpunk, fantasy, sci-fi, retro, vintage
photorealistic, cel shading, flat colors
```

### 光线词
```
dramatic lighting, soft lighting, ambient light
neon lights, glowing, luminous, sparkle
sunset, sunrise, golden hour, night scene
rim lighting, backlighting
```

### 色彩词
```
vibrant colors, muted colors, pastel colors
monochrome, black and white, sepia
colorful, saturated, desaturated
```

### 氛围词
```
magical, dreamy, ethereal, mysterious
dark, moody, bright, cheerful
cinematic, epic, dramatic
```

### 负面词（常用）
```
low quality, worst quality, bad quality
blurry, out of focus, bokeh
bad anatomy, deformed, distorted, disfigured
ugly, gross, disgusting
watermark, text, signature, username
extra limbs, missing limbs, bad proportions
jpeg artifacts, compression, noise, grain
```

---

## 💡 实用模板示例

### 模板 1: 平衡版（推荐）
```python
EFFECT_STRENGTH = 1.1
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"
```

### 模板 2: 保守版（最保留原图）
```python
EFFECT_STRENGTH = 0.8
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}"
NEGATIVE_PROMPT = "low quality, blurry"
```

### 模板 3: 艺术版
```python
EFFECT_STRENGTH = 1.3
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, digital art, vibrant colors, artistic, detailed"
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, watermark, text"
```

### 模板 4: 写实版
```python
EFFECT_STRENGTH = 1.2
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, photorealistic, detailed lighting, high quality"
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, cartoon, illustrated"
```

### 模板 5: 赛博朋克专用
```python
EFFECT_STRENGTH = 1.4
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, cyberpunk style, neon lights, futuristic, digital art, vibrant colors"
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, natural, organic, vintage"
```

---

## 🧪 测试流程

### 方法 1: 使用测试脚本

```bash
python3 test_custom_params.py
```

编辑 `test_custom_params.py`，取消注释不同的测试场景，对比效果。

### 方法 2: 直接在飞书测试

1. 修改 `replicate_config.py`
2. 重启 webhook: `pkill -f webhook_server.py && nohup python3 webhook_server.py > webhook.log 2>&1 &`
3. 在飞书发送: `@机器人 /milady 3456 neon lights cyberpunk`
4. 对比效果，再调整参数

---

## 📋 快速参考卡片

```python
# ========================================
# 你的自定义参数 (replicate_config.py)
# ========================================

# 控制特效强度 (0.8 = 温和, 1.1 = 适中, 1.5 = 强烈)
EFFECT_STRENGTH = 1.1

# Positive Prompt 模板 (用 {description} 占位)
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"

# Negative Prompt (告诉 AI 避免什么)
NEGATIVE_PROMPT = "low quality, blurry, bad anatomy, deformed, ugly, distorted"

# 文本引导强度 (6.0 = 自由, 7.0 = 平衡, 9.0 = 严格)
GUIDANCE_SCALE = 7.0

# 推理步数 (30 = 快, 40 = 平衡, 50 = 高质量)
NUM_INFERENCE_STEPS = 40
```

---

## ❓ 常见问题

### Q1: 修改后不生效？
A: 需要重启 webhook 服务器
```bash
pkill -f webhook_server.py
nohup python3 webhook_server.py > webhook.log 2>&1 &
```

### Q2: 如何恢复默认设置？
A: 删除 `replicate_config.py`，系统会使用内置默认值

### Q3: 如何快速对比不同参数？
A: 使用 `test_custom_params.py`，同时生成多个版本对比

### Q4: Prompt 模板必须包含 {description} 吗？
A: 是的，`{description}` 会被替换为用户输入的描述

### Q5: 可以完全移除 "anime girl" 吗？
A: 可以，但可能导致风格不稳定。建议至少保留基础风格词。

---

## 🎉 推荐工作流

1. **从默认参数开始测试** → 了解基线效果
2. **调整 EFFECT_STRENGTH** → 找到合适的特效强度
3. **优化 Prompt 模板** → 微调风格和质量
4. **测试多个场景** → 验证稳定性
5. **固化到配置文件** → 应用到生产环境

---

**提示**: 任何修改后都可以通过飞书实时测试，快速迭代找到最佳参数组合！
