#!/usr/bin/env python3
"""
下载 Milady 核心图层（快速版本）
只下载必需的基础图层，可以快速开始使用
"""

import requests
import sys
from pathlib import Path
from urllib.parse import urljoin

# 强制刷新输出
sys.stdout.reconfigure(line_buffering=True)

BASE_URL = "https://maker.remilia.org/"

# 核心图层（必需的基础图层）
CORE_LAYERS = {
    "Skin": ["Pale.png", "Tan.png", "Pink.png", "Black.png", "Clay.png", "Alien.png"],
    "Eyes": ["Classic.png", "Closed.png", "Smug.png", "Sparkle.png", "Heart.png"],
    "Eye Color": ["Blue.png", "Brown.png", "Green.png", "Grey.png"],
    "Mouth": ["Smile A.png", "Smile B.png", "Pout.png", "Cat.png", "Flat.png"],
    "Hair": ["OG Blonde.png", "OG Black.png", "OG Blue.png", "Short Pink.png", "Bowl Black.png"],
    "Brows": ["Flat.png", "Complacent A.png", "Concerned A.png"],
    "Face": ["Blush.png", "Big Blush.png"],
    # 可选但常用
    "Shirt": ["Blank Tank.png", "Maid.png", "Pink Coat.png"],
    "Hat": ["Beret.png", "Pink Bow.png"],
    "Background": ["Clouds.png", "XP.png", "Streets.png"],
}


def download_layer(layer_name: str, image_name: str, output_dir: Path) -> bool:
    """下载单个图层文件"""
    url = urljoin(BASE_URL, f"fullRes/Milady/{layer_name}/{image_name}")

    try:
        print(f"  📥 {image_name}...", end=" ", flush=True)
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            layer_dir = output_dir / layer_name
            layer_dir.mkdir(parents=True, exist_ok=True)

            file_path = layer_dir / image_name
            with open(file_path, 'wb') as f:
                f.write(response.content)

            file_size = len(response.content) / 1024
            print(f"✅ ({file_size:.1f} KB)")
            return True
        else:
            print(f"❌ HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {e}")
        return False


def main():
    print("🎨 Milady 核心图层下载工具（快速版本）")
    print("=" * 70)

    output_dir = Path(__file__).parent.parent / "assets" / "milady_layers"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"📁 输出目录: {output_dir}")
    print()

    total = sum(len(images) for images in CORE_LAYERS.values())
    success = 0
    failed = 0

    for layer_name, images in CORE_LAYERS.items():
        print(f"\n📂 {layer_name} ({len(images)} 个)")
        for image_name in images:
            if download_layer(layer_name, image_name, output_dir):
                success += 1
            else:
                failed += 1

    print("\n" + "=" * 70)
    print("📊 下载统计")
    print("=" * 70)
    print(f"总计: {total} 个文件")
    print(f"成功: {success} 个 ✅")
    print(f"失败: {failed} 个 ❌")
    print(f"\n✅ 核心图层下载完成！可以开始使用了。")
    print(f"💡 如需全部图层，运行: python3 scripts/download_milady_layers.py")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ 用户取消")
    except Exception as e:
        print(f"\n\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
