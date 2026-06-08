#!/usr/bin/env python3
"""
McDonald 背景生成器
用于生成带有 McDonald Logo 的背景图片
"""

from PIL import Image
from typing import Tuple
from pathlib import Path


def create_mcdonald_background(size: Tuple[int, int] = (1000, 1250)) -> Image.Image:
    """
    创建 McDonald Logo 平铺背景

    Args:
        size: 背景尺寸 (width, height)

    Returns:
        PIL Image (RGBA 格式)
    """
    # 尝试加载真实的 McDonald Logo
    logo_path = (
        Path(__file__).parent.parent.parent
        / "assets"
        / "backgrounds"
        / "mcdonalds_logo.png"
    )

    if logo_path.exists():
        # 使用真实 Logo
        logo = Image.open(logo_path)

        # 创建白色背景
        background = Image.new("RGBA", size, (255, 255, 255, 255))

        # 平铺 Logo（2x3 = 6 个 logo）
        tile_width = size[0] // 2
        tile_height = size[1] // 3
        logo_resized = logo.resize((tile_width, tile_height), Image.Resampling.LANCZOS)

        for row in range(3):
            for col in range(2):
                x = col * tile_width
                y = row * tile_height
                background.paste(
                    logo_resized,
                    (x, y),
                    logo_resized if logo_resized.mode == "RGBA" else None,
                )

        return background

    else:
        # 回退方案：创建简单的红色 + 黄色 "M" 背景
        from PIL import ImageDraw, ImageFont

        # McDonald 红色背景
        bg = Image.new("RGB", size, color=(218, 2, 14))
        draw = ImageDraw.Draw(bg)

        # McDonald 黄色
        yellow = (255, 199, 44)

        # 平铺 "M" 字母
        m_width = size[0] // 3
        m_height = size[1] // 3

        for x in range(0, size[0] + m_width, m_width):
            for y in range(0, size[1] + m_height, m_height):
                try:
                    font_size = min(m_width, m_height) // 2
                    try:
                        font = ImageFont.truetype(
                            "/System/Library/Fonts/Helvetica.ttc", font_size
                        )
                    except:
                        try:
                            font = ImageFont.truetype(
                                "/System/Library/Fonts/Arial.ttf", font_size
                            )
                        except:
                            font = ImageFont.load_default()

                    text_x = x + m_width // 2
                    text_y = y + m_height // 2

                    draw.text(
                        (text_x, text_y), "M", fill=yellow, font=font, anchor="mm"
                    )
                except:
                    pass

        return bg.convert("RGBA")
