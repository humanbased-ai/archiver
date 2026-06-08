#!/usr/bin/env python3
"""检查 Replicate 余额"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_token = os.getenv('REPLICATE_API_TOKEN')
headers = {'Authorization': f'Token {api_token}'}

print("💰 检查 Replicate 账户余额...\n")

# 尝试不同的 API 端点
endpoints = [
    'https://api.replicate.com/v1/account',
    'https://api.replicate.com/v1/account/billing',
]

for endpoint in endpoints:
    try:
        response = requests.get(endpoint, headers=headers)
        print(f"📍 {endpoint}")
        print(f"   状态: {response.status_code}")
        if response.status_code == 200:
            print(f"   响应: {response.json()}")
        else:
            print(f"   错误: {response.text}")
        print()
    except Exception as e:
        print(f"   请求失败: {e}\n")

print("="*70)
print("\n建议:")
print("1. 访问 https://replicate.com/account/billing")
print("2. 查看当前余额")
print("3. 如果余额为 $0，需要充值（最低 $5）")
print("4. 充值后等待 5 分钟，然后重试")
