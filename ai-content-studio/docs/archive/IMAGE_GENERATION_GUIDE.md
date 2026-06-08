# AI Content Studio 配图生成指南

## 📸 配图策略总结

基于 Binance GM posts 分析，Jessie 的配图策略：

### 配图频率
- **GM posts**: 30% 需要配图
- **Main posts**: 50% 需要配图
- **Casual posts**: 40% 需要配图
- **Replies**: 几乎不需要配图

### 配图类型分布

| 类型 | 比例 | 适用场景 | 示例 |
|------|------|---------|------|
| **工作场景** | 20% | Builder daily, GM 工作日 | 笔记本+咖啡+代码 |
| **Meme 图** | 30% | 吐槽、对线、荒谬叙事 | 黑底白字、对话框 format |
| **极简文字** | 30% | Cult energy, 强文案 | 大字体居中、纯色背景 |
| **插画/艺术** | 20% | Milady 观察、周末 vibes | Milady 风格插画 |

---

## 🎨 配图生成流程

### 1. 自动判断是否需要配图

系统会根据以下因素自动判断：
- **内容类型**（gm/main/casual/reply）
- **主题关键词**（meme/milady/builder/duixian）
- **文案长度**（强文案可能不需要图）
- **随机概率**（避免每条都配图）

### 2. 选择配图类型

根据主题自动选择：
- **Meme format** → meme 图
- **Milady culture** → illustration
- **Builder daily** → work_scene
- **Cult energy** → minimal_text

### 3. 生成配图建议

**给设计师的建议**（人工作图）：
```
配图建议：工作场景实拍/渲染

元素：
- MacBook 笔记本（屏幕显示代码/数据表格）
- 咖啡杯
- 可选：Codatta logo 小物件
- 背景：办公桌/咖啡厅/户外

风格：真实感、生活化、不做作

参考：Binance 的户外工作照（笔记本+咖啡+自然光）
```

**给 AI 的 prompt**（自动生成）：
```
A clean desk with a modern laptop showing data charts,
a coffee cup, warm natural lighting, realistic photo style,
minimal and professional
```

### 4. AI 自动生成（可选）

支持两个 API：
- **Nano Banana Pro**: `BANANA_API_KEY`
- **Lovart API**: `LOVART_API_KEY`

---

## 🛠️ 使用方法

### 方法 1: 自动生成配图建议

```python
from src.utils.image_generation import ImageSuggestionGenerator

suggestion = ImageSuggestionGenerator.suggest_image(
    content_type='main',
    theme='AI industry unfairness - criticize funding',
    tweet_text='AI companies raise $10B but pay labelers $3/hour'
)

print(suggestion)
# {
#     'needs_image': True,
#     'image_type': 'meme',
#     'prompt_for_designer': '配图建议：Meme 幽默图...',
#     'prompt_for_ai': 'A simple meme template...',
#     'style': 'meme'
# }
```

### 方法 2: AI 自动生成图片

```python
from src.utils.image_generation import ImageGenerator

generator = ImageGenerator()
result = generator.generate_image(
    prompt="A laptop with data charts and coffee cup",
    style="realistic",
    size="1024x1024"
)

print(result)
# {
#     'success': True,
#     'url': 'https://...',
#     'local_path': '/Users/pengsun/ai-content-studio/generated_images/banana_1234567.png',
#     'provider': 'banana'
# }
```

### 方法 3: 一站式生成（推荐）

```python
from src.utils.image_generation import generate_tweet_image

result = generate_tweet_image(
    content_type='main',
    theme='Builder daily',
    tweet_text='debugged validation pipeline for 3 hours, coffee #5'
)

print(result)
# {
#     'needs_image': True,
#     'suggestion': {...},      # 设计师建议
#     'ai_result': {...}         # AI 生成结果（如果成功）
# }
```

---

## ⚙️ 配置 API Keys

在 `/Users/pengsun/ai-content-studio/src/core/config.py` 中添加：

```python
class Config:
    # ... existing config ...

    # AI Image Generation
    BANANA_API_KEY = os.getenv('BANANA_API_KEY', '')
    LOVART_API_KEY = os.getenv('LOVART_API_KEY', '')
```

在 `.env` 文件中添加：

```bash
# AI Image Generation API Keys
BANANA_API_KEY=your_banana_api_key_here
LOVART_API_KEY=your_lovart_api_key_here
```

---

## 📋 配图类型详细说明

### 1. 工作场景 (work_scene)

**适用**:
- Builder daily
- GM 工作日
- Industry insights

**元素**:
- 笔记本电脑（显示代码/图表）
- 咖啡杯
- 简洁办公环境
- 自然光/温暖光线

**AI Prompt 示例**:
```
A clean modern desk with laptop showing data analytics dashboard,
coffee cup next to keyboard, warm natural lighting,
realistic photo style, professional but casual
```

