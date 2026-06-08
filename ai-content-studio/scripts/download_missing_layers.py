#!/usr/bin/env python3
"""下载缺失的图层"""

import requests
import json
from pathlib import Path

BASE_URL = "https://maker.remilia.org/fullRes/Milady"
OUTPUT_DIR = Path("assets/milady_layers")

# 缺失的类别
MISSING_LAYERS = {
    "Eyes-Mask": [
        "Balaclava.png",
        "Bandit.png", 
        "Domino.png",
        "Masked.png",
        "Red Eyes.png",
        "Ski Goggles.png",
        "Yellow Eyes.png"
    ],
    "UnclothedBase": [
        "Alien.png",
        "Black.png",
        "Clay.png", 
        "Pale.png",
        "Pink.png",
        "Tan.png"
    ]
}

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
})

print("🔍 开始下载缺失的图层...\n")

total_downloaded = 0
total_failed = 0

for category, images in MISSING_LAYERS.items():
    category_dir = OUTPUT_DIR / category
    category_dir.mkdir(exist_ok=True)
    
    print(f"\n📂 {category} ({len(images)} 个)")
    print("-" * 40)
    
    for image_name in images:
        image_path = category_dir / image_name
        
        if image_path.exists():
            print(f"⏭️  {image_name} (已存在)")
            continue
        
        url = f"{BASE_URL}/{category}/{image_name}"
        
        try:
            response = session.get(url, timeout=30)
            if response.status_code == 200:
                with open(image_path, 'wb') as f:
                    f.write(response.content)
                
                size_kb = len(response.content) / 1024
                print(f"✅ {image_name} ({size_kb:.1f} KB)")
                total_downloaded += 1
            else:
                print(f"❌ {image_name} (HTTP {response.status_code})")
                total_failed += 1
        
        except Exception as e:
            print(f"❌ {image_name}: {e}")
            total_failed += 1

print(f"\n{'='*40}")
print(f"✅ 下载完成！")
print(f"成功: {total_downloaded}")
print(f"失败: {total_failed}")
print(f"{'='*40}")
