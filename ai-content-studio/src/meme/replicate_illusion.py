#!/usr/bin/env python3
"""
Replicate ControlNet Illusion API 集成
使用 Replicate 的 ControlNet 模型，更稳定可靠
"""

import replicate
from pathlib import Path
from typing import Optional
import os


class ReplicateIllusion:
    """Replicate ControlNet Illusion API 客户端"""

    def __init__(self, api_token: Optional[str] = None):
        """
        初始化客户端

        Args:
            api_token: Replicate API Token（默认从环境变量读取）
        """
        self.api_token = api_token or os.getenv("REPLICATE_API_TOKEN")
        if not self.api_token:
            raise ValueError("需要提供 REPLICATE_API_TOKEN")

        self.client = replicate.Client(api_token=self.api_token)
        print("✅ Replicate ControlNet 客户端已初始化")

    def generate(
        self,
        control_image_path: str,
        prompt: str,
        negative_prompt: str = "low quality, blurry, bad anatomy",
        num_inference_steps: int = 40,
        guidance_scale: float = 7.5,
        controlnet_conditioning_scale: float = 1.4,
        seed: Optional[int] = None,
        output_path: Optional[str] = None
    ) -> str:
        """
        使用 Replicate ControlNet 生成图像

        Args:
            control_image_path: 控制图像路径
            prompt: 生成描述
            negative_prompt: 负面提示词
            num_inference_steps: 推理步数 (20-100)
            guidance_scale: 文本引导强度 (1.0-20.0)
            controlnet_conditioning_scale: ControlNet 强度 (0.0-2.5)
            seed: 随机种子
            output_path: 输出路径

        Returns:
            生成图片的路径
        """
        print(f"🎨 使用 Replicate ControlNet 生成图像...")
        print(f"   控制图像: {control_image_path}")
        print(f"   Prompt: {prompt}")

        try:
            # 准备输入参数 - Replicate 需要文件对象
            with open(control_image_path, "rb") as control_image_file:
                input_params = {
                    "image": control_image_file,
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "num_inference_steps": num_inference_steps,
                    "guidance_scale": guidance_scale,
                    "controlnet_conditioning_scale": controlnet_conditioning_scale,
                }

                if seed is not None:
                    input_params["seed"] = seed

                # 调用 Replicate API
                # 使用 lucataco/illusion-diffusion-hq (QR Code ControlNet with Realistic Vision V5.1)
                # 匹配 Hugging Face IllusionDiffusion 的实现
                print("   正在调用 Replicate API (IllusionDiffusion)...")
                output = self.client.run(
                    "lucataco/illusion-diffusion-hq:3c64e669051f9b358e748c8e2fb8a06e64122a9ece762ef133252e2c99da77c1",
                    input={
                        "image": control_image_file,
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "num_inference_steps": num_inference_steps,
                        "guidance_scale": guidance_scale,
                        "controlnet_conditioning_scale": controlnet_conditioning_scale,
                        "qr_code_content": "",  # 不生成 QR code，只做风格转换
                        "width": 768,
                        "height": 768,
                        "num_outputs": 1
                    }
                )

            # output 是一个 URL 列表
            if isinstance(output, list) and len(output) > 0:
                output_url = output[0]
            else:
                output_url = output

            print(f"   生成的图片 URL: {output_url}")

            # 下载生成的图片
            if output_path:
                import requests
                Path(output_path).parent.mkdir(parents=True, exist_ok=True)

                response = requests.get(output_url)
                with open(output_path, "wb") as f:
                    f.write(response.content)

                print(f"✅ 图像已保存: {output_path}")
                return output_path
            else:
                # 如果没有指定输出路径，下载到临时目录
                import tempfile
                import requests

                temp_dir = Path("output/lark")
                temp_dir.mkdir(parents=True, exist_ok=True)

                temp_path = temp_dir / f"replicate_illusion_{Path(control_image_path).stem}.png"

                response = requests.get(output_url)
                with open(temp_path, "wb") as f:
                    f.write(response.content)

                print(f"✅ 图像已生成: {temp_path}")
                return str(temp_path)

        except Exception as e:
            print(f"❌ 生成失败: {e}")
            raise Exception(f"Replicate ControlNet 生成失败: {e}")

    def generate_milady_with_effect(
        self,
        milady_nft_path: str,
        description: str,
        output_path: Optional[str] = None,
        effect_strength: float = 1.1,
        positive_prompt_template: Optional[str] = None,
        negative_prompt: Optional[str] = None,
        guidance_scale: float = 7.0,
        num_inference_steps: int = 40
    ) -> str:
        """
        为 Milady NFT 添加特效

        Args:
            milady_nft_path: Milady NFT 图片路径
            description: 效果描述
            output_path: 输出路径
            effect_strength: 效果强度 (0.0-2.5，推荐 0.9-1.3)
            positive_prompt_template: 正向提示词模板，使用 {description} 作为占位符
                                     例如: "milady nft character, {description}, high quality, detailed"
            negative_prompt: 负向提示词
            guidance_scale: 文本引导强度 (1.0-20.0，推荐 6.0-8.0)
            num_inference_steps: 推理步数 (20-100，推荐 30-50)

        Returns:
            生成图片的路径
        """
        # 使用默认模板或自定义模板
        if positive_prompt_template is None:
            positive_prompt_template = "same character, {description}, high quality, detailed, maintaining identity and features"

        # 构建完整的 positive prompt
        full_prompt = positive_prompt_template.replace("{description}", description)

        # 使用默认 negative prompt 或自定义
        if negative_prompt is None:
            negative_prompt = "low quality, blurry, bad anatomy, deformed, ugly, distorted, different person, different character, different face, wrong identity"

        return self.generate(
            control_image_path=milady_nft_path,
            prompt=full_prompt,
            negative_prompt=negative_prompt,
            controlnet_conditioning_scale=effect_strength,
            guidance_scale=guidance_scale,
            num_inference_steps=num_inference_steps,
            output_path=output_path
        )


def test_replicate_illusion():
    """测试 Replicate ControlNet"""
    print("🧪 测试 Replicate ControlNet...")

    from src.meme.meme_generator_v2 import MemeGeneratorV2

    # Step 1: 生成基础 NFT
    print("\n📸 Step 1: 生成基础 Milady NFT #5555")
    meme_gen = MemeGeneratorV2()
    base_nft_path = meme_gen.generate(
        nft_id=5555,
        layers={},
        output_path="output/lark/milady_5555_test_base.png"
    )
    print(f"✅ 基础 NFT 已生成: {base_nft_path}")

    # Step 2: 应用 Replicate ControlNet 特效
    print("\n✨ Step 2: 应用 Replicate ControlNet 特效")
    import os
    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        raise ValueError("❌ REPLICATE_API_TOKEN 未配置，请在 config/.env 中设置")
    illusion = ReplicateIllusion(api_token=api_token)

    result = illusion.generate_milady_with_effect(
        milady_nft_path=base_nft_path,
        description="holding pizza, caption $XNY to $1, cyberpunk neon style",
        output_path="output/lark/milady_5555_replicate_test.png",
        effect_strength=1.4
    )

    print(f"\n✅ 测试完成！")
    print(f"📁 生成的文件: {result}")

    if Path(result).exists():
        print(f"📊 文件大小: {Path(result).stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    test_replicate_illusion()
