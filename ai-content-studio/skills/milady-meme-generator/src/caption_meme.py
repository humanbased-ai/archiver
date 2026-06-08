#!/usr/bin/env python3
"""
Caption Meme Generator - 文字梗图生成器
在图片上添加经典的 meme 文字（上下文字格式）
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import Optional, Tuple


class CaptionMeme:
    """文字梗图生成器"""

    # 字体配置（支持多种字体风格）
    FONTS = {
        "impact": {
            "name": "Impact",
            "paths": [
                "/System/Library/Fonts/Supplemental/Impact.ttf",  # macOS
                "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",  # Linux
                "C:\\Windows\\Fonts\\impact.ttf",  # Windows
                "assets/fonts/Impact.ttf",
            ],
            "description": "经典 Meme 字体（粗体、有力）",
        },
        "angelic": {
            "name": "Angelic",
            "paths": [
                "/Library/Fonts/Angelic War.ttf",  # macOS
                "/System/Library/Fonts/Supplemental/Palatino.ttc",  # macOS 替代
                "C:\\Windows\\Fonts\\pala.ttf",  # Windows - Palatino
                "assets/fonts/AngelicWar.ttf",
            ],
            "description": "优雅天使字体",
        },
        "chinese": {
            "name": "Chinese",
            "paths": [
                "/System/Library/Fonts/PingFang.ttc",  # macOS - 苹方
                "/System/Library/Fonts/STHeiti Medium.ttc",  # macOS - 黑体
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",  # Linux
                "C:\\Windows\\Fonts\\msyhbd.ttc",  # Windows - 微软雅黑 Bold
                "C:\\Windows\\Fonts\\simhei.ttf",  # Windows - 黑体
                "assets/fonts/SourceHanSansCN-Bold.otf",
            ],
            "description": "中文粗体字体",
        },
        "glow": {
            "name": "Glow",
            "paths": [
                "/System/Library/Fonts/Supplemental/Arial.ttf",  # macOS - Arial (发光效果通过描边实现)
                "C:\\Windows\\Fonts\\arial.ttf",  # Windows
                "assets/fonts/Arial.ttf",
            ],
            "description": "发光效果字体",
            "glow": True,  # 特殊标记：需要发光效果
        },
    }

    # 默认字体路径（向后兼容）
    DEFAULT_FONTS = FONTS["impact"]["paths"]
    CHINESE_FONTS = FONTS["chinese"]["paths"]

    def __init__(
        self, font_path: Optional[str] = None, chinese_font_path: Optional[str] = None
    ):
        """
        初始化文字梗图生成器

        Args:
            font_path: 自定义英文字体文件路径，如果为 None 则使用默认字体
            chinese_font_path: 自定义中文字体文件路径，如果为 None 则使用默认字体
        """
        # 加载所有字体
        self.loaded_fonts = {}
        for font_name, font_config in self.FONTS.items():
            font_file = self._find_font(None, font_config["paths"])
            if font_file:
                self.loaded_fonts[font_name] = {
                    "path": font_file,
                    "config": font_config,
                }

        # 向后兼容
        self.font_path = self._find_font(font_path, self.DEFAULT_FONTS)
        self.chinese_font_path = self._find_font(chinese_font_path, self.CHINESE_FONTS)

        print(f"✅ CaptionMeme 已初始化")
        print(f"🔤 可用字体: {', '.join(self.loaded_fonts.keys())}")
        print(f"🔤 默认英文: {self.font_path}")
        print(f"🔤 默认中文: {self.chinese_font_path}")

    def _find_font(
        self, custom_font: Optional[str] = None, font_list: list = None
    ) -> Optional[Path]:
        """查找可用的字体文件"""
        # 如果提供了自定义字体，优先使用
        if custom_font:
            font_file = Path(custom_font)
            if font_file.exists():
                return font_file

        # 尝试默认字体路径
        if font_list is None:
            font_list = self.DEFAULT_FONTS

        for font_path in font_list:
            font_file = Path(font_path)
            if font_file.exists():
                return font_file

        return None

    def _has_chinese(self, text: str) -> bool:
        """检测文本是否包含中文字符"""
        for char in text:
            if "\u4e00" <= char <= "\u9fff":
                return True
        return False

    def _calculate_font_size(
        self, text: str, image_width: int, max_width_ratio: float = 0.9
    ) -> int:
        """
        根据图片宽度和文字长度计算合适的字体大小

        Args:
            text: 文字内容
            image_width: 图片宽度
            max_width_ratio: 文字最大占图片宽度的比例

        Returns:
            字体大小（像素）
        """
        # 基础字体大小
        base_size = int(image_width / 10)

        # 根据文字长度调整
        if len(text) > 20:
            base_size = int(base_size * 0.8)
        elif len(text) > 30:
            base_size = int(base_size * 0.6)

        return max(30, base_size)  # 最小 30px

    def _draw_text_with_outline(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        position: Tuple[int, int],
        font: ImageFont.FreeTypeFont,
        text_color: str = "white",
        outline_color: str = "black",
        outline_width: int = 3,
    ):
        """
        绘制带描边的文字

        Args:
            draw: ImageDraw 对象
            text: 文字内容
            position: 文字位置 (x, y)
            font: 字体对象
            text_color: 文字颜色
            outline_color: 描边颜色
            outline_width: 描边宽度
        """
        x, y = position

        # 绘制描边（在多个方向绘制黑色文字）
        for offset_x in range(-outline_width, outline_width + 1):
            for offset_y in range(-outline_width, outline_width + 1):
                if offset_x != 0 or offset_y != 0:
                    draw.text(
                        (x + offset_x, y + offset_y),
                        text,
                        font=font,
                        fill=outline_color,
                    )

        # 绘制主文字
        draw.text(position, text, font=font, fill=text_color)

    def _draw_text_with_glow(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        position: Tuple[int, int],
        font: ImageFont.FreeTypeFont,
        text_color: str = "white",
        glow_color: str = "#00FFFF",  # 青色发光
        glow_width: int = 8,
    ):
        """
        绘制带发光效果的文字

        Args:
            draw: ImageDraw 对象
            text: 文字内容
            position: 文字位置 (x, y)
            font: 字体对象
            text_color: 文字颜色
            glow_color: 发光颜色
            glow_width: 发光宽度
        """
        x, y = position

        # Convert glow_color hex to RGB tuple
        glow_rgb = tuple(int(glow_color.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))

        # 1. 先绘制深色阴影（提供对比度）
        shadow_color = (0, 0, 0, 200)  # 半透明黑色
        for offset_x in range(-3, 4):
            for offset_y in range(-3, 4):
                if offset_x != 0 or offset_y != 0:
                    draw.text(
                        (x + offset_x, y + offset_y), text, font=font, fill=shadow_color
                    )

        # 2. 绘制发光效果（多层渐变）
        for i in range(glow_width, 0, -1):
            # 计算透明度（越外层越透明）
            alpha = int(255 * (1 - i / glow_width))  # 完全不透明到透明的渐变
            glow_with_alpha = glow_rgb + (alpha,)  # RGBA tuple

            for offset_x in range(-i, i + 1):
                for offset_y in range(-i, i + 1):
                    if offset_x != 0 or offset_y != 0:
                        draw.text(
                            (x + offset_x, y + offset_y),
                            text,
                            font=font,
                            fill=glow_with_alpha,
                        )

        # 3. 绘制主文字 - 使用发光颜色（完全不透明）
        main_text_color = glow_rgb + (255,)  # 使用发光颜色作为主文字颜色
        draw.text(position, text, font=font, fill=main_text_color)

    def add_caption(
        self,
        image: Image.Image,
        top_text: str = "",
        bottom_text: str = "",
        text_color: str = "white",
        outline_color: str = "black",
        outline_width: int = 3,
        all_caps: bool = True,
        use_chinese: bool = False,
        font_style: str = "impact",
    ) -> Image.Image:
        """
        在图片上添加上下文字

        Args:
            image: PIL Image 对象
            top_text: 顶部文字
            bottom_text: 底部文字
            text_color: 文字颜色
            outline_color: 描边颜色
            outline_width: 描边宽度
            all_caps: 是否转换为大写
            use_chinese: 是否使用中文字体（自动检测）
            font_style: 字体风格 ("impact", "angelic", "chinese", "glow")

        Returns:
            添加文字后的图像
        """
        # 复制图像以避免修改原图
        img = image.copy()
        draw = ImageDraw.Draw(img)

        width, height = img.size

        # 自动检测是否需要中文字体
        has_chinese = self._has_chinese(top_text + bottom_text)
        if has_chinese:
            font_style = "chinese"
            use_chinese = True

        # 转换为大写（经典 meme 风格）- 仅英文
        if all_caps and not use_chinese:
            top_text = top_text.upper()
            bottom_text = bottom_text.upper()

        # 选择字体路径
        if font_style in self.loaded_fonts:
            selected_font_path = self.loaded_fonts[font_style]["path"]
            use_glow = self.loaded_fonts[font_style]["config"].get("glow", False)
        elif use_chinese:
            selected_font_path = self.chinese_font_path
            use_glow = False
        else:
            selected_font_path = self.font_path
            use_glow = False

        # 处理顶部文字
        if top_text:
            font_size = self._calculate_font_size(top_text, width)
            try:
                if selected_font_path:
                    font = ImageFont.truetype(str(selected_font_path), font_size)
                else:
                    font = ImageFont.load_default()
            except Exception as e:
                font = ImageFont.load_default()

            # 计算文字位置（居中，顶部）
            bbox = draw.textbbox((0, 0), top_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            x = (width - text_width) // 2
            y = height // 20  # 距离顶部 5%

            # 根据字体风格选择绘制方法
            if use_glow:
                self._draw_text_with_glow(
                    draw, top_text, (x, y), font, text_color=text_color
                )
            else:
                self._draw_text_with_outline(
                    draw,
                    top_text,
                    (x, y),
                    font,
                    text_color,
                    outline_color,
                    outline_width,
                )

        # 处理底部文字
        if bottom_text:
            font_size = self._calculate_font_size(bottom_text, width)
            try:
                if selected_font_path:
                    font = ImageFont.truetype(str(selected_font_path), font_size)
                else:
                    font = ImageFont.load_default()
            except Exception:
                font = ImageFont.load_default()

            # 计算文字位置（居中，底部）
            bbox = draw.textbbox((0, 0), bottom_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            x = (width - text_width) // 2
            y = height - text_height - (height // 20)  # 距离底部 5%

            # 根据字体风格选择绘制方法
            if use_glow:
                self._draw_text_with_glow(
                    draw, bottom_text, (x, y), font, text_color=text_color
                )
            else:
                self._draw_text_with_outline(
                    draw,
                    bottom_text,
                    (x, y),
                    font,
                    text_color,
                    outline_color,
                    outline_width,
                )

        return img

    def create_meme(
        self,
        image_path: str,
        top_text: str = "",
        bottom_text: str = "",
        output_path: str = "output/meme.png",
        **kwargs,
    ) -> str:
        """
        从文件创建梗图

        Args:
            image_path: 输入图片路径
            top_text: 顶部文字
            bottom_text: 底部文字
            output_path: 输出路径
            **kwargs: 其他参数传递给 add_caption

        Returns:
            输出文件路径
        """
        # 加载图片
        img = Image.open(image_path).convert("RGB")

        # 添加文字
        meme = self.add_caption(img, top_text, bottom_text, **kwargs)

        # 保存
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        meme.save(output_file, "PNG")

        print(f"✅ 梗图已保存: {output_file}")
        return str(output_file)


# 便捷函数
def create_caption_meme(
    image_path: str,
    top_text: str = "",
    bottom_text: str = "",
    output_path: str = "output/caption_meme.png",
) -> str:
    """
    快速创建文字梗图

    Args:
        image_path: 输入图片路径
        top_text: 顶部文字
        bottom_text: 底部文字
        output_path: 输出路径

    Returns:
        输出文件路径
    """
    caption = CaptionMeme()
    return caption.create_meme(image_path, top_text, bottom_text, output_path)


if __name__ == "__main__":
    # 测试
    caption = CaptionMeme()

    # 示例：给 Milady 添加文字
    test_image = "output/test_milady.png"
    if Path(test_image).exists():
        output = caption.create_meme(
            test_image,
            top_text="GM BUILDERS",
            bottom_text="LFG",
            output_path="output/test_caption_meme.png",
        )
        print(f"✅ 测试完成: {output}")
    else:
        print(f"⚠️ 测试图片不存在: {test_image}")
