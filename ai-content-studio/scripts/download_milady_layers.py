#!/usr/bin/env python3
"""
下载 Milady Maker 所有图层素材
从 maker.remilia.org 提取并下载所有 PNG 图层
"""

import requests
import json
import os
import sys
from pathlib import Path
from urllib.parse import urljoin

# 强制刷新输出
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)

# 基础 URL
BASE_URL = "https://maker.remilia.org/"

# 图层数据（从网页源码提取）
LAYER_DATA = {
    "attributeLayers": [
        {
            "name": "Background",
            "images": ["Bjork.png", "Bushland.png", "Casino.png", "Clouds.png", "Harajuku.png", "Mountain.png", "Nagano.png", "Roadside.png", "Sonora.png", "Streets.png", "Sunrise.png", "Sunset.png", "Tennis.png", "Train.png", "XP.png", "Yashima.png", "chiyo.png", "haruhi.png", "hikari.png", "lain.png", "misato.png", "puripurin.png"],
            "z": 0
        },
        {
            "name": "Skin",
            "images": ["Alien.png", "Black.png", "Clay.png", "Pale.png", "Pink.png", "Tan.png"],
            "z": 1
        },
        {
            "name": "Face",
            "images": ["Big Blush.png", "Blush.png", "Freckles.png", "Line Blush.png", "Oval Blush.png"],
            "z": 2
        },
        {
            "name": "Eyes",
            "images": ["Alien.png", "Chinese.png", "Classic.png", "Closed.png", "Crying.png", "Dilated.png", "Heart.png", "Sleepy.png", "Smug.png", "Sparkle.png", "Spiral.png", "Teary.png"],
            "z": 3
        },
        {
            "name": "Eye Color",
            "images": ["Aqua.png", "Blue.png", "Brown.png", "Gold.png", "Green.png", "Grey.png", "Leaf.png", "Lilac.png"],
            "z": 4
        },
        {
            "name": "Mouth",
            "images": ["3.png", "Cat.png", "Crooked.png", "Flat.png", "Hm.png", "Open.png", "Pout.png", "Smile A.png", "Smile B.png", "Smile C.png", "Smoking.png", "Smug.png", "Straw.png", "Vamp.png", "W.png"],
            "z": 4
        },
        {
            "name": "Neck",
            "images": ["Anime Chest Tattoo.png", "Castle Neck Tattoo.png", "Lean Neck Tattoo.png", "Spider Neck Tattoo.png"],
            "z": 5,
            "isOptional": True
        },
        {
            "name": "Necklaces",
            "images": ["Cherry Necklace.png", "Coral Cross Necklace.png", "ETH Necklace.png", "Evil Eye Necklace.png", "Fliphone Lanyard.png", "Girl Necklace.png", "Lean Neck Tattoo.png", "Mestwood Pearl Necklace.png", "Milady Beads.png", "Neckscarf.png", "Silver Coin Necklace.png", "Smiley Bead Necklace.png"],
            "z": 5,
            "isOptional": True
        },
        {
            "name": "Shirt",
            "images": ["Active Dissident Shirt.png", "Bear Sweater.png", "Black Blazer.png", "Blank Tank.png", "Blue Pink Shirt.png", "Blue Ribbon Tank.png", "Blue Sweatervest.png", "Bosozuku Jacket.png", "Bowling Shirt Oriental.png", "Bowling Shirt.png", "Cactus Shirt.png", "Cardigan Tee.png", "Chore Coat.png", "Fleece Paisley Jacket.png", "Football Shirt.png", "Fur Coat.png", "Fuzzy Coat.png", "Gold Spray Puffer.png", "Goth Harajuku.png", "Goth Poncho.png", "Green Blazer.png", "Grey Puffer.png", "Heihei Shirt.png", "Hikki Condition Shirt.png", "Im Cute Im Punk Shirt.png", "Jesus Tank.png", "Knit Sweater.png", "Kogal Cardigan.png", "Leopard Polo.png", "Leopard Vest.png", "MWO Shirt.png", "Maf Creeper.png", "Maf Rothko.png", "Maid.png", "Malenciaga Jersey.png", "Malenciaga Neon.png", "Mape Hoodie.png", "Matagonia Pullover.png", "Meedles Tracksuit.png", "Meline Teddy.png", "Mouse Tank.png", "Peter Pan Collar Shirt.png", "Pink Coat.png", "Pink Knit Polo.png", "Red Puffer.png", "Remilia Tank.png", "Ribbon Lolita.png", "Sailor Lolita.png", "Sheep Pullover.png", "Silk Shirt.png", "Skull Sweater.png", "Special People Shirt.png", "Super Lover Shirt.png", "Sweater and Tie.png", "Tennis Outfit.png", "Tie Dye Shirt.png", "Ulzzang Coat.png", "Western Jacket.png", "Zip Polo.png"],
            "z": 6,
            "isOptional": True
        },
        {
            "name": "Hair",
            "images": ["Bowl Black.png", "Bowl Blue.png", "Bowl Brown.png", "Bowl Green.png", "Bowl Harajuku Dye.png", "Bowl Purple.png", "Bowl Slate.png", "Braid Black.png", "Braid Blue.png", "Braid Brown.png", "Braid Green.png", "Braid Purple.png", "Braids Harajuku Dye.png", "OG Black.png", "OG Blonde.png", "OG Blue.png", "OG Frosted Blonde.png", "OG Frosted Purple.png", "OG Green.png", "OG Orange.png", "OG Slate.png", "Short Blonde.png", "Short Blue.png", "Short Green.png", "Short Orange.png", "Short Pink.png", "Straight Black.png", "Tuft Blue.png", "Tuft Brown.png", "Tuft Dark.png", "Tuft Green.png", "Tuft Purple.png"],
            "z": 7
        },
        {
            "name": "Brows",
            "images": ["Complacent A.png", "Complacent B.png", "Concerned A.png", "Concerned B.png", "Concerned C.png", "Flat.png"],
            "z": 8
        },
        {
            "name": "Earrings",
            "images": ["Bar Piercings.png", "Burger Earring.png", "Celine Dog.png", "Chain Earrings.png", "Cherry Earring.png", "Chrome Cross.png", "Cross Earring.png", "Diamond Stud.png", "Double Safety Pins.png", "Dual Rings Gold.png", "Dual Rings Silver.png", "Flower Earring.png", "Heart Pearls Earring.png", "Loop Chain Earring.png", "Safety Pin Piercing.png", "Strawberry Earring.png"],
            "z": 9,
            "isOptional": True
        },
        {
            "name": "Face Decoration",
            "images": ["Black Hearts Tattoo.png", "Crescent Tattoo.png", "Face Piercings.png", "Gucci Cone Tattoo.png", "Milady Pilled Tattoo.png", "Nose Ring Gold.png", "Nose Ring Silver.png", "Snakebites.png", "Star Heart Tattoo.png", "Teardrops Tattoo.png", "Temple Cross Tattoo.png", "Tyson Tribal Tattoo.png"],
            "z": 10,
            "isOptional": True
        },
        {
            "name": "Glasses",
            "images": ["Cobain Glasses.png", "Harajuku Glasses.png", "Larry Glasses.png", "Moakleys.png", "Mottega Sunglasses Blue.png", "Mottega Sunglasses Yellow.png", "Prescription Glasses.png", "Round Glasses.png", "Sunglasses.png", "YY Glasses.png"],
            "z": 10,
            "isOptional": True
        },
        {
            "name": "Hat",
            "images": ["Alien Hat.png", "Aloha Visor.png", "Backwards Trucker Pink.png", "Bandana.png", "Bean Hat.png", "Bear Ears.png", "Bear Hat.png", "Beret.png", "Blue Cap.png", "Blue Pink Bow.png", "Brown Cowboy Hat.png", "Buckethat.png", "Cake Hat.png", "Cat Earmuffs.png", "Cat Ears with Bell.png", "Cross Cap Pink.png", "Cross Cap White.png", "Denim Cap.png", "Denim Fish Cap.png", "Denim USA Cap.png", "Dubai Hat.png", "Earflap Cap.png", "Fez.png", "Flower Clip.png", "Fuzz Earmuffs.png", "Goth Headband.png", "Halo.png", "Heihei Hat.png", "Ivy Cap.png", "Kossphones.png", "Maid Hat.png", "Meedles Headband.png", "Migoko Hat.png", "Miteryx Beanie.png", "Orange Beret.png", "Pink Bonnet.png", "Pink Bow.png", "Plaid Bonnet.png", "Rhinestone Skull Cap.png", "Sailor Hat.png", "Shy Saints Cap.png", "Spotted Fur Hat.png", "Strawberry Hat.png", "Tennis Visor.png", "Treeprint Bucket.png", "Trucker Anime.png", "Trucker Black.png", "Trucker Construction.png", "Trucker Gothic Milady.png", "Trucker Hat 911.png", "Trucker Im So.png", "Trucker Oasis.png", "Trucker Pink Camo.png", "Trucker White Rabbit.png", "Varsity Cap.png", "White Cowboy Hat.png", "Workin Cap.png"],
            "z": 11,
            "isOptional": True
        },
        {
            "name": "Overlay",
            "images": ["100Crazy.png", "Add Text.png", "Allegations.png", "Banana Sticker.png", "Birthday Hat.png", "Cancelled.png", "Chat Bubble.png", "Clippy.png", "Counterstrike.png", "Doomguy.png", "Face Sticker.png", "Fraps.png", "Gunpoint.png", "Halo No Gun.png", "Halo.png", "Hanging In There Star.png", "Heart Meme.png", "Home Along.png", "HyperCam.png", "Is Your Child A Milady.png", "Love Is Violence.png", "Love Love.png", "M1 Blood.png", "M2 Blood.png", "M3 Blood.png", "M4 Blood.png", "Milady Is For.png", "Milady Stare.png", "Milady.png", "Motivational.png", "Orange.png", "Party Hat.png", "Please Respond.png", "Poverty.png", "Prayer.png", "Sniper.png", "Soyface.png", "Stars.png", "Tap To Add Text.png", "Tolking 2 My Frends.png", "Top Text.png", "U Pray On My Downfall.png"],
            "z": 13,
            "isOptional": True
        }
    ]
}


