#!/usr/bin/env python3
"""
Stable Diffusion Effects - 使用 Replicate API
无需本地安装，开箱即用
"""

import os
import replicate
from PIL import Image
from pathlib import Path
from typing import Optional
import requests
from io import BytesIO
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()


class StableDiffusionEffectsReplicate:
    """
    使用 Replicate API 实现 Effect 和 Mirage 功能

    优势：
    - 无需本地安装 GPU/模型
    - 速度快（云端 GPU）
    - 按使用付费（约 $0.001-0.01/次）
    """

    def __init__(self, api_token: Optional[str] = None):
        """
        初始化 Replicate API

        Args:
            api_token: Replicate API Token (或从环境变量 REPLICATE_API_TOKEN 读取)
        """
        self.api_token = api_token or os.getenv("REPLICATE_API_TOKEN")

        if not self.api_token:
            raise ValueError(
                "需要 Replicate API Token！\n"
                "获取方式: https://replicate.com/account/api-tokens\n"
                "设置: export REPLICATE_API_TOKEN='your-token'"
            )

        # 设置环境变量
        os.environ["REPLICATE_API_TOKEN"] = self.api_token

    def apply_effect(
        self,
        image_path: str,
        prompt: str,
        output_path: Optional[str] = None,
        strength: float = 0.5,
        steps: int = 30,
        cfg_scale: float = 7.0,
        seed: Optional[int] = None,
    ) -> str:
        """
        应用 Effect 效果（图像滤镜）

        Args:
            image_path: 输入图片路径
            prompt: 效果描述（如 "liminal space illusion"）
            output_path: 输出路径（可选）
            strength: 效果强度 (0.0-1.0)
            steps: 采样步数
            cfg_scale: 提示词相关性
            seed: 随机种子

        Returns:
            输出图片路径
        """
        print(f"🎨 应用 Effect: {prompt}")
        print(f"   强度: {strength}, 步数: {steps}")

        # 打开图片文件
        with open(image_path, "rb") as image_file:
            # 调用 Replicate API
            output = replicate.run(
                "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
                input={
                    "image": image_file,
                    "prompt": prompt,
                    "negative_prompt": "low quality, blurry, distorted, bad anatomy",
                    "num_inference_steps": steps,
                    "guidance_scale": cfg_scale,
                    "prompt_strength": strength,
                    "seed": seed,
                },
            )

        # 下载输出图片
        if isinstance(output, list) and len(output) > 0:
            output_url = output[0]
        else:
            output_url = output

        response = requests.get(output_url)
        img = Image.open(BytesIO(response.content))

        # 保存
        if output_path is None:
            output_path = str(
                Path(image_path).parent / f"effect_{Path(image_path).stem}.png"
            )

        img.save(output_path)
        print(f"✅ 已保存: {output_path}")

        return output_path

    def apply_mirage(
        self,
        image_path: str,
        prompt: str,
        output_path: Optional[str] = None,
        strength: float = 0.75,
        steps: int = 50,
        cfg_scale: float = 8.0,
        seed: Optional[int] = None,
    ) -> str:
        """
        应用 Mirage 效果（幻觉扩散）

        Args:
            image_path: 输入图片路径
            prompt: 幻觉描述
            output_path: 输出路径（可选）
            strength: 效果强度 (更激进，默认 0.75)
            steps: 采样步数（默认 50）
            cfg_scale: 提示词相关性（默认 8.0）
            seed: 随机种子

        Returns:
            输出图片路径
        """
        print(f"✨ 应用 Mirage: {prompt}")

        return self.apply_effect(
            image_path=image_path,
            prompt=f"{prompt}, highly detailed, dramatic lighting, surreal, artistic",
            output_path=output_path
            or str(Path(image_path).parent / f"mirage_{Path(image_path).stem}.png"),
            strength=strength,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
        )


def main():
    """测试函数"""
    import sys

    # 检查 API Token
    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        print("❌ 需要设置 REPLICATE_API_TOKEN")
        print("\n获取步骤：")
        print("1. 访问 https://replicate.com/account/api-tokens")
        print("2. 创建账号并获取 API Token")
        print("3. 设置环境变量:")
        print("   export REPLICATE_API_TOKEN='your-token'")
        print("\n或者在代码中设置:")
        print("   sd = StableDiffusionEffectsReplicate(api_token='your-token')")
        sys.exit(1)

    sd = StableDiffusionEffectsReplicate()

    # 测试图片
    test_image = "output/mcdonald_employee.png"

    if not Path(test_image).exists():
        print(f"⚠️  测试图片不存在: {test_image}")
        print("   请先生成一张测试图片")
        sys.exit(1)

    print("=" * 70)
    print("🧪 测试 Effect 功能")
    print("=" * 70)

    try:
        result = sd.apply_effect(
            image_path=test_image,
            prompt="liminal space, dreamlike atmosphere",
            strength=0.4,
            output_path="output/test_effect_replicate.png",
        )
        print(f"\n🎉 Effect 成功!")
        print(f"   输出: {result}")
    except Exception as e:
        print(f"\n❌ Effect 失败: {e}")

    print("\n" + "=" * 70)
    print("🧪 测试 Mirage 功能")
    print("=" * 70)

    try:
        result = sd.apply_mirage(
            image_path=test_image,
            prompt="cyberpunk aesthetic, neon lights",
            strength=0.7,
            output_path="output/test_mirage_replicate.png",
        )
        print(f"\n🎉 Mirage 成功!")
        print(f"   输出: {result}")
    except Exception as e:
        print(f"\n❌ Mirage 失败: {e}")


if __name__ == "__main__":
    main()
