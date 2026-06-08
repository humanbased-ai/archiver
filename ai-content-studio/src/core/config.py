"""配置管理"""
import os
import yaml
from dotenv import load_dotenv
from pathlib import Path

# Load .env from config directory
env_path = Path(__file__).parent.parent.parent / 'config' / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    """配置类 - 所有 API keys 和配置项"""

    # =========================================================================
    # 1. Twitter API Configuration
    # =========================================================================
    TWITTER_API_KEY = os.getenv('TWITTER_API_KEY')
    TWITTER_API_SECRET = os.getenv('TWITTER_API_SECRET')
    TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN')
    TWITTER_ACCESS_SECRET = os.getenv('TWITTER_ACCESS_SECRET')
    TWITTER_BEARER_TOKEN = os.getenv('TWITTER_BEARER_TOKEN')

    # =========================================================================
    # 2. Claude/Anthropic API Configuration
    # =========================================================================
    CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY') or os.getenv('ANTHROPIC_API_KEY')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY') or os.getenv('CLAUDE_API_KEY')
    CLAUDE_MODEL = os.getenv('CLAUDE_MODEL', 'claude-sonnet-4-20250514')

    # =========================================================================
    # 3. Replicate API Configuration
    # =========================================================================
    REPLICATE_API_TOKEN = os.getenv('REPLICATE_API_TOKEN')

    # =========================================================================
    # 4. Lark/Feishu Bot Configuration
    # =========================================================================
    LARK_APP_ID = os.getenv('LARK_APP_ID')
    LARK_APP_SECRET = os.getenv('LARK_APP_SECRET')
    LARK_CHAT_ID = os.getenv('LARK_CHAT_ID')
    LARK_WEBHOOK_URL = os.getenv('LARK_WEBHOOK_URL')
    LARK_VERIFICATION_TOKEN = os.getenv('LARK_VERIFICATION_TOKEN')

    # =========================================================================
    # 5. Database Configuration
    # =========================================================================
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///jessie.db')

    # =========================================================================
    # 6. Bot Operation Mode
    # =========================================================================
    BOT_MODE = os.getenv('BOT_MODE', 'semi-autonomous')

    # =========================================================================
    # 7. Feature Flags
    # =========================================================================
    ENABLE_AI_EFFECTS = os.getenv('ENABLE_AI_EFFECTS', 'true').lower() == 'true'
    ENABLE_TWITTER_POSTING = os.getenv('ENABLE_TWITTER_POSTING', 'true').lower() == 'true'
    ENABLE_SOCIAL_MONITORING = os.getenv('ENABLE_SOCIAL_MONITORING', 'true').lower() == 'true'
    ENABLE_CONTENT_GENERATION = os.getenv('ENABLE_CONTENT_GENERATION', 'true').lower() == 'true'

    # =========================================================================
    # 8. Free AI Alternatives
    # =========================================================================
    USE_FREE_AI = os.getenv('USE_FREE_AI', 'false').lower() == 'true'
    FREE_AI_MODEL = os.getenv('FREE_AI_MODEL', 'llama-2-70b-chat')

    # =========================================================================
    # 9. Advanced Settings
    # =========================================================================
    FRESHNESS_THRESHOLD = float(os.getenv('FRESHNESS_THRESHOLD', '0.7'))
    MAX_TWEETS_PER_DAY = int(os.getenv('MAX_TWEETS_PER_DAY', '10'))
    MONITOR_INTERVAL = int(os.getenv('MONITOR_INTERVAL', '30'))
    DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

    # =========================================================================
    # 10. Paths
    # =========================================================================
    SKILLS_PATH = Path(__file__).parent.parent.parent / 'skills'
    CONFIG_PATH = Path(__file__).parent.parent.parent / 'config'
    TRAINING_DATA_PATH = SKILLS_PATH / 'twitter-content-ai' / 'training_data'

    @classmethod
    def load_yaml_config(cls):
        """加载 YAML 配置"""
        config_path = cls.CONFIG_PATH / 'config.yaml'
        if config_path.exists():
            with open(config_path) as f:
                return yaml.safe_load(f)
        return {}

    @classmethod
    def validate(cls, check_optional=False):
        """验证配置"""
        required = {}
        optional = {
            'TWITTER_BEARER_TOKEN': '社交媒体监控功能',
            'CLAUDE_API_KEY': 'Twitter 内容生成功能',
            'REPLICATE_API_TOKEN': 'AI 图像特效功能',
            'LARK_APP_ID': 'Lark Bot 功能',
        }

        missing_required = [key for key in required if not getattr(cls, key)]
        if missing_required:
            raise ValueError(f"❌ 缺少必需配置: {missing_required}")

        if check_optional:
            missing_optional = {
                key: desc for key, desc in optional.items()
                if not getattr(cls, key)
            }
            if missing_optional:
                print("⚠️  缺少可选配置（部分功能将不可用）:")
                for key, desc in missing_optional.items():
                    print(f"   - {key}: {desc}")

        return True

    @classmethod
    def get_api_status(cls):
        """获取所有 API 的配置状态"""
        return {
            'Twitter API': {
                'configured': bool(cls.TWITTER_BEARER_TOKEN),
                'required_for': '社交媒体监控、发推',
                'cost': 'FREE',
            },
            'Claude API': {
                'configured': bool(cls.CLAUDE_API_KEY),
                'required_for': 'Twitter 内容生成',
                'cost': '~$0.01-0.05/推文',
                'model': cls.CLAUDE_MODEL,
            },
            'Replicate API': {
                'configured': bool(cls.REPLICATE_API_TOKEN),
                'required_for': 'AI 图像特效',
                'cost': '$0.006-0.05/图片',
            },
            'Lark Bot': {
                'configured': bool(cls.LARK_APP_ID and cls.LARK_APP_SECRET),
                'required_for': 'Lark Bot 集成',
                'cost': 'FREE',
            },
        }

    @classmethod
    def print_status(cls):
        """打印配置状态"""
        print("=" * 70)
        print("🤖 AI Content Studio Configuration Status")
        print("=" * 70)

        status = cls.get_api_status()

        for api_name, info in status.items():
            status_icon = "✅" if info['configured'] else "❌"
            print(f"\n{status_icon} {api_name}")
            print(f"   用途: {info['required_for']}")
            print(f"   成本: {info['cost']}")
            if 'model' in info:
                print(f"   模型: {info['model']}")
            if not info['configured']:
                print(f"   ⚠️  未配置 - 相关功能将不可用")

        print("\n" + "=" * 70)
        print("💡 配置指南: 查看 config/.env.example")
        print("=" * 70 + "\n")
