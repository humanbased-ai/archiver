# 🎨 FLUX Fill Pro - AI 配饰替换功能

## 📋 功能简介

使用 FLUX Fill Pro 模型实现 Milady NFT 配饰的**智能替换**（而非叠加）。

### 核心特点

- ✅ **智能替换**：完全移除原配饰，用新配饰替换
- ✅ **自然语言**：用文字描述你想要的新配饰
- ✅ **预定义区域**：6 种配饰区域已预设好坐标
- ✅ **高质量**：使用 FLUX Fill Pro 专业级 inpainting 模型
- ✅ **批量支持**：可一次替换多个配饰

---

## 💰 费用说明

**FLUX Fill Pro 定价：**
- 约 $0.05 USD / 张图片
- 比 Illusion Diffusion ($0.007) 贵约 7 倍
- 但效果更精准，替换更自然

**建议：**
- 先用 Illusion 做风格转换（便宜）
- 需要精准替换配饰时才用 FLUX Fill Pro

---

## 🚀 快速开始

### 基本格式

```
@我是机器人 /milady_replace NFT编号 配饰类型 新配饰描述
```

### 示例

```
@我是机器人 /milady_replace 5050 glasses cyberpunk sunglasses with purple neon glow

@我是机器人 /milady_replace 1234 hat futuristic holographic cap with LED lights

@我是机器人 /milady_replace 8888 clothes black leather jacket with neon patches
```

---

## 📦 支持的配饰类型

| 英文 | 中文 | 说明 | 预定义区域 (x, y, width, height) |
|------|------|------|----------------------------------|
| `hat` | 帽子 | 头顶 | (100, 30, 300, 180) |
| `glasses` | 眼镜 | 眼睛 | (150, 170, 200, 90) |
| `earrings` | 耳环/左耳环 | 左耳 | (80, 210, 120, 100) |
| `earrings_right` | 右耳环 | 右耳 | (300, 210, 120, 100) |
| `necklace` | 项链 | 脖子 | (160, 340, 180, 100) |
| `clothes` | 衣服/上衣/外套 | 上身 | (120, 380, 260, 120) |

### ✅ 支持中文

可以直接使用中文配饰类型，系统会自动转换：

**中文示例：**
```
@我是机器人 /milady_replace 5050 帽子 未来主义全息帽子，LED显示屏
@我是机器人 /milady_replace 1234 眼镜 赛博朋克紫色霓虹墨镜
@我是机器人 /milady_replace 8888 衣服 黑色皮夹克，霓虹补丁
```

**注意：**
- 区域坐标基于标准 500x500 Milady NFT 尺寸
- 支持的中文别名：帽子、眼镜、耳环、左耳环、右耳环、项链、衣服、上衣、外套
- 如果需要自定义区域，可联系管理员修改配置

---

## 🎯 使用示例

### 示例 1: 替换眼镜（赛博朋克风格）

```
@我是机器人 /milady_replace 5050 glasses cyberpunk sunglasses with purple neon glow, futuristic, highly detailed, glowing edges
```

**效果：**
- 移除原始眼镜
- 替换成赛博朋克风格的霓虹紫色太阳镜

---

### 示例 2: 替换帽子（未来主义）

```
@我是机器人 /milady_replace 1234 hat holographic cap with LED display, futuristic technology, transparent material, glowing effects
```

**效果：**
- 移除原始帽子
- 替换成全息 LED 显示屏帽子

---

### 示例 3: 替换衣服（皮夹克）

```
@我是机器人 /milady_replace 8888 clothes black leather jacket with neon patches, cyberpunk style, detailed stitching, glowing accents
```

**效果：**
- 移除原始上衣
- 替换成带霓虹补丁的黑色皮夹克

---

### 示例 4: 替换项链（宝石）

```
@我是机器人 /milady_replace 3456 necklace diamond necklace with glowing gemstones, luxury jewelry, sparkling effects, highly detailed
```

**效果：**
- 移除原始项链
- 替换成带发光宝石的钻石项链

---

### 示例 5: 中文示例 - 替换帽子

```
@我是机器人 /milady_replace 5050 帽子 帽子上的「大白兔」三个字和兔子 Logo 换成文字「Codatta Intern」
```

**效果：**
- 使用中文配饰类型"帽子"（自动转换为 `hat`）
- 将帽子上的图案和文字替换成新的描述

