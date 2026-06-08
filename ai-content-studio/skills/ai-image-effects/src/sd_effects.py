#!/usr/bin/env python3
"""
Stable Diffusion Effects - Effect 和 Mirage 功能
使用 AUTOMATIC1111 WebUI API 实现图像转换
"""

import requests
import base64
from io import BytesIO
from PIL import Image
from pathlib import Path
from typing import Optional, Dict, Any
import os


class StableDiffusionEffects:
    """
    Stable Diffusion 图像效果处理器
    实现 Effect 和 Mirage 功能
    """

    def __init__(self, api_url: str = "http://127.0.0.1:7860"):
        """
        初始化 SD Effects

        Args:
            api_url: AUTOMATIC1111 WebUI API 地址
        """
        self.api_url = api_url.rstrip("/")
        self.img2img_endpoint = f"{self.api_url}/sdapi/v1/img2img"

    def check_connection(self) -> bool:
        """检查 API 连接是否正常"""
        try:
            response = requests.get(f"{self.api_url}/sdapi/v1/options", timeout=5)
            return response.status_code == 200
        except:
            return False

    def image_to_base64(self, image_path: str) -> str:
        """
        将图片转换为 base64 编码

        Args:
            image_path: 图片路径

        Returns:
            base64 编码的图片字符串
        """
        img = Image.open(image_path)

        # 转换为 RGB（SD 不支持 RGBA）
        if img.mode == "RGBA":
            # 创建白色背景
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # 使用 alpha 通道作为 mask
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # 编码为 base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return img_base64

    def base64_to_image(self, base64_str: str) -> Image.Image:
        """
        将 base64 字符串转换为 PIL Image

        Args:
            base64_str: base64 编码的图片字符串

        Returns:
            PIL Image 对象
        """
        img_data = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_data))
        return img

    def apply_effect(
        self,
        image_path: str,
        prompt: str,
        output_path: Optional[str] = None,
        strength: float = 0.5,
        steps: int = 30,
        cfg_scale: float = 7.0,
        seed: int = -1,
    ) -> str:
        """
        应用 Effect 效果（图像滤镜）

        Args:
            image_path: 输入图片路径
            prompt: 效果描述（如 "liminal space illusion"）
            output_path: 输出路径（可选）
            strength: 效果强度 (0.0-1.0)，越高变化越大
            steps: 采样步数（30-50 推荐）
            cfg_scale: 提示词相关性（7.0 推荐）
            seed: 随机种子（-1 为随机）

        Returns:
            输出图片路径
        """
        # 读取并编码图片
        init_image = self.image_to_base64(image_path)

        # 构建 API 请求
        payload = {
            "init_images": [init_image],
            "prompt": prompt,
            "negative_prompt": "low quality, blurry, distorted, bad anatomy",
            "steps": steps,
            "cfg_scale": cfg_scale,
            "denoising_strength": strength,
            "seed": seed,
            "width": 512,  # SD 1.5 标准尺寸
            "height": 512,
            "restore_faces": False,
            "include_init_images": False,
        }

        # 发送请求
        try:
            response = requests.post(self.img2img_endpoint, json=payload, timeout=120)
            response.raise_for_status()

            result = response.json()

            # 解码输出图片
            output_image = self.base64_to_image(result["images"][0])

            # 保存
            if output_path is None:
                output_path = str(
                    Path(image_path).parent / f"effect_{Path(image_path).stem}.png"
                )

            output_image.save(output_path)

            return output_path

        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"SD API 请求失败: {e}")

    def apply_mirage(
        self,
        image_path: str,
        prompt: str,
        output_path: Optional[str] = None,
        strength: float = 0.75,
        steps: int = 50,
        cfg_scale: float = 8.0,
        seed: int = -1,
    ) -> str:
        """
        应用 Mirage 效果（幻觉扩散）

        Mirage 比 Effect 更激进，会更大幅度地重新诠释图像

        Args:
            image_path: 输入图片路径
            prompt: 幻觉描述（如 "cyberpunk aesthetic"）
            output_path: 输出路径（可选）
            strength: 效果强度 (0.0-1.0)，默认 0.75（更激进）
            steps: 采样步数（50 推荐，更多细节）
            cfg_scale: 提示词相关性（8.0 推荐，更强）
            seed: 随机种子（-1 为随机）

        Returns:
            输出图片路径
        """
        # Mirage 使用更强的参数
        return self.apply_effect(
            image_path=image_path,
            prompt=f"{prompt}, highly detailed, dramatic lighting, surreal",
            output_path=output_path
            or str(Path(image_path).parent / f"mirage_{Path(image_path).stem}.png"),
            strength=strength,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
        )


def main():
    """测试函数"""
    sd = StableDiffusionEffects()

    print("检查 SD WebUI 连接...")
    if sd.check_connection():
        print("✅ 连接成功！")
    else:
        print("❌ 连接失败！请确保 SD WebUI 已启动")
        print("   启动命令: cd stable-diffusion-webui && ./webui.sh")
        return

    # 测试 Effect
    print("\n测试 Effect 功能...")
    test_image = "output/test_mcdonald_badge_v2.png"

    if Path(test_image).exists():
        try:
            result = sd.apply_effect(
                image_path=test_image,
                prompt="liminal space, dreamlike atmosphere",
                strength=0.4,
                output_path="output/test_effect.png",
            )
            print(f"✅ Effect 成功: {result}")
        except Exception as e:
            print(f"❌ Effect 失败: {e}")
    else:
        print(f"⚠️  测试图片不存在: {test_image}")


if __name__ == "__main__":
    main()
