#!/usr/bin/env python3
"""
Download all 10,000 Milady NFT original images
Downloads each NFT image and tags with ID and owner address
"""

import os
import json
import time
import requests
from pathlib import Path
from typing import Dict, Optional

# Milady Maker NFT Contract
MILADY_CONTRACT = "0x5Af0D9827E0c53E4799BB226655A1de152A425a5"

# 官方 NFT 图片地址（直接访问，无需 IPFS）
MILADY_IMAGE_BASE = "https://www.miladymaker.net/milady/"

# IPFS gateway (备用)
IPFS_GATEWAY = "https://ipfs.io/ipfs/"

# 输出目录
OUTPUT_DIR = Path("assets/milady_nfts")
METADATA_DIR = OUTPUT_DIR / "metadata"
IMAGES_DIR = OUTPUT_DIR / "images"

# 创建目录
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)


class MiladyNFTDownloader:
    """Milady NFT 图片下载器"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

    def get_token_uri(self, token_id: int) -> Optional[str]:
        """
        获取 NFT 的 token URI（从合约或 OpenSea API）

        Args:
            token_id: NFT ID (0-9999)

        Returns:
            Token URI (IPFS 链接)
        """
        # 方法 1: 尝试从 OpenSea API 获取
        try:
            opensea_url = f"https://api.opensea.io/api/v2/chain/ethereum/contract/{MILADY_CONTRACT}/nfts/{token_id}"
            response = self.session.get(opensea_url, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if 'nft' in data and 'metadata_url' in data['nft']:
                    return data['nft']['metadata_url']

        except Exception as e:
            print(f"⚠️  OpenSea API 失败 (token {token_id}): {e}")

        # 方法 2: 使用标准 IPFS 路径（Milady 使用的格式）
        # Milady 的 metadata 存储在: ipfs://QmYzsXq5QuKcUuVwjz1VS4fPr6kCZdF1nZBBz3PmjhB8VW/{token_id}
        ipfs_hash = "QmYzsXq5QuKcUuVwjz1VS4fPr6kCZdF1nZBBz3PmjhB8VW"
        return f"ipfs://{ipfs_hash}/{token_id}"

    def download_metadata(self, token_id: int) -> Optional[Dict]:
        """
        下载 NFT 的 metadata JSON

        Args:
            token_id: NFT ID

        Returns:
            Metadata 字典
        """
        token_uri = self.get_token_uri(token_id)
        if not token_uri:
            return None

        # 转换 IPFS URI 为 HTTP URL
        if token_uri.startswith("ipfs://"):
            ipfs_hash = token_uri.replace("ipfs://", "")
            http_url = f"{IPFS_GATEWAY}{ipfs_hash}"
        else:
            http_url = token_uri

        try:
            response = self.session.get(http_url, timeout=30)
            if response.status_code == 200:
                metadata = response.json()

                # 保存 metadata
                metadata_path = METADATA_DIR / f"milady_{token_id}.json"
                with open(metadata_path, 'w') as f:
                    json.dump(metadata, f, indent=2)

                print(f"✅ Metadata {token_id}: {metadata.get('name', 'Unknown')}")
                return metadata

        except Exception as e:
            print(f"❌ 下载 metadata 失败 (token {token_id}): {e}")

        return None

    def download_image(self, token_id: int, image_url: str) -> bool:
        """
        下载 NFT 图片

        Args:
            token_id: NFT ID
            image_url: 图片 URL (可能是 IPFS 链接)

        Returns:
            是否成功
        """
        # 转换 IPFS URI
        if image_url.startswith("ipfs://"):
            ipfs_hash = image_url.replace("ipfs://", "")
            http_url = f"{IPFS_GATEWAY}{ipfs_hash}"
        else:
            http_url = image_url

        try:
            response = self.session.get(http_url, timeout=30, stream=True)
            if response.status_code == 200:
                # 保存图片
                image_path = IMAGES_DIR / f"milady_{token_id}.png"
                with open(image_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)

                print(f"✅ 图片 {token_id}: {image_path.name}")
                return True

        except Exception as e:
            print(f"❌ 下载图片失败 (token {token_id}): {e}")

        return False

    def get_owner_address(self, token_id: int) -> Optional[str]:
        """
        获取 NFT 当前持有者地址（从 OpenSea 或区块链）

        Args:
            token_id: NFT ID

        Returns:
            Owner 地址
        """
        try:
            # 使用 OpenSea API 获取 owner
            opensea_url = f"https://api.opensea.io/api/v2/chain/ethereum/contract/{MILADY_CONTRACT}/nfts/{token_id}"
            response = self.session.get(opensea_url, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if 'nft' in data and 'owners' in data['nft'] and len(data['nft']['owners']) > 0:
                    return data['nft']['owners'][0]['address']

        except Exception as e:
            print(f"⚠️  获取 owner 失败 (token {token_id}): {e}")

        return None

    def download_nft(self, token_id: int) -> bool:
        """
        下载单个 NFT（image + metadata + owner）

        Args:
            token_id: NFT ID (0-9999)

        Returns:
            是否成功
        """
        print(f"\n{'='*50}")
        print(f"📥 下载 Milady #{token_id}")
        print(f"{'='*50}")

        # 1. 直接从官网下载图片（最可靠的方法）
        image_url = f"{MILADY_IMAGE_BASE}{token_id}.png"
        success = self.download_image(token_id, image_url)

        if not success:
            print(f"❌ 跳过 #{token_id}（图片下载失败）")
            return False

        # 2. 尝试下载 metadata（可选，不影响图片下载）
        metadata = self.download_metadata(token_id)
        if metadata:
            print(f"✅ Metadata: {metadata.get('name', f'Milady #{token_id}')}")
        else:
            # 如果 metadata 下载失败，创建基础 metadata
            metadata = {
                "name": f"Milady #{token_id}",
                "image": image_url,
                "attributes": []
            }

        # 3. 获取 owner 地址（可选）
        owner = self.get_owner_address(token_id)

        # 4. 创建完整信息文件
        info = {
            "token_id": token_id,
            "name": metadata.get("name", f"Milady #{token_id}"),
            "owner": owner,
            "attributes": metadata.get("attributes", []),
            "image_url": image_url,
            "contract": MILADY_CONTRACT,
            "local_image_path": str(IMAGES_DIR / f"milady_{token_id}.png"),
            "local_metadata_path": str(METADATA_DIR / f"milady_{token_id}.json") if metadata else None
        }

        info_path = OUTPUT_DIR / f"milady_{token_id}_info.json"
        with open(info_path, 'w') as f:
            json.dump(info, f, indent=2)

        print(f"✅ 完成 Milady #{token_id}")
        if owner:
            print(f"   Owner: {owner}")

        return True

    def download_all(self, start_id: int = 0, end_id: int = 9999, batch_delay: int = 1):
        """
        下载所有 NFT

        Args:
            start_id: 起始 ID
            end_id: 结束 ID
            batch_delay: 每个 NFT 之间的延迟（秒）
        """
        print(f"\n🚀 开始下载 Milady NFTs ({start_id} - {end_id})")
        print(f"📁 输出目录: {OUTPUT_DIR}")
        print(f"⏱️  延迟设置: {batch_delay}s/NFT\n")

        success_count = 0
        failed_count = 0

        for token_id in range(start_id, end_id + 1):
            try:
                # 检查是否已下载
                image_path = IMAGES_DIR / f"milady_{token_id}.png"
                if image_path.exists():
                    print(f"⏭️  跳过 #{token_id}（已存在）")
                    success_count += 1
                    continue

                # 下载
                if self.download_nft(token_id):
                    success_count += 1
                else:
                    failed_count += 1

                # 延迟（避免被限流）
                if token_id < end_id:
                    time.sleep(batch_delay)

                # 每 100 个输出进度
                if (token_id + 1) % 100 == 0:
                    print(f"\n📊 进度: {token_id + 1}/{end_id + 1}")
                    print(f"   成功: {success_count}, 失败: {failed_count}\n")

            except KeyboardInterrupt:
                print(f"\n\n⚠️  用户中断")
                break
            except Exception as e:
                print(f"❌ 错误 (token {token_id}): {e}")
                failed_count += 1

        # 最终统计
        print(f"\n{'='*50}")
        print(f"✅ 下载完成！")
        print(f"{'='*50}")
        print(f"成功: {success_count}")
        print(f"失败: {failed_count}")
        print(f"总计: {success_count + failed_count}")
        print(f"\n📁 文件位置:")
        print(f"   图片: {IMAGES_DIR}")
        print(f"   Metadata: {METADATA_DIR}")
        print(f"   完整信息: {OUTPUT_DIR}")

        # 创建索引文件
        self.create_index()

    def create_index(self):
        """创建 NFT 索引文件"""
        index = []

        for info_file in OUTPUT_DIR.glob("milady_*_info.json"):
            try:
                with open(info_file, 'r') as f:
                    info = json.load(f)
                    index.append({
                        "token_id": info["token_id"],
                        "name": info["name"],
                        "owner": info.get("owner"),
                        "image_path": info["local_image_path"]
                    })
            except:
                pass

        # 按 token_id 排序
        index.sort(key=lambda x: x["token_id"])

        # 保存索引
        index_path = OUTPUT_DIR / "milady_nfts_index.json"
        with open(index_path, 'w') as f:
            json.dump(index, f, indent=2)

        print(f"\n📋 索引已创建: {index_path}")
        print(f"   包含 {len(index)} 个 NFT")


def main():
    """主函数"""
    downloader = MiladyNFTDownloader()

    print("""
