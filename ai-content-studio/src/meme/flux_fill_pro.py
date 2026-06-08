#!/usr/bin/env python3
"""
FLUX Fill Pro - 配饰替换系统
使用 FLUX Fill Pro 实现智能配饰检测和替换
"""

import os
import replicate
from PIL import Image, ImageDraw
import requests
from io import BytesIO
from typing import Optional, Dict, Tuple

from .sam_detector import SAMDetector


class FluxFillPro:
    """FLUX Fill Pro 配饰替换引擎"""

    # 预定义配饰区域（基于标准 Milady NFT 结构）
    ACCESSORY_REGIONS = {
        "hat": {
            "region": (100, 30, 300, 180),  # (x, y, width, height)
            "description": "帽子区域（头顶）"
        },
        "glasses": {
            "region": (150, 170, 200, 90),
            "description": "眼镜区域（眼睛）"
        },
        "earrings": {
            "region": (80, 210, 120, 100),  # 左耳
            "description": "耳环区域（左耳）"
        },
        "earrings_right": {
            "region": (300, 210, 120, 100),  # 右耳
            "description": "耳环区域（右耳）"
        },
        "necklace": {
            "region": (160, 340, 180, 100),
            "description": "项链区域（脖子）"
        },
        "scarf": {
            "region": (140, 360, 220, 140),  # 围巾（颈部+肩部）
            "description": "围巾区域（颈部和肩部）"
        },
        "clothes": {
            "region": (120, 380, 260, 120),
            "description": "衣服区域（上身）"
        },
        "other": {
            "region": (50, 50, 400, 400),  # 全图区域（用于 overlay 等）
            "description": "通用区域（全图）"
        }
    }

    def __init__(self, api_token: Optional[str] = None, use_sam: bool = False):
        """
        初始化 FLUX Fill Pro 客户端

        Args:
            api_token: Replicate API token
            use_sam: 是否使用 SAM 自动检测配饰区域（默认 False）
        """
        self.api_token = api_token or os.getenv("REPLICATE_API_TOKEN")
        if not self.api_token:
            raise ValueError("REPLICATE_API_TOKEN is required")

        # 设置环境变量
        os.environ["REPLICATE_API_TOKEN"] = self.api_token

        # SAM 检测器
        self.use_sam = use_sam
        self.sam_detector = SAMDetector() if use_sam else None

        if use_sam:
            print("✅ FLUX Fill Pro 客户端已初始化 (SAM 自动检测已启用)")
        else:
            print("✅ FLUX Fill Pro 客户端已初始化")

    def enable_sam(self):
        """启用 SAM 自动检测（如果尚未启用）"""
        if not self.sam_detector:
            self.sam_detector = SAMDetector()
            self.use_sam = True
            print("✅ SAM 自动检测已启用")
        else:
            print("ℹ️  SAM 已经启用")

    def disable_sam(self):
        """禁用 SAM 自动检测"""
        self.use_sam = False
        print("ℹ️  SAM 自动检测已禁用（但检测器仍保留）")

    def create_mask(
        self,
        image_size: Tuple[int, int],
        region: Tuple[int, int, int, int],
        feather: int = 10
    ) -> Image.Image:
        """
        创建遮罩图像

        Args:
            image_size: 图像尺寸 (width, height)
            region: 区域 (x, y, width, height)
            feather: 羽化边缘像素

        Returns:
            遮罩图像（白色=要修改的区域，黑色=保留的区域）
        """
        width, height = image_size
        mask = Image.new('L', (width, height), 0)  # 黑色背景
        draw = ImageDraw.Draw(mask)

        x, y, w, h = region

        # 绘制白色矩形（要修改的区域）
        draw.rectangle([x, y, x + w, y + h], fill=255)

        # 可选：添加羽化效果（使用 PIL 的 filter）
        if feather > 0:
            from PIL import ImageFilter
            mask = mask.filter(ImageFilter.GaussianBlur(radius=feather))

        return mask

    def replace_accessory(
        self,
        image_path: str,
        accessory_type: str,
        new_description: str,
        output_path: str,
        guidance: float = 30.0,
        num_inference_steps: int = 28,
        custom_region: Optional[Tuple[int, int, int, int]] = None,
        force_sam: Optional[bool] = None
    ) -> str:
        """
        替换配饰

        Args:
            image_path: 原始 Milady NFT 图片路径
            accessory_type: 配饰类型 (hat, glasses, earrings, necklace, clothes)
            new_description: 新配饰的描述
            output_path: 输出路径
            guidance: 引导强度 (推荐 20-40)
            num_inference_steps: 推理步数 (推荐 20-40)
            custom_region: 自定义区域 (x, y, width, height)
            force_sam: 强制使用/不使用 SAM（None=使用初始化设置）

        Returns:
            生成图片的路径

        示例:
            replace_accessory(
                "milady_1234.png",
                "glasses",
                "cyberpunk sunglasses with neon purple glow",
                "output.png"
            )
        """
        # 加载原图
        image = Image.open(image_path)
        image_size = image.size

        print(f"🎨 开始替换配饰...")
        print(f"   原图尺寸: {image_size}")
        print(f"   配饰类型: {accessory_type}")
        print(f"   新描述: {new_description}")

        # 决定是否使用 SAM
        use_sam_for_this_call = force_sam if force_sam is not None else self.use_sam

        # 获取区域
        if custom_region:
            region = custom_region
            print(f"   使用自定义区域: {region}")
        elif use_sam_for_this_call and self.sam_detector:
            # 使用 SAM 自动检测
            print(f"   🔍 使用 SAM 自动检测配饰区域...")
            predefined = self.ACCESSORY_REGIONS.get(accessory_type, {}).get("region")
            region = self.sam_detector.detect_accessory(
                image_path=image_path,
                accessory_type=accessory_type,
                predefined_region=predefined
            )
            if region is None:
                raise ValueError(f"SAM 未能检测到 {accessory_type}，且无预定义区域")
        elif accessory_type in self.ACCESSORY_REGIONS:
            region = self.ACCESSORY_REGIONS[accessory_type]["region"]
            print(f"   使用预定义区域: {region}")
        else:
            raise ValueError(f"未知的配饰类型: {accessory_type}。支持: {list(self.ACCESSORY_REGIONS.keys())}")

        # 创建遮罩
        mask = self.create_mask(image_size, region, feather=5)

        # 保存临时文件（FLUX Fill Pro 需要 URL 或文件）
        temp_image_path = "/tmp/flux_input_image.png"
        temp_mask_path = "/tmp/flux_input_mask.png"
        image.save(temp_image_path)
        mask.save(temp_mask_path)

        print(f"✨ 调用 FLUX Fill Pro...")

        # 调用 FLUX Fill Pro
        try:
            output = replicate.run(
                "black-forest-labs/flux-fill-pro",
                input={
                    "image": open(temp_image_path, "rb"),
                    "mask": open(temp_mask_path, "rb"),
                    "prompt": new_description,
                    "guidance": guidance,
                    "num_inference_steps": num_inference_steps,
                    "output_format": "png",
                    "output_quality": 100
                }
            )

            # FLUX Fill Pro 返回 URL
            if isinstance(output, str):
                result_url = output
            else:
                result_url = output[0] if isinstance(output, list) else str(output)

            print(f"✅ FLUX Fill Pro 生成成功")
            print(f"   结果 URL: {result_url}")

            # 下载结果
            response = requests.get(result_url)
            result_image = Image.open(BytesIO(response.content))

            # 保存
            result_image.save(output_path)
            print(f"💾 已保存到: {output_path}")

            return output_path

        except Exception as e:
            print(f"❌ FLUX Fill Pro 调用失败: {e}")
            raise

    def batch_replace(
        self,
        image_path: str,
        replacements: Dict[str, str],
        output_path: str
    ) -> str:
        """
        批量替换多个配饰

        Args:
            image_path: 原始图片路径
            replacements: 配饰替换字典 {accessory_type: new_description}
            output_path: 输出路径

        Returns:
            最终图片路径

        示例:
            batch_replace(
                "milady_1234.png",
                {
                    "hat": "cyberpunk cap with neon lights",
                    "glasses": "purple holographic sunglasses"
                },
                "output.png"
            )
        """
        current_image = image_path
        temp_outputs = []

        print(f"🔄 批量替换 {len(replacements)} 个配饰...")

        for i, (accessory_type, description) in enumerate(replacements.items(), 1):
            print(f"\n--- 第 {i}/{len(replacements)} 个配饰 ---")
            temp_output = f"/tmp/flux_batch_{i}.png"

            self.replace_accessory(
                image_path=current_image,
                accessory_type=accessory_type,
                new_description=description,
                output_path=temp_output
            )

            current_image = temp_output
            temp_outputs.append(temp_output)

        # 最后一张就是最终结果
        final_image = Image.open(current_image)
        final_image.save(output_path)

        print(f"\n✅ 批量替换完成！")
        print(f"💾 最终结果: {output_path}")

        return output_path

    def visualize_regions(
        self,
        image_path: str,
        output_path: str
    ) -> str:
        """
        可视化所有预定义配饰区域（调试用）

        Args:
            image_path: 原始图片路径
            output_path: 输出路径

        Returns:
            可视化图片路径
        """
        image = Image.open(image_path)
        draw = ImageDraw.Draw(image)

        for accessory_type, config in self.ACCESSORY_REGIONS.items():
            x, y, w, h = config["region"]
            # 绘制矩形边框
            draw.rectangle([x, y, x + w, y + h], outline="red", width=3)
            # 添加标签
            draw.text((x, y - 20), accessory_type, fill="red")

        image.save(output_path)
        print(f"📊 区域可视化已保存: {output_path}")

        return output_path


# 测试代码
if __name__ == "__main__":
    # 示例用法
    flux = FluxFillPro()

    # 示例 1: 单个配饰替换
    # flux.replace_accessory(
    #     image_path="milady_1234.png",
    #     accessory_type="glasses",
    #     new_description="cyberpunk sunglasses with neon purple glow, futuristic, highly detailed",
    #     output_path="output_glasses.png"
    # )

    # 示例 2: 批量替换
    # flux.batch_replace(
    #     image_path="milady_1234.png",
    #     replacements={
    #         "hat": "cyberpunk cap with holographic display",
    #         "glasses": "neon purple sunglasses"
    #     },
    #     output_path="output_batch.png"
    # )

    # 示例 3: 可视化区域
    # flux.visualize_regions(
    #     image_path="milady_1234.png",
    #     output_path="regions_visualization.png"
    # )

    print("✅ FLUX Fill Pro 模块加载完成")
