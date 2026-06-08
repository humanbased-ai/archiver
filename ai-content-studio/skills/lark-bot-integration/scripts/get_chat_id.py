"""获取Lark群组ID"""

import requests
from src.core.config import Config


def get_tenant_access_token():
    """获取tenant_access_token"""
    url = "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal"
    payload = {"app_id": Config.LARK_APP_ID, "app_secret": Config.LARK_APP_SECRET}

    response = requests.post(url, json=payload)
    data = response.json()

    if data.get("code") == 0:
        return data["tenant_access_token"]
    else:
        print(f"获取token失败: {data}")
        return None


def get_bot_chats(access_token):
    """获取机器人所在的群组列表"""
    url = "https://open.larksuite.com/open-apis/im/v1/chats"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"user_id_type": "open_id", "page_size": 20}

    response = requests.get(url, headers=headers, params=params)
    data = response.json()

    if data.get("code") == 0:
        return data.get("data", {}).get("items", [])
    else:
        print(f"获取群组失败: {data}")
        return []


if __name__ == "__main__":
    print("=" * 50)
    print("获取Lark群组ID")
    print("=" * 50)

    # 获取access token
    print("\n1. 获取access token...")
    token = get_tenant_access_token()

    if token:
        print(f"✅ Token获取成功: {token[:20]}...")

        # 获取群组列表
        print("\n2. 获取机器人所在的群组...")
        chats = get_bot_chats(token)

        if chats:
            print(f"\n✅ 找到 {len(chats)} 个群组:\n")
            for i, chat in enumerate(chats, 1):
                print(f"{i}. 群名称: {chat.get('name', '未命名')}")
                print(f"   群ID: {chat.get('chat_id')}")
                print(f"   描述: {chat.get('description', '无')}")
                print()
        else:
            print("\n❌ 没有找到群组")
            print("\n💡 请先:")
            print("   1. 在Lark创建一个群")
            print("   2. 在企业应用后台找到机器人")
            print("   3. 把机器人添加到群里")
            print("   4. 然后重新运行这个脚本")
    else:
        print("❌ 无法获取access token")
        print("\n请检查:")
        print("   1. LARK_APP_ID 是否正确")
        print("   2. LARK_APP_SECRET 是否正确")
        print(f"   当前APP_ID: {Config.LARK_APP_ID}")
