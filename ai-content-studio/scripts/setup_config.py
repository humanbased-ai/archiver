#!/usr/bin/env python3
"""
配置向导 - 帮助用户设置 API keys
"""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.config import Config

def print_header():
    """打印欢迎信息"""
    print("\n" + "=" * 70)
    print("🤖 AI Content Studio 配置向导")
    print("=" * 70)
    print("\n这个向导将帮助你配置所有必需的 API keys\n")

def check_env_file():
    """检查 .env 文件是否存在"""
    config_dir = project_root / 'config'
    env_file = config_dir / '.env'
    example_file = config_dir / '.env.example'

    if not env_file.exists():
        print("📝 未找到 .env 文件，正在创建...")
        if example_file.exists():
            # 复制 example 文件
            with open(example_file) as f:
                content = f.read()
            with open(env_file, 'w') as f:
                f.write(content)
            print(f"✅ 已创建 {env_file}")
            print(f"💡 模板来自: {example_file}\n")
        else:
            print(f"❌ 错误: 找不到 {example_file}")
            return False

    return True

def get_user_input(prompt, current_value=None, optional=False):
    """获取用户输入"""
    if current_value and current_value != f"your_{prompt.lower().replace(' ', '_')}_here":
        print(f"   当前值: {current_value[:20]}...")
        use_current = input(f"   保留当前值? (y/n): ").lower()
        if use_current == 'y':
            return current_value

    if optional:
        print(f"   (可选 - 按回车跳过)")

    value = input(f"   输入 {prompt}: ").strip()
    return value if value else current_value

def configure_twitter():
    """配置 Twitter API"""
    print("\n" + "-" * 70)
    print("1️⃣  Twitter API 配置")
    print("-" * 70)
    print("用途: 社交媒体监控、发推")
    print("成本: FREE")
    print("获取: https://developer.twitter.com/en/portal/dashboard")
    print()

    if Config.TWITTER_BEARER_TOKEN:
        print(f"✅ Twitter API 已配置")
        update = input("要更新吗? (y/n): ").lower()
        if update != 'y':
            return

    print("\n需要以下信息:")
    keys = {
        'TWITTER_API_KEY': get_user_input("API Key", Config.TWITTER_API_KEY),
        'TWITTER_API_SECRET': get_user_input("API Secret", Config.TWITTER_API_SECRET),
        'TWITTER_ACCESS_TOKEN': get_user_input("Access Token", Config.TWITTER_ACCESS_TOKEN),
        'TWITTER_ACCESS_SECRET': get_user_input("Access Secret", Config.TWITTER_ACCESS_SECRET),
        'TWITTER_BEARER_TOKEN': get_user_input("Bearer Token", Config.TWITTER_BEARER_TOKEN),
    }

    return keys

def configure_claude():
    """配置 Claude API"""
    print("\n" + "-" * 70)
    print("2️⃣  Claude API 配置")
    print("-" * 70)
    print("用途: Twitter 内容生成")
    print("成本: ~$0.01-0.05/推文")
    print("获取: https://console.anthropic.com/settings/keys")
    print("注意: 这与 Claude Pro 订阅是分开的")
    print()

    if Config.CLAUDE_API_KEY:
        print(f"✅ Claude API 已配置")
        update = input("要更新吗? (y/n): ").lower()
        if update != 'y':
            return

    print("\n需要以下信息:")
    keys = {
        'CLAUDE_API_KEY': get_user_input("Claude API Key", Config.CLAUDE_API_KEY),
        'ANTHROPIC_API_KEY': None,  # 使用相同的 key
    }

    # 询问是否使用更便宜的 Haiku 模型
    print("\n💡 模型选择:")
    print("  1. Claude Sonnet 4.5 (当前) - 最高质量, ~$0.02/推文")
    print("  2. Claude Haiku - 高质量, ~$0.002/推文 (便宜 10 倍)")
    choice = input("选择模型 (1/2, 默认 1): ").strip()

    if choice == '2':
        keys['CLAUDE_MODEL'] = 'claude-3-5-haiku-20241022'

    return keys

