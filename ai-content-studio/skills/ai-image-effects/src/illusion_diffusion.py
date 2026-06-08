"""
IllusionDiffusion API 集成
使用 Hugging Face Space: AP123/IllusionDiffusion
"""

from gradio_client import Client
from PIL import Image
from pathlib import Path
from typing import Optional, Tuple
import io


class IllusionDiffusion:
    """IllusionDiffusion API 客户端"""

    def __init__(self):
        """初始化客户端"""
        self.client = Client("AP123/IllusionDiffusion")
        print("✅ IllusionDiffusion 客户端已初始化")

    def generate(
        self,
        control_image_path: str,
        prompt: str,
        negative_prompt: str = "low quality, blurry, bad anatomy",
        controlnet_conditioning_scale: float = 0.8,
        guidance_scale: float = 7.5,
        control_guidance_start: float = 0.0,
        control_guidance_end: float = 1.0,
        upscaler_strength: float = 1.0,
        seed: int = -1,
        sampler: str = "DPM++ Karras SDE",
        output_path: Optional[str] = None,
    ) -> str:
        """
        使用 IllusionDiffusion 生成图像

        Args:
            control_image_path: 控制图像路径（Milady NFT 图片）
            prompt: 生成描述（如 "holding pizza, caption $XNY to $1"）
            negative_prompt: 负面提示词
            controlnet_conditioning_scale: 幻觉强度 (0.0-5.0)
            guidance_scale: 文本引导强度 (0.0-50.0)
            control_guidance_start: ControlNet 开始时间 (0.0-1.0)
            control_guidance_end: ControlNet 结束时间 (0.0-1.0)
            upscaler_strength: 上采样强度 (0.0-1.0)
            seed: 随机种子 (-1 为随机)
            sampler: 采样器 ("DPM++ Karras SDE" 或 "Euler")
            output_path: 输出路径

        Returns:
            生成图片的路径
        """
        print(f"🎨 使用 IllusionDiffusion 生成图像...")
        print(f"   控制图像: {control_image_path}")
        print(f"   Prompt: {prompt}")

        try:
            # 调用 Gradio API
            result = self.client.predict(
                control_image_path,  # control_image
                prompt,  # prompt
                negative_prompt,  # negative_prompt
                guidance_scale,  # guidance_scale
                controlnet_conditioning_scale,  # controlnet_conditioning_scale
                control_guidance_start,  # control_guidance_start
                control_guidance_end,  # control_guidance_end
                upscaler_strength,  # upscaler_strength
                seed,  # seed
                sampler,  # sampler
                api_name="/inference",
            )

            # result 是一个元组: (image, visible1, visible2, seed)
            output_image_path = result[0]

            # 如果指定了输出路径，复制到目标位置
            if output_path:
                from shutil import copy2

                Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                copy2(output_image_path, output_path)
                print(f"✅ 图像已保存: {output_path}")
                return output_path
            else:
                print(f"✅ 图像已生成: {output_image_path}")
                return output_image_path

        except Exception as e:
            error_msg = str(e)
            print(f"❌ 生成失败: {error_msg}")

            # 提供更友好的错误信息
            if "upstream Gradio app has raised an exception" in error_msg:
                print("💡 提示: IllusionDiffusion Space 可能暂时不可用")
                print("   原因可能是:")
                print("   - Space 正在休眠（Zero GPU）")
                print("   - 服务器负载过高")
                print("   - 输入图片格式或尺寸不符合要求")
                print(
                    "   建议稍后重试或访问 https://huggingface.co/spaces/AP123/IllusionDiffusion"
                )

            raise Exception(f"IllusionDiffusion 生成失败: {error_msg}")

    def generate_milady_with_effect(
        self,
        milady_nft_path: str,
        description: str,
        output_path: Optional[str] = None,
        effect_strength: float = 0.8,
    ) -> str:
        """
        为 Milady NFT 添加特效

        Args:
            milady_nft_path: Milady NFT 图片路径
            description: 效果描述（如 "holding pizza, neon lights, cyberpunk style"）
            output_path: 输出路径
            effect_strength: 效果强度 (0.0-1.0)

        Returns:
            生成图片的路径

        示例:
            generate_milady_with_effect(
                "output/nfts/milady_5555.png",
                "holding a pizza, caption text '$XNY to $1', cyberpunk neon style",
                effect_strength=0.8
            )
        """
        # 构建完整的 prompt
        full_prompt = f"anime girl, {description}, high quality, detailed"

        negative_prompt = "low quality, blurry, bad anatomy, deformed, ugly"

        return self.generate(
            control_image_path=milady_nft_path,
            prompt=full_prompt,
            negative_prompt=negative_prompt,
            controlnet_conditioning_scale=effect_strength,
            guidance_scale=7.5,
            output_path=output_path,
        )


def test_illusion_diffusion():
    """测试 IllusionDiffusion"""
    print("🧪 测试 IllusionDiffusion...")

    illusion = IllusionDiffusion()

    # 测试：需要有一个 Milady NFT 图片
    # 这里用一个示例路径
    test_nft_path = "output/nfts/milady_test.png"

    if not Path(test_nft_path).exists():
        print(f"⚠️ 测试图片不存在: {test_nft_path}")
        print("   请先生成一个 Milady NFT 图片")
        return

    # 测试生成
    result = illusion.generate_milady_with_effect(
        milady_nft_path=test_nft_path,
        description="holding a pizza, with neon text '$XNY to $1', cyberpunk style",
        output_path="output/test_illusion.png",
        effect_strength=0.8,
    )

    print(f"✅ 测试完成！结果: {result}")


if __name__ == "__main__":
    test_illusion_diffusion()
