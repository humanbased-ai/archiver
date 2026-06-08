#!/usr/bin/env python3
"""
Milady Maker - 图层合成引擎
通过组合不同的图层属性生成自定义 Milady 图像
"""

from PIL import Image
from pathlib import Path
from typing import Dict, List, Optional
import random
import json


class MiladyMaker:
    """Milady 图层合成引擎"""

    # 图层 z-index 顺序（从下到上）
    LAYER_ORDER = [
        "Background",      # z=0
        "Skin",           # z=1
        "Face",           # z=2
        "Eyes",           # z=3
        "Eye Color",      # z=4
        "Mouth",          # z=4
        "Neck",           # z=5
        "Necklaces",      # z=5
        "Shirt",          # z=6
        "Hair",           # z=7
        "Brows",          # z=8
        "Earrings",       # z=9
        "Face Decoration", # z=10
        "Glasses",        # z=10
        "Hat",            # z=11
        "Overlay",        # z=13
    ]

    # 必需图层（必须有的属性）
    REQUIRED_LAYERS = ["Skin", "Eyes", "Mouth", "Hair", "Brows"]

    def __init__(self, assets_path: str = "assets/milady_layers"):
        """
        初始化 Milady Maker

        Args:
            assets_path: 图层素材文件夹路径
        """
        self.assets_path = Path(assets_path)
        self.available_layers = self._scan_available_layers()

        print(f"✅ MiladyMaker 已初始化")
        print(f"📁 素材路径: {self.assets_path}")
        print(f"📊 可用图层: {len(self.available_layers)} 类")

    def _scan_available_layers(self) -> Dict[str, List[str]]:
        """扫描可用的图层文件"""
        layers = {}

        for layer_name in self.LAYER_ORDER:
            layer_dir = self.assets_path / layer_name
            if layer_dir.exists() and layer_dir.is_dir():
                # 获取所有 PNG 文件
                png_files = [f.stem for f in layer_dir.glob("*.png")]
                if png_files:
                    layers[layer_name] = sorted(png_files)

        return layers

    def get_available_options(self, layer_name: str) -> List[str]:
        """
        获取特定图层的可用选项

        Args:
            layer_name: 图层名称

        Returns:
            该图层的所有可用选项列表
        """
        return self.available_layers.get(layer_name, [])

    def generate_random_attributes(self) -> Dict[str, str]:
        """
        生成随机的 Milady 属性组合

        Returns:
            属性字典 {layer_name: option_name}
        """
        attributes = {}

        for layer_name in self.LAYER_ORDER:
            options = self.get_available_options(layer_name)
            if not options:
                continue

            # 必需图层必须选择，可选图层随机决定是否添加
            if layer_name in self.REQUIRED_LAYERS:
                attributes[layer_name] = random.choice(options)
            else:
                # 50% 概率添加可选图层
                if random.random() > 0.5:
                    attributes[layer_name] = random.choice(options)

        return attributes

    def create_milady(
        self,
        attributes: Optional[Dict[str, str]] = None,
        output_size: tuple = (1000, 1000)
    ) -> Image.Image:
        """
        创建 Milady 图像

        Args:
            attributes: 属性字典 {layer_name: option_name}
                       如果为 None，则生成随机属性
            output_size: 输出图像大小 (width, height)

        Returns:
            合成后的 PIL Image 对象
        """
        # 如果没有提供属性，生成随机属性
        if attributes is None:
            attributes = self.generate_random_attributes()

        # 创建空白画布
        canvas = Image.new('RGBA', output_size, (0, 0, 0, 0))

        # 按 z-index 顺序合成图层
        for layer_name in self.LAYER_ORDER:
            if layer_name not in attributes:
                continue

            option_name = attributes[layer_name]
            layer_path = self.assets_path / layer_name / f"{option_name}.png"

            if not layer_path.exists():
                print(f"⚠️ 图层文件不存在: {layer_path}")
                continue

            try:
                # 加载图层
                layer_img = Image.open(layer_path).convert('RGBA')

                # 调整大小到目标尺寸
                if layer_img.size != output_size:
                    layer_img = layer_img.resize(output_size, Image.Resampling.LANCZOS)

                # 合成到画布
                canvas = Image.alpha_composite(canvas, layer_img)

            except Exception as e:
                print(f"❌ 加载图层失败 {layer_name}/{option_name}: {e}")

        return canvas

    def save_milady(
        self,
        attributes: Optional[Dict[str, str]] = None,
        output_path: str = "output/milady.png",
        output_size: tuple = (1000, 1000)
    ) -> str:
        """
        生成并保存 Milady 图像

        Args:
            attributes: 属性字典
            output_path: 输出文件路径
            output_size: 输出图像大小

        Returns:
            保存的文件路径
        """
        # 创建输出目录
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # 生成图像
        milady = self.create_milady(attributes, output_size)

        # 保存
        milady.save(output_file, 'PNG')

        print(f"✅ Milady 已保存: {output_file}")
        return str(output_file)

    def get_layer_info(self) -> Dict[str, int]:
        """
        获取图层信息统计

        Returns:
            {layer_name: option_count}
        """
        return {
            layer: len(options)
            for layer, options in self.available_layers.items()
        }

    def print_available_layers(self):
        """打印所有可用的图层选项"""
        print("\n" + "=" * 70)
        print("📊 可用的 Milady 图层")
        print("=" * 70)

        for layer_name in self.LAYER_ORDER:
            options = self.get_available_options(layer_name)
            if options:
                required = "✅ 必需" if layer_name in self.REQUIRED_LAYERS else "⚪ 可选"
                print(f"\n{required} {layer_name} ({len(options)} 个选项)")
                # 只显示前 5 个选项
                preview = options[:5]
                print(f"   {', '.join(preview)}")
                if len(options) > 5:
                    print(f"   ... 还有 {len(options) - 5} 个")


# 便捷函数
def create_random_milady(output_path: str = "output/random_milady.png") -> str:
    """
    快速生成一个随机 Milady

    Args:
        output_path: 输出路径

    Returns:
        保存的文件路径
    """
    maker = MiladyMaker()
    return maker.save_milady(output_path=output_path)


if __name__ == "__main__":
    # 测试
    maker = MiladyMaker()
    maker.print_available_layers()

    # 生成随机 Milady
    print("\n🎨 生成随机 Milady...")
    output = create_random_milady("output/test_milady.png")
    print(f"✅ 完成: {output}")
