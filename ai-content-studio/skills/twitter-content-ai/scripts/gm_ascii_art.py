"""
GM ASCII Art 模板库
为 Jessie 提供创意 ASCII 艺术 GM posts
"""

import random


class GMAsciiArt:
    """GM ASCII 艺术库"""

    # ASCII Art 模板（保持格式！）
    TEMPLATES = [
        # Template 1: 简单的 GM 大字
        {
            "name": "big_gm",
            "art": """
 ██████╗ ███╗   ███╗
██╔════╝ ████╗ ████║
██║  ███╗██╔████╔██║
██║   ██║██║╚██╔╝██║
╚██████╔╝██║ ╚═╝ ██║
 ╚═════╝ ╚═╝     ╚═╝
""",
            "vibe": "bold, technical",
        },
        # Template 2: 咖啡 + GM
        {
            "name": "coffee_gm",
            "art": """
    ( (
     ) )
  ┌─────┐
  │ GM! │
  │ ☕  │
  └─────┘
""",
            "vibe": "cozy, morning",
        },
        # Template 3: 扫把 Jessie
        {
            "name": "broom_gm",
            "art": """
      🧹
     /|\\
    / | \\
      |
   GM from
   the data
   janitor
""",
            "vibe": "jessie signature",
        },
        # Template 4: 极简点阵 GM
        {
            "name": "dot_matrix_gm",
            "art": """
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿ GM ⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
""",
            "vibe": "minimal, technical",
        },
        # Template 5: 笔记本电脑
        {
            "name": "laptop_gm",
            "art": """
 ___________________
|  _____________  |
| |             | |
| |  gm from   | |
| |  my desk   | |
| |_____________| |
|___________________|
    _[_______]_
___[___________]___
""",
            "vibe": "work from home",
        },
        # Template 6: 数据流 GM
        {
            "name": "data_stream_gm",
            "art": """
01001000 01101101
01100111 01101101
    ╔═══╗
    ║ GM║
    ╚═══╝
01001000 01101101
""",
            "vibe": "technical, data nerd",
        },
        # Template 7: 蝴蝶结 Milady 风格
        {
            "name": "bow_gm",
            "art": """
    🎀
   /  \\
  /    \\
 /  GM  \\
/________\\
  milady
  morning
""",
            "vibe": "milady aesthetic",
        },
        # Template 8: 极简框框
        {
            "name": "box_gm",
            "art": """
┌─────────────┐
│             │
│     GM      │
│             │
└─────────────┘
""",
            "vibe": "clean, simple",
        },
        # Template 9: 星星包围
        {
            "name": "stars_gm",
            "art": """
    ✨        ✨
        GM
    ✨        ✨
  from the void
""",
            "vibe": "dreamy, cosmic",
        },
        # Template 10: 疲惫版
        {
            "name": "tired_gm",
            "art": """
   _____
  |     |
  | g m |
  |  .  |
  | ... |
  |_____|
   😮‍💨💤
""",
            "vibe": "tired, monday",
        },
        # Template 11: 箭头指向
        {
            "name": "arrow_gm",
            "art": """👈
gm
👇""",
            "vibe": "playful, directional",
        },
        # Template 12: 全球时区
        {
            "name": "global_gm",
            "art": """gn 🌍
gm 🌎""",
            "vibe": "global, inclusive",
        },
        # Template 13: 数据流简化版
        {
            "name": "data_minimal",
            "art": """01001000
   GM
01101101""",
            "vibe": "technical, minimal",
        },
    ]

    @classmethod
    def get_random_art(cls) -> dict:
        """随机获取一个 ASCII art"""
        return random.choice(cls.TEMPLATES)

    @classmethod
    def get_art_by_vibe(cls, vibe: str) -> dict:
        """根据 vibe 获取匹配的 ASCII art

        Args:
            vibe: 'morning', 'tired', 'technical', 'milady', 'minimal', etc.
        """
        matching = [t for t in cls.TEMPLATES if vibe.lower() in t["vibe"].lower()]

        if matching:
            return random.choice(matching)
        else:
            return cls.get_random_art()

    @classmethod
    def get_art_by_day(cls, day_of_week: str) -> dict:
        """根据星期几选择合适的 ASCII art"""

        day_vibes = {
            "Monday": "tired",
            "Tuesday": "technical",
            "Wednesday": "minimal",
            "Thursday": "work",
            "Friday": "minimal",
            "Saturday": "milady",
            "Sunday": "dreamy",
        }

        vibe = day_vibes.get(day_of_week, "minimal")
        return cls.get_art_by_vibe(vibe)

    @classmethod
    def list_all_templates(cls) -> list:
        """列出所有可用的模板"""
        return [{"name": t["name"], "vibe": t["vibe"]} for t in cls.TEMPLATES]


def generate_ascii_gm(day_of_week: str = None, vibe: str = None) -> str:
    """生成 ASCII GM post

    Args:
        day_of_week: 星期几
        vibe: 想要的氛围

    Returns:
        完整的 ASCII art GM post
    """

    if vibe:
        template = GMAsciiArt.get_art_by_vibe(vibe)
    elif day_of_week:
        template = GMAsciiArt.get_art_by_day(day_of_week)
    else:
        template = GMAsciiArt.get_random_art()

    return template["art"].strip()


# 测试
if __name__ == "__main__":
    print("🧹 Jessie's ASCII GM Art Gallery\n")
    print("=" * 50)

    for i, template in enumerate(GMAsciiArt.TEMPLATES, 1):
        print(f"\n[{i}] {template['name']} ({template['vibe']})")
        print("-" * 50)
        print(template["art"])

    print("\n" + "=" * 50)
    print("\n🎲 Random GM:")
    print(generate_ascii_gm())
