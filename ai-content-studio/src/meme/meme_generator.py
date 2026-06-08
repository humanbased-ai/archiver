#!/usr/bin/env python3
"""
Meme Generator - 统一的梗图生成接口
整合 MiladyMaker 和 CaptionMeme，提供一站式梗图生成服务
"""

from PIL import Image
from pathlib import Path
from typing import Dict, Optional
import random

from .milady_maker import MiladyMaker
from .caption_meme import CaptionMeme


class MemeGenerator:
    """统一的梗图生成器"""

    # 预设的梗图文字模板
    MEME_TEMPLATES = {
        "gm": [
            ("GM BUILDERS", "LFG"),
            ("GM FRENS", "WAGMI"),
            ("GOOD MORNING", "TIME TO BUILD"),
            ("GM", "LETS FUCKING GO"),
            ("RISE AND GRIND", "GM"),
        ],
        "crypto": [
            ("WEN MOON", "SOON™"),
            ("DIAMOND HANDS", "NEVER SELLING"),
            ("NGMI", "HFSP"),
            ("BULLISH AF", "TO THE MOON"),
            ("DYOR", "NFA"),
        ],
        "milady": [
            ("MILADY SZNN", "ALWAYS"),
            ("NOBODY TAKES MEMES", "AS SERIOUSLY AS US"),
            ("NETWORK SPIRITUALITY", "DIGITAL FOLKLORE"),
            ("REMILIA COLLECTIVE", "CULT OF BEAUTY"),
        ],
        "motivational": [
            ("KEEP BUILDING", "NGMI OTHERWISE"),
            ("STAY FOCUSED", "IGNORE FUD"),
            ("ONE MORE REP", "THEN WE MOON"),
        ],
    }

    def __init__(
        self,
        assets_path: str = "assets/milady_layers",
        font_path: Optional[str] = None
    ):
        """
        初始化梗图生成器

        Args:
            assets_path: Milady 图层素材路径
            font_path: 自定义字体路径
        """
        self.milady_maker = MiladyMaker(assets_path)
        self.caption_meme = CaptionMeme(font_path)

        print("=" * 70)
        print("🎨 Meme Generator 已就绪！")
        print("=" * 70)

    def generate_milady_meme(
        self,
        top_text: str = "",
        bottom_text: str = "",
        attributes: Optional[Dict[str, str]] = None,
        output_path: str = "output/milady_meme.png",
        milady_size: tuple = (1000, 1000)
    ) -> str:
        """
        生成 Milady 梗图（图 + 文字）

        Args:
            top_text: 顶部文字
            bottom_text: 底部文字
            attributes: Milady 属性（如果为 None 则随机生成）
            output_path: 输出路径
            milady_size: Milady 图片大小

        Returns:
            输出文件路径
        """
        print(f"\n🎨 生成 Milady 梗图...")

        # 1. 生成 Milady 图像
        milady_img = self.milady_maker.create_milady(attributes, milady_size)

        # 2. 添加文字
        meme_img = self.caption_meme.add_caption(milady_img, top_text, bottom_text)

        # 3. 保存
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        meme_img.save(output_file, 'PNG')

        print(f"✅ Milady 梗图已保存: {output_file}")
        return str(output_file)

    def generate_random_meme(
        self,
        category: str = "gm",
        output_path: str = "output/random_meme.png"
    ) -> str:
        """
        生成随机梗图（随机 Milady + 预设文字）

        Args:
            category: 文字类别 (gm, crypto, milady, motivational)
            output_path: 输出路径

        Returns:
            输出文件路径
        """
        # 随机选择文字模板
        templates = self.MEME_TEMPLATES.get(category, self.MEME_TEMPLATES["gm"])
        top_text, bottom_text = random.choice(templates)

        # 生成随机 Milady
        attributes = self.milady_maker.generate_random_attributes()

        return self.generate_milady_meme(
            top_text=top_text,
            bottom_text=bottom_text,
            attributes=attributes,
            output_path=output_path
        )

    def add_caption_to_image(
        self,
        image_path: str,
        top_text: str = "",
        bottom_text: str = "",
        output_path: str = "output/caption_meme.png"
    ) -> str:
        """
        给现有图片添加文字（不生成 Milady）

        Args:
            image_path: 输入图片路径
            top_text: 顶部文字
            bottom_text: 底部文字
            output_path: 输出路径

        Returns:
            输出文件路径
        """
        return self.caption_meme.create_meme(
            image_path, top_text, bottom_text, output_path
        )

    def get_available_milady_layers(self) -> Dict[str, int]:
        """
        获取可用的 Milady 图层统计

        Returns:
            {layer_name: option_count}
        """
        return self.milady_maker.get_layer_info()

    def print_status(self):
        """打印当前状态"""
        print("\n" + "=" * 70)
        print("📊 Meme Generator 状态")
        print("=" * 70)

        layer_info = self.get_available_milady_layers()
        total_layers = sum(layer_info.values())

        print(f"\n✅ Milady 图层: {len(layer_info)} 类，共 {total_layers} 个选项")
        for layer, count in layer_info.items():
            required = "✅" if layer in self.milady_maker.REQUIRED_LAYERS else "⚪"
            print(f"   {required} {layer}: {count} 个")

        print(f"\n✅ 文字模板: {len(self.MEME_TEMPLATES)} 类")
        for category, templates in self.MEME_TEMPLATES.items():
            print(f"   - {category}: {len(templates)} 个")

        print("\n" + "=" * 70)


# 便捷函数
def generate_random_milady_meme(output_path: str = "output/random_milady_meme.png") -> str:
    """
    快速生成一个随机 Milady 梗图

    Args:
        output_path: 输出路径

    Returns:
        输出文件路径
    """
    generator = MemeGenerator()
    return generator.generate_random_meme(output_path=output_path)


if __name__ == "__main__":
    # 测试
    generator = MemeGenerator()
    generator.print_status()

    # 生成随机梗图
    print("\n🎨 生成随机梗图...")
    output = generator.generate_random_meme(
        category="gm",
        output_path="output/test_random_meme.png"
    )
    print(f"✅ 完成: {output}")
