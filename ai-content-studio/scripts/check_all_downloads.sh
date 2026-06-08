#!/bin/bash
echo "======================================"
echo "📊 Milady 下载进度总览"
echo "======================================"
echo ""

# NFT 图片下载
echo "1️⃣  NFT 原图下载"
echo "--------------------------------------"
nft_count=$(ls assets/milady_nfts/images/*.png 2>/dev/null | wc -l | tr -d ' ')
nft_size=$(du -sh assets/milady_nfts/images 2>/dev/null | cut -f1)
nft_pct=$(echo "scale=2; $nft_count * 100 / 10000" | bc 2>/dev/null || echo "0")

echo "   进度: ${nft_count}/10,000 (${nft_pct}%)"
echo "   大小: ${nft_size}"

if ps aux | grep -q "[d]ownload_milady_nfts_simple"; then
    echo "   状态: ✅ 运行中"
    nft_pid=$(ps aux | grep "[d]ownload_milady_nfts_simple" | awk '{print $2}' | head -1)
    echo "   PID: $nft_pid"
else
    echo "   状态: ⚠️  未运行"
fi

echo ""

# 图层下载
echo "2️⃣  图层系统下载"
echo "--------------------------------------"
layer_count=$(find assets/milady_layers -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
layer_size=$(du -sh assets/milady_layers 2>/dev/null | cut -f1)

echo "   进度: ${layer_count}/400+ 图层"
echo "   大小: ${layer_size}"

if ps aux | grep -q "[d]ownload_milady_layers"; then
    echo "   状态: ✅ 运行中"
    layer_pid=$(ps aux | grep "[d]ownload_milady_layers" | awk '{print $2}' | head -1)
    echo "   PID: $layer_pid"
else
    echo "   状态: ⚠️  未运行"
fi

echo ""

# 图层类别统计
echo "3️⃣  图层类别明细"
echo "--------------------------------------"
for dir in assets/milady_layers/*/; do
    if [ -d "$dir" ]; then
        category=$(basename "$dir")
        count=$(ls "$dir"*.png 2>/dev/null | wc -l | tr -d ' ')
        if [ "$count" -gt 0 ]; then
            printf "   %-20s %3d 个\n" "$category:" "$count"
        fi
    fi
done

echo ""
echo "======================================"
