"""
通用 Emoji 库
为所有推文类型（GM、Main、Casual、Reply）提供 emoji 支持
"""

import random
from typing import List, Dict

class EmojiLibrary:
    """通用 Emoji 库，包含所有分类和选择逻辑"""

    # ==================== Emoji 分类 ====================

    # 🧹🎀 Jessie 签名（可选，不强制）
    SIGNATURE = ["🧹", "🎀"]

    # 💻⚙️🔧 工作相关
    WORK = [
        "💻", "⚙️", "🔧", "🛠️", "📊", "📈", "🗂️", "📝",
        "🖥️", "⌨️", "🔬", "🧪", "📉", "📋", "🗃️", "💾",
        "🖱️", "🔌", "⛏️", "🏗️", "📐", "📏"
    ]

    # 🥱😮‍💨😪 疲惫/崩溃
    TIRED = [
        "🥱", "😮‍💨", "😪", "😴", "💤", "😵", "😵‍💫", "🫠",
        "😩", "😓", "😞", "😔", "🥲", "😶‍🌫️", "🤯", "😭"
    ]

    # ☕🫖🧋 咖啡/能量
    COFFEE = ["☕", "🫖", "🧋", "🥤", "🧃", "⚡", "🔋", "💊", "🍵"]

    # 💪✨🚀 积极/motivated
    POSITIVE = [
        "💪", "✨", "🌟", "⭐", "🎯", "🚀", "🔥", "💥",
        "⚡", "🌈", "🎉", "🙌", "👊", "✊", "💯", "🌞",
        "🌅", "🌄", "🎆", "💫"
    ]

    # 😎🌴🧘 周末/放松
    WEEKEND = [
        "🎉", "🎊", "🍻", "🥂", "🍾", "🎈", "🎪", "🎭",
        "🎨", "🎮", "🎲", "🏖️", "🌴", "😎", "🕶️", "🧘",
        "🛀", "🌺", "🌸", "🏝️"
    ]

    # 🤖👾🛸 极客文化/科技
    GEEK = [
        "🤖", "👾", "🎮", "🕹️", "👽", "🛸", "🚀", "🌌",
        "🔭", "🧬", "🧠", "⚛️", "🔮", "🎯", "🎲", "🃏",
        "🧩", "🔬", "💡", "⚙️"
    ]

    # 💎🚀📈 Crypto/Web3
    CRYPTO = [
        "💎", "🚀", "📈", "📉", "💰", "💸", "🪙", "⛓️",
        "🔐", "🔑", "🌐", "🕸️", "🔗", "📊", "🏦", "💵"
    ]

    # 🎀💖✨ Milady 美学
    MILADY = [
        "🎀", "💖", "💕", "💝", "💗", "✨", "🌸", "🦋",
        "🧚", "👑", "💅", "🎨", "🌈", "🦄", "🍓", "🍰",
        "🧁", "🌺", "🌷", "💐"
    ]

    # 🍕🍔🌮 食物
    FOOD = [
        "🍕", "🍔", "🌮", "🌯", "🍜", "🍝", "🍱", "🍙",
        "🍣", "🥡", "🥗", "🧇", "🥞", "🍪", "🍩", "🎂",
        "🍰", "🧁", "🍿", "🥨"
    ]

    # 🌅⏰🕐 时间相关
    TIME = [
        "🌅", "🌄", "🌇", "🌆", "🌃", "🌌", "⏰", "⏱️",
        "⌚", "🕐", "🕑", "🕒", "🕓", "⏳", "⌛"
    ]

    # ☀️🌧️❄️ 天气/自然
    WEATHER = [
        "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️",
        "🌩️", "❄️", "⛄", "🌨️", "🌪️", "🌫️", "🌬️", "🍂",
        "🍁", "🌿", "🌱", "🌾"
    ]

    # 🎭🎨💡 随机 vibes
    RANDOM = [
        "🎭", "🎪", "🎨", "🎬", "🎤", "🎧", "🎵", "🎶",
        "📻", "📺", "📱", "🔔", "🔕", "💡", "🕯️", "🧨",
        "🎁", "🎈", "🏆", "🥇"
    ]

    # 🔥💀🖤 对线/Duixian/批判
    CRITICAL = [
        "🔥", "💀", "🖤", "⚔️", "🗡️", "💣", "💥", "⚡",
        "🎯", "👊", "😤", "🤨", "😒", "🙄", "💢"
    ]

    # 🎓📚🧠 学习/教育/深度
    EDUCATIONAL = [
        "🎓", "📚", "📖", "🧠", "💭", "💡", "🔍", "🔬",
        "📊", "📈", "📉", "🗂️", "📝", "✍️", "🖊️"
    ]

    # 🤝👥🌍 社区/合作
    COMMUNITY = [
        "🤝", "👥", "👫", "👬", "👭", "🌍", "🌎", "🌏",
        "🫂", "💬", "💭", "🗣️", "👋", "🙏", "❤️"
    ]

    # 🏗️🔨⚡ Builder/建设者
    BUILDER = [
        "🏗️", "🔨", "⚡", "🛠️", "🔧", "⚙️", "🏭", "🏢",
        "🚧", "📐", "📏", "🗂️", "💼", "🎯"
    ]

    # ==================== 场景组合推荐 ====================

    SCENARIOS = {
        # GM Posts
        "gm_monday_tired": ["TIRED", "COFFEE", "WORK"],
        "gm_monday_motivated": ["POSITIVE", "WORK", "COFFEE"],
        "gm_tuesday_grind": ["WORK", "COFFEE", "BUILDER"],
        "gm_wednesday_midweek": ["TIRED", "COFFEE", "GEEK"],
        "gm_thursday_almostthere": ["POSITIVE", "WORK", "BUILDER"],
        "gm_friday_relief": ["POSITIVE", "WEEKEND", "CRYPTO"],
        "gm_weekend": ["WEEKEND", "MILADY", "GEEK"],

        # Main Content - Industry Insights
        "industry_insight": ["WORK", "CRYPTO", "EDUCATIONAL"],
        "data_ownership": ["WORK", "CRYPTO", "CRITICAL"],
        "ai_training": ["WORK", "GEEK", "EDUCATIONAL"],
        "base_ecosystem": ["CRYPTO", "BUILDER", "POSITIVE"],

        # Main Content - Critical/Duixian
        "criticize_unfairness": ["CRITICAL", "WORK", "TIRED"],
        "call_out_companies": ["CRITICAL", "CRYPTO", "WORK"],

        # Main Content - Absurd/Meme
        "meme_format": ["RANDOM", "GEEK", "TIRED"],
        "absurd_narrative": ["RANDOM", "MILADY", "CRITICAL"],

        # Casual Posts
        "casual_weekend": ["WEEKEND", "MILADY", "FOOD"],
        "casual_community": ["COMMUNITY", "MILADY", "POSITIVE"],
        "builder_daily": ["BUILDER", "WORK", "COFFEE"],
        "milady_observation": ["MILADY", "RANDOM", "WEEKEND"],

        # Replies
        "reply_supportive": ["POSITIVE", "COMMUNITY", "SIGNATURE"],
        "reply_gm": ["COFFEE", "POSITIVE", "SIGNATURE"],
        "reply_technical": ["WORK", "GEEK", "EDUCATIONAL"],
        "reply_casual": ["RANDOM", "MILADY", "WEEKEND"],
        "reply_celebration": ["POSITIVE", "COMMUNITY", "CRYPTO"]
    }

    # ==================== 工作日推荐 ====================

    DAY_RECOMMENDATIONS = {
        "Monday": {
            "primary": ["TIRED", "COFFEE", "WORK"],
            "secondary": ["POSITIVE", "BUILDER"],
            "avoid": ["WEEKEND"]
        },
        "Tuesday": {
            "primary": ["WORK", "COFFEE", "CRYPTO"],
            "secondary": ["GEEK", "BUILDER"],
            "avoid": ["WEEKEND"]
        },
        "Wednesday": {
            "primary": ["TIRED", "WORK", "MILADY"],
            "secondary": ["GEEK", "RANDOM"],
            "avoid": ["WEEKEND"]
        },
        "Thursday": {
            "primary": ["WORK", "POSITIVE", "BUILDER"],
            "secondary": ["COFFEE", "CRYPTO"],
            "avoid": ["WEEKEND"]
        },
        "Friday": {
            "primary": ["POSITIVE", "WEEKEND", "WORK"],
            "secondary": ["COFFEE", "MILADY"],
            "avoid": []
        },
        "Saturday": {
            "primary": ["WEEKEND", "MILADY", "GEEK"],
            "secondary": ["CRYPTO", "FOOD"],
            "avoid": ["TIRED", "WORK"]
        },
        "Sunday": {
            "primary": ["WEEKEND", "MILADY", "TIME"],
            "secondary": ["GEEK", "CRYPTO"],
            "avoid": ["WORK"]
        }
    }

    # ==================== Helper Methods ====================

    @classmethod
    def get_category_emojis(cls, category_name: str) -> List[str]:
        """获取某个分类的所有 emojis"""
        return getattr(cls, category_name, [])

    @classmethod
    def get_random_from_category(cls, category_name: str, count: int = 1) -> List[str]:
        """从某个分类随机选择 N 个 emojis"""
        category = cls.get_category_emojis(category_name)
        if not category:
            return []
        return random.sample(category, min(count, len(category)))

    @classmethod
    def get_scenario_emojis(cls, scenario: str, count: int = 2) -> List[str]:
        """根据场景获取推荐的 emojis

        Args:
            scenario: 场景名称（如 'gm_monday_tired', 'industry_insight'）
            count: 返回多少个 emojis（默认2个）

        Returns:
            List of emoji strings
        """
        categories = cls.SCENARIOS.get(scenario, ["WORK", "SIGNATURE"])

        emojis = []
        emojis_per_category = max(1, count // len(categories))

        for category in categories:
            category_emojis = cls.get_random_from_category(category, emojis_per_category)
            emojis.extend(category_emojis)

        # 如果不够，补充
        if len(emojis) < count:
            all_emojis = []
            for cat in categories:
                all_emojis.extend(cls.get_category_emojis(cat))
            remaining = random.sample(all_emojis, count - len(emojis))
            emojis.extend(remaining)

        return emojis[:count]

    @classmethod
    def get_day_emojis(cls, day_of_week: str, count: int = 2) -> List[str]:
        """根据星期几获取推荐的 emojis"""
        day_rec = cls.DAY_RECOMMENDATIONS.get(day_of_week, {})
        primary = day_rec.get("primary", ["WORK", "SIGNATURE"])

        emojis = []
        for category in primary[:2]:  # 取前2个主要分类
            emoji = cls.get_random_from_category(category, 1)
            emojis.extend(emoji)

        return emojis[:count]

    @classmethod
    def format_emoji_guide(cls, scenario: str = None, day_of_week: str = None) -> str:
        """生成 emoji 使用指南（用于 prompt）

        Args:
            scenario: 场景名称
            day_of_week: 星期几

        Returns:
            格式化的 emoji 指南字符串
        """
        guide = "EMOJI LIBRARY:\n"

        # 添加场景推荐
        if scenario and scenario in cls.SCENARIOS:
            categories = cls.SCENARIOS[scenario]
            guide += f"\nRecommended for {scenario}:\n"
            for cat in categories:
                emojis = cls.get_category_emojis(cat)
                guide += f"- {cat}: {' '.join(emojis[:10])}\n"

        # 添加工作日推荐
        if day_of_week and day_of_week in cls.DAY_RECOMMENDATIONS:
            day_rec = cls.DAY_RECOMMENDATIONS[day_of_week]
            guide += f"\nRecommended for {day_of_week}:\n"
            for cat in day_rec["primary"]:
                emojis = cls.get_category_emojis(cat)
                guide += f"- {cat}: {' '.join(emojis[:10])}\n"

        # 添加所有分类（简化版）
        guide += "\nALL CATEGORIES:\n"
        guide += f"- WORK: {' '.join(cls.WORK[:8])}\n"
        guide += f"- TIRED: {' '.join(cls.TIRED[:8])}\n"
        guide += f"- COFFEE: {' '.join(cls.COFFEE[:6])}\n"
        guide += f"- POSITIVE: {' '.join(cls.POSITIVE[:8])}\n"
        guide += f"- WEEKEND: {' '.join(cls.WEEKEND[:8])}\n"
        guide += f"- GEEK: {' '.join(cls.GEEK[:8])}\n"
        guide += f"- CRYPTO: {' '.join(cls.CRYPTO[:8])}\n"
        guide += f"- MILADY: {' '.join(cls.MILADY[:8])}\n"
        guide += f"- CRITICAL: {' '.join(cls.CRITICAL[:8])}\n"
        guide += f"- BUILDER: {' '.join(cls.BUILDER[:8])}\n"
        guide += f"- COMMUNITY: {' '.join(cls.COMMUNITY[:8])}\n"
        guide += f"- SIGNATURE (optional): {' '.join(cls.SIGNATURE)}\n"

        guide += "\nUSAGE RULES:\n"
        guide += "- Emojis are OPTIONAL - not every tweet needs them\n"
        guide += "- Use 0-3 emojis per tweet (less is often better)\n"
        guide += "- Only use emoji when it adds value or tone\n"
        guide += "- Match emojis to content mood and context\n"
        guide += "- Variety > repetition (don't reuse same emojis)\n"
        guide += "- 🧹 and 🎀 are optional signatures, not required\n"
        guide += "- Many strong tweets work better WITHOUT emojis\n"
        guide += "- When in doubt, skip the emoji\n"

        return guide

    @classmethod
    def get_all_emojis(cls) -> List[str]:
        """获取所有 emojis（去重）"""
        all_emojis = []
        for attr in dir(cls):
            if attr.isupper() and not attr.startswith('_'):
                value = getattr(cls, attr)
                if isinstance(value, list) and value and isinstance(value[0], str):
                    all_emojis.extend(value)
        return list(set(all_emojis))


# ==================== Quick Access Functions ====================

def get_emoji_for_content_type(content_type: str, day_of_week: str = None, count: int = 2) -> List[str]:
    """根据内容类型和星期快速获取 emojis

    Args:
        content_type: 'gm', 'main', 'casual', 'reply'
        day_of_week: 星期几
        count: 需要几个 emojis

    Returns:
        List of emoji strings
    """
    # GM posts
    if content_type == 'gm' and day_of_week:
        day_lower = day_of_week.lower()
        if day_lower == 'monday':
            return EmojiLibrary.get_scenario_emojis('gm_monday_tired', count)
        elif day_lower in ['saturday', 'sunday']:
            return EmojiLibrary.get_scenario_emojis('gm_weekend', count)
        else:
            return EmojiLibrary.get_day_emojis(day_of_week, count)

    # Main posts - 根据主题判断
    elif content_type == 'main':
        return EmojiLibrary.get_scenario_emojis('industry_insight', count)

    # Casual posts
    elif content_type == 'casual':
        if day_of_week and day_of_week.lower() in ['saturday', 'sunday']:
            return EmojiLibrary.get_scenario_emojis('casual_weekend', count)
        else:
            return EmojiLibrary.get_scenario_emojis('casual_community', count)

    # Reply
    elif content_type == 'reply':
        return EmojiLibrary.get_scenario_emojis('reply_supportive', count)

    # 默认
    return EmojiLibrary.get_random_from_category('WORK', count)


def format_emoji_guide_for_prompt(content_type: str, day_of_week: str = None, theme: str = None) -> str:
    """为 Claude prompt 格式化 emoji 指南

    Args:
        content_type: 'gm', 'main', 'casual', 'reply'
        day_of_week: 星期几
        theme: 主题（用于判断场景）

    Returns:
        格式化的指南字符串
    """
    # 判断场景
    scenario = None

    if content_type == 'gm':
        if day_of_week == 'Monday':
            scenario = 'gm_monday_tired'
        elif day_of_week in ['Saturday', 'Sunday']:
            scenario = 'gm_weekend'
    elif content_type == 'main' and theme:
        theme_lower = theme.lower()
        if 'unfair' in theme_lower or 'criticize' in theme_lower or '$' in theme_lower:
            scenario = 'criticize_unfairness'
        elif 'base' in theme_lower or 'ecosystem' in theme_lower:
            scenario = 'base_ecosystem'
        elif 'meme' in theme_lower or 'absurd' in theme_lower:
            scenario = 'meme_format'
        else:
            scenario = 'industry_insight'
    elif content_type == 'casual':
        if 'milady' in (theme or '').lower():
            scenario = 'milady_observation'
        elif 'builder' in (theme or '').lower():
            scenario = 'builder_daily'
        else:
            scenario = 'casual_community'

    return EmojiLibrary.format_emoji_guide(scenario, day_of_week)
