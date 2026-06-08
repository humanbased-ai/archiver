#!/usr/bin/env python3
"""
自然语言 Prompt 解析器
支持用户用自然语言描述想要的 Meme 图
"""

import re
from typing import Dict, Optional, List, Tuple


class PromptParser:
    """自然语言 Prompt 解析器"""

    # 模板关键词映射
    TEMPLATE_KEYWORDS = {
        "gm": ["gm", "早安", "good morning", "goodmorning", "建设者", "builders"],
        "crypto": ["crypto", "加密", "币圈", "moon", "钻石手", "diamond hands", "bullish"],
        "milady": ["milady", "米拉迪", "remilia", "网络灵性", "数字民俗"],
        "motivational": ["励志", "鸡汤", "motivational", "打气", "坚持"]
    }

    # 字体风格关键词
    FONT_KEYWORDS = {
        "impact": ["impact", "经典", "粗体", "传统"],
        "glow": ["glow", "发光", "赛博", "cyberpunk", "霓虹", "neon", "未来城市", "未来", "futuristic"],
        "angelic": ["angelic", "优雅", "天使", "elegant"],
        "chinese": ["中文", "chinese", "汉字"]
    }

    # 图层类别关键词（通用的，只在没有匹配到具体图层时使用）
    LAYER_KEYWORDS = {
        "Hat": ["hat", "cap"],  # 移除中文"帽子"，避免与具体帽子名称冲突
        "Glasses": ["眼镜", "glasses", "墨镜", "sunglasses", "太阳镜"],
        "Earrings": ["耳环", "earrings", "耳饰"],
        "Necklaces": ["项链", "necklace", "necklaces", "颈链"],
        "Face Decoration": ["脸部装饰", "face decoration", "面部", "贴纸"],
        "Overlay": ["特效", "overlay", "叠加", "效果"]  # 移除"爱心"、"星星"，使用具体名称
    }

    # 常用图层文件映射
    COMMON_LAYERS = {
        # 帽子
        "贝雷帽": "Hat:Beret.png",
        "蓝色帽子": "Hat:Blue Cap.png",
        "棕色牛仔帽": "Hat:Brown Cowboy Hat.png",
        "白色牛仔帽": "Hat:White Cowboy Hat.png",
        "粉色帽子": "Hat:Pink Bonnet.png",
        "熊帽": "Hat:Bear Hat.png",
        "蛋糕帽": "Hat:Cake Hat.png",
        "光环": "Hat:Halo.png",

        # 眼镜
        "墨镜": "Glasses:Sunglasses.png",
        "圆框眼镜": "Glasses:Round Glasses.png",
        "prescription眼镜": "Glasses:Prescription Glasses.png",
        "cobain眼镜": "Glasses:Cobain Glasses.png",
        "harajuku眼镜": "Glasses:Harajuku Glasses.png",

        # 特效叠加层
        "爱心": "Overlay:Heart Meme.png",
        "星星": "Overlay:Stars.png",
        "生日帽": "Overlay:Birthday Hat.png",
        "庆祝的帽子": "Overlay:Birthday Hat.png",  # 新增：支持"庆祝的帽子"
        "庆祝帽": "Overlay:Birthday Hat.png",
        "派对帽": "Overlay:Birthday Hat.png",
        "拿着枪": "Overlay:Gunpoint.png",
        "手拿枪": "Overlay:Gunpoint.png",  # 新增
        "手上拿着枪": "Overlay:Gunpoint.png",  # 新增
        "枪": "Overlay:Gunpoint.png",
        "举枪": "Overlay:Gunpoint.png",
        "光晕": "Overlay:Halo.png",
        "100疯狂": "Overlay:100Crazy.png",
        "100% crazy": "Overlay:100Crazy.png",
        "100crazy": "Overlay:100Crazy.png",
        "crazy": "Overlay:100Crazy.png",
        "香蕉贴纸": "Overlay:Banana Sticker.png",
        "对话框": "Overlay:Chat Bubble.png",
        "麦当劳": "Overlay:McDonald_Badge.png",
        "mcdonald": "Overlay:McDonald_Badge.png",
        "麦当劳logo": "Overlay:McDonald_Badge.png",
        "mcdonald logo": "Overlay:McDonald_Badge.png",
        "麦当劳打工": "Overlay:McDonald_Badge.png",
        "在麦当劳打工": "Overlay:McDonald_Badge.png",
        "麦当劳员工": "Overlay:McDonald_Badge.png",

        # 嘴部装饰（Mouth 类别，不是 Overlay）
        "抽烟": "Mouth:Smoking.png",
        "叼烟": "Mouth:Smoking.png",
        "叼一支烟": "Mouth:Smoking.png",
        "在嘴边叼一支烟": "Mouth:Smoking.png",
        "嘴边叼烟": "Mouth:Smoking.png",
        "吸烟": "Mouth:Smoking.png",
    }

    # 视觉风格/效果关键词（用于 Prompt Enhancer 或 Effect/Mirage）
    VISUAL_STYLE_KEYWORDS = {
        # Liminal Space 风格
        "liminal": ["liminal", "liminal space", "边缘空间", "过渡空间"],
        "illusion": ["illusion", "幻觉", "错觉"],

        # 艺术风格
        "vaporwave": ["vaporwave", "蒸汽波", "赛博"],
        "retrowave": ["retrowave", "复古波", "80年代"],
        "cyberpunk": ["cyberpunk", "赛博朋克", "未来主义"],
        "glitch": ["glitch", "故障", "故障艺术"],

        # 光影效果
        "neon": ["neon", "霓虹", "发光"],
        "glow": ["glow", "发光", "辉光"],
        "bokeh": ["bokeh", "散景", "虚化"],

        # 氛围
        "dreamy": ["dreamy", "梦幻", "如梦似幻"],
        "nostalgic": ["nostalgic", "怀旧", "复古"],
        "surreal": ["surreal", "超现实", "超现实主义"],
    }

    # 自定义背景关键词
    BACKGROUND_KEYWORDS = {
        "mcdonald": ["mcdonald", "麦当劳", "mcdonalds", "mcd", "麦当劳背景", "mcdonald背景", "mcdonald标志"]
    }

    def __init__(self):
        """初始化解析器"""
        self.debug = False

    def parse(self, prompt: str) -> Dict:
        """
        解析自然语言 prompt

        Args:
            prompt: 用户输入的自然语言描述

        Returns:
            解析后的参数字典
        """
        params = {
            "template": None,
            "nft_id": None,
            "layers": {},
            "top_text": "",
            "bottom_text": "",
            "font_style": "impact",
            "all_caps": True,
            "visual_styles": [],  # 新增：视觉风格列表
            "use_prompt_enhancer": False,  # 新增：是否需要使用 Prompt Enhancer
            "custom_background": None,  # 新增：自定义背景类型（如 "mcdonald"）
        }

        prompt_lower = prompt.lower()

        # 1. 解析模板类型
        params["template"] = self._parse_template(prompt_lower)

        # 2. 解析 NFT ID
        params["nft_id"] = self._parse_nft_id(prompt)

        # 3. 解析图层
        params["layers"] = self._parse_layers(prompt, prompt_lower)

        # 4. 解析字体风格
        params["font_style"] = self._parse_font_style(prompt_lower)

        # 5. 解析自定义文字
        top_text, bottom_text = self._parse_custom_text(prompt)
        if top_text:
            params["top_text"] = top_text
        if bottom_text:
            params["bottom_text"] = bottom_text

        # 6. 解析大小写选项
        params["all_caps"] = self._parse_caps_option(prompt_lower)

        # 7. 解析视觉风格（新增）
        params["visual_styles"] = self._parse_visual_styles(prompt_lower)

        # 8. 检测是否需要 Prompt Enhancer
        # 如果有视觉风格描述，或者是纯自然语言描述（无模板），启用 Prompt Enhancer
        if params["visual_styles"] or (not params["template"] and not params["top_text"]):
            params["use_prompt_enhancer"] = True

        # 9. 解析自定义背景
        params["custom_background"] = self._parse_custom_background(prompt_lower)

        if self.debug:
            print(f"📝 原始 Prompt: {prompt}")
            print(f"🔍 解析结果: {params}")

        return params

    def _parse_template(self, prompt_lower: str) -> Optional[str]:
        """解析模板类型"""
        for template, keywords in self.TEMPLATE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in prompt_lower:
                    return template
        return None

    def _parse_nft_id(self, prompt: str) -> Optional[int]:
        """解析 NFT ID"""
        # 匹配 #数字 或 NFT 数字 或 nft 数字
        patterns = [
            r'#(\d+)',
            r'nft[:\s]+(\d+)',
            r'NFT[:\s]+(\d+)',
            r'编号[:\s]*(\d+)',
            r'id[:\s]*(\d+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, prompt, re.IGNORECASE)
            if match:
                nft_id = int(match.group(1))
                if 0 <= nft_id <= 9999:
                    return nft_id

        return None

    def _parse_layers(self, prompt: str, prompt_lower: str) -> Dict[str, List[str]]:
        """
        解析图层（支持同一类别多个图层）

        返回格式: {"Overlay": ["Gunpoint.png", "Birthday Hat.png"], "Hat": ["Beret.png"]}
        """
        from collections import defaultdict
        layers = defaultdict(list)

        # 1. 先检查常用图层的中文名称（按长度排序，优先匹配更具体的关键词）
        sorted_layers = sorted(self.COMMON_LAYERS.items(), key=lambda x: len(x[0]), reverse=True)
        matched_keywords = set()  # 避免重复匹配

        for layer_name, layer_path in sorted_layers:
            if layer_name in prompt and layer_name not in matched_keywords:
                category, filename = layer_path.split(":", 1)
                # 支持同一类别添加多个图层
                if filename not in layers[category]:
                    layers[category].append(filename)
                    matched_keywords.add(layer_name)

        # 2. 检查图层类别关键词（只在没有匹配到具体图层时设置默认）
        # 使用单词边界匹配，避免 "cap" 匹配到 "caption"
        import re
        for category, keywords in self.LAYER_KEYWORDS.items():
            for keyword in keywords:
                # 使用 \b 单词边界，确保只匹配完整单词
                pattern = r'\b' + re.escape(keyword) + r'\b'
                if re.search(pattern, prompt_lower, re.IGNORECASE) and not layers[category]:
                    # 找到了类别但没有具体图层，设置默认图层
                    if category == "Hat":
                        layers[category].append("Beret.png")  # 默认贝雷帽
                    elif category == "Glasses":
                        layers[category].append("Sunglasses.png")  # 默认墨镜
                    elif category == "Overlay":
                        layers[category].append("Heart Meme.png")  # 默认爱心
                    break

        # 转换为普通 dict
        return dict(layers)

    def _parse_font_style(self, prompt_lower: str) -> str:
        """解析字体风格"""
        for font_style, keywords in self.FONT_KEYWORDS.items():
            for keyword in keywords:
                if keyword in prompt_lower:
                    return font_style

        # 默认返回 impact
        return "impact"

    def _parse_custom_text(self, prompt: str) -> Tuple[str, str]:
        """解析自定义文字"""
        top_text = ""
        bottom_text = ""

        # 1. 匹配直接引号文字：文字：xxx / caption：xxx / 上文字：xxx
        direct_patterns = [
            r'上文字[：:]\s*["""]([^"""]+)["""]',
            r'下文字[：:]\s*["""]([^"""]+)["""]',
            r'文字[配]?[：:]\s*["""]([^"""]+)["""]',
            r'caption[：:\s]+写?([^\n，。！？,]+)',  # 新增：匹配 "caption 写$XNY = $1"
            r'顶部[：:]\s*["""]([^"""]+)["""]',
            r'底部[：:]\s*["""]([^"""]+)["""]',
        ]

        # 上文字（包括 caption）
        for pattern in direct_patterns[:4]:  # 前4个模式用于上文字
            match = re.search(pattern, prompt, re.IGNORECASE)
            if match and not top_text:
                top_text = match.group(1)
                break

        # 下文字
        for pattern in direct_patterns[4:]:  # 后2个模式用于下文字
            match = re.search(pattern, prompt)
            if match and not bottom_text:
                bottom_text = match.group(1)
                break

        # 2. 匹配自然语言描述：文字跟...有关 / 文字包含...
        if not top_text:
            # 匹配 "文字跟 X、Y、Z 有关" 或 "文字包含 X、Y、Z"
            nl_patterns = [
                r'文字跟\s*([^，。！？,]+?)\s*有关',
                r'文字包含\s*([^，。！？,]+)',
                r'写.*?([0-9]+.*?[A-Za-z\u4e00-\u9fff]+)',  # 匹配 "2026 Happy New Year" 这种
            ]

            for pattern in nl_patterns:
                match = re.search(pattern, prompt)
                if match:
                    # 提取关键词并组合
                    keywords_str = match.group(1)
                    # 分割、、和、
                    keywords = re.split(r'[、,，]+', keywords_str)
                    # 过滤空字符串并清理
                    keywords = [k.strip() for k in keywords if k.strip()]

                    if keywords:
                        # 智能分行：保持短语完整性
                        # 策略：按原始关键词（用、分隔的）来分组，而不是按单词
                        # 例如 "2026、Happy New Year、keep building"
                        # → keywords = ["2026", "Happy New Year", "keep building"]
                        # → top: "2026 HAPPY NEW YEAR"  bottom: "KEEP BUILDING"

                        if len(keywords) == 1:
                            # 只有一个关键词，全部放上面
                            top_text = keywords[0].upper()
                        elif len(keywords) == 2:
                            # 两个关键词，各占一行
                            top_text = keywords[0].upper()
                            bottom_text = keywords[1].upper()
                        elif len(keywords) >= 3:
                            # 三个或以上，前面几个合并到上行，最后的放下行
                            # 例如 ["2026", "Happy New Year", "keep building"]
                            # → top: "2026 HAPPY NEW YEAR", bottom: "KEEP BUILDING"
                            top_text = ' '.join(keywords[:-1]).upper()
                            bottom_text = keywords[-1].upper()
                        break

        return top_text, bottom_text

    def _parse_caps_option(self, prompt_lower: str) -> bool:
        """解析大小写选项"""
        # 如果提到保持小写、不要大写等，返回 False
        if any(keyword in prompt_lower for keyword in ["小写", "不要大写", "保持原样", "lowercase"]):
            return False
        return True

    def _parse_visual_styles(self, prompt_lower: str) -> List[str]:
        """
        解析视觉风格/效果

        Args:
            prompt_lower: 小写的 prompt

        Returns:
            检测到的视觉风格列表
        """
        detected_styles = []

        for style, keywords in self.VISUAL_STYLE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in prompt_lower and style not in detected_styles:
                    detected_styles.append(style)
                    break  # 找到一个就跳过

        return detected_styles

    def _parse_custom_background(self, prompt_lower: str) -> Optional[str]:
        """
        解析自定义背景类型

        Args:
            prompt_lower: 小写的 prompt

        Returns:
            背景类型（如 "mcdonald"）或 None
        """
        for bg_type, keywords in self.BACKGROUND_KEYWORDS.items():
            for keyword in keywords:
                if keyword in prompt_lower:
                    return bg_type
        return None

    def get_style_guide(self) -> str:
        """获取风格指南"""
        return """
🎨 **Milady Meme 生成指南 - 自然语言版**

## 📝 基础格式

你可以用自然语言描述你想要的梗图，系统会自动解析！

**示例格式**：
```
帮我生成一张 [主题] 的梗图，NFT 用 #[编号]，加上 [装饰]，风格用 [字体风格]
```

---

## 🎯 主题选择

| 主题 | 关键词 | 效果 |
|------|--------|------|
| **GM** | gm, 早安, good morning, 建设者 | "GM BUILDERS / LFG" |
| **Crypto** | crypto, 加密, 币圈, moon, 钻石手 | "WEN MOON / SOON™" |
| **Milady** | milady, 米拉迪, remilia | "MILADY SZNN / ALWAYS" |
| **励志** | 励志, 鸡汤, motivational, 打气 | "KEEP BUILDING" |

**示例**：
- "生成一个 GM 主题的"
- "来个币圈梗图"
- "整个 milady 的"

---

## 🖼️ NFT 选择

**关键词**: `#数字`, `NFT 编号`, `ID`

**范围**: 0-9999（接近 10,000 个）

**示例**：
- "NFT 用 #1234"
- "编号 5678"
- "用 NFT #100"

如果不指定，系统会随机选择一个！

---

## 🎨 图层装饰

### 帽子类
| 中文名 | 关键词 | 效果 |
|--------|--------|------|
| 贝雷帽 | 贝雷帽, 帽子 | 艺术家风格 |
| 牛仔帽 | 牛仔帽, 棕色牛仔帽 | 西部风格 |
| 棒球帽 | 蓝色帽子, 棒球帽 | 街头风格 |
| 粉色帽子 | 粉色帽子 | 可爱风格 |

### 眼镜类
| 中文名 | 关键词 | 效果 |
|--------|--------|------|
| 墨镜 | 墨镜, 太阳镜 | 酷炫风格 |
| 爱心眼镜 | 爱心眼镜 | 可爱风格 |
| 3D眼镜 | 3D眼镜 | 复古风格 |

### 特效类
| 中文名 | 关键词 | 效果 |
|--------|--------|------|
| 爱心特效 | 爱心, 特效 | 浪漫氛围 |
| 星星特效 | 星星 | 闪耀效果 |
| 生日帽 | 生日帽 | 庆祝氛围 |

**示例**：
- "加个贝雷帽"
- "戴上墨镜"
- "加个爱心特效"
- "来点星星"

---

## ✨ 字体风格

| 风格 | 关键词 | 效果 | 适用场景 |
|------|--------|------|----------|
| **Impact** | 经典, 粗体, 传统 | 经典 Meme 粗体 | 通用，默认 |
| **Glow** | 发光, 赛博, cyberpunk, 霓虹 | 赛博朋克发光 | 科技感 |
| **Angelic** | 优雅, 天使, elegant | 优雅天使字体 | 高雅感 |
| **Chinese** | 中文, 汉字 | 中文粗体 | 中文内容（自动） |

**示例**：
- "风格用发光的"
- "用赛博朋克风格"
- "优雅一点"

---

## 📋 完整示例

### 示例 1：简单使用
```
帮我生成一张 GM 的梗图
```
**解析结果**：
- 主题：GM
- NFT：随机
- 图层：无
- 字体：Impact（默认）

---

### 示例 2：指定 NFT
```
来个 crypto 主题的，NFT 用 #1234
```
**解析结果**：
- 主题：Crypto
- NFT：#1234
- 图层：无
- 字体：Impact

---

### 示例 3：添加装饰
```
生成一个 GM 的，加个贝雷帽和墨镜
```
**解析结果**：
- 主题：GM
- NFT：随机
- 图层：贝雷帽 + 墨镜
- 字体：Impact

---

### 示例 4：选择字体
```
整个 milady 的，风格用发光的那种
```
**解析结果**：
- 主题：Milady
- NFT：随机
- 图层：无
- 字体：Glow（赛博朋克发光）

---

### 示例 5：完整配置
```
帮我生成一张 crypto 主题的梗图，NFT 用 #5678，戴上墨镜，加个爱心特效，风格用发光的
```
**解析结果**：
- 主题：Crypto
- NFT：#5678
- 图层：墨镜 + 爱心特效
- 字体：Glow

---

### 示例 6：自定义文字
```
生成一个梗图，上文字："早安建设者"，下文字："冲冲冲"
```
**解析结果**：
- 主题：无（使用自定义文字）
- 文字：早安建设者 / 冲冲冲
- 字体：Chinese（自动检测中文）

---

### 示例 7：中文完整版
```
来张早安主题的，编号 2000，加个粉色帽子和爱心特效，保持小写
```
**解析结果**：
- 主题：GM（早安）
- NFT：#2000
- 图层：粉色帽子 + 爱心特效
- 大小写：保持原样

---

## 🎨 风格组合建议

### 🌟 经典 GM 风格
```
GM 主题 + 贝雷帽 + Impact 字体
```
"生成一个 GM 的，加个贝雷帽"

### 💎 酷炫 Crypto 风格
```
Crypto 主题 + 墨镜 + Glow 字体
```
"来个币圈梗图，戴上墨镜，用发光风格"

### 💖 可爱 Milady 风格
```
Milady 主题 + 粉色帽子 + 爱心特效
```
"整个 milady 的，加个粉色帽子和爱心"

### 🚀 励志打气风格
```
励志主题 + 星星特效 + Angelic 字体
```
"来个励志的，加点星星，优雅一点"

---

## 💡 使用技巧

1. **关键词可以混用**：
   - "来个 GM 主题的" = "生成一个早安的" = "整个 good morning 的"

2. **可以省略不需要的部分**：
   - 不指定 NFT → 随机选择
   - 不指定图层 → 纯文字
   - 不指定字体 → 使用 Impact

3. **中文会自动识别**：
   - 只要文字里有中文，自动用中文字体

4. **随机生成**：
   - "随机来一张"
   - "给我整一个"

---

## ❓ 常见问题

**Q: 如何查看所有可用的图层？**
A: 输入 "有哪些图层" 或查看文档

**Q: 可以同时加多个装饰吗？**
A: 可以！"加个帽子和墨镜和爱心"

**Q: NFT 编号范围是？**
A: 0-9999，目前有 9,955+ 可用

**Q: 字体可以混用吗？**
A: 每次只能选一种字体风格

---

**开始使用**：直接用自然语言描述你想要的梗图，系统会自动解析！

例如：
```
帮我整一张 GM 的，用 NFT #1234，加个贝雷帽，风格用发光的
```

系统会自动理解并生成！🚀
"""


# 便捷函数
def parse_prompt(prompt: str, debug: bool = False) -> Dict:
    """
    解析自然语言 prompt

    Args:
        prompt: 用户输入
        debug: 是否打印调试信息

    Returns:
        解析后的参数
    """
    parser = PromptParser()
    parser.debug = debug
    return parser.parse(prompt)


if __name__ == "__main__":
    # 测试解析器
    parser = PromptParser()
    parser.debug = True

    test_prompts = [
        "帮我生成一张 GM 的梗图",
        "来个 crypto 主题的，NFT 用 #1234",
        "生成一个 GM 的，加个贝雷帽和墨镜",
        "整个 milady 的，风格用发光的那种",
        "帮我生成一张 crypto 主题的梗图，NFT 用 #5678，戴上墨镜，加个爱心特效，风格用发光的",
        "来张早安主题的，编号 2000，加个粉色帽子和爱心特效",
        "随机来一张，加点星星",
    ]

    print("🧪 测试自然语言解析器\n")

    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n{'='*70}")
        print(f"测试 {i}: {prompt}")
        print('='*70)
        result = parser.parse(prompt)
        print(f"✅ 解析结果:")
        for key, value in result.items():
            if value:
                print(f"   {key}: {value}")
        print()

    # 打印风格指南
    print("\n" + "="*70)
    print("📖 风格指南")
    print("="*70)
    print(parser.get_style_guide())