╔══════════════════════════════════════════════════════════╗
║       Milady NFT Collection Downloader                  ║
║       下载所有 10,000 个 Milady NFT 原图                 ║
╚══════════════════════════════════════════════════════════╝

合约地址: 0x5Af0D9827E0c53E4799BB226655A1de152A425a5
总数量: 10,000 NFTs
    """)

    # 选择下载范围
    print("\n请选择下载选项：")
    print("1️⃣  下载全部 (0-9999)")
    print("2️⃣  下载测试集 (前 10 个)")
    print("3️⃣  自定义范围")
    print("4️⃣  继续上次下载")

    choice = input("\n请输入选项 (1-4): ").strip()

    if choice == "1":
        downloader.download_all(0, 9999, batch_delay=1)
    elif choice == "2":
        downloader.download_all(0, 9, batch_delay=1)
    elif choice == "3":
        start = int(input("起始 ID: "))
        end = int(input("结束 ID: "))
        downloader.download_all(start, end, batch_delay=1)
    elif choice == "4":
        # 查找最后下载的 ID
        existing_files = list(IMAGES_DIR.glob("milady_*.png"))
        if existing_files:
            last_id = max([int(f.stem.split("_")[1]) for f in existing_files])
            print(f"\n上次下载到: #{last_id}")
            downloader.download_all(last_id + 1, 9999, batch_delay=1)
        else:
            print("\n未找到已下载文件，从头开始")
            downloader.download_all(0, 9999, batch_delay=1)
    else:
        print("❌ 无效选项")


if __name__ == "__main__":
    main()