**参考**: Binance 的户外工作照

---

### 2. Meme 图 (meme)

**适用**:
- 对线/批判
- 荒谬叙事
- 吐槽

**格式**:
- 黑底白字
- 对话框 format
- 时间表 layout
- 对比图

**AI Prompt 示例**:
```
Simple meme template with bold white text on black background,
modern social media style, humorous and relatable
```

**参考**: Binance 的周末时间表 meme

---

### 3. 极简文字 (minimal_text)

**适用**:
- Cult energy
- 强文案
- 简短有力的 statement

**设计**:
- 纯色背景（黑/深蓝/渐变）
- 大字体、居中
- 可选小 emoji 点缀

**AI Prompt 示例**:
```
Minimalist typography design with text "{核心文案}",
clean modern aesthetic, solid color background,
bold sans-serif font, high contrast
```

---

### 4. 插画/艺术 (illustration)

**适用**:
- Milady 文化观察
- Weekend vibes
- 社区时刻

**风格**:
- Pastel 配色（粉、蓝、紫）
- 可爱、略带邪教感
- Milady NFT 美学
- 蝴蝶、蝴蝶结、星星元素

**AI Prompt 示例**:
```
Cute anime-style illustration with pastel colors,
Milady aesthetic, butterflies and bows,
soft dreamy atmosphere, pink and purple tones
```

---

## 🎯 配图建议实例

### 示例 1: GM Post (Monday)

**推文**: "gm 🥱 another monday of making AI less stupid"

**判断**: 30% 概率需要配图 → 这次不需要（纯文字足够）

**建议**:
```json
{
  "needs_image": false,
  "image_type": "none",
  "prompt_for_designer": "纯文字推文，无需配图"
}
```

---

### 示例 2: Main Post (Tuesday - 批判)

**推文**: "AI companies this year:\n- raised $50B ✅\n- hired genius engineers ✅\n- pay data labelers $3/hour ✅\n\nbrother the math ain't mathing"

**判断**: 批判类 + 列表格式 → 适合 Meme 图

**设计师建议**:
```
配图建议：Meme 幽默图

格式：
- 黑底白字列表
- 每项用 ✅ 标记
- 底部加吐槽文字
- 简洁、易读、有力

参考：对比式 meme 图
```

**AI Prompt**:
```
Simple meme format with white text on black background,
checklist style with checkmarks, bottom text punchline,
modern social media aesthetic
```

---

### 示例 3: Builder Daily (Thursday)

**推文**: "today:\n✅ debugged validation pipeline\n✅ 5 coffees\n❌ sanity\n❌ work-life balance"

**判断**: Builder 日常 + 工作内容 → 工作场景

**设计师建议**:
```
配图建议：工作场景实拍

元素：
- 笔记本屏幕显示代码
- 多个咖啡杯（强调"5 coffees"）
- 略显凌乱的桌面（真实感）
- 傍晚光线（加班氛围）

风格：真实、不做作、有点累的感觉
```

**AI Prompt**:
```
A developer's messy desk at evening, laptop showing code,
multiple coffee cups, warm dim lighting,
realistic photo style, tired but determined vibe
```

---

### 示例 4: Milady Observation (Weekend)

**推文**: "just saw the most chaotic thread on miladychan\nthe unhinged energy is exactly what weekends are for 🦋"

**判断**: Milady 文化 → illustration

**设计师建议**:
```
配图建议：Milady 风格插画

风格：
- Pastel 配色（粉、蓝、紫）
- 蝴蝶元素（对应 🦋）
- 略带 chaotic/unhinged 感
- 梦幻、可爱

参考：Milady NFT 美学
```

**AI Prompt**:
```
Cute chaotic anime illustration with butterflies,
pastel pink and purple colors, dreamy and unhinged vibe,
Milady aesthetic, soft gradient background
```

---

## 📊 配图效果评估

### 好的配图特征：
✅ 与文案主题匹配
✅ 风格统一（Jessie 的视觉 identity）
✅ 不过度设计（真实 > 精美）
✅ 增强文案表达力
✅ 可快速理解

### 避免的配图：
❌ 过于 corporate/正式
❌ Stock photo 感
❌ 与文案无关
❌ 过度设计/复杂
❌ 明显的 AI 生成痕迹（除非刻意为之）

---

## 🚀 下一步

1. **配置 API Keys**（Banana/Lovart）
2. **测试 AI 生成**（生成几张样图）
3. **建立配图库**（常用场景的预设图）
4. **人工审核**（AI 生成的图需要人工筛选）
5. **迭代优化**（根据效果调整 prompts）

---

## 📝 Notes

- 配图不是必须的，强文案可以纯文字
- AI 生成的图可能需要人工调整
- 可以混合使用：AI 生成 base + 设计师优化
- 建议建立一个配图素材库，常用场景可以复用
- Meme 图建议人工制作（更精确）