def download_layer(layer_name: str, image_name: str, output_dir: Path) -> bool:
    """下载单个图层文件"""
    # 正确的路径格式: /fullRes/Milady/{layer_name}/{image_name}
    url = urljoin(BASE_URL, f"fullRes/Milady/{layer_name}/{image_name}")

    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            # 保存文件
            layer_dir = output_dir / layer_name
            layer_dir.mkdir(parents=True, exist_ok=True)

            file_path = layer_dir / image_name
            with open(file_path, 'wb') as f:
                f.write(response.content)

            file_size = len(response.content) / 1024  # KB
            print(f"✅ {layer_name}/{image_name} ({file_size:.1f} KB)")
            return True
    except Exception as e:
        print(f"❌ {layer_name}/{image_name}: {e}")
        return False

    print(f"❌ {layer_name}/{image_name}: HTTP {response.status_code}")
    return False


def main():
    print("🎨 Milady Maker 图层下载工具")
    print("=" * 70)

    # 输出目录
    output_dir = Path(__file__).parent.parent / "assets" / "milady_layers"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"📁 输出目录: {output_dir}")
    print()

    # 统计
    total_layers = 0
    success_count = 0
    failed_layers = []

    # 遍历所有图层
    for layer in LAYER_DATA["attributeLayers"]:
        layer_name = layer["name"]
        images = layer["images"]
        z_index = layer.get("z", 0)
        is_optional = layer.get("isOptional", False)

        print(f"\n📂 {layer_name} (z={z_index}, 可选={is_optional})")
        print(f"   共 {len(images)} 个图片")

        for image_name in images:
            total_layers += 1
            if download_layer(layer_name, image_name, output_dir):
                success_count += 1
            else:
                failed_layers.append(f"{layer_name}/{image_name}")

    # 保存配置文件
    config_file = output_dir / "layer_config.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(LAYER_DATA, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 70)
    print("📊 下载统计")
    print("=" * 70)
    print(f"总计: {total_layers} 个图层")
    print(f"成功: {success_count} 个")
    print(f"失败: {len(failed_layers)} 个")

    if failed_layers:
        print("\n❌ 失败的图层:")
        for layer in failed_layers[:10]:  # 只显示前 10 个
            print(f"   - {layer}")
        if len(failed_layers) > 10:
            print(f"   ... 还有 {len(failed_layers) - 10} 个")

    print(f"\n✅ 配置文件已保存: {config_file}")
    print("\n🎉 下载完成！")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ 用户取消")
    except Exception as e:
        print(f"\n\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
