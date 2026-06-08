# 🎨 Milady Meme Generator

**自动生成 Milady 风格梗图的完整工具**

---

## ✅ 已完成功能

### 1. **MiladyMaker（图层合成引擎）**
- ✅ 加载并合成 Milady 图层
- ✅ 支持 10+ 种图层类别（皮肤、眼睛、头发、衣服等）
- ✅ 随机生成 Milady
- ✅ 自定义属性组合

### 2. **CaptionMeme（文字梗图生成器）**
- ✅ 在图片上添加上下文字
- ✅ 使用 Impact 字体（经典 meme 字体）
- ✅ 自动描边效果
- ✅ 自适应字体大小

### 3. **MemeGenerator（统一接口）**
- ✅ 一键生成 Milady 梗图
- ✅ 预设文字模板（GM、Crypto、Milady、Motivational）
- ✅ 批量生成
- ✅ 自定义文字和属性

---

## 🚀 快速开始

### 安装依赖

```bash
pip3 install Pillow
```

### 基础用法

#### 1. 生成随机 Milady 梗图

```python
from src.meme import MemeGenerator

# 初始化生成器
generator = MemeGenerator()

# 生成随机 GM 梗图
output = generator.generate_random_meme(
    category="gm",
    output_path="output/my_meme.png"
)

print(f"✅ 梗图已保存: {output}")
```

#### 2. 生成自定义 Milady 梗图

```python
from src.meme import MemeGenerator

generator = MemeGenerator()

# 自定义属性
attributes = {
    "Skin": "Pale",
    "Eyes": "Heart",
    "Mouth": "Cat",
    "Hair": "Short Pink",
    "Background": "XP",
}

# 生成梗图
output = generator.generate_milady_meme(
    top_text="NETWORK SPIRITUALITY",
    bottom_text="DIGITAL FOLKLORE",
    attributes=attributes,
    output_path="output/custom_meme.png"
)
```

#### 3. 只生成 Milady（不加文字）

```python
from src.meme import MiladyMaker

maker = MiladyMaker()

# 随机 Milady
maker.save_milady(output_path="output/milady.png")

# 或自定义
attributes = {"Skin": "Pink", "Eyes": "Sparkle", ...}
maker.save_milady(attributes=attributes, output_path="output/custom_milady.png")
```

#### 4. 给现有图片添加文字

```python
from src.meme import CaptionMeme

caption = CaptionMeme()

caption.create_meme(
    image_path="my_image.png",
    top_text="TOP TEXT",
    bottom_text="BOTTOM TEXT",
    output_path="output/captioned.png"
)
```

---

## 📊 可用的图层

### 必需图层（必须有）
- ✅ **Skin**: 6 个选项（Pale, Tan, Pink, Black, Clay, Alien）
- ✅ **Eyes**: 5 个选项（Classic, Closed, Heart, Smug, Sparkle）
- ✅ **Mouth**: 5 个选项（Smile A, Smile B, Cat, Pout, Flat）
- ✅ **Hair**: 5 个选项（OG Blonde, OG Black, Short Pink 等）
- ✅ **Brows**: 3 个选项（Flat, Complacent A, Concerned A）

### 可选图层
- ⚪ **Background**: 16 个选项（Clouds, XP, Streets 等）
- ⚪ **Face**: 2 个选项（Blush, Big Blush）
- ⚪ **Eye Color**: 4 个选项（Blue, Brown, Green, Grey）
- ⚪ **Shirt**: 3 个选项（Blank Tank, Maid, Pink Coat）
- ⚪ **Hat**: 2 个选项（Beret, Pink Bow）

**注意**：后台正在下载完整的 400+ 个图层文件，完成后会有更多选项！

---

## 🎭 预设文字模板

### GM 类（gm）
- "GM BUILDERS" / "LFG"
- "GM FRENS" / "WAGMI"
- "GOOD MORNING" / "TIME TO BUILD"
- "GM" / "LETS FUCKING GO"
- "RISE AND GRIND" / "GM"

### Crypto 类（crypto）
- "WEN MOON" / "SOON™"
- "DIAMOND HANDS" / "NEVER SELLING"
- "NGMI" / "HFSP"
- "BULLISH AF" / "TO THE MOON"
- "DYOR" / "NFA"

### Milady 类（milady）
- "MILADY SZNN" / "ALWAYS"
- "NOBODY TAKES MEMES" / "AS SERIOUSLY AS US"
- "NETWORK SPIRITUALITY" / "DIGITAL FOLKLORE"
- "REMILIA COLLECTIVE" / "CULT OF BEAUTY"

### Motivational 类（motivational）
- "KEEP BUILDING" / "NGMI OTHERWISE"
- "STAY FOCUSED" / "IGNORE FUD"
- "ONE MORE REP" / "THEN WE MOON"

---

## 🛠️ 命令行工具

### 测试所有功能

```bash
python3 test_meme_generator.py
```

**会生成：**
- ✅ 随机 Milady
- ✅ 自定义 Milady
- ✅ 文字梗图
- ✅ 完整梗图（Milady + 文字）
- ✅ 批量生成 10 个梗图

