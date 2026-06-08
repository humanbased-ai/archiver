#!/usr/bin/env python3
"""检查缺失的图层"""

import json
from pathlib import Path

# 官方图层配置（从网站获取）
OFFICIAL_LAYERS = {
    "Background": 22,
    "Skin": 6,
    "Face": 5,
    "Eyes": 12,
    "Eye Color": 8,
    "Eyes-Mask": 7,  # 这个可能缺失
    "Mouth": 15,
    "Neck": 4,
    "Necklaces": 12,
    "Shirt": 57,
    "Hair": 31,
    "Brows": 6,
    "Earrings": 16,
    "Face Decoration": 12,
    "Glasses": 10,
    "Hat": 57,
    "Overlay": 41,
    "UnclothedBase": 6  # 这个可能缺失
}

# 检查本地下载的图层
layer_dir = Path("assets/milady_layers")
local_layers = {}

for category_dir in layer_dir.iterdir():
    if category_dir.is_dir():
        count = len(list(category_dir.glob("*.png")))
        local_layers[category_dir.name] = count

print("📊 图层对比检查\n")
print(f"{'类别':<20} {'官方':<8} {'本地':<8} {'状态'}")
print("=" * 50)

total_official = 0
total_local = 0
missing_categories = []

for category, official_count in OFFICIAL_LAYERS.items():
    local_count = local_layers.get(category, 0)
    total_official += official_count
    total_local += local_count
    
    status = "✅" if local_count == official_count else "❌ 缺失"
    if local_count < official_count:
        missing_categories.append(f"{category} (缺 {official_count - local_count})")
    
    print(f"{category:<20} {official_count:<8} {local_count:<8} {status}")

print("=" * 50)
print(f"{'总计':<20} {total_official:<8} {total_local:<8}")
print()

if missing_categories:
    print("⚠️  缺失的类别:")
    for cat in missing_categories:
        print(f"   - {cat}")
else:
    print("✅ 所有图层已完整下载！")

print(f"\n完成度: {total_local}/{total_official} ({total_local*100/total_official:.1f}%)")
