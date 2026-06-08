#!/bin/bash
# 启动内网穿透隧道

echo "🌐 启动内网穿透..."
echo "选择一个方案："
echo ""
echo "1. localhost.run (SSH 隧道，免费)"
echo "2. 检查 ngrok 是否已安装"
echo "3. 使用 Cloudflare Tunnel"
echo ""

# 尝试 localhost.run（绕过 host key verification）
echo "📍 尝试使用 localhost.run..."
echo "⏳ 连接中，请稍候..."
echo ""

ssh -o StrictHostKeyChecking=no -R 80:localhost:5001 nokey@localhost.run

# 如果上面失败，尝试其他方案
echo ""
echo "❌ localhost.run 连接失败"
echo ""
echo "其他方案："
echo "1. 查找 ngrok: find ~ -name ngrok -type f 2>/dev/null"
echo "2. 安装 ngrok: brew install ngrok/ngrok/ngrok"
echo "3. 使用 Cloudflare: brew install cloudflared && cloudflared tunnel --url http://localhost:5001"
