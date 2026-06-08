#!/usr/bin/env python3
"""
Milady 合成引擎 - 基于 NFT 原图 + 图层叠加
支持在 NFT 原图基础上替换/叠加图层
"""

import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from PIL import Image
import random


class MiladyComposer:
    """
    Milady 图片合成引擎

    工作原理:
    1. 从 10,000 个 NFT 原图中选择一个作为基础
    2. 可选择性地替换/叠加图层（帽子、眼镜、装饰等）
    3. 图层会覆盖 NFT 原图上的对应部位
    """

    # NFT 原图尺寸
    NFT_SIZE = (1000, 1250)

    # 图层原始尺寸（需要缩放到 NFT 尺寸）
    LAYER_SIZE = (2000, 2500)

    # 图层类别（可以叠加到 NFT 上的）
    OVERLAY_LAYERS = [
        "Hat",  # 帽子（替换类）
        "Glasses",  # 眼镜（叠加类）
        "Earrings",  # 耳环（叠加类）
        "Necklaces",  # 项链（叠加类）
        "Face Decoration",  # 脸部装饰（叠加类）
        "Mouth",  # 嘴部装饰（叠加类，如抽烟）
        "Overlay",  # 特效叠加层（叠加类）
    ]

    # 不应该叠加的图层（这些是 NFT 的基础部分）
    BASE_LAYERS = [
        "Background",
        "Skin",
        "Face",
        "Eyes",
        "Eye Color",
        "Mouth",
        "Hair",
        "Shirt",
        "Brows",
        "Neck",
    ]

    def __init__(
        self,
        nft_dir: str = "assets/milady_nfts/images",
        layer_dir: str = "assets/milady_layers",
        config_path: str = "assets/milady_layers/layer_config.json",
    ):
        """
        初始化合成引擎

        Args:
            nft_dir: NFT 原图目录
            layer_dir: 图层目录
            config_path: 图层配置文件
        """
        self.nft_dir = Path(nft_dir)
        self.layer_dir = Path(layer_dir)

        # 加载图层配置
        with open(config_path, "r") as f:
            config = json.load(f)
            self.layer_config = {
                layer["name"]: layer["images"] for layer in config["attributeLayers"]
            }
            # 单独存储 z-index
            self.layer_z_index = {
                layer["name"]: layer.get("z", 0) for layer in config["attributeLayers"]
            }

        # 获取所有 NFT 列表
        self.nft_list = sorted(list(self.nft_dir.glob("milady_*.png")))
        print(f"✅ 加载了 {len(self.nft_list)} 个 NFT 原图")
        print(f"✅ 加载了 {len(self.layer_config)} 个图层类别")

    def get_random_nft_id(self) -> int:
        """随机选择一个 NFT ID"""
        return random.randint(0, 9999)

    def get_nft_attributes(self, nft_id: int) -> Optional[Dict]:
        """
        从官方 API 获取 NFT 的属性

        Args:
            nft_id: NFT ID

        Returns:
            属性字典，如 {"Background": "tennis", "Race": "clay", "Hair": "og orange"}
        """
        try:
            import requests

            url = f"https://www.miladymaker.net/milady/json/{nft_id}"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                attributes = {}
                for attr in data.get("attributes", []):
                    trait_type = attr["trait_type"]
                    value = attr["value"]
                    # 跳过非图层属性
                    if trait_type not in ["Drip Score", "Core", "Number"]:
                        attributes[trait_type] = value
                return attributes
        except Exception as e:
            print(f"⚠️  无法获取 NFT #{nft_id} 的属性: {e}")
        return None

    def compose_with_replacement(
        self,
        nft_id: int,
        replacements: Optional[Union[Dict[str, str], Dict[str, List[str]]]] = None,
        output_size: Tuple[int, int] = (1000, 1250),
    ) -> Optional[Image.Image]:
        """
        基于 NFT 元数据重新合成，支持图层替换和新增

        Args:
            nft_id: NFT ID
            replacements: 要替换/新增的图层
                         格式1: {"Hat": "Beret.png", "Glasses": "Sunglasses.png"}
                         格式2: {"Overlay": ["Gunpoint.png", "Birthday Hat.png"]}
            output_size: 输出尺寸

        Returns:
            合成后的图片
        """
        # 1. 获取 NFT 属性
        attributes = self.get_nft_attributes(nft_id)
        if not attributes:
            print(f"❌ 无法获取 NFT #{nft_id} 的属性，使用原图")
            return self.load_nft(nft_id)

        print(f"📋 NFT #{nft_id} 属性: {attributes}")

        # 统一图层格式
        normalized_replacements = self._normalize_layers(replacements)

        # 2. 构建图层列表（按 z-index 排序）
        layers_to_compose = []

        # 属性名称映射（API 名称 -> 图层类别名称）
        category_mapping = {
            "Background": "Background",
            "Race": "UnclothedBase",  # API 中是 Race，使用 UnclothedBase（包含完整身体和脸部轮廓）
            "Eyes": "Eyes",
            "Eye Color": "Eye Color",
            "Shirt": "Shirt",
            "Hair": "Hair",
            "Neck": "Neck",
            "Hat": "Hat",
            "Glasses": "Glasses",
            "Earrings": "Earrings",
            "Necklaces": "Necklaces",
            "Face Decoration": "Face Decoration",
        }

        # 1. 添加 NFT 元数据中的图层
        for api_name, layer_category in category_mapping.items():
            if api_name in attributes:
                # 检查是否需要替换这个图层
                if (
                    normalized_replacements
                    and layer_category in normalized_replacements
                ):
                    # 使用替换的图层（可能有多个）
                    for layer_file in normalized_replacements[layer_category]:
                        print(f"🔄 替换 {layer_category}: {layer_file}")
                        z_index = self.layer_z_index.get(layer_category, 0)
                        layers_to_compose.append((z_index, layer_category, layer_file))
                else:
                    # 使用原有的图层
                    value = attributes[api_name]
                    # 将 API 值转换为文件名（首字母大写 + .png）
                    layer_file = value.title().replace(" ", " ") + ".png"
                    z_index = self.layer_z_index.get(layer_category, 0)
                    layers_to_compose.append((z_index, layer_category, layer_file))

        # 2. 添加固定的面部特征图层（Mouth、Brows、Face）
        # 这些在 NFT 元数据中不存在，但是图层文件夹中有
        # 使用默认值确保面部完整
        default_face_layers = {
            "Brows": "Flat.png",  # 默认眉毛
            "Mouth": "Flat.png",  # 默认嘴巴
            "Face": "Blush.png",  # 默认腮红（Face 图层）
        }

        for category, default_file in default_face_layers.items():
            # 检查是否需要替换
            if normalized_replacements and category in normalized_replacements:
                for layer_file in normalized_replacements[category]:
                    print(f"🔄 替换 {category}: {layer_file}")
                    z_index = self.layer_z_index.get(
                        category, 5
                    )  # Mouth/Brows 在中间层
                    layers_to_compose.append((z_index, category, layer_file))
            else:
                # 使用默认值
                z_index = self.layer_z_index.get(category, 5)
                layers_to_compose.append((z_index, category, default_file))
                print(f"➕ 添加默认 {category}: {default_file}")

        # 3. 添加额外的图层（比如 Overlay，这些不在 NFT 元数据中）
        extra_categories = ["Overlay"]  # 可叠加但不在 NFT 元数据中的类别
        for category in extra_categories:
            if normalized_replacements and category in normalized_replacements:
                z_index = self.layer_z_index.get(
                    category, 100
                )  # Overlay 默认 z-index 很高
                for layer_file in normalized_replacements[category]:
                    print(f"➕ 新增 {category}: {layer_file}")
                    layers_to_compose.append((z_index, category, layer_file))

        # 4. 按 z-index 排序
        layers_to_compose.sort(key=lambda x: x[0])

        # 5. 开始合成
        canvas = None
        for z, category, filename in layers_to_compose:
            layer_img = self.load_layer(category, filename)
            if layer_img:
                if canvas is None:
                    canvas = layer_img
                else:
                    canvas = Image.alpha_composite(canvas, layer_img)
                print(f"✅ 叠加 {category}: {filename} (z={z})")

        # 6. 调整输出尺寸
        if canvas and output_size != self.NFT_SIZE:
            canvas = canvas.resize(output_size, Image.Resampling.LANCZOS)

        return canvas

    def load_nft(self, nft_id: int) -> Optional[Image.Image]:
        """
        加载 NFT 原图

        Args:
            nft_id: NFT ID (0-9999)

        Returns:
            PIL Image 或 None
        """
        nft_path = self.nft_dir / f"milady_{nft_id}.png"

        if not nft_path.exists():
            print(f"⚠️  NFT #{nft_id} 不存在")
            return None

        try:
            img = Image.open(nft_path).convert("RGBA")
            return img
        except Exception as e:
            print(f"❌ 加载 NFT #{nft_id} 失败: {e}")
            return None

    def load_layer(self, category: str, image_name: str) -> Optional[Image.Image]:
        """
        加载图层并缩放到 NFT 尺寸

        Args:
            category: 图层类别（如 "Hat"）
            image_name: 图层文件名（如 "Cowboy Hat.png"）

        Returns:
            缩放后的 PIL Image 或 None
        """
        layer_path = self.layer_dir / category / image_name

        if not layer_path.exists():
            print(f"⚠️  图层不存在: {category}/{image_name}")
            return None

        try:
            # 加载图层（2000x2500）
            layer = Image.open(layer_path).convert("RGBA")

            # 缩放到 NFT 尺寸（1000x1250）
            layer_resized = layer.resize(self.NFT_SIZE, Image.Resampling.LANCZOS)

            return layer_resized

        except Exception as e:
            print(f"❌ 加载图层失败 {category}/{image_name}: {e}")
            return None

    def _normalize_layers(
        self, layers: Optional[Union[Dict[str, str], Dict[str, List[str]]]]
    ) -> Dict[str, List[str]]:
        """
        统一图层格式为 Dict[str, List[str]]

        Args:
            layers: 可以是 {"Hat": "Beret.png"} 或 {"Hat": ["Beret.png", "..."]}

        Returns:
            统一后的 Dict[str, List[str]] 格式
        """
        if not layers:
            return {}

        normalized = {}
        for category, value in layers.items():
            if isinstance(value, str):
                # 单个字符串转为列表
                normalized[category] = [value]
            elif isinstance(value, list):
                # 已经是列表
                normalized[category] = value
            else:
                print(f"⚠️  无效的图层格式: {category}={value}")

        return normalized

    def compose_from_scratch(
        self,
        skin: str = "Pale.png",
        background: str = "XP.png",
        layers: Optional[Union[Dict[str, str], Dict[str, List[str]]]] = None,
        output_size: Tuple[int, int] = (1000, 1250),
    ) -> Optional[Image.Image]:
        """
        从基础图层开始合成（图层替换模式）

        Args:
            skin: 皮肤颜色（UnclothedBase）
            background: 背景
            layers: 要添加的图层
                   格式1: {"Hat": "Beret.png"}
                   格式2: {"Overlay": ["Gunpoint.png", "Birthday Hat.png"]}
            output_size: 输出尺寸

        Returns:
            合成后的图片
        """
        # 1. 加载背景
        bg_layer = self.load_layer("Background", background)
        if bg_layer is None:
            # 如果背景加载失败，使用纯色背景
            canvas = Image.new("RGBA", self.NFT_SIZE, (200, 200, 200, 255))
        else:
            canvas = bg_layer

        # 2. 加载并叠加皮肤基础图
        skin_layer = self.load_layer("UnclothedBase", skin)
        if skin_layer:
            canvas = Image.alpha_composite(canvas, skin_layer)
            print(f"✅ 叠加皮肤: {skin}")

        # 3. 统一图层格式并叠加
        normalized_layers = self._normalize_layers(layers)
        if normalized_layers:
            for category, image_names in normalized_layers.items():
                for image_name in image_names:
                    layer_img = self.load_layer(category, image_name)
                    if layer_img:
                        canvas = Image.alpha_composite(canvas, layer_img)
                        print(f"✅ 叠加 {category}: {image_name}")

        # 调整输出尺寸
        if output_size != self.NFT_SIZE:
            canvas = canvas.resize(output_size, Image.Resampling.LANCZOS)

        return canvas

    def compose(
        self,
        nft_id: Optional[int] = None,
        layers: Optional[Union[Dict[str, str], Dict[str, List[str]]]] = None,
        output_size: Tuple[int, int] = (1000, 1250),
    ) -> Optional[Image.Image]:
        """
        合成 Milady 图片

        Args:
            nft_id: NFT ID，如果为 None 则随机选择
            layers: 要叠加的图层
                   格式1: {"Hat": "Cowboy Hat.png", "Glasses": "Sunglasses.png"}
                   格式2: {"Overlay": ["Gunpoint.png", "Birthday Hat.png"]}
            output_size: 输出尺寸

        Returns:
            合成后的图片

        Example:
            >>> composer = MiladyComposer()
            >>> # 使用 NFT #1234，添加牛仔帽和墨镜
            >>> img = composer.compose(
            ...     nft_id=1234,
            ...     layers={"Hat": "Cowboy Hat.png", "Glasses": "Sunglasses.png"}
            ... )
            >>> # 添加多个 Overlay
            >>> img = composer.compose(
            ...     nft_id=1234,
            ...     layers={"Overlay": ["Gunpoint.png", "Birthday Hat.png"]}
            ... )
        """
        # 选择 NFT
        if nft_id is None:
            nft_id = self.get_random_nft_id()

        # 加载 NFT 原图作为基础
        canvas = self.load_nft(nft_id)
        if canvas is None:
            print(f"❌ 无法加载 NFT #{nft_id}")
            return None

        print(f"📸 使用 NFT #{nft_id} 作为基础 (尺寸: {canvas.size})")

        # 统一图层格式
        normalized_layers = self._normalize_layers(layers)

        # 叠加图层（所有图层都缩放到 NFT 尺寸再叠加）
        if normalized_layers:
            for category, image_names in normalized_layers.items():
                if category not in self.OVERLAY_LAYERS:
                    print(f"⚠️  跳过 {category}（不是可叠加图层）")
                    continue

                # 逐个叠加该类别下的所有图层
                for image_name in image_names:
                    layer_img = self.load_layer(category, image_name)
                    if layer_img:
                        # load_layer 已经把图层缩放到 NFT 尺寸 (1000x1250)
                        # 使用 alpha 通道进行叠加
                        canvas = Image.alpha_composite(canvas, layer_img)
                        print(f"✅ 叠加 {category}: {image_name}")

        # 最后才调整到输出尺寸（如果需要）
        if output_size != self.NFT_SIZE:
            canvas = canvas.resize(output_size, Image.Resampling.LANCZOS)
            print(f"📐 最终调整到输出尺寸: {output_size}")

        return canvas

    def compose_random(
        self,
        nft_id: Optional[int] = None,
        num_layers: int = 2,
        output_size: Tuple[int, int] = (1000, 1250),
    ) -> Optional[Image.Image]:
        """
        随机合成 Milady（随机选择图层）

        Args:
            nft_id: NFT ID，如果为 None 则随机选择
            num_layers: 随机添加的图层数量
            output_size: 输出尺寸

        Returns:
            合成后的图片
        """
        # 随机选择要叠加的图层类别
        selected_categories = random.sample(
            self.OVERLAY_LAYERS, min(num_layers, len(self.OVERLAY_LAYERS))
        )

        # 为每个类别随机选择一个图层
        layers = {}
        for category in selected_categories:
            if category in self.layer_config and self.layer_config[category]:
                image_name = random.choice(self.layer_config[category])
                layers[category] = image_name

        return self.compose(nft_id=nft_id, layers=layers, output_size=output_size)

    def get_available_layers(self, category: str) -> List[str]:
        """
        获取某个类别的所有可用图层

        Args:
            category: 图层类别

        Returns:
            图层文件名列表
        """
        return self.layer_config.get(category, [])

    def create_meme(
        self,
        nft_id: Optional[int] = None,
        layers: Optional[Dict[str, str]] = None,
        top_text: str = "",
        bottom_text: str = "",
        all_caps: bool = True,
        output_path: Optional[str] = None,
    ) -> Optional[str]:
        """
        创建带文字的 Milady Meme

        Args:
            nft_id: NFT ID
            layers: 要叠加的图层
            top_text: 顶部文字
            bottom_text: 底部文字
            output_path: 输出路径

        Returns:
            输出文件路径
        """
        # 合成图片
        img = self.compose(nft_id=nft_id, layers=layers)
        if img is None:
            return None

        # 如果有文字，使用 CaptionMeme 添加
        if top_text or bottom_text:
            from .caption_meme import CaptionMeme

            caption = CaptionMeme()
            img = caption.add_caption(img, top_text, bottom_text, all_caps=all_caps)

        # 保存
        if output_path is None:
            output_dir = Path("output/memes")
            output_dir.mkdir(parents=True, exist_ok=True)
            timestamp = int(time.time())
            output_path = str(output_dir / f"milady_meme_{timestamp}.png")

        img.save(output_path)
        print(f"💾 保存到: {output_path}")

        return output_path


