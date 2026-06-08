#!/usr/bin/env python3
"""
Meme Generator V2 - 基于 NFT 原图 + 图层合成
使用新的架构：NFT 原图作为基础，图层作为装饰
"""

from PIL import Image
from pathlib import Path
from typing import Dict, Optional, List
import random
import time

from .milady_composer import MiladyComposer
from .caption_meme import CaptionMeme
from .prompt_enhancer import PromptEnhancer


class MemeGeneratorV2:
    """Meme Generator V2 - 基于 NFT 原图"""

    # ==================== 图层分类常量 ====================
    # 结构性图层：改变整体外观，必须使用元数据重组
    STRUCTURAL_LAYERS = {"Hat", "Hair", "Shirt"}

    # 装饰性图层：可以直接叠加在原图上，保留所有细节
    DECORATIVE_LAYERS = {
        "Glasses",
        "Mouth",
        "Overlay",
        "Earrings",
        "Necklaces",
        "Face Decoration",
    }

    # ⚠️ 核心原则：能用原图就用原图！
    # 只有 STRUCTURAL_LAYERS 才触发重组，其他一律叠加
    # ====================================================

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
            ("WAGMI", "FRENS"),
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
            ("BE UNGOVERNABLE", "STAY BASED"),
        ],
    }

    def __init__(
        self,
        nft_dir: str = "assets/milady_nfts/images",
        layer_dir: str = "assets/milady_layers",
        font_path: Optional[str] = None,
        enable_prompt_enhancer: bool = True,
    ):
        """
        初始化梗图生成器 V2

        Args:
            nft_dir: NFT 原图目录
            layer_dir: 图层目录
            font_path: 自定义字体路径
            enable_prompt_enhancer: 是否启用 Prompt Enhancer
        """
        self.composer = MiladyComposer(nft_dir=nft_dir, layer_dir=layer_dir)
        self.caption = CaptionMeme(font_path)

        # 初始化 Prompt Enhancer（可选）
        if enable_prompt_enhancer:
            self.prompt_enhancer = PromptEnhancer()
        else:
            self.prompt_enhancer = None

        print("=" * 70)
        print("🎨 Meme Generator V2 已就绪！")
        print("   - NFT 原图: 10,000 个")
        print("   - 可叠加图层: 6 类")
        if self.prompt_enhancer and self.prompt_enhancer.is_available():
            print("   - Prompt Enhancer: ✅ 已启用")
        else:
            print("   - Prompt Enhancer: ❌ 未启用")
        print("=" * 70)

    def generate(
        self,
        nft_id: Optional[int] = None,
        layers: Optional[Dict[str, str]] = None,
        top_text: str = "",
        bottom_text: str = "",
        all_caps: bool = True,
        font_style: str = "impact",
        output_path: Optional[str] = None,
        output_size: tuple = (1000, 1250),
        use_base_layers: bool = False,  # False=使用NFT原图+叠加, True=从基础图层自定义
    ) -> str:
        """
        生成 Milady Meme

        Args:
            nft_id: NFT ID (0-9999)，None 为随机
            layers: 图层配置，如 {"Hat": "Cowboy Hat.png", "Glasses": "Heart Glasses.png"}
            top_text: 顶部文字
            bottom_text: 底部文字
            all_caps: 是否全大写
            font_style: 字体风格 ("impact", "angelic", "chinese", "glow")
            output_path: 输出路径
            output_size: 输出尺寸
            use_base_layers: 是否从基础图层开始合成（True=替换模式，False=叠加模式）

        Returns:
            输出文件路径

        Example:
            >>> gen = MemeGeneratorV2()
            >>> # 使用基础图层，添加帽子，加上文字
            >>> path = gen.generate(
            ...     layers={"Hat": "Cowboy Hat.png"},
            ...     top_text="GM BUILDERS",
            ...     bottom_text="LFG",
            ...     font_style="glow",
            ...     use_base_layers=True
            ... )
        """
        # 1. 合成图片
        if use_base_layers:
            # 从基础图层开始合成（完全自定义）
            import random

            skins = ["Pale.png", "Pink.png", "Tan.png", "Black.png"]
            backgrounds = ["XP.png", "Clouds.png", "Sunset.png", "Streets.png"]

            img = self.composer.compose_from_scratch(
                skin=random.choice(skins),
                background=random.choice(backgrounds),
                layers=layers,
                output_size=output_size,
            )
        elif nft_id is not None and layers:
            # ⚠️ 关键判断：使用 STRUCTURAL_LAYERS 常量
            # 只有结构性图层（Hat/Hair/Shirt）才触发重组
            # 装饰性图层（Mouth/Glasses/Overlay）一律叠加，保留原图所有细节
            needs_replacement = any(
                category in layers for category in self.STRUCTURAL_LAYERS
            )

            if needs_replacement:
                # 有结构性图层，必须使用元数据重组
                structural = [cat for cat in layers if cat in self.STRUCTURAL_LAYERS]
                print(f"🔄 检测到结构性图层 {structural}，使用元数据重组模式")
                print(f"⚠️  警告: 重组模式可能丢失部分细节（眼睛高光、面部阴影等）")
                img = self.composer.compose_with_replacement(
                    nft_id=nft_id, replacements=layers, output_size=output_size
                )
            else:
                # 只有装饰性图层（包括 Overlay），使用原图叠加模式（100%保留细节）
                decorative = [cat for cat in layers if cat in self.DECORATIVE_LAYERS]
                print(
                    f"📸 仅装饰性图层 {decorative}，使用原图叠加模式（保留完整 NFT 细节）"
                )
                img = self.composer.compose(
                    nft_id=nft_id, layers=layers, output_size=output_size
                )
        else:
            # 使用 NFT 原图（叠加模式）
            img = self.composer.compose(
                nft_id=nft_id, layers=layers, output_size=output_size
            )

        if img is None:
            print("❌ 图片合成失败")
            return None

        # 2. 添加文字
        if top_text or bottom_text:
            img = self.caption.add_caption(
                img, top_text, bottom_text, all_caps=all_caps, font_style=font_style
            )

        # 3. 保存
        if output_path is None:
            output_dir = Path("output/memes")
            output_dir.mkdir(parents=True, exist_ok=True)
            timestamp = int(time.time())
            output_path = str(output_dir / f"milady_meme_{timestamp}.png")

        img.save(output_path)
        print(f"💾 保存到: {output_path}")

        return output_path

    def generate_random(
        self,
        num_layers: int = 2,
        top_text: str = "",
        bottom_text: str = "",
        all_caps: bool = True,
        output_path: Optional[str] = None,
    ) -> str:
        """
        生成随机 Milady Meme（随机 NFT + 随机图层）

        Args:
            num_layers: 随机叠加的图层数量
            top_text: 顶部文字
            bottom_text: 底部文字
            output_path: 输出路径

        Returns:
            输出文件路径
        """
        # 1. 随机合成
        img = self.composer.compose_random(num_layers=num_layers)

        if img is None:
            print("❌ 图片合成失败")
            return None

        # 2. 添加文字
        if top_text or bottom_text:
            img = self.caption.add_caption(
                img, top_text, bottom_text, all_caps=all_caps
            )

        # 3. 保存
        if output_path is None:
            output_dir = Path("output/memes")
            output_dir.mkdir(parents=True, exist_ok=True)
            timestamp = int(time.time())
            output_path = str(output_dir / f"milady_meme_{timestamp}.png")

        img.save(output_path)
        print(f"💾 保存到: {output_path}")

        return output_path

    def generate_from_template(
        self,
        template_name: str,
        nft_id: Optional[int] = None,
        layers: Optional[Dict[str, str]] = None,
        output_path: Optional[str] = None,
    ) -> str:
        """
        使用预设模板生成 Meme

        Args:
            template_name: 模板名称 ("gm", "crypto", "milady", "motivational")
            nft_id: NFT ID，None 为随机
            layers: 图层配置
            output_path: 输出路径

        Returns:
            输出文件路径

        Example:
            >>> gen = MemeGeneratorV2()
            >>> path = gen.generate_from_template("gm", nft_id=1234)
        """
        if template_name not in self.MEME_TEMPLATES:
            print(f"❌ 未知模板: {template_name}")
            print(f"可用模板: {', '.join(self.MEME_TEMPLATES.keys())}")
            return None

        # 随机选择模板中的文字
        top_text, bottom_text = random.choice(self.MEME_TEMPLATES[template_name])

        return self.generate(
            nft_id=nft_id,
            layers=layers,
            top_text=top_text,
            bottom_text=bottom_text,
            output_path=output_path,
        )

    def batch_generate(
        self,
        count: int,
        template_name: Optional[str] = None,
        output_dir: str = "output/batch_memes",
    ) -> List[str]:
        """
        批量生成 Meme

        Args:
            count: 生成数量
            template_name: 模板名称，None 为随机选择
            output_dir: 输出目录

        Returns:
            生成的文件路径列表
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        generated_paths = []

        print(f"\n🚀 开始批量生成 {count} 个 Meme...")

        for i in range(count):
            # 随机选择模板
            if template_name is None:
                current_template = random.choice(list(self.MEME_TEMPLATES.keys()))
            else:
                current_template = template_name

            # 生成文件路径
            output_path = output_dir / f"meme_{i+1:04d}.png"

            # 生成 Meme
            print(f"\n[{i+1}/{count}] 生成中...")
            path = self.generate_from_template(
                template_name=current_template, output_path=str(output_path)
            )

            if path:
                generated_paths.append(path)

        print(f"\n✅ 批量生成完成！共 {len(generated_paths)} 个 Meme")
        print(f"📁 输出目录: {output_dir}")

        return generated_paths

    def list_available_layers(self) -> Dict[str, List[str]]:
        """
        列出所有可用的图层

        Returns:
            {类别: [图层列表]}
        """
        result = {}
        for category in self.composer.OVERLAY_LAYERS:
            layers = self.composer.get_available_layers(category)
            if layers:
                result[category] = layers

        return result

    def generate_from_natural_language(
        self,
        prompt: str,
        bypass_enhancer: bool = False,
        nft_id: Optional[int] = None,
        output_path: Optional[str] = None,
    ) -> str:
        """
        从自然语言描述生成 Meme（使用 Prompt Enhancer）

        这个方法会：
        1. 使用 Prompt Enhancer 扩展用户的简短提示
        2. （未来）使用 Text-to-Image 模型根据增强后的提示生成图像
        3. 目前阶段：返回增强后的提示词，供用户查看

        Args:
            prompt: 用户的自然语言描述
            bypass_enhancer: 是否跳过 Prompt Enhancer（-raw 标志）
            nft_id: NFT ID（可选，用于叠加到 NFT 上）
            output_path: 输出路径

        Returns:
            增强后的提示词（当前版本）
            未来：生成的图片路径

        Example:
            >>> gen = MemeGeneratorV2()
            >>> # 简短输入
            >>> enhanced = gen.generate_from_natural_language(
            ...     "milady celebrating thanksgiving"
            ... )
            >>> print(enhanced)
            "A cheerful Milady NFT character joyfully celebrating Thanksgiving..."
        """
        # 使用 Prompt Enhancer 增强提示词
        if self.prompt_enhancer and self.prompt_enhancer.is_available():
            enhanced_prompt = self.prompt_enhancer.enhance(
                prompt, bypass=bypass_enhancer, context="milady meme"
            )
        else:
            print("⚠️ Prompt Enhancer 不可用，使用原始提示词")
            enhanced_prompt = prompt

        print(f"\n{'='*70}")
        print(f"✨ 增强后的提示词：")
        print(f"{'='*70}")
        print(enhanced_prompt)
        print(f"{'='*70}\n")

        # TODO: 未来这里会调用 Text-to-Image 模型生成图像
        # 目前暂时返回增强后的提示词
        print("💡 提示：Text-to-Image 功能尚未实现")
        print("   增强后的提示词已显示在上方")
        print("   未来可以用于 Effect/Mirage 功能的图像生成")

        return enhanced_prompt


def main():
    """测试 V2 生成器"""

    gen = MemeGeneratorV2()

    print("\n" + "=" * 60)
    print("🧪 测试 1: 使用 NFT #0，添加装饰，加上 GM 文字")
    print("=" * 60)

    gen.generate(
        nft_id=0,
        layers={"Hat": "Cowboy Hat.png", "Glasses": "Heart Glasses.png"},
        top_text="GM BUILDERS",
        bottom_text="LFG",
    )

    print("\n" + "=" * 60)
    print("🧪 测试 2: 随机 NFT + 随机图层 + 模板文字")
    print("=" * 60)

    gen.generate_from_template("crypto")

    print("\n" + "=" * 60)
    print("🧪 测试 3: 批量生成 3 个 GM Meme")
    print("=" * 60)

    gen.batch_generate(count=3, template_name="gm")

    print("\n✅ 所有测试完成！")


if __name__ == "__main__":
    main()
