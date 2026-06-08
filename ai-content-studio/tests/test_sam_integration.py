#!/usr/bin/env python3
"""
测试 SAM 集成到 FLUX Fill Pro
验证所有 6 种配饰类型的自动检测功能
"""

import os
import sys
from pathlib import Path
import requests
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from meme.flux_fill_pro import FluxFillPro


# 测试用例配置
TEST_CASES = [
    {
        "nft_id": 5050,
        "accessory_type": "hat",
        "expected_attribute": "Hat: beret",
        "description": "帽子检测测试 (Beret)"
    },
    {
        "nft_id": 5050,
        "accessory_type": "glasses",
        "expected_attribute": "Glasses: purple",
        "description": "眼镜检测测试 (Purple Glasses)"
    },
    {
        "nft_id": 3274,
        "accessory_type": "earrings",
        "expected_attribute": "Earring: dual rings silver",
        "description": "耳环检测测试 (Dual Rings Silver)"
    },
    {
        "nft_id": 8888,  # 需要找一个有项链的
        "accessory_type": "necklace",
        "expected_attribute": "Necklace",
        "description": "项链检测测试"
    }
]


def fetch_nft_image(nft_id: int, output_dir: str = "temp/test_nfts") -> str:
    """
    从 miladymaker.net 下载 NFT 图像

    Args:
        nft_id: NFT ID
        output_dir: 输出目录

    Returns:
        下载的图像路径
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    nft_path = output_path / f"milady_{nft_id}.png"

    # 如果已经存在，直接返回
    if nft_path.exists():
        print(f"✅ NFT #{nft_id} 已存在")
        return str(nft_path)

    print(f"⬇️  下载 NFT #{nft_id}...")
    url = f"https://www.miladymaker.net/milady/{nft_id}.png"

    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            with open(nft_path, 'wb') as f:
                f.write(response.content)

            # Resize to 500x500 for consistency
            img = Image.open(nft_path)
            img_resized = img.resize((500, 500), Image.Resampling.LANCZOS)
            img_resized.save(nft_path)

            print(f"✅ NFT #{nft_id} 下载完成")
            return str(nft_path)
        else:
            print(f"❌ NFT #{nft_id} 下载失败: HTTP {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ NFT #{nft_id} 下载失败: {e}")
        return None


def test_sam_detection_only():
    """
    测试 SAM 检测功能（不进行实际替换）
    验证所有配饰类型都能被正确检测
    """
    print("\n" + "="*60)
    print("🧪 SAM 配饰检测测试")
    print("="*60)

    # 初始化 FLUX Fill Pro with SAM enabled
    print("\n📦 初始化 FLUX Fill Pro (启用 SAM)...")
    flux = FluxFillPro(use_sam=True)

    results = []

    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"\n{'='*60}")
        print(f"测试 {i}/{len(TEST_CASES)}: {test_case['description']}")
        print(f"NFT ID: {test_case['nft_id']}")
        print(f"配饰类型: {test_case['accessory_type']}")
        print(f"预期属性: {test_case['expected_attribute']}")
        print(f"{'='*60}")

        # 下载 NFT
        nft_path = fetch_nft_image(test_case['nft_id'])
        if not nft_path:
            results.append({
                **test_case,
                "status": "FAILED",
                "reason": "无法下载 NFT"
            })
            continue

        # 使用 SAM 检测
        try:
            predefined = flux.ACCESSORY_REGIONS.get(test_case['accessory_type'], {}).get("region")
            detected_region = flux.sam_detector.detect_accessory(
                image_path=nft_path,
                accessory_type=test_case['accessory_type'],
                predefined_region=predefined
            )

            if detected_region:
                results.append({
                    **test_case,
                    "status": "SUCCESS",
                    "detected_region": detected_region,
                    "predefined_region": predefined
                })
                print(f"✅ 检测成功: {detected_region}")
            else:
                results.append({
                    **test_case,
                    "status": "FAILED",
                    "reason": "SAM 未检测到配饰"
                })
                print(f"❌ 检测失败")

        except Exception as e:
            results.append({
                **test_case,
                "status": "ERROR",
                "reason": str(e)
            })
            print(f"❌ 检测出错: {e}")

    # 汇总报告
    print("\n" + "="*60)
    print("📊 测试结果汇总")
    print("="*60)

    success_count = sum(1 for r in results if r['status'] == 'SUCCESS')
    failed_count = sum(1 for r in results if r['status'] == 'FAILED')
    error_count = sum(1 for r in results if r['status'] == 'ERROR')

    print(f"\n总计测试: {len(results)}")
    print(f"✅ 成功: {success_count}")
    print(f"❌ 失败: {failed_count}")
    print(f"⚠️  错误: {error_count}")

    # 详细结果
    print("\n详细结果:")
    for r in results:
        status_icon = "✅" if r['status'] == 'SUCCESS' else "❌"
        print(f"\n{status_icon} {r['description']}")
        print(f"   NFT: #{r['nft_id']}")
        print(f"   状态: {r['status']}")
        if r['status'] == 'SUCCESS':
            print(f"   检测区域: {r['detected_region']}")
            print(f"   预定义区域: {r['predefined_region']}")
        else:
            print(f"   原因: {r.get('reason', 'Unknown')}")

    # 返回结果
    return results


def test_sam_with_flux_fill():
    """
    测试 SAM + FLUX Fill Pro 完整流程
    实际生成一张替换图片
    """
    print("\n" + "="*60)
    print("🎨 SAM + FLUX Fill Pro 集成测试")
    print("="*60)

    # 使用 NFT #5050 (hat) 进行测试
    nft_id = 5050
    accessory_type = "hat"
    new_description = "cyberpunk cap with neon blue lights, futuristic, highly detailed"

    print(f"\n📦 准备测试...")
    print(f"   NFT ID: {nft_id}")
    print(f"   配饰类型: {accessory_type}")
    print(f"   新描述: {new_description}")

    # 下载 NFT
    nft_path = fetch_nft_image(nft_id)
    if not nft_path:
        print("❌ 无法下载 NFT，测试中止")
        return

    # 初始化 FLUX Fill Pro with SAM
    flux = FluxFillPro(use_sam=True)

    # 输出路径
    output_path = "temp/test_output_sam_flux.png"

    try:
        print(f"\n🚀 开始替换配饰...")
        result_path = flux.replace_accessory(
            image_path=nft_path,
            accessory_type=accessory_type,
            new_description=new_description,
            output_path=output_path
        )

        print(f"\n✅ 测试完成！")
        print(f"   输出路径: {result_path}")
        print(f"\n💡 请查看生成的图片以验证效果")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


def test_comparison():
    """
    对比测试：SAM vs 预定义区域
    生成两张图片，分别使用 SAM 和预定义区域
    """
    print("\n" + "="*60)
    print("🔬 SAM vs 预定义区域对比测试")
    print("="*60)

    nft_id = 5050
    accessory_type = "hat"
    new_description = "cyberpunk cap with neon blue lights, futuristic, highly detailed"

    # 下载 NFT
    nft_path = fetch_nft_image(nft_id)
    if not nft_path:
        print("❌ 无法下载 NFT，测试中止")
        return

    # 测试 1: 使用预定义区域
    print("\n" + "-"*60)
    print("1️⃣  使用预定义区域")
    print("-"*60)

    flux_predefined = FluxFillPro(use_sam=False)
    output_predefined = "temp/test_output_predefined.png"

    try:
        flux_predefined.replace_accessory(
            image_path=nft_path,
            accessory_type=accessory_type,
            new_description=new_description,
            output_path=output_predefined
        )
        print(f"✅ 预定义区域版本已生成: {output_predefined}")
    except Exception as e:
        print(f"❌ 预定义区域测试失败: {e}")

    # 测试 2: 使用 SAM
    print("\n" + "-"*60)
    print("2️⃣  使用 SAM 自动检测")
    print("-"*60)

    flux_sam = FluxFillPro(use_sam=True)
    output_sam = "temp/test_output_sam.png"

    try:
        flux_sam.replace_accessory(
            image_path=nft_path,
            accessory_type=accessory_type,
            new_description=new_description,
            output_path=output_sam
        )
        print(f"✅ SAM 版本已生成: {output_sam}")
    except Exception as e:
        print(f"❌ SAM 测试失败: {e}")

    print("\n" + "="*60)
    print("📊 对比测试完成")
    print("="*60)
    print(f"\n预定义区域: {output_predefined}")
    print(f"SAM 自动检测: {output_sam}")
    print(f"\n💡 请对比两张图片，查看 SAM 的检测精度")


def main():
    """主测试入口"""
    print("\n" + "="*60)
    print("🚀 SAM 集成测试套件")
    print("="*60)
    print("\n选择测试模式:")
    print("1. SAM 检测测试（仅检测，不生成图片）")
    print("2. SAM + FLUX Fill Pro 完整测试（生成 1 张图片）")
    print("3. 对比测试（生成 2 张图片：预定义 vs SAM）")
    print("4. 运行所有测试")

    choice = input("\n请选择 (1-4): ").strip()

    if choice == "1":
        test_sam_detection_only()
    elif choice == "2":
        test_sam_with_flux_fill()
    elif choice == "3":
        test_comparison()
    elif choice == "4":
        print("\n🏃 运行所有测试...")
        test_sam_detection_only()
        print("\n" + "="*80 + "\n")
        test_sam_with_flux_fill()
        print("\n" + "="*80 + "\n")
        test_comparison()
    else:
        print("❌ 无效选择")


if __name__ == "__main__":
    main()
