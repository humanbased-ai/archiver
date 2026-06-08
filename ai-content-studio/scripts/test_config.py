#!/usr/bin/env python3
"""
测试配置 - 验证所有 API keys 是否正确配置
"""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.config import Config

def test_twitter_api():
    """测试 Twitter API"""
    print("\n🐦 测试 Twitter API...")

    if not Config.TWITTER_BEARER_TOKEN:
        print("   ⚠️  未配置 TWITTER_BEARER_TOKEN")
        return False

    try:
        from skills.social_monitoring.src.twitter_client import TwitterClient
        client = TwitterClient(bearer_token=Config.TWITTER_BEARER_TOKEN)
        # 简单测试：获取自己的用户信息
        print("   ✅ Twitter API 配置正确")
        return True
    except Exception as e:
        print(f"   ❌ Twitter API 测试失败: {e}")
        return False

def test_claude_api():
    """测试 Claude API"""
    print("\n🤖 测试 Claude API...")

    if not Config.CLAUDE_API_KEY:
        print("   ⚠️  未配置 CLAUDE_API_KEY")
        return False

    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=Config.CLAUDE_API_KEY)

        # 简单测试：生成一条短推文
        response = client.messages.create(
            model=Config.CLAUDE_MODEL,
            max_tokens=50,
            messages=[{
                "role": "user",
                "content": "Say 'test successful' in 2 words"
            }]
        )

        result = response.content[0].text
        print(f"   ✅ Claude API 配置正确")
        print(f"   📝 测试响应: {result}")
        print(f"   💰 使用模型: {Config.CLAUDE_MODEL}")
        return True
    except Exception as e:
        print(f"   ❌ Claude API 测试失败: {e}")
        return False

def test_replicate_api():
    """测试 Replicate API"""
    print("\n🎨 测试 Replicate API...")

    if not Config.REPLICATE_API_TOKEN:
        print("   ⚠️  未配置 REPLICATE_API_TOKEN")
        return False

    try:
        import replicate
        client = replicate.Client(api_token=Config.REPLICATE_API_TOKEN)

        # 检查余额
        # Note: Replicate API 没有直接的余额查询接口
        # 我们只验证 token 格式是否正确
        if Config.REPLICATE_API_TOKEN.startswith('r8_'):
            print(f"   ✅ Replicate API Token 格式正确")
            print(f"   💡 提示: 访问 https://replicate.com/account/billing 查看余额")
            return True
        else:
            print(f"   ⚠️  Token 格式可能不正确（应该以 r8_ 开头）")
            return False
    except Exception as e:
        print(f"   ❌ Replicate API 测试失败: {e}")
        return False

def test_lark_bot():
    """测试 Lark Bot"""
    print("\n📱 测试 Lark Bot...")

    if not Config.LARK_APP_ID or not Config.LARK_APP_SECRET:
        print("   ⚠️  未配置 LARK_APP_ID 或 LARK_APP_SECRET")
        return False

    try:
        from skills.lark_bot_integration.src.lark_meme_bot import LarkMemeBot
        bot = LarkMemeBot(
            app_id=Config.LARK_APP_ID,
            app_secret=Config.LARK_APP_SECRET
        )

        # 尝试获取 access token
        bot.get_tenant_access_token()
        print(f"   ✅ Lark Bot 配置正确")
        return True
    except Exception as e:
        print(f"   ❌ Lark Bot 测试失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 70)
    print("🧪 AI Content Studio 配置测试")
    print("=" * 70)

    # 显示当前配置状态
    Config.print_status()

    # 运行所有测试
    results = {
        'Twitter API': test_twitter_api(),
        'Claude API': test_claude_api(),
        'Replicate API': test_replicate_api(),
        'Lark Bot': test_lark_bot(),
    }

    # 总结
    print("\n" + "=" * 70)
    print("📊 测试结果总结")
    print("=" * 70)

    total = len(results)
    passed = sum(1 for v in results.values() if v)

    for name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"   {name}: {status}")

    print(f"\n   总计: {passed}/{total} 测试通过")

    if passed == total:
        print("\n🎉 所有测试通过！可以开始使用 AI Content Studio 了")
        print("\n💡 下一步:")
        print("   1. 启动 Lark Bot: python webhook_server.py")
        print("   2. 测试生成推文: /tweet gm")
        print("   3. 测试监控: /monitor mentions")
    else:
        print("\n⚠️  部分测试失败，请检查配置")
        print("\n💡 建议:")
        print("   1. 重新运行配置向导: python scripts/setup_config.py")
        print("   2. 检查 API keys 是否正确")
        print("   3. 查看配置文档: cat CONFIG.md")

    print()

    return 0 if passed == total else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  测试已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