def configure_replicate():
    """配置 Replicate API"""
    print("\n" + "-" * 70)
    print("3️⃣  Replicate API 配置")
    print("-" * 70)
    print("用途: AI 图像特效 (Illusion, FLUX Fill Pro, SAM)")
    print("成本: $0.006-0.05/图片")
    print("获取: https://replicate.com/account/api-tokens")
    print()

    if Config.REPLICATE_API_TOKEN:
        print(f"✅ Replicate API 已配置")
        update = input("要更新吗? (y/n): ").lower()
        if update != 'y':
            return

    print("\n需要以下信息:")
    keys = {
        'REPLICATE_API_TOKEN': get_user_input("Replicate API Token", Config.REPLICATE_API_TOKEN),
    }

    return keys

def configure_lark():
    """配置 Lark Bot"""
    print("\n" + "-" * 70)
    print("4️⃣  Lark Bot 配置")
    print("-" * 70)
    print("用途: Lark (飞书) Bot 集成")
    print("成本: FREE")
    print("获取: https://open.larksuite.com/app")
    print()

    if Config.LARK_APP_ID:
        print(f"✅ Lark Bot 已配置")
        update = input("要更新吗? (y/n): ").lower()
        if update != 'y':
            return

    print("\n需要以下信息:")
    keys = {
        'LARK_APP_ID': get_user_input("App ID", Config.LARK_APP_ID, optional=True),
        'LARK_APP_SECRET': get_user_input("App Secret", Config.LARK_APP_SECRET, optional=True),
        'LARK_WEBHOOK_URL': get_user_input("Webhook URL", Config.LARK_WEBHOOK_URL, optional=True),
    }

    return keys

def update_env_file(all_keys):
    """更新 .env 文件"""
    env_file = project_root / 'config' / '.env'

    print("\n" + "=" * 70)
    print("💾 保存配置...")
    print("=" * 70)

    # 读取现有内容
    if env_file.exists():
        with open(env_file) as f:
            lines = f.readlines()
    else:
        lines = []

    # 更新或添加每个 key
    updated_lines = []
    updated_keys = set()

    for line in lines:
        # 跳过注释和空行
        if line.startswith('#') or not line.strip():
            updated_lines.append(line)
            continue

        # 解析 key=value
        if '=' in line:
            key = line.split('=')[0].strip()
            if key in all_keys and all_keys[key]:
                # 更新值
                updated_lines.append(f"{key}={all_keys[key]}\n")
                updated_keys.add(key)
            else:
                # 保留原值
                updated_lines.append(line)
        else:
            updated_lines.append(line)

    # 添加新的 keys
    for key, value in all_keys.items():
        if key not in updated_keys and value:
            updated_lines.append(f"{key}={value}\n")

    # 写入文件
    with open(env_file, 'w') as f:
        f.writelines(updated_lines)

    print(f"✅ 配置已保存到: {env_file}")

def main():
    """主函数"""
    print_header()

    # 检查 .env 文件
    if not check_env_file():
        return

    # 收集所有配置
    all_keys = {}

    # 1. Twitter
    twitter_keys = configure_twitter()
    if twitter_keys:
        all_keys.update(twitter_keys)

    # 2. Claude
    claude_keys = configure_claude()
    if claude_keys:
        all_keys.update(claude_keys)
        # 设置 ANTHROPIC_API_KEY 为相同的值
        if 'CLAUDE_API_KEY' in claude_keys and claude_keys['CLAUDE_API_KEY']:
            all_keys['ANTHROPIC_API_KEY'] = claude_keys['CLAUDE_API_KEY']

    # 3. Replicate
    replicate_keys = configure_replicate()
    if replicate_keys:
        all_keys.update(replicate_keys)

    # 4. Lark
    lark_keys = configure_lark()
    if lark_keys:
        all_keys.update(lark_keys)

    # 更新 .env 文件
    if all_keys:
        update_env_file(all_keys)

    # 显示最终状态
    print("\n" + "=" * 70)
    print("✅ 配置完成！")
    print("=" * 70)

    # 重新加载配置并显示状态
    from dotenv import load_dotenv
    env_file = project_root / 'config' / '.env'
    load_dotenv(dotenv_path=env_file, override=True)

    # 显示配置状态
    print("\n当前配置状态:")
    Config.print_status()

    print("\n💡 下一步:")
    print("   1. 运行测试: python scripts/test_config.py")
    print("   2. 启动 Bot: python webhook_server.py")
    print("   3. 查看文档: cat CONFIG.md")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  配置已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
