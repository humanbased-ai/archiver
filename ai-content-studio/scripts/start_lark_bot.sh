#!/bin/bash
# Lark Meme Bot 快速启动脚本

echo "🎨 Lark Meme Bot 启动脚本"
echo "========================================"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

# 检查依赖
echo "📦 检查依赖..."
pip3 list | grep -q "Flask" || pip3 install Flask
pip3 list | grep -q "Pillow" || pip3 install Pillow
pip3 list | grep -q "requests" || pip3 install requests

# 检查配置
echo "⚙️ 检查配置..."
if [ ! -f "config/.env" ]; then
    echo "⚠️ 配置文件不存在: config/.env"
    echo "请先配置飞书凭证"
    exit 1
fi

# 检查是否配置了 Lark 凭证
if ! grep -q "LARK_APP_ID" config/.env; then
    echo "⚠️ 未配置 LARK_APP_ID"
    echo "请编辑 config/.env 添加飞书配置"
    exit 1
fi

# 创建输出目录
mkdir -p output/lark
mkdir -p logs

# 启动服务器
echo ""
echo "🚀 启动 Lark Webhook 服务器..."
echo "========================================"
echo "📍 Webhook URL: http://localhost:5000/webhook"
echo "📖 帮助信息: http://localhost:5000/help"
echo "🧪 测试接口: POST http://localhost:5000/test"
echo "========================================"
echo ""

# 启动服务器
python3 lark_webhook_server.py
