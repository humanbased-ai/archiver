#!/usr/bin/env python3
"""
Prompt Enhancer - 提示词增强器

将简短的用户输入扩展成详细的、专业级的 Meme 生成提示词
类似于 AlphaKek.ai 的 Prompt Enhancer 功能
"""

import os
from typing import Optional
from anthropic import Anthropic


class PromptEnhancer:
    """提示词增强器 - 使用 Claude API 扩展简短提示"""

    MAX_LENGTH_FOR_ENHANCEMENT = 350  # 超过此长度则跳过增强

    def __init__(self, api_key: Optional[str] = None):
        """
        初始化 Prompt Enhancer

        Args:
            api_key: Anthropic API key (默认从环境变量读取)
        """
        # 尝试从多个环境变量读取
        self.api_key = (
            api_key or os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
        )

        if not self.api_key:
            print(
                "⚠️ 警告: 未设置 ANTHROPIC_API_KEY 或 CLAUDE_API_KEY，Prompt Enhancer 将不可用"
            )
            print("💡 设置方法: export ANTHROPIC_API_KEY='your-api-key'")
            print("   或: export CLAUDE_API_KEY='your-api-key'")
            self.client = None
        else:
            self.client = Anthropic(api_key=self.api_key)
            print("✅ Prompt Enhancer 已初始化")

    def enhance(
        self, prompt: str, bypass: bool = False, context: str = "milady meme"
    ) -> str:
        """
        增强提示词

        Args:
            prompt: 原始用户输入
            bypass: 是否跳过增强（对应 -raw 标志）
            context: 上下文类型（用于定制增强风格）

        Returns:
            增强后的提示词（如果跳过或失败，返回原始输入）

        示例:
            输入: "milady celebrating thanksgiving"
            输出: "A Milady NFT character joyfully celebrating Thanksgiving,
                   wearing a pilgrim hat, surrounded by autumn decorations..."
        """
        # 检查是否跳过
        if bypass:
            print("🔄 使用 -raw 标志，跳过提示词增强")
            return prompt

        # 检查长度
        if len(prompt) > self.MAX_LENGTH_FOR_ENHANCEMENT:
            print(
                f"📏 提示词长度 ({len(prompt)}) 超过 {self.MAX_LENGTH_FOR_ENHANCEMENT}，跳过增强"
            )
            return prompt

        # 检查客户端
        if not self.client:
            print("⚠️ Prompt Enhancer 不可用，返回原始提示词")
            return prompt

        # 调用 Claude API 增强
        try:
            print(f"🚀 正在增强提示词: '{prompt}'")

            enhanced = self._call_claude_api(prompt, context)

            print(f"✅ 增强完成")
            print(f"📝 原始: {prompt}")
            print(f"✨ 增强: {enhanced[:100]}...")

            return enhanced

        except Exception as e:
            print(f"⚠️ 提示词增强失败: {e}")
            print(f"🔄 返回原始提示词")
            return prompt

    def _call_claude_api(self, prompt: str, context: str) -> str:
        """
        调用 Claude API 进行提示词增强

        Args:
            prompt: 原始提示词
            context: 上下文类型

        Returns:
            增强后的提示词
        """
        # 构建系统提示
        system_prompt = self._build_system_prompt(context)

        # 调用 API
        response = self.client.messages.create(
            model="claude-3-5-haiku-20241022",  # 使用 Haiku 快速且便宜
            max_tokens=500,
            temperature=0.7,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Enhance this prompt: {prompt}"}],
        )

        # 提取响应
        enhanced = response.content[0].text.strip()

        return enhanced

    def _build_system_prompt(self, context: str) -> str:
        """
        构建系统提示词

        Args:
            context: 上下文类型

        Returns:
            系统提示词
        """
        if context == "milady meme":
            return """You are a professional meme prompt enhancer for Milady NFT meme generation.

Your task is to take short, vague user prompts and expand them into detailed, creative descriptions optimized for meme generation.

Guidelines:
- Expand the prompt with vivid details about the scene, character, mood, and visual style
- Keep the Milady NFT aesthetic in mind (cute, internet culture, Gen-Z, crypto-native)
- Add details about colors, lighting, composition, and atmosphere
- Make it creative and fun, suitable for viral meme content
- Keep the enhanced prompt under 200 words
- Output ONLY the enhanced prompt, no explanations

Examples:

Input: "milady celebrating thanksgiving"
Output: A cheerful Milady NFT character joyfully celebrating Thanksgiving, wearing a cute pilgrim hat with autumn leaves tucked in. She's surrounded by warm orange and golden autumn decorations, sitting at a cozy table filled with traditional dishes. The scene has a warm, nostalgic glow with soft lighting. Fall colors dominate - burnt orange, deep reds, golden yellows. The mood is wholesome and festive, capturing internet culture's ironic yet genuine appreciation for traditional holidays. Style: kawaii meets Americana, with subtle crypto references in the background.

Input: "gm builders"
Output: An energetic Milady NFT character greeting the day with pure builder energy. She's wearing construction gear - hard hat, safety vest - but make it fashion. Background shows a digital construction site with half-built blockchain infrastructure, pixelated cranes, and glowing green charts going up. Sunrise lighting with warm golden hour glow. Text "GM BUILDERS" in bold impact font. The vibe is optimistic, determined, and community-focused. Colors: construction yellow, safety orange, dawn pink, with neon accents. Style: internet optimism meets startup grindset culture.

Input: "wen moon"
Output: A dreamy Milady NFT character gazing upward at a massive glowing moon made of cryptocurrency coins. She's reaching toward the sky with hopeful expression. The scene is set in a surreal crypto landscape with floating charts, rocket ships in the distance, and diamond hands imagery. Starry night sky with purple and blue gradient. The moon has a golden glow casting ethereal light. Mood: hopeful yearning mixed with ironic self-awareness of crypto culture. Text "WEN MOON" in glowing neon font. Style: vaporwave meets financial nihilism, dreamy yet meme-able."""

        elif context == "general meme":
            return """You are a professional meme prompt enhancer.

Your task is to take short, vague user prompts and expand them into detailed, creative descriptions optimized for meme generation.

Guidelines:
- Expand the prompt with vivid details about the scene, mood, and visual style
- Add details about colors, lighting, composition, and atmosphere
- Make it creative, funny, and suitable for viral meme content
- Keep the enhanced prompt under 200 words
- Output ONLY the enhanced prompt, no explanations"""

        else:
            return """You are a professional prompt enhancer for image generation.

Expand short prompts into detailed, vivid descriptions with specific details about:
- Visual composition and framing
- Colors and lighting
- Mood and atmosphere
- Style and aesthetic

Keep output under 200 words. Output ONLY the enhanced prompt."""

    def is_available(self) -> bool:
        """检查 Prompt Enhancer 是否可用"""
        return self.client is not None


# CLI 测试
if __name__ == "__main__":
    print("=" * 70)
    print("🧪 测试 Prompt Enhancer")
    print("=" * 70)

    enhancer = PromptEnhancer()

    if not enhancer.is_available():
        print("\n❌ 错误: 未设置 ANTHROPIC_API_KEY")
        print("💡 请设置环境变量:")
        print("   export ANTHROPIC_API_KEY='your-api-key'")
        exit(1)

    # 测试用例
    test_prompts = [
        "milady celebrating thanksgiving",
        "gm builders",
        "wen moon",
        "milady with sunglasses",
        "crypto trading at 3am",
    ]

    print("\n" + "=" * 70)
    print("📝 开始测试...")
    print("=" * 70)

    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n{'=' * 70}")
        print(f"测试 {i}/{len(test_prompts)}")
        print(f"{'=' * 70}")

        enhanced = enhancer.enhance(prompt, context="milady meme")

        print(f"\n✅ 完成")
        print(f"📥 原始: {prompt}")
        print(f"📤 增强:\n{enhanced}\n")

    print("\n" + "=" * 70)
    print("✅ 所有测试完成！")
    print("=" * 70)
