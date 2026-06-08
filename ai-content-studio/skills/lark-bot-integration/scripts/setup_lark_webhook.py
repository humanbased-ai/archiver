#!/usr/bin/env python3
"""
飞书 Webhook 配置向导
帮助你快速配置飞书通知
"""

import os
import sys
from pathlib import Path


def main():
    print("=" * 70)
    print("🔧 AI Content Studio - 飞书 Webhook 配置向导")
    print("=" * 70)
    print()

    # 检查 .env 文件
    env_file = Path(__file__).parent / "config" / ".env"

    if not env_file.exists():
        print(f"❌ 未找到配置文件: {env_file}")
        print(f"📝 正在创建...")
        env_file.parent.mkdir(parents=True, exist_ok=True)
        env_file.touch()
        print(f"✅ 已创建: {env_file}")
        print()

    # 读取现有配置
    existing_webhook = None
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("LARK_WEBHOOK_URL="):
                    existing_webhook = (
                        line.split("=", 1)[1].strip().strip('"').strip("'")
                    )
                    break

    # 显示说明
    print("📖 配置步骤:")
    print()
    print("1️⃣  打开飞书，进入目标群聊")
    print("2️⃣  点击右上角 ··· → 设置 → 群机器人")
    print("3️⃣  点击 添加机器人 → 自定义机器人")
    print("4️⃣  填写机器人名称：AI Content Studio 内容监控")
    print("5️⃣  复制 Webhook 地址")
    print()
    print("-" * 70)
    print()

    if existing_webhook:
        print(f"⚠️  检测到现有配置:")
        print(f"   {existing_webhook[:50]}...")
        print()
        update = input("是否更新？(y/n) [n]: ").strip().lower()
        if update != "y":
            print("\n✅ 保持现有配置")
            test_webhook(existing_webhook)
            return
        print()

    # 获取 Webhook URL
    print("📋 请粘贴飞书 Webhook URL:")
    print("   (格式: https://open.feishu.cn/open-apis/bot/v2/hook/...)")
    print()
    webhook_url = input("Webhook URL: ").strip().strip('"').strip("'")

    if not webhook_url:
        print("\n❌ Webhook URL 不能为空")
        sys.exit(1)

    if not webhook_url.startswith("https://open.feishu.cn/open-apis/bot/"):
        print("\n⚠️  警告: URL 格式可能不正确")
        print(f"   您输入的: {webhook_url}")
        proceed = input("   继续？(y/n) [n]: ").strip().lower()
        if proceed != "y":
            print("\n❌ 已取消")
            sys.exit(1)

    # 写入配置文件
    print()
    print("💾 正在保存配置...")

    # 读取现有内容
    lines = []
    webhook_found = False

    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            lines = f.readlines()

    # 更新或添加 LARK_WEBHOOK_URL
    new_lines = []
    for line in lines:
        if line.startswith("LARK_WEBHOOK_URL="):
            new_lines.append(f'LARK_WEBHOOK_URL="{webhook_url}"\n')
            webhook_found = True
        else:
            new_lines.append(line)

    # 如果没找到，添加到末尾
    if not webhook_found:
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines.append("\n")
        new_lines.append(f'LARK_WEBHOOK_URL="{webhook_url}"\n')

    # 写入文件
    with open(env_file, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print(f"✅ 配置已保存到: {env_file}")
    print()

    # 测试 Webhook
    test_webhook(webhook_url)


def test_webhook(webhook_url):
    """测试 Webhook 是否可用"""
    print("=" * 70)
    print("🧪 测试 Webhook 连接")
    print("=" * 70)
    print()

    try:
        import requests

        # 发送测试消息
        test_message = {
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": {
                        "tag": "plain_text",
                        "content": "✅ AI Content Studio 配置成功",
                    },
                    "template": "green",
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {
                            "tag": "lark_md",
                            "content": "**飞书通知已成功配置！**\n\n从现在起，当内容新鲜度过低时，你会在这个群收到提醒。",
                        },
                    },
                    {"tag": "hr"},
                    {
                        "tag": "div",
                        "text": {
                            "tag": "lark_md",
                            "content": "🔔 **提醒触发条件**:\n- 新鲜度 < 0.6\n- 完全重复率 > 10%\n- 短语重复率 > 40%\n- 距上次训练 > 30 天",
                        },
                    },
                ],
            },
        }

        print("📤 正在发送测试消息...")
        response = requests.post(webhook_url, json=test_message, timeout=10)
        response.raise_for_status()

        result = response.json()
        if result.get("code") == 0:
            print("✅ 测试成功！请检查飞书群是否收到消息")
        else:
            print(f"⚠️  响应: {result}")

    except ImportError:
        print("⚠️  未安装 requests 库，无法测试")
        print("   安装: pip install requests")
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        print()
        print("🔍 故障排查:")
        print("   1. 检查 Webhook URL 是否正确")
        print("   2. 检查机器人是否被移出群聊")
        print("   3. 检查网络连接")
        return

    print()
    print("=" * 70)
    print("🎉 配置完成！")
    print("=" * 70)
    print()
    print("📝 后续步骤:")
    print()
    print("1️⃣  测试完整提醒流程:")
    print("   python3 test_alert_system.py")
    print()
    print("2️⃣  查看配置文档:")
    print("   cat docs/ALERT_SETUP.md")
    print()
    print("3️⃣  开始使用 AI Content Studio:")
    print("   python3 test_gm_with_ascii.py")
    print()
    print("💡 提示: 每生成 20 条推文会自动检查新鲜度")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ 已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ 错误: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
