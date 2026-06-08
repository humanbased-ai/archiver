"""
持续学习系统
自动化训练数据更新流程
"""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict
from ..core.logger import setup_logger
from .content_freshness_monitor import ContentFreshnessMonitor

logger = setup_logger("continuous_learning")


class ContinuousLearningSystem:
    """持续学习系统 - 管理训练数据更新"""

    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.training_data_dir = self.project_root / "skills"
        self.monitor = ContentFreshnessMonitor()

    def add_training_samples(
        self,
        content_type: str,
        samples: List[Dict],
        source: str = "manual",
        notes: str = "",
    ) -> dict:
        """添加新的训练样本

        Args:
            content_type: 'gm', 'main', 'casual', etc.
            samples: 训练样本列表，格式：
                [{
                    'text': str,
                    'style': str,
                    'engagement': str,
                    'image': dict (可选),
                    ... 其他元数据
                }]
            source: 来源（'manual', 'high_engagement_tweets', 'user_feedback'）
            notes: 备注

        Returns:
            {
                'success': bool,
                'added_count': int,
                'total_samples': int,
                'message': str
            }
        """
        try:
            # 加载现有训练数据
            training_file = (
                self.training_data_dir / f"training_data_{content_type}.json"
            )

            if not training_file.exists():
                return {
                    "success": False,
                    "message": f"Training file not found: {training_file}",
                }

            with open(training_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # 获取当前最大 ID
            existing_samples = data.get("training_samples", [])
            if existing_samples:
                last_id = max(
                    [int(s["id"].split("_")[1]) for s in existing_samples if "id" in s]
                )
            else:
                last_id = 0

            # 添加新样本
            new_samples = []
            for i, sample in enumerate(samples, start=1):
                new_id = f"{content_type}_{str(last_id + i).zfill(3)}"

                new_sample = {
                    "id": new_id,
                    "text": sample["text"],
                    "style": sample.get("style", "unknown"),
                    "emoji_usage": self._detect_emoji(sample["text"]),
                    "length": self._classify_length(sample["text"]),
                    "tone": sample.get("tone", ""),
                    "engagement": sample.get("engagement", "unknown"),
                    "added_date": datetime.now().isoformat(),
                    "source": source,
                }

                # 添加可选字段
                if "image" in sample:
                    new_sample["image"] = sample["image"]
                if "key_features" in sample:
                    new_sample["key_features"] = sample["key_features"]
                if "emoji_type" in sample:
                    new_sample["emoji_type"] = sample["emoji_type"]

                new_samples.append(new_sample)

            # 更新训练数据
            data["training_samples"].extend(new_samples)

            # 更新元数据
            if "metadata" not in data:
                data["metadata"] = {}

            data["metadata"]["last_updated"] = datetime.now().isoformat()
            data["metadata"]["total_samples"] = len(data["training_samples"])
            data["metadata"]["latest_addition"] = {
                "date": datetime.now().isoformat(),
                "count": len(new_samples),
                "source": source,
                "notes": notes,
            }

            # 保存
            with open(training_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            # 记录到新鲜度监控系统
            self.monitor.record_training_update(
                training_type=content_type, samples_added=len(new_samples), notes=notes
            )

            logger.info(
                f"Added {len(new_samples)} new samples to {content_type} training data"
            )

            return {
                "success": True,
                "added_count": len(new_samples),
                "total_samples": len(data["training_samples"]),
                "new_ids": [s["id"] for s in new_samples],
                "message": f"Successfully added {len(new_samples)} samples to {content_type}",
            }

        except Exception as e:
            logger.error(f"Error adding training samples: {e}")
            return {"success": False, "message": f"Error: {str(e)}"}

    def _detect_emoji(self, text: str) -> bool:
        """检测文本是否包含 emoji"""
        import re

        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002700-\U000027BF"  # dingbats
            "\U0001F900-\U0001F9FF"  # supplemental symbols
            "]+",
            flags=re.UNICODE,
        )
        return bool(emoji_pattern.search(text))

    def _classify_length(self, text: str) -> str:
        """分类文本长度"""
        word_count = len(text.split())
        if word_count <= 2:
            return "ultra_minimal"
        elif word_count <= 5:
            return "minimal"
        elif word_count <= 10:
            return "short"
        else:
            return "medium"

    def suggest_training_samples(self, content_type: str = "gm") -> dict:
        """根据当前状态建议需要什么样的训练样本

        Returns:
            {
                'needs_training': bool,
                'suggestions': list,
                'priority': str
            }
        """
        # 检查新鲜度
        freshness = self.monitor.check_freshness(content_type)

        suggestions = []
        priority = "LOW"

        if not freshness["is_fresh"]:
            priority = "HIGH"

            # 根据问题类型给出建议
            for alert in freshness["alerts"]:
                if alert["type"] == "exact_duplicate":
                    suggestions.append(
                        {
                            "type": "new_styles",
                            "description": "需要完全不同风格的样本（新的句式、新的表达方式）",
                            "example": '如果现有的都是 "gm from X"，尝试添加 "X says gm" 或问题式 "ready for Y?"',
                        }
                    )

                elif alert["type"] == "similar_duplicate":
                    suggestions.append(
                        {
                            "type": "vocabulary_expansion",
                            "description": "需要扩展词汇库（新的地点、活动、对象）",
                            "example": "添加新的技术术语、新的工作场景、新的情绪表达",
                        }
                    )

                elif alert["type"] == "phrase_reuse":
                    suggestions.append(
                        {
                            "type": "phrase_diversity",
                            "description": f"高频短语需要替代: {', '.join(alert['details']['top_phrases'][:3])}",
                            "example": "寻找同义表达、换一种说法",
                        }
                    )

                elif alert["type"] == "training_staleness":
                    suggestions.append(
                        {
                            "type": "fresh_content",
                            "description": "需要来自近期的新鲜素材",
                            "example": "收集最近 1-2 周的高互动推文、新出现的 meme、时事热点",
                        }
                    )

        else:
            suggestions.append(
                {
                    "type": "maintenance",
                    "description": "当前内容新鲜度良好，可以继续观察",
                    "example": "建议每 2-3 周添加 3-5 个新样本保持活力",
                }
            )

        return {
            "needs_training": not freshness["is_fresh"],
            "priority": priority,
            "freshness_score": freshness.get("freshness_score", 0),
            "suggestions": suggestions,
            "current_stats": freshness["stats"],
        }

    def generate_training_template(
        self, content_type: str = "gm", count: int = 5
    ) -> str:
        """生成训练样本模板（方便用户填写）

        Args:
            content_type: 内容类型
            count: 生成几个模板

        Returns:
            JSON 模板字符串
        """
        template = {
            "content_type": content_type,
            "source": "manual / high_engagement_tweets / user_feedback",
            "notes": "描述这批样本的来源和特点",
            "samples": [],
        }

        for i in range(count):
            sample = {
                "text": f"【填写推文内容 {i+1}】",
                "style": "【填写风格，如: minimal, meta_humor, call_to_action】",
                "tone": "【填写语气，如: casual, encouraging, playful】",
                "engagement": "【填写互动情况，如: high (1.2K likes), moderate (200 likes)】",
                "image": {
                    "has_image": False,
                    "type": "【如果有图，填写: work_scene, meme, product_shot, etc.】",
                    "description": "【图片描述】",
                },
                "key_features": [
                    "【这条推文的关键特征 1】",
                    "【这条推文的关键特征 2】",
                ],
            }
            template["samples"].append(sample)

        return json.dumps(template, ensure_ascii=False, indent=2)

    def import_from_template(self, template_file: str) -> dict:
        """从模板文件导入训练样本

        Args:
            template_file: 模板文件路径（JSON）

        Returns:
            导入结果
        """
        try:
            with open(template_file, "r", encoding="utf-8") as f:
                template = json.load(f)

            content_type = template["content_type"]
            source = template.get("source", "manual")
            notes = template.get("notes", "")
            samples = template["samples"]

            # 清理模板中的占位符
            cleaned_samples = []
            for sample in samples:
                # 跳过未填写的模板
                if "【填写" in sample["text"]:
                    continue
                cleaned_samples.append(sample)

            if not cleaned_samples:
                return {
                    "success": False,
                    "message": "No valid samples found in template (all placeholders)",
                }

            # 添加样本
            result = self.add_training_samples(
                content_type=content_type,
                samples=cleaned_samples,
                source=source,
                notes=notes,
            )

            return result

        except Exception as e:
            logger.error(f"Error importing from template: {e}")
            return {"success": False, "message": f"Error: {str(e)}"}

    def get_learning_dashboard(self) -> str:
        """生成学习状态仪表板"""
        lines = ["📚 持续学习系统 - 状态仪表板", "=" * 70, ""]

        # 检查各类型内容的新鲜度
        for content_type in ["gm", "main", "casual"]:
            training_file = (
                self.training_data_dir / f"training_data_{content_type}.json"
            )

            if not training_file.exists():
                continue

            freshness = self.monitor.check_freshness(content_type)
            suggestions = self.suggest_training_samples(content_type)

            status_emoji = "✅" if freshness["is_fresh"] else "⚠️"
            lines.append(f"{status_emoji} {content_type.upper()} Content")
            lines.append(f"   新鲜度: {freshness.get('freshness_score', 0):.2f} / 1.00")
            lines.append(f"   优先级: {suggestions['priority']}")

            if not freshness["is_fresh"]:
                lines.append(f"   问题数: {len(freshness['alerts'])}")
                for alert in freshness["alerts"][:2]:
                    lines.append(f"     - {alert['message']}")

            lines.append("")

        # 训练历史
        lines.append("📅 最近训练更新:")
        recent_updates = self.monitor.history["training_data_updates"][-5:]
        if recent_updates:
            for update in recent_updates:
                date = datetime.fromisoformat(update["date"]).strftime("%Y-%m-%d")
                lines.append(
                    f"   {date}: {update['type']} (+{update['samples_added']} 样本)"
                )
        else:
            lines.append("   （无训练记录）")

        lines.append("")
        lines.append("=" * 70)

        return "\n".join(lines)


# 便捷函数
def add_training_samples(
    content_type: str, samples: List[Dict], notes: str = ""
) -> dict:
    """快速添加训练样本"""
    system = ContinuousLearningSystem()
    return system.add_training_samples(content_type, samples, notes=notes)


def get_training_suggestions(content_type: str = "gm") -> dict:
    """获取训练建议"""
    system = ContinuousLearningSystem()
    return system.suggest_training_samples(content_type)


def generate_training_template(
    content_type: str = "gm", output_file: str = None
) -> str:
    """生成训练模板"""
    system = ContinuousLearningSystem()
    template = system.generate_training_template(content_type)

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(template)
        print(f"✅ Template saved to: {output_file}")

    return template


# 测试
if __name__ == "__main__":
    system = ContinuousLearningSystem()

    print(system.get_learning_dashboard())
    print("\n")

    # 生成训练建议
    suggestions = system.suggest_training_samples("gm")
    print(f"需要训练: {suggestions['needs_training']}")
    print(f"优先级: {suggestions['priority']}")
    print(f"新鲜度: {suggestions['freshness_score']:.2f}")
    print("\n建议:")
    for s in suggestions["suggestions"]:
        print(f"  - {s['description']}")
        print(f"    例如: {s['example']}")
        print()
