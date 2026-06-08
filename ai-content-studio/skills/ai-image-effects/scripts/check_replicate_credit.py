#!/usr/bin/env python3
"""检查 Replicate 账户状态"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_token = os.getenv("REPLICATE_API_TOKEN")

if not api_token:
    print("❌ 未找到 REPLICATE_API_TOKEN")
    exit(1)

# 检查账户信息
headers = {"Authorization": f"Token {api_token}"}

print("🔍 检查 Replicate 账户状态...\n")

# 尝试获取账户信息
try:
    response = requests.get("https://api.replicate.com/v1/account", headers=headers)

    if response.status_code == 200:
        account = response.json()
        print("✅ API Token 有效")
        print(f"账户信息: {account}")
    else:
        print(f"⚠️  状态码: {response.status_code}")
        print(f"响应: {response.text}")

    # 检查可用的模型
    print("\n" + "=" * 70)
    print("尝试列出模型...")

    models_response = requests.get(
        "https://api.replicate.com/v1/models", headers=headers
    )
    if models_response.status_code == 200:
        print("✅ 可以访问模型列表")
    else:
        print(f"❌ 无法访问模型: {models_response.status_code}")

except Exception as e:
    print(f"❌ 请求失败: {e}")

print("\n" + "=" * 70)
print("💡 提示:")
print("1. 检查是否已添加付款方式: https://replicate.com/account/billing")
print("2. 新添加的付款方式可能需要 5-10 分钟生效")
print("3. 确认是否有免费额度或余额")
