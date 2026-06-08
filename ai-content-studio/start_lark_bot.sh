#!/bin/bash
# 启动 Lark Meme Bot Webhook 服务器

# 设置端口（避免与系统端口冲突）
export PORT=5001

echo "🎨 启动 Lark Meme Bot Webhook 服务器..."
echo "📍 端口: $PORT"
echo "📍 Webhook URL: http://localhost:$PORT/webhook"
echo ""

# 运行服务器
python3 lark_webhook_server.py
