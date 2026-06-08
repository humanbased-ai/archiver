#!/usr/bin/env python3
"""
Memegen.link API - 免费梗图生成
使用 memegen.link 的 100+ 模板创建经典梗图
"""

import requests
from pathlib import Path
from typing import Optional, Dict, List
from PIL import Image
from io import BytesIO


class MemegenAPI:
    """
    Memegen.link API 客户端

    特点：
    - 免费，无需 API key
    - 100+ 经典梗图模板
    - 支持自定义文字
    - 多种图片格式
    """

    BASE_URL = "https://api.memegen.link"

    # 常用模板映射（中文 -> 英文模板名）
    POPULAR_TEMPLATES = {
        # 对比/选择类
        "drake": "drake",  # Drake 选择
        "drakeposting": "drake",
        "分心男友": "db",  # Distracted Boyfriend
        "出轨": "db",
        "气球": "balloon",  # Running Away Balloon
        "两个都要": "both",  # Why Not Both?

        # 反应/情绪类
        "这很好": "fine",  # This is fine (着火的狗)
        "着火": "fine",
        "懵逼": "surprised",  # 惊讶
        "恐惧": "afraid",  # Afraid to Ask

        # 陈述/真相类
        "蜘蛛侠": "spiderman",  # 两个蜘蛛侠互指
        "指认": "spiderman",
        "古代外星人": "aag",  # Ancient Aliens Guy
        "外星人": "aag",

        # 经典梗图
        "一个不留": "oprah",  # 奥普拉：你得到，你也得到
        "奥普拉": "oprah",
        "到处都是": "buzz",  # X, X Everywhere
        "无处不在": "buzz",
        "一直都是": "astronaut",  # Always Has Been
        "宇航员": "astronaut",

        # 动物类
        "坏运": "blb",  # Bad Luck Brian
        "社恐": "awkward",  # Socially Awkward Penguin
        "买船猫": "boat",  # I Should Buy a Boat Cat

        # 其他
        "我不总是": "iw",  # The Most Interesting Man
        "为什么不": "both",  # Why Not Both
    }

    def __init__(self):
        """初始化 Memegen API"""
        pass

    def get_templates(self) -> List[Dict]:
        """
        获取所有可用模板

        Returns:
            模板列表
        """
        response = requests.get(f"{self.BASE_URL}/templates")
        response.raise_for_status()
        return response.json()

    def _encode_text(self, text: str) -> str:
        """
        编码文字以适配 memegen URL

        规则：
        - 空格 -> 下划线 _
        - 换行 -> ~n
        - ? -> ~q
        - % -> ~p
        - # -> ~h
        - / -> ~s
        - '' -> 双单引号 ''
        - 中文 -> URL encode

        Args:
            text: 原始文字

        Returns:
            编码后的文字
        """
        import urllib.parse

        text = text.replace(' ', '_')
        text = text.replace('\n', '~n')
        text = text.replace('?', '~q')
        text = text.replace('%', '~p')
        text = text.replace('#', '~h')
        text = text.replace('/', '~s')
        text = text.replace("'", "''")

        # URL encode（处理中文等特殊字符）
        text = urllib.parse.quote(text, safe='_~')

        return text

    def generate_meme(
        self,
        template: str,
        top_text: str = "",
        bottom_text: str = "",
        output_path: Optional[str] = None,
        format: str = "png",
        # 高级功能参数
        width: Optional[int] = None,
        height: Optional[int] = None,
        font: Optional[str] = None,
        style: Optional[str] = None,
        layout: Optional[str] = None,
        background: Optional[str] = None,
        color: Optional[str] = None
    ) -> str:
        """
        生成梗图（支持高级功能）

        Args:
            template: 模板名称（英文或中文）
            top_text: 上方文字
            bottom_text: 下方文字
            output_path: 输出路径（可选）
            format: 图片格式（png/jpg/webp/gif）

            高级功能：
            width: 图片宽度
            height: 图片高度
            font: 字体（titilliumweb/thick, kalam/comic, impact, notosans, etc.）
            style: 备用样式或图片URL（用于overlays）
            layout: 文字布局（top/default）
            background: 自定义背景图片URL
            color: 文字颜色，格式："color1,color2"（HTML颜色名或hex）

        Returns:
            输出图片路径
        """
        # 转换中文模板名
        if template in self.POPULAR_TEMPLATES:
            template = self.POPULAR_TEMPLATES[template]

        # 编码文字
        top_encoded = self._encode_text(top_text) if top_text else "_"
        bottom_encoded = self._encode_text(bottom_text) if bottom_text else "_"

        # 构建基础 URL
        url = f"{self.BASE_URL}/images/{template}/{top_encoded}/{bottom_encoded}.{format}"

        # 添加查询参数
        params = []
        if width:
            params.append(f"width={width}")
        if height:
            params.append(f"height={height}")
        if font:
            params.append(f"font={font}")
        if style:
            params.append(f"style={style}")
        if layout:
            params.append(f"layout={layout}")
        if background:
            params.append(f"background={background}")
        if color:
            params.append(f"color={color}")

        if params:
            url += "?" + "&".join(params)

        print(f"🎨 生成梗图: {template}")
        print(f"   上方文字: {top_text}")
        print(f"   下方文字: {bottom_text}")
        if params:
            print(f"   高级参数: {', '.join(params)}")
        print(f"   URL: {url}")

        # 下载图片
        response = requests.get(url)
        response.raise_for_status()

        img = Image.open(BytesIO(response.content))

        # 保存
        if output_path is None:
            output_path = f"output/memegen_{template}.{format}"

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path)

        print(f"✅ 已保存: {output_path}")

        return output_path

    def generate_custom(
        self,
        template: str,
        lines: List[str],
        output_path: Optional[str] = None,
        format: str = "png"
    ) -> str:
        """
        生成多行文字梗图

        Args:
            template: 模板名称
            lines: 文字行列表
            output_path: 输出路径
            format: 图片格式

        Returns:
            输出图片路径
        """
        # 转换中文模板名
        if template in self.POPULAR_TEMPLATES:
            template = self.POPULAR_TEMPLATES[template]

        # 编码所有行
        encoded_lines = [self._encode_text(line) for line in lines]
        text_path = "/".join(encoded_lines)

        # 构建 URL
        url = f"{self.BASE_URL}/images/{template}/{text_path}.{format}"

        print(f"🎨 生成多行梗图: {template}")
        for i, line in enumerate(lines, 1):
            print(f"   第{i}行: {line}")

        # 下载图片
        response = requests.get(url)
        response.raise_for_status()

        img = Image.open(BytesIO(response.content))

        # 保存
        if output_path is None:
            output_path = f"output/memegen_{template}.{format}"

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path)

        print(f"✅ 已保存: {output_path}")

        return output_path


