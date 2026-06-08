"""
创意 GM 生成引擎
解决 "套路化" 问题，持续产生新鲜内容
"""

import random
from datetime import datetime


class CreativeGMEngine:
    """动态创意 GM 生成器 - 避免套路化"""

    # 基础构件库（可以随意组合）
    BUILDING_BLOCKS = {
        "base": ["gm", "Gm", "GM"],
        "locations": [
            "from the trenches",
            "from the neural nets",
            "from the void",
            "from my desk",
            "from the data mines",
            "from the training set",
            "from the annotation queue",
            "from the edge cases",
        ],
        "activities": [
            "debugging before coffee",
            "labeling before thinking",
            "making AI less confused",
            "fighting null values",
            "teaching machines to see",
            "finding the outliers",
            "surviving another sprint",
        ],
        "objects": [
            "coffee",
            "laptop",
            "datasets",
            "bugs",
            "deadlines",
            "PRs",
            "merge conflicts",
        ],
        "moods_single": [
            "🤨",
            "🥱",
            "🫠",
            "🤯",
            "😮‍💨",
            "💤",
            "☕",
            "🧹",
            "🎀",
            "💻",
            "🚀",
            "🔥",
            "✨",
            "🤝",
        ],
        "moods_double": ["😎😎", "🧹🧹", "☕☕", "🎀🎀", "💀💀", "🫡🫡"],
        "mood_combos": ["☕💻", "🧹💻", "☕🤯", "💤☕", "🧹✨", "🎀💻", "☕☀️"],
        "punctuation": ["", "...", ".", "—", ""],
        "questions": [
            "who's building today?",
            "who needs coffee?",
            "who's in the trenches?",
            "what are we fixing today?",
            "anyone else tired?",
            "ready for chaos?",
        ],
        "statements": [
            "we got this",
            "one day at a time",
            "coffee first, code later",
            "hang in there",
            "let's build",
            "still here",
            "not dead yet",
        ],
        "meta_phrases": [
            "i say gm, you gm back — deal?",
            "algorithm pls show this to someone",
            "is anyone actually awake",
            "mandatory gm tweet",
            "another day another dataset",
        ],
    }

    # 生成策略
    STRATEGIES = [
        "ultra_minimal",  # 30%
        "minimal_location",  # 15%
        "minimal_activity",  # 10%
        "mood_emoji",  # 20%
        "double_emoji",  # 3%
        "emoji_combo",  # 5%
        "ellipsis",  # 5%
        "question",  # 5%
        "statement",  # 4%
        "meta",  # 3%
    ]

    # 策略权重
    STRATEGY_WEIGHTS = [30, 15, 10, 20, 3, 5, 5, 5, 4, 3]

    @classmethod
    def generate_creative_gm(
        cls, day_of_week: str = None, theme: str = None, avoid_list: list = None
    ) -> dict:
        """动态生成创意 GM

        Returns:
            {
                'text': str,
                'strategy': str,
                'components': list,  # 使用了哪些构件
                'is_new_combo': bool  # 是否是新组合
            }
        """

        # 随机选择生成策略
        strategy = random.choices(cls.STRATEGIES, weights=cls.STRATEGY_WEIGHTS)[0]

        if strategy == "ultra_minimal":
            return cls._ultra_minimal()

        elif strategy == "minimal_location":
            return cls._minimal_location()

        elif strategy == "minimal_activity":
            return cls._minimal_activity()

        elif strategy == "mood_emoji":
            return cls._mood_emoji()

        elif strategy == "double_emoji":
            return cls._double_emoji()

        elif strategy == "emoji_combo":
            return cls._emoji_combo()

        elif strategy == "ellipsis":
            return cls._ellipsis()

        elif strategy == "question":
            return cls._question()

        elif strategy == "statement":
            return cls._statement()

        elif strategy == "meta":
            return cls._meta()

        else:
            return cls._ultra_minimal()

    @classmethod
    def _ultra_minimal(cls) -> dict:
        """超极简 - 就是 gm"""
        base = random.choice(cls.BUILDING_BLOCKS["base"])
        return {
            "text": base,
            "strategy": "ultra_minimal",
            "components": [base],
            "is_new_combo": False,
        }

    @classmethod
    def _minimal_location(cls) -> dict:
        """极简 + 地点"""
        base = random.choice(["gm", "gm"])  # 偏向小写
        location = random.choice(cls.BUILDING_BLOCKS["locations"])
        text = f"{base} {location}"
        return {
            "text": text,
            "strategy": "minimal_location",
            "components": [base, location],
            "is_new_combo": True,
        }

    @classmethod
    def _minimal_activity(cls) -> dict:
        """极简 + 活动"""
        base = random.choice(["gm", "gm", "gm", "Gm"])
        activity = random.choice(cls.BUILDING_BLOCKS["activities"])
        text = f"{base} {activity}"
        return {
            "text": text,
            "strategy": "minimal_activity",
            "components": [base, activity],
            "is_new_combo": True,
        }

    @classmethod
    def _mood_emoji(cls) -> dict:
        """单个 emoji 表达情绪"""
        base = random.choice(["gm", "gm", "gm"])
        emoji = random.choice(cls.BUILDING_BLOCKS["moods_single"])
        punct = random.choice(cls.BUILDING_BLOCKS["punctuation"])

        # 40% 概率 emoji 在后面，60% 概率在旁边
        if random.random() < 0.4:
            text = f"{base}{punct}\n{emoji}"
        else:
            text = f"{base} {emoji}"

        return {
            "text": text,
            "strategy": "mood_emoji",
            "components": [base, emoji],
            "is_new_combo": False,
        }

    @classmethod
    def _double_emoji(cls) -> dict:
        """重复 emoji"""
        base = random.choice(["gm", "gm"])
        emoji_double = random.choice(cls.BUILDING_BLOCKS["moods_double"])
        text = f"{base} {emoji_double}"
        return {
            "text": text,
            "strategy": "double_emoji",
            "components": [base, emoji_double],
            "is_new_combo": False,
        }

    @classmethod
    def _emoji_combo(cls) -> dict:
        """多 emoji 组合"""
        base = random.choice(["gm", "Gm"])
        combo = random.choice(cls.BUILDING_BLOCKS["mood_combos"])
        text = f"{base} {combo}"
        return {
            "text": text,
            "strategy": "emoji_combo",
            "components": [base, combo],
            "is_new_combo": False,
        }

    @classmethod
    def _ellipsis(cls) -> dict:
        """省略号传达疲惫"""
        base = random.choice(["gm", "gm"])

        # 70% 只有 ...，30% 加 emoji
        if random.random() < 0.7:
            text = f"{base}..."
        else:
            emoji = random.choice(["🤯", "🫠", "😮‍💨", "💤"])
            text = f"{base}... {emoji}"

        return {
            "text": text,
            "strategy": "ellipsis",
            "components": [base, "ellipsis"],
            "is_new_combo": False,
        }

    @classmethod
    def _question(cls) -> dict:
        """问题式互动"""
        base = random.choice(["gm", "gm", "GM"])
        question = random.choice(cls.BUILDING_BLOCKS["questions"])

        # 50% 分行，50% 同行
        if random.random() < 0.5:
            text = f"{base}\n\n{question}"
        else:
            text = f"{base}, {question}"

        return {
            "text": text,
            "strategy": "question",
            "components": [base, question],
            "is_new_combo": True,
        }

    @classmethod
    def _statement(cls) -> dict:
        """陈述式鼓励"""
        base = random.choice(["gm", "gm", "Gm"])
        statement = random.choice(cls.BUILDING_BLOCKS["statements"])

        # 多行排版增加视觉冲击
        text = f"{base}\n\n{statement}"

        return {
            "text": text,
            "strategy": "statement",
            "components": [base, statement],
            "is_new_combo": True,
        }

    @classmethod
    def _meta(cls) -> dict:
        """Meta 幽默"""
        phrase = random.choice(cls.BUILDING_BLOCKS["meta_phrases"])
        return {
            "text": phrase,
            "strategy": "meta",
            "components": [phrase],
            "is_new_combo": False,
        }

    @classmethod
    def generate_batch(cls, n: int = 20) -> list:
        """批量生成并检查重复率

        Args:
            n: 生成数量

        Returns:
            list of generated GMs with stats
        """
        results = []
        texts_seen = set()
        duplicates = 0

        for i in range(n):
            gm = cls.generate_creative_gm()

            if gm["text"] in texts_seen:
                duplicates += 1
            else:
                texts_seen.add(gm["text"])

            results.append(
                {
                    "id": i + 1,
                    "gm": gm,
                    "is_duplicate": gm["text"] in texts_seen and i > 0,
                }
            )

        stats = {
            "total": n,
            "unique": len(texts_seen),
            "duplicates": duplicates,
            "duplicate_rate": f"{duplicates/n*100:.1f}%",
            "strategy_distribution": {},
        }

        # 统计策略分布
        for r in results:
            strategy = r["gm"]["strategy"]
            stats["strategy_distribution"][strategy] = (
                stats["strategy_distribution"].get(strategy, 0) + 1
            )

        return {"results": results, "stats": stats}

    @classmethod
    def expand_vocabulary(cls, new_locations: list = None, new_activities: list = None):
        """扩展词汇库（用于持续学习）

        当发现新的好词汇/短语时，可以动态添加
        """
        if new_locations:
            cls.BUILDING_BLOCKS["locations"].extend(new_locations)

        if new_activities:
            cls.BUILDING_BLOCKS["activities"].extend(new_activities)

        print(f"✅ Vocabulary expanded:")
        print(f"  - Locations: {len(cls.BUILDING_BLOCKS['locations'])}")
        print(f"  - Activities: {len(cls.BUILDING_BLOCKS['activities'])}")


# 测试和演示
if __name__ == "__main__":
    print("🧹 Jessie's Creative GM Engine\n")
    print("=" * 60)

    # 生成 20 条测试
    batch = CreativeGMEngine.generate_batch(20)

    print("\n📊 Statistics:")
    print(f"  Total: {batch['stats']['total']}")
    print(f"  Unique: {batch['stats']['unique']}")
    print(f"  Duplicate Rate: {batch['stats']['duplicate_rate']}")
    print("\n  Strategy Distribution:")
    for strategy, count in batch["stats"]["strategy_distribution"].items():
        print(f"    - {strategy}: {count}")

    print("\n" + "=" * 60)
    print("\n🎲 Sample GMs:\n")

    for item in batch["results"][:15]:
        gm = item["gm"]
        print(f"[{item['id']}] {gm['strategy']}")
        print(f"    {gm['text']}")
        if gm["is_new_combo"]:
            print(f"    ✨ NEW COMBO")
        print()