def main():
    """测试合成引擎"""
    import time

    composer = MiladyComposer()

    print("\n" + "=" * 60)
    print("🧪 测试 1: 使用 NFT #0，添加帽子和眼镜")
    print("=" * 60)

    img1 = composer.compose(
        nft_id=0, layers={"Hat": "Cowboy Hat.png", "Glasses": "Heart Glasses.png"}
    )

    if img1:
        output_path = f"output/test_nft_0_with_layers.png"
        img1.save(output_path)
        print(f"✅ 保存到: {output_path}")

    print("\n" + "=" * 60)
    print("🧪 测试 2: 随机 NFT + 随机图层")
    print("=" * 60)

    img2 = composer.compose_random(num_layers=3)

    if img2:
        output_path = f"output/test_random_composition.png"
        img2.save(output_path)
        print(f"✅ 保存到: {output_path}")

    print("\n" + "=" * 60)
    print("🧪 测试 3: 创建带文字的 Meme")
    print("=" * 60)

    output_path = composer.create_meme(
        nft_id=100,
        layers={"Hat": "Pink Bonnet.png", "Overlay": "Heart Meme.png"},
        top_text="GM BUILDERS",
        bottom_text="LFG",
    )

    print("\n✅ 所有测试完成！")


if __name__ == "__main__":
    main()
