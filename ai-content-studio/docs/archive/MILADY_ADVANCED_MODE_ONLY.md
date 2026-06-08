# 🔧 Milady AI 特效 - 仅支持高级模式

## 📋 更新说明

为了更好地保留 Milady NFT 的人物特征，我们已经**移除了简单模式**，现在只支持高级模式。

### 为什么移除简单模式？

**问题根源：**
1. 简单模式使用的 prompt 模板会自动添加前缀后缀
2. AI 模型对于"保持人物"的控制不够精确
3. 即使使用 ControlNet（控制图像），也可能因为 prompt 描述不当而改变人物

**用户反馈：**
> "我明确说了用 milady 5050 nft，但你还是给我变了个人物"

这是因为 AI 只是从文本理解"一个动漫女孩"，并不真正"认识" Milady NFT。

**解决方案：**
- 要求用户**明确指定完整的 prompt**
- 在 prompt 中**必须包含 "same character"** 关键词
- **降低 effect_strength**（推荐 0.8-0.9）以减少改变
- 在 negative_prompt 中**明确禁止 "different person"**

---

## ✅ 新的使用方式

### 必需格式

```
@我是机器人 /milady NFT编号
effect_strength: 数值
positive_prompt: 完整描述
negative_prompt: 负面词（可选）
```

### 关键要点

1. **必须提供 `positive_prompt`**
   - 否则会报错提示

2. **必须包含 "same character"**
   - 这是保持人物的关键词
   - 示例: `same character holding pizza, superrealistic style`

3. **推荐降低 effect_strength**
   - 0.6-0.8 = 微调（最保留原图）⭐ 推荐
   - 0.9-1.1 = 适中
   - 1.2-1.5 = 强烈（明显转换，可能改变人物）

4. **在 negative_prompt 中禁止改变人物**
   - 推荐: `low quality, blurry, different person, different face`
   - 明确告诉 AI 不要改变人物

---

## 💡 推荐案例

### 案例 1: 保留原图（推荐新手）

```
@我是机器人 /milady 5050
effect_strength: 0.8
positive_prompt: same character, subtle enhancement, high quality, detailed
negative_prompt: low quality, blurry, different person
```

**效果**: 最大程度保留原图，只有细微增强

---

### 案例 2: 超写实照片风格

```
@我是机器人 /milady 5050
effect_strength: 0.9
positive_prompt: same character holding pizza, superrealistic style, highly detailed, photorealistic, maintaining identity and features
negative_prompt: low quality, blurry, bad anatomy, different person, different character, different face, wrong identity
```

**效果**: 写实风格，但保持人物身份

---

### 案例 3: 赛博朋克风格

```
@我是机器人 /milady 5555
effect_strength: 1.0
positive_prompt: same character, cyberpunk style, neon lights, futuristic, vibrant colors, maintaining identity
negative_prompt: low quality, blurry, different person, natural
```

**效果**: 添加赛博朋克元素，但不改变人物

---

### 案例 4: 冬季雪景

```
@我是机器人 /milady 3456
effect_strength: 0.9
positive_prompt: same character in winter wonderland, snowy street, cozy atmosphere, maintaining original features
negative_prompt: low quality, blurry, different person
```

**效果**: 冬季背景，保持人物特征

---

## 🎯 最佳实践

### 1. Prompt 编写技巧

**✅ 推荐写法:**
```
same character, {你的描述}, maintaining identity, high quality, detailed
```

**❌ 不推荐:**
```
a girl holding pizza, superrealistic  # 这会生成一个新的女孩
anime character with pizza            # AI 不知道要保持原人物
```

---

### 2. Effect Strength 选择

| 强度 | 效果 | 适用场景 |
|------|------|----------|
| 0.6-0.8 | 微调 | 只想增强质量，几乎不改变 |
| 0.9 | 适中 | 添加风格，但保留人物 |
| 1.0-1.1 | 明显 | 风格转换，可能略微改变特征 |
| 1.2+ | 强烈 | ⚠️ 容易改变人物，不推荐 |

**推荐**: 从 0.8 开始测试，如果效果不够明显再提高到 0.9

---

### 3. Negative Prompt 策略

**基础版**（最简洁）:
```
low quality, blurry, different person
```

**标准版**（推荐）:
```
low quality, blurry, bad anatomy, different person, different face
```

**完整版**（最严格）:
```
low quality, blurry, bad anatomy, deformed, ugly, distorted, different person, different character, different face, wrong identity
```

---

### 4. 常见关键词