def main():
    """测试函数"""
    api = MemegenAPI()

    print("="*70)
    print("🧪 测试 Memegen.link API")
    print("="*70)
    print()

    # 测试 1: Drake 模板
    print("测试 1: Drake 选择梗图")
    api.generate_meme(
        template="drake",
        top_text="使用复杂的 AI API",
        bottom_text="使用免费的 memegen.link",
        output_path="output/test_memegen_drake.png"
    )
    print()

    # 测试 2: 分心男友
    print("测试 2: 分心男友梗图")
    api.generate_meme(
        template="分心男友",
        top_text="Replicate (要钱)",
        bottom_text="Memegen (免费)",
        output_path="output/test_memegen_distracted.png"
    )
    print()

    # 测试 3: This is fine
    print("测试 3: This is fine 梗图")
    api.generate_meme(
        template="fine",
        top_text="Replicate 余额还没到账",
        bottom_text="This is fine",
        output_path="output/test_memegen_fine.png"
    )
    print()

    # 测试 4: 到处都是
    print("测试 4: 到处都是梗图")
    api.generate_meme(
        template="到处都是",
        top_text="Meme templates",
        bottom_text="Meme templates everywhere",
        output_path="output/test_memegen_everywhere.png"
    )
    print()

    print("="*70)
    print("🎉 所有测试完成！")
    print("="*70)
    print("\n生成的文件：")
    print("  - output/test_memegen_drake.png")
    print("  - output/test_memegen_distracted.png")
    print("  - output/test_memegen_fine.png")
    print("  - output/test_memegen_everywhere.png")


if __name__ == "__main__":
    main()