---

## ⚙️ 高级格式（多行参数）

如果需要精细控制生成参数，可以使用多行格式：

```
@我是机器人 /milady_replace 5050
accessory: glasses
description: cyberpunk sunglasses with purple neon glow, futuristic, highly detailed, glowing edges, transparent material
guidance: 35.0
steps: 30
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `accessory` | 字符串 | **必需** | 配饰类型（hat, glasses, earrings 等） |
| `description` | 字符串 | **必需** | 新配饰的详细描述 |
| `guidance` | 浮点数 | 30.0 | 引导强度（推荐 20-40） |
| `steps` | 整数 | 28 | 推理步数（推荐 20-40） |

---

## 🎨 Guidance 参数调节

**Guidance（引导强度）** 控制 AI 对描述的遵循程度：

| Guidance | 效果 | 适用场景 |
|----------|------|----------|
| 20-25 | 温和 | 微调，接近原图风格 |
| 30 | **推荐** | 平衡效果和质量 |
| 35-40 | 强烈 | 明显风格转换 |
| 40+ | 极强 | 可能过度生成，失真 |

**推荐：** 从 30 开始，如果效果不够明显提高到 35

---

## 📝 Prompt 编写技巧

### ✅ 推荐写法

**详细具体 + 质量关键词：**
```
cyberpunk sunglasses with purple neon glow, futuristic design, highly detailed, glowing edges, transparent material, reflective surface
```

**要点：**
- 描述材质（transparent, reflective, leather 等）
- 描述效果（glowing, sparkling, shining 等）
- 描述细节（detailed stitching, LED display 等）
- 添加质量词（highly detailed, professional, masterpiece 等）

---

### ❌ 不推荐写法

**过于简单：**
```
sunglasses  # 太简略，效果随机
```

**描述人物：**
```
a girl wearing cyberpunk glasses  # 不要描述人物，只描述配饰
```

**矛盾风格：**
```
cyberpunk vintage classic glasses  # 风格冲突，AI 会困惑
```

---

## 💡 常用关键词参考

### 风格关键词

- **赛博朋克**: `cyberpunk, neon lights, futuristic, glowing, LED, holographic`
- **奢华**: `luxury, diamond, gold, sparkling, gemstones, crystal`
- **复古**: `vintage, retro, classic, antique, elegant`
- **未来主义**: `futuristic, technology, holographic, transparent, glowing`
- **自然**: `natural, organic, wooden, handmade, rustic`

### 材质关键词

- **金属**: `metallic, chrome, silver, gold, bronze, copper`
- **玻璃**: `glass, transparent, translucent, crystal, reflective`
- **布料**: `fabric, leather, silk, cotton, wool, denim`
- **塑料**: `plastic, acrylic, glossy, shiny`

### 效果关键词

- **发光**: `glowing, luminous, shining, radiant, bright`
- **闪耀**: `sparkling, shimmering, glittering, dazzling`
- **反射**: `reflective, mirror-like, glossy, polished`

### 质量关键词

- `highly detailed, intricate details, professional quality`
- `masterpiece, best quality, ultra-detailed`
- `photorealistic, realistic, lifelike`

---

## 🔧 技术原理

### 工作流程

1. **生成基础图片**：使用 Milady Maker 生成指定 NFT 的基础图片
2. **创建遮罩**：根据配饰类型，生成对应区域的白色遮罩
3. **FLUX Fill Pro**：使用 inpainting 技术，在遮罩区域内生成新内容
4. **保留其他区域**：遮罩外的区域完全保留，确保人物不变

### FLUX Fill Pro vs Illusion Diffusion

| 特性 | FLUX Fill Pro | Illusion Diffusion |
|------|---------------|-------------------|
| **用途** | 精准替换配饰 | 风格转换 |
| **方法** | Inpainting (局部重绘) | ControlNet (全局风格) |
| **价格** | ~$0.05/张 | ~$0.007/张 |
| **速度** | 30-60 秒 | 20-40 秒 |
| **适用** | 需要精准替换时 | 需要整体风格转换时 |

**建议：**
- 整体风格转换 → 用 Illusion Diffusion（便宜快速）
- 精准替换配饰 → 用 FLUX Fill Pro（专业精准）

---

## ⚠️ 常见问题

### 问题 1: "基础图片生成失败"

**原因：**
- NFT 编号超出范围（有效范围: 0-9999）
- MemeGeneratorV2 未正确初始化

**解决：**
```
# 检查 NFT 编号
/milady_replace 5050 glasses ...  # ✅ 正确
/milady_replace 99999 glasses ... # ❌ 超出范围
```

---

### 问题 2: "不支持的配饰类型"

**原因：**
- 输入了不在预定义列表中的配饰类型

**解决：**
只使用以下类型：
- `hat`, `glasses`, `earrings`, `earrings_right`, `necklace`, `clothes`

---

### 问题 3: 替换效果不理想

**可能原因：**
1. Prompt 描述不够详细
2. Guidance 参数不合适
3. 配饰类型选错了区域

**解决方案：**

**1. 优化 Prompt：**
```
# 不够详细
description: sunglasses