### 查看生成的图片

```bash
ls -lh output/
ls -lh output/batch/
```

---

## 📁 项目结构

```
ai-content-studio/
├── src/meme/
│   ├── __init__.py              # 模块入口
│   ├── milady_maker.py          # 图层合成引擎
│   ├── caption_meme.py          # 文字梗图生成器
│   └── meme_generator.py        # 统一接口
│
├── assets/milady_layers/        # 图层素材
│   ├── Background/
│   ├── Skin/
│   ├── Eyes/
│   ├── Hair/
│   └── ...
│
├── output/                      # 生成的图片
│   └── batch/                   # 批量生成
│
├── test_meme_generator.py       # 测试脚本
└── scripts/
    ├── download_milady_layers.py     # 下载完整图层
    └── download_core_layers.py       # 下载核心图层
```

---

## 🎯 使用场景

### 1. **为 Twitter Bot 生成每日梗图**

```python
generator = MemeGenerator()

# 每天生成一个随机 GM 梗图
daily_meme = generator.generate_random_meme(
    category="gm",
    output_path=f"output/daily/gm_{datetime.now().strftime('%Y%m%d')}.png"
)
```

### 2. **批量生成梗图库**

```python
generator = MemeGenerator()

for i in range(100):
    category = random.choice(["gm", "crypto", "milady", "motivational"])
    generator.generate_random_meme(
        category=category,
        output_path=f"output/library/meme_{i:03d}.png"
    )
```

### 3. **集成到 AI Content Studio**

```python
from src.meme import MemeGenerator

class AIContentStudio:
    def __init__(self):
        self.meme_generator = MemeGenerator()

    def post_daily_meme(self):
        # 生成梗图
        meme_path = self.meme_generator.generate_random_meme()

        # 上传到 Twitter
        self.twitter_client.upload_media(meme_path)
```

---

## 🚀 高级功能（待实现）

### ⏳ Text-to-Image（需要 AI API）
使用 Stable Diffusion 或 DALL-E 生成完全新的 Milady

### ⏳ Effect（图像滤镜）
应用赛博朋克、像素风等效果

### ⏳ Mirage（风格转换）
将 Milady 转换为幻觉艺术风格

### ⏳ Prompt Enhancer
自动优化生成提示词

---

## 📝 API 参考

### MemeGenerator

```python
class MemeGenerator:
    def generate_milady_meme(
        top_text: str,
        bottom_text: str,
        attributes: Optional[Dict[str, str]] = None,
        output_path: str = "output/milady_meme.png"
    ) -> str
        """生成 Milady 梗图"""

    def generate_random_meme(
        category: str = "gm",
        output_path: str = "output/random_meme.png"
    ) -> str
        """生成随机梗图"""

    def add_caption_to_image(
        image_path: str,
        top_text: str,
        bottom_text: str,
        output_path: str
    ) -> str
        """给现有图片添加文字"""
```

### MiladyMaker

```python
class MiladyMaker:
    def create_milady(
        attributes: Optional[Dict[str, str]] = None,
        output_size: tuple = (1000, 1000)
    ) -> Image.Image
        """创建 Milady 图像"""

    def save_milady(
        attributes: Optional[Dict[str, str]] = None,
        output_path: str = "output/milady.png"
    ) -> str
        """生成并保存 Milady"""

    def generate_random_attributes() -> Dict[str, str]
        """生成随机属性组合"""
```

### CaptionMeme

```python
class CaptionMeme:
    def add_caption(
        image: Image.Image,
        top_text: str = "",
        bottom_text: str = "",
        text_color: str = "white",
        all_caps: bool = True
    ) -> Image.Image
        """在图片上添加文字"""

    def create_meme(
        image_path: str,
        top_text: str,
        bottom_text: str,
        output_path: str
    ) -> str
        """从文件创建梗图"""
```

---

## ✅ 当前状态

- ✅ **核心功能完成** - 图层合成、文字添加、梗图生成全部可用
- ✅ **测试通过** - 生成了 17 个测试梗图，全部成功
- ✅ **核心图层已下载** - 51 个图层文件（119 MB）
- 🔄 **完整图层下载中** - 后台正在下载全部 400+ 个图层

**Milady Meme Generator 已经可以使用了！** 🎉

---

## 💡 下一步

1. **等待完整图层下载完成**（后台运行中）
2. **集成到 AI Content Studio 的 Twitter 发布流程**
3. **添加 Text-to-Image AI 功能**（需要 Replicate/Stability AI API）
4. **创建 Web 界面**（可选）

---

## 📞 帮助

**查看可用图层：**
```python
from src.meme import MiladyMaker
maker = MiladyMaker()
maker.print_available_layers()
```

**查看系统状态：**
```python
from src.meme import MemeGenerator
generator = MemeGenerator()
generator.print_status()
```

**运行测试：**
```bash
python3 test_meme_generator.py
```

---

**Milady Meme Generator - 让梗图创作变得简单！** 🎨✨
