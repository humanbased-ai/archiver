#!/bin/bash
# 检查 Milady NFT 下载进度

echo "📊 Milady NFT 下载进度"
echo "===================="
echo ""

# 检查进程
if ps aux | grep -q "[p]ython.*download_milady_nfts"; then
    echo "✅ 下载进程运行中"
    ps aux | grep "[p]ython.*download_milady_nfts" | awk '{print "   PID:", $2}'
else
    echo "⚠️  下载进程未运行"
fi

echo ""

# 统计已下载数量
image_count=$(ls assets/milady_nfts/images/ 2>/dev/null | wc -l | tr -d ' ')
info_count=$(ls assets/milady_nfts/milady_*_info.json 2>/dev/null | wc -l | tr -d ' ')

echo "📁 已下载文件:"
echo "   图片: ${image_count} / 10,000"
echo "   信息: ${info_count} / 10,000"

if [ "$image_count" -gt 0 ]; then
    percentage=$(echo "scale=2; $image_count * 100 / 10000" | bc)
    echo "   进度: ${percentage}%"
fi

echo ""

# 检查磁盘使用
if [ -d "assets/milady_nfts/images" ]; then
    size=$(du -sh assets/milady_nfts/images 2>/dev/null | cut -f1)
    echo "💾 磁盘使用: ${size}"
fi

echo ""

# 显示最近下载的几个
echo "📥 最近下载:"
ls -lt assets/milady_nfts/images/ | head -6 | tail -5 | awk '{print "   ", $9, "(" $6, $7, $8 ")"}'

echo ""

# 显示日志最后几行
if [ -f "logs/milady_nfts_download.log" ]; then
    echo "📋 最新日志:"
    tail -5 logs/milady_nfts_download.log | sed 's/^/   /'
fi
