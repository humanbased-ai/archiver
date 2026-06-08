# 🎨 Milady NFT Prompt 模板改进说明

## 📋 改进背景

### 原有问题

之前的简单模式使用的默认 Prompt 模板是：
```
anime girl, {description}, high quality, detailed
```

**问题分析：**
1. "anime girl" 是通用描述，不能准确表达 Milady NFT 的特征
2. AI 可能会偏离 Milady 的独特风格
3. 虽然使用了 ControlNet（控制图像结构），但 prompt 没有强调保留原始特征

### 用户反馈

> "简单模式和复杂模式，好像模型不太一样？"

确实！因为：
- **简单模式**: `anime girl, {用户描述}, high quality, detailed`
- **高级模式**: 用户提供的完整 prompt（不添加前缀后缀）

这导致两种模式生成的效果存在差异。

---

## ✅ 改进方案

### 新的默认模板

```
milady nft character, {description}, high quality, detailed, preserving original features
```

**改进要点：**
1. ✅ **明确身份**: `milady nft character` 替代通用的 `anime girl`
2. ✅ **保留特征**: 添加 `preserving original features` 指示 AI 保留原图特征
3. ✅ **质量控制**: 保留 `high quality, detailed` 确保生成质量

---

## 📊 效果对比

### 旧模板 (Before)
```
输入: /milady 5050 holding pizza, surrealistic style
实际 Prompt: anime girl, holding pizza, surrealistic style, high quality, detailed
```

**问题**:
- AI 会理解为"一个动漫女孩"，可能偏离 Milady 风格
- 没有强调保留原始 NFT 特征

### 新模板 (After)
```
输入: /milady 5050 holding pizza, surrealistic style
实际 Prompt: milady nft character, holding pizza, surrealistic style, high quality, detailed, preserving original features
```

**优势**:
- ✅ AI 知道这是 Milady NFT 角色
- ✅ 明确指示保留原始特征
- ✅ 更好地平衡风格转换和特征保留

---

## 🔧 修改的文件

### 1. `/Users/pengsun/ai-content-studio/replicate_config.py`
- 第 25 行: 更新默认 `POSITIVE_PROMPT_TEMPLATE`
- 第 56 行: 更新预设 2 (平衡版)
- 第 186 行: 更新 PRESETS["default"]
- 第 313 行: 更新文档示例

### 2. `/Users/pengsun/ai-content-studio/src/meme/replicate_illusion.py`
- 第 156 行: 更新函数文档示例
- 第 166 行: 更新默认模板代码

---

## 💡 使用建议

### 简单模式（推荐）

现在简单模式已经优化，可以放心使用：

```
@我是机器人 /milady 5050 holding pizza, cyberpunk style
```

效果：
- ✅ 保留 Milady NFT 的基本特征
- ✅ 添加你描述的风格和元素
- ✅ 平衡的风格转换强度

### 高级模式（完全控制）

如果你想要完全自定义 prompt：

```
@我是机器人 /milady 5050
effect_strength: 1.2
positive_prompt: milady nft character holding pizza, cyberpunk neon lights, futuristic city, highly detailed, vibrant colors
negative_prompt: low quality, blurry, bad anatomy
```

**提示**: 高级模式中，建议也包含 "milady nft character" 以保持一致性。

---

## 🎯 不同场景的推荐模板

### 场景 1: 最大保留原图特征

```python
EFFECT_STRENGTH = 0.8
POSITIVE_PROMPT_TEMPLATE = "milady nft character, {description}, preserving original style"
```

### 场景 2: 平衡模式（推荐）⭐

```python
EFFECT_STRENGTH = 1.1
POSITIVE_PROMPT_TEMPLATE = "milady nft character, {description}, high quality, detailed, preserving original features"
```

### 场景 3: 明显风格转换

```python
EFFECT_STRENGTH = 1.5
POSITIVE_PROMPT_TEMPLATE = "milady nft character, {description}, artistic, vibrant, masterpiece"
```

### 场景 4: 完全重绘（艺术创作）

```python
EFFECT_STRENGTH = 1.8
POSITIVE_PROMPT_TEMPLATE = "{description}, inspired by milady nft, highly detailed, professional art"
```

---

## 📝 技术说明

### ControlNet 工作原理

1. **控制图像**: 原始 Milady NFT（提供结构信息）
2. **Prompt**: 文本描述（提供风格和内容信息）
3. **Effect Strength**: 控制 AI 对原图的改变程度

**新模板的优势**:
- Prompt 和控制图像保持一致（都是 Milady NFT）
- 明确指示保留特征，减少偏离
- 更可预测的生成结果

---

## 🧪 测试建议

### 对比测试

使用相同的描述和参数，对比新旧模板：

**旧模板测试**:
```python
# 修改 replicate_config.py
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"
```

**新模板测试**:
```python
# 修改 replicate_config.py
POSITIVE_PROMPT_TEMPLATE = "milady nft character, {description}, high quality, detailed, preserving original features"
```

**测试命令**:
```
@我是机器人 /milady 5050 holding pizza, surrealistic style
```

对比生成结果，你会发现新模板：
- ✅ 更好地保留 Milady 的面部特征
- ✅ 更稳定的风格转换
- ✅ 更符合预期的效果

---

## ⚙️ 如何恢复旧版本

如果你更喜欢旧版本的效果，可以这样恢复：

```python
# 编辑 replicate_config.py
POSITIVE_PROMPT_TEMPLATE = "anime girl, {description}, high quality, detailed"
```

然后重启 webhook:
```bash
pkill -f webhook_server.py
nohup python3 webhook_server.py > webhook.log 2>&1 &
```

---

## 💬 反馈和建议

如果你发现新模板有任何问题或建议，请随时反馈！

可以尝试的其他模板：
- `"milady, {description}, nft style, high quality"`
- `"milady nft art, {description}, detailed, preserving character"`
- `"cute milady character, {description}, anime style, high quality"`

---

## 📊 总结

| 项目 | 旧模板 | 新模板 |
|------|--------|--------|
| **身份描述** | anime girl (通用) | milady nft character (特定) |
| **特征保留** | ❌ 无明确指示 | ✅ preserving original features |
| **适用性** | 通用动漫女孩 | Milady NFT 专用 |
| **效果稳定性** | ⚠️ 可能偏离 | ✅ 更可预测 |

**推荐**: 使用新模板作为默认配置，在简单模式下获得更好的 Milady NFT 特征保留效果！

---

**更新时间**: 2026-01-07
**生效状态**: ✅ 已应用并重启服务器