**保持人物的关键词:**
- `same character` - 相同角色
- `maintaining identity` - 保持身份
- `maintaining original features` - 保持原始特征
- `preserving character` - 保留角色

**风格关键词:**
- `photorealistic, superrealistic` - 写实风格
- `cyberpunk style, neon lights` - 赛博朋克
- `fantasy, magical` - 奇幻风格
- `watercolor, painting` - 绘画风格

**质量关键词:**
- `high quality, detailed` - 高质量
- `highly detailed, sharp focus` - 高度细节
- `masterpiece, best quality` - 杰作级质量

---

## ⚠️ 常见错误

### 错误 1: 没有提供 positive_prompt

```
@我是机器人 /milady 5050
effect_strength: 0.9
```

**错误信息**: ❌ 必须提供 positive_prompt 参数

**正确做法**: 必须加上 positive_prompt 行

---

### 错误 2: Prompt 中没有 "same character"

```
positive_prompt: holding pizza, superrealistic style
```

**问题**: AI 会生成一个新人物

**正确做法**:
```
positive_prompt: same character holding pizza, superrealistic style
```

---

### 错误 3: Effect Strength 过高

```
effect_strength: 1.5
```

**问题**: 即使有 "same character"，过高的强度也会大幅改变人物

**正确做法**: 降低到 0.8-0.9

---

## 📊 参数对照表

### Effect Strength 参考

| 数值 | 描述 | 人物保留度 | 风格明显度 |
|------|------|-----------|-----------|
| 0.6 | 极微调 | ⭐⭐⭐⭐⭐ | ⭐ |
| 0.8 | 温和 | ⭐⭐⭐⭐ | ⭐⭐ |
| 0.9 | 适中 | ⭐⭐⭐ | ⭐⭐⭐ |
| 1.1 | 明显 | ⭐⭐ | ⭐⭐⭐⭐ |
| 1.3 | 强烈 | ⭐ | ⭐⭐⭐⭐⭐ |

**推荐**: 0.8-0.9（保持人物的同时添加风格）

---

## 🔍 故障排查

### 问题: 生成的图片还是改变了人物

**可能原因:**
1. Effect Strength 太高（超过 1.0）
2. Prompt 中没有 "same character"
3. Prompt 描述了具体的人物特征（如 "a blonde girl"）
4. Negative Prompt 没有禁止 "different person"

**解决方案:**
```
effect_strength: 0.8  # 降低强度
positive_prompt: same character, {你的风格描述}, maintaining identity
negative_prompt: low quality, blurry, different person, different face
```

---

### 问题: 效果不够明显

**可能原因:**
1. Effect Strength 太低（低于 0.7）
2. Prompt 描述不够具体

**解决方案:**
```
effect_strength: 0.9  # 适当提高
positive_prompt: same character, {更详细的描述}, highly detailed, vibrant colors
```

---

## 📚 完整示例

### 示例 1: 你的超写实披萨场景

```
@我是机器人 /milady 5050
effect_strength: 0.9
positive_prompt: same character holding pizza, superrealistic style, highly detailed, photorealistic, professional photography, studio lighting, maintaining identity and features
negative_prompt: low quality, blurry, bad anatomy, different person, different character, different face, wrong identity, anime, cartoon
```

**要点:**
- ✅ 包含 "same character"
- ✅ Effect Strength 0.9（适中）
- ✅ Negative 中明确禁止 anime, cartoon（因为要写实风格）
- ✅ 包含 maintaining identity and features

---

### 示例 2: 赛博朋克霓虹灯

```
@我是机器人 /milady 5555
effect_strength: 1.0
positive_prompt: same character, cyberpunk cityscape background, neon lights, futuristic atmosphere, glowing effects, vibrant purple and blue colors, maintaining original character features
negative_prompt: low quality, blurry, different person, different face, natural lighting, vintage
```

**要点:**
- ✅ Effect Strength 1.0（稍高，因为背景改变较大）
- ✅ Negative 中加 natural lighting（因为要霓虹灯）
- ✅ 描述背景和氛围，而非人物本身

---

## 🎉 总结

### 关键点

1. **必须提供 positive_prompt**
2. **必须包含 "same character"**
3. **推荐 effect_strength: 0.8-0.9**
4. **在 negative_prompt 禁止 "different person"**

### 核心原则

> 描述风格和场景，而不是人物本身。
> 用 "same character" 告诉 AI 保持人物不变。

---

**更新时间**: 2026-01-07
**生效状态**: ✅ 已应用并重启服务器
