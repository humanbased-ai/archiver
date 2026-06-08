#!/usr/bin/env python3
"""
简化版 Milady NFT 下载器 - 专注于图片下载
"""

import os
import json
import time
import requests
from pathlib import Path

# 官方 NFT 图片地址
MILADY_IMAGE_BASE = "https://www.miladymaker.net/milady/"
MILADY_CONTRACT = "0x5Af0D9827E0c53E4799BB226655A1de152A425a5"

# 输出目录
IMAGES_DIR = Path("assets/milady_nfts/images")
INFO_DIR = Path("assets/milady_nfts")

# 创建目录
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def download_nft_image(token_id: int, session: requests.Session) -> bool:
    """下载单个 NFT 图片"""

    image_path = IMAGES_DIR / f"milady_{token_id}.png"

    # 跳过已存在的文件
    if image_path.exists():
        return True

    try:
        # 下载图片
        url = f"{MILADY_IMAGE_BASE}{token_id}.png"
        response = session.get(url, timeout=15, stream=True)

        if response.status_code == 200:
            with open(image_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            # 创建简单的 info 文件
            info = {
                "token_id": token_id,
                "name": f"Milady #{token_id}",
                "image_url": url,
                "contract": MILADY_CONTRACT,
                "local_image_path": str(image_path)
            }

            info_path = INFO_DIR / f"milady_{token_id}_info.json"
            with open(info_path, 'w') as f:
                json.dump(info, f, indent=2)

            return True
        else:
            print(f"❌ #{token_id}: HTTP {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ #{token_id}: {e}")
        return False


def download_all(start_id=0, end_id=9999, batch_delay=0.2):
    """下载所有 NFT"""

    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })

    print(f"\n🚀 开始下载 Milady NFTs ({start_id} - {end_id})")
    print(f"📁 输出目录: {IMAGES_DIR}\n")

    success_count = 0
    failed_count = 0
    skipped_count = 0

    for token_id in range(start_id, end_id + 1):
        image_path = IMAGES_DIR / f"milady_{token_id}.png"

        if image_path.exists():
            skipped_count += 1
            if token_id % 100 == 0:
                print(f"⏭️  #{token_id} (已存在)")
        else:
            if download_nft_image(token_id, session):
                success_count += 1
                if (success_count + failed_count) % 10 == 0 or success_count % 100 == 0:
                    print(f"✅ #{token_id}")
            else:
                failed_count += 1

            # 延迟
            time.sleep(batch_delay)

        # 每 100 个输出进度
        if (token_id + 1) % 100 == 0:
            total_done = success_count + skipped_count
            percentage = (total_done / 10000) * 100
            print(f"\n📊 进度: {total_done}/10,000 ({percentage:.1f}%)")
            print(f"   新下载: {success_count}, 跳过: {skipped_count}, 失败: {failed_count}\n")

    # 最终统计
    total_done = success_count + skipped_count
    print(f"\n{'='*50}")
    print(f"✅ 下载完成！")
    print(f"{'='*50}")
    print(f"新下载: {success_count}")
    print(f"跳过(已存在): {skipped_count}")
    print(f"失败: {failed_count}")
    print(f"总计完成: {total_done}/10,000")

    # 创建索引
    create_index()


def create_index():
    """创建 NFT 索引"""
    index = []

    for info_file in sorted(INFO_DIR.glob("milady_*_info.json")):
        try:
            with open(info_file, 'r') as f:
                info = json.load(f)
                index.append({
                    "token_id": info["token_id"],
                    "name": info["name"],
                    "image_path": info["local_image_path"]
                })
        except:
            pass

    index.sort(key=lambda x: x["token_id"])

    index_path = INFO_DIR / "milady_nfts_index.json"
    with open(index_path, 'w') as f:
        json.dump(index, f, indent=2)

    print(f"\n📋 索引已创建: {index_path} ({len(index)} NFTs)")


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════╗
║       Milady NFT Downloader (Simple Version)           ║
║       简化版 - 专注图片下载                              ║
╚══════════════════════════════════════════════════════════╝
    """)

    try:
        download_all(0, 9999, batch_delay=0.2)
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断")
        print("可以重新运行继续下载（会自动跳过已下载的文件）")
        create_index()