# 更好
description: cyberpunk sunglasses with purple neon glow, futuristic design, highly detailed, glowing edges
```

**2. 调整 Guidance：**
```
# 效果太弱
guidance: 20.0

# 更明显
guidance: 35.0
```

**3. 选对配饰类型：**
```
# 如果原图戴的是帽子，选 hat
accessory: hat

# 如果是眼镜，选 glasses
accessory: glasses
```

---

### 问题 4: "REPLICATE_API_TOKEN 未配置"

**原因：**
- 环境变量未设置

**解决：**
```bash
# 设置环境变量
export REPLICATE_API_TOKEN="your_token_here"

# 重启 webhook
pkill -f webhook_server.py
nohup python3 webhook_server.py > webhook.log 2>&1 &
```

---

## 📊 完整示例对照

### 示例 1: 赛博朋克眼镜

**简单格式：**
```
@我是机器人 /milady_replace 5050 glasses cyberpunk sunglasses with purple neon glow
```

**高级格式：**
```
@我是机器人 /milady_replace 5050
accessory: glasses
description: cyberpunk sunglasses with purple neon glow, futuristic design, highly detailed, glowing edges, transparent material, reflective surface
guidance: 35.0
steps: 30
```

---

### 示例 2: 全息帽子

**简单格式：**
```
@我是机器人 /milady_replace 1234 hat holographic cap with LED display
```

**高级格式：**
```
@我是机器人 /milady_replace 1234
accessory: hat
description: holographic cap with LED display, futuristic technology, transparent material, glowing effects, digital patterns
guidance: 30.0
steps: 28
```

---

### 示例 3: 钻石项链

**简单格式：**
```
@我是机器人 /milady_replace 3456 necklace diamond necklace with glowing gemstones
```

**高级格式：**
```
@我是机器人 /milady_replace 3456
accessory: necklace
description: diamond necklace with glowing gemstones, luxury jewelry, sparkling effects, highly detailed, crystal clear, radiant shine
guidance: 30.0
steps: 28
```

---

## 🔍 调试功能

### 可视化配饰区域

如果需要查看预定义的配饰区域位置（开发调试用）：

```python
from src.meme.flux_fill_pro import FluxFillPro

flux = FluxFillPro()
flux.visualize_regions(
    image_path="milady_5050.png",
    output_path="regions_visualization.png"
)
```

**效果：**
- 在原图上绘制红色矩形框标记各个配饰区域
- 用于调试和确认区域位置是否合适

---

## 🚀 未来改进

### 计划中的功能

1. **自动配饰检测**
   - 使用 SAM (Segment Anything Model) 自动识别配饰位置
   - 不再需要预定义区域

2. **批量替换命令**
   - 一次性替换多个配饰
   - 示例: `/milady_replace_batch 5050 glasses:xxx hat:yyy`

3. **自定义区域**
   - 允许用户通过坐标指定自定义替换区域
   - 示例: `region: 100,100,200,200`

4. **预览模式**
   - 先显示遮罩预览，确认后再生成
   - 避免浪费 API 调用次数

---

## 📚 相关文档

- [FLUX Fill Pro 模型文档](src/meme/flux_fill_pro.py)
- [Replicate 计费指南](REPLICATE_BILLING_GUIDE.md)
- [Milady Illusion 特效指南](MILADY_ADVANCED_MODE_ONLY.md)

---

## 💬 反馈和建议

如果遇到问题或有改进建议，请随时反馈！

**当前状态：** ✅ 已上线并运行
**更新时间：** 2026-01-07
