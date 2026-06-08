"""
内容新鲜度监控系统
检测重复率、创意枯竭，并提醒需要新素材
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter
from difflib import SequenceMatcher
from ..core.logger import setup_logger

logger = setup_logger('freshness_monitor')


class ContentFreshnessMonitor:
    """监控生成内容的新鲜度和重复率"""

    def __init__(self, history_file: str = None):
        """
        Args:
            history_file: 历史记录文件路径
        """
        if history_file is None:
            history_file = Path(__file__).parent.parent.parent / 'data' / 'generated_history.json'

        self.history_file = Path(history_file)
        self.history_file.parent.mkdir(parents=True, exist_ok=True)

        self.history = self._load_history()

        # 阈值配置
        self.THRESHOLDS = {
            'exact_duplicate_rate': 0.10,      # 10% 完全重复就报警
            'similar_duplicate_rate': 0.25,    # 25% 相似重复就报警
            'phrase_reuse_rate': 0.40,         # 40% 短语重复就报警
            'days_since_training': 30,         # 30 天没训练就提醒
            'content_staleness_score': 0.50,   # 新鲜度低于 0.50 开始报警
            'high_severity_threshold': 0.35,   # 新鲜度低于 0.35 为高严重度
            'medium_severity_threshold': 0.50  # 新鲜度低于 0.50 为中等严重度
        }

    def _load_history(self) -> dict:
        """加载历史记录"""
        if self.history_file.exists():
            with open(self.history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            return {
                'generated_posts': [],
                'training_data_updates': [],
                'alerts': [],
                'stats': {
                    'total_generated': 0,
                    'last_training_date': None
                }
            }

    def _save_history(self):
        """保存历史记录"""
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, ensure_ascii=False, indent=2)

    def record_generated_post(self, post_text: str, content_type: str, metadata: dict = None):
        """记录生成的推文

        Args:
            post_text: 推文内容
            content_type: 'gm', 'main', 'casual', etc.
            metadata: 额外信息（theme, day, etc.）
        """
        record = {
            'id': len(self.history['generated_posts']) + 1,
            'text': post_text,
            'content_type': content_type,
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata or {}
        }

        self.history['generated_posts'].append(record)
        self.history['stats']['total_generated'] += 1

        self._save_history()
        logger.info(f"Recorded post #{record['id']}: {post_text[:50]}...")

    def record_training_update(self, training_type: str, samples_added: int, notes: str = ""):
        """记录训练数据更新

        Args:
            training_type: 'gm', 'main', 'reply', etc.
            samples_added: 添加的样本数量
            notes: 备注
        """
        record = {
            'type': training_type,
            'samples_added': samples_added,
            'date': datetime.now().isoformat(),
            'notes': notes
        }

        self.history['training_data_updates'].append(record)
        self.history['stats']['last_training_date'] = datetime.now().isoformat()

        self._save_history()
        logger.info(f"Recorded training update: {training_type} (+{samples_added} samples)")

    def check_freshness(self, content_type: str = 'gm', recent_window: int = 50) -> dict:
        """检查内容新鲜度

        Args:
            content_type: 检查的内容类型
            recent_window: 检查最近 N 条

        Returns:
            {
                'is_fresh': bool,
                'alerts': list,
                'stats': dict,
                'recommendations': list
            }
        """
        # 筛选相关类型的推文
        posts = [p for p in self.history['generated_posts'] if p['content_type'] == content_type]
        recent_posts = posts[-recent_window:] if len(posts) > recent_window else posts

        if len(recent_posts) < 10:
            return {
                'is_fresh': True,
                'alerts': [],
                'stats': {'message': 'Not enough data to analyze'},
                'recommendations': []
            }

        # 1. 检查完全重复
        exact_duplicates = self._check_exact_duplicates(recent_posts)

        # 2. 检查相似重复
        similar_duplicates = self._check_similar_duplicates(recent_posts)

        # 3. 检查短语重复
        phrase_reuse = self._check_phrase_reuse(recent_posts)

        # 4. 检查距离上次训练的时间
        training_staleness = self._check_training_staleness()

        # 5. 计算综合新鲜度分数
        freshness_score = self._calculate_freshness_score(
            exact_duplicates,
            similar_duplicates,
            phrase_reuse,
            training_staleness
        )

        # 生成报警
        alerts = []
        recommendations = []

        if exact_duplicates['rate'] > self.THRESHOLDS['exact_duplicate_rate']:
            alerts.append({
                'severity': 'HIGH',
                'type': 'exact_duplicate',
                'message': f"⚠️ 完全重复率过高: {exact_duplicates['rate']*100:.1f}% (阈值: {self.THRESHOLDS['exact_duplicate_rate']*100:.0f}%)",
                'details': exact_duplicates
            })
            recommendations.append("立即添加新的训练样本，避免生成重复内容")

        if similar_duplicates['rate'] > self.THRESHOLDS['similar_duplicate_rate']:
            alerts.append({
                'severity': 'MEDIUM',
                'type': 'similar_duplicate',
                'message': f"⚠️ 相似重复率过高: {similar_duplicates['rate']*100:.1f}% (阈值: {self.THRESHOLDS['similar_duplicate_rate']*100:.0f}%)",
                'details': similar_duplicates
            })
            recommendations.append("内容开始套路化，建议丰富词汇库和表达方式")

        if phrase_reuse['rate'] > self.THRESHOLDS['phrase_reuse_rate']:
            alerts.append({
                'severity': 'MEDIUM',
                'type': 'phrase_reuse',
                'message': f"⚠️ 短语重复率过高: {phrase_reuse['rate']*100:.1f}% (阈值: {self.THRESHOLDS['phrase_reuse_rate']*100:.0f}%)",
                'details': phrase_reuse
            })
            recommendations.append(f"高频短语: {', '.join(phrase_reuse['top_phrases'][:5])}")

        if training_staleness['days_since_training'] > self.THRESHOLDS['days_since_training']:
            alerts.append({
                'severity': 'LOW',
                'type': 'training_staleness',
                'message': f"📅 距离上次训练已过 {training_staleness['days_since_training']} 天",
                'details': training_staleness
            })
            recommendations.append("定期补充新素材可以保持内容新鲜度")

        if freshness_score < self.THRESHOLDS['content_staleness_score']:
            alerts.append({
                'severity': 'HIGH',
                'type': 'content_staleness',
                'message': f"🚨 内容新鲜度过低: {freshness_score:.2f} (阈值: {self.THRESHOLDS['content_staleness_score']:.2f})",
                'details': {'score': freshness_score}
            })
            recommendations.append("⚠️ 紧急：需要立即补充新训练素材！")

        # 记录报警
        if alerts:
            alert_record = {
                'timestamp': datetime.now().isoformat(),
                'content_type': content_type,
                'alerts': alerts,
                'freshness_score': freshness_score
            }
            self.history['alerts'].append(alert_record)
            self._save_history()

        return {
            'is_fresh': freshness_score >= self.THRESHOLDS['content_staleness_score'] and len(alerts) == 0,
            'freshness_score': freshness_score,
            'alerts': alerts,
            'stats': {
                'exact_duplicate_rate': exact_duplicates['rate'],
                'similar_duplicate_rate': similar_duplicates['rate'],
                'phrase_reuse_rate': phrase_reuse['rate'],
                'days_since_training': training_staleness['days_since_training'],
                'total_posts_analyzed': len(recent_posts)
            },
            'recommendations': recommendations
        }

    def _check_exact_duplicates(self, posts: list) -> dict:
        """检查完全重复"""
        texts = [p['text'].strip().lower() for p in posts]
        counter = Counter(texts)
        duplicates = {text: count for text, count in counter.items() if count > 1}

        duplicate_rate = sum(count - 1 for count in duplicates.values()) / len(texts) if texts else 0

        return {
            'rate': duplicate_rate,
            'count': len(duplicates),
            'examples': list(duplicates.items())[:5]
        }

    def _check_similar_duplicates(self, posts: list, similarity_threshold: float = 0.8) -> dict:
        """检查相似重复（使用编辑距离）"""
        texts = [p['text'].strip().lower() for p in posts]
        similar_pairs = []

        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                similarity = SequenceMatcher(None, texts[i], texts[j]).ratio()
                if similarity >= similarity_threshold:
                    similar_pairs.append((texts[i], texts[j], similarity))

        similar_rate = len(similar_pairs) / len(texts) if texts else 0

        return {
            'rate': similar_rate,
            'count': len(similar_pairs),
            'examples': similar_pairs[:5]
        }

    def _check_phrase_reuse(self, posts: list, min_phrase_length: int = 3) -> dict:
        """检查短语重复（2-4 个词的组合）"""
        all_phrases = []

        for post in posts:
            words = post['text'].lower().split()
            # 提取 2-4 词的短语
            for n in range(2, 5):
                for i in range(len(words) - n + 1):
                    phrase = ' '.join(words[i:i+n])
                    # 过滤掉太常见的词（gm, from, the 等）
                    if phrase not in ['gm from', 'from the', 'the data', 'data labeling']:
                        all_phrases.append(phrase)

        if not all_phrases:
            return {'rate': 0, 'count': 0, 'top_phrases': []}

        counter = Counter(all_phrases)
        repeated_phrases = {phrase: count for phrase, count in counter.items() if count > 2}

        reuse_rate = len(repeated_phrases) / len(set(all_phrases)) if all_phrases else 0

        return {
            'rate': reuse_rate,
            'count': len(repeated_phrases),
            'top_phrases': [phrase for phrase, count in counter.most_common(10) if count > 2]
        }

    def _check_training_staleness(self) -> dict:
        """检查距离上次训练的时间"""
        last_training = self.history['stats'].get('last_training_date')

        if not last_training:
            return {
                'days_since_training': 999,
                'last_training_date': None,
                'message': '从未记录过训练更新'
            }

        last_date = datetime.fromisoformat(last_training)
        days_since = (datetime.now() - last_date).days

        return {
            'days_since_training': days_since,
            'last_training_date': last_training,
            'message': f'上次训练: {days_since} 天前'
        }

    def _calculate_freshness_score(self, exact_dup, similar_dup, phrase_reuse, training_stale) -> float:
        """计算综合新鲜度分数 (0-1, 1 最新鲜)"""

        # 各项权重
        weights = {
            'exact_duplicate': 0.4,
            'similar_duplicate': 0.3,
            'phrase_reuse': 0.2,
            'training_staleness': 0.1
        }

        # 计算各项得分（越高越好）
        exact_score = max(0, 1 - exact_dup['rate'] / self.THRESHOLDS['exact_duplicate_rate'])
        similar_score = max(0, 1 - similar_dup['rate'] / self.THRESHOLDS['similar_duplicate_rate'])
        phrase_score = max(0, 1 - phrase_reuse['rate'] / self.THRESHOLDS['phrase_reuse_rate'])
        training_score = max(0, 1 - training_stale['days_since_training'] / self.THRESHOLDS['days_since_training'])

        # 加权平均
        total_score = (
            exact_score * weights['exact_duplicate'] +
            similar_score * weights['similar_duplicate'] +
            phrase_score * weights['phrase_reuse'] +
            training_score * weights['training_staleness']
        )

        return total_score

    def get_freshness_report(self, content_type: str = 'gm') -> str:
        """生成新鲜度报告（适合发送通知）"""
        result = self.check_freshness(content_type)

        if result['is_fresh']:
            return f"✅ {content_type.upper()} 内容新鲜度良好 (得分: {result['freshness_score']:.2f})"

        report_lines = [
            f"📊 {content_type.upper()} 内容新鲜度报告",
            f"得分: {result['freshness_score']:.2f} / 1.00",
            "",
            "⚠️ 问题："
        ]

        for alert in result['alerts']:
            severity_emoji = {
                'HIGH': '🚨',
                'MEDIUM': '⚠️',
                'LOW': '📅'
            }
            report_lines.append(f"{severity_emoji[alert['severity']]} {alert['message']}")

        if result['recommendations']:
            report_lines.append("")
            report_lines.append("💡 建议：")
            for rec in result['recommendations']:
                report_lines.append(f"  - {rec}")

        report_lines.append("")
        report_lines.append("📈 统计：")
        report_lines.append(f"  - 完全重复率: {result['stats']['exact_duplicate_rate']*100:.1f}%")
        report_lines.append(f"  - 相似重复率: {result['stats']['similar_duplicate_rate']*100:.1f}%")
        report_lines.append(f"  - 短语重复率: {result['stats']['phrase_reuse_rate']*100:.1f}%")
        report_lines.append(f"  - 距上次训练: {result['stats']['days_since_training']} 天")

        return "\n".join(report_lines)

    def auto_check_and_alert(self, content_type: str = 'gm', check_interval: int = 20) -> dict:
        """自动检查并返回是否需要报警

        Args:
            content_type: 内容类型
            check_interval: 每生成 N 条就检查一次

        Returns:
            {
                'should_alert': bool,
                'message': str
            }
        """
        posts = [p for p in self.history['generated_posts'] if p['content_type'] == content_type]

        # 每 N 条检查一次
        if len(posts) % check_interval == 0 and len(posts) > 0:
            result = self.check_freshness(content_type)

            if not result['is_fresh']:
                return {
                    'should_alert': True,
                    'message': self.get_freshness_report(content_type)
                }

        return {
            'should_alert': False,
            'message': ''
        }


# 便捷函数
def check_content_freshness(content_type: str = 'gm') -> dict:
    """快速检查内容新鲜度"""
    monitor = ContentFreshnessMonitor()
    return monitor.check_freshness(content_type)


def get_freshness_report(content_type: str = 'gm') -> str:
    """获取新鲜度报告"""
    monitor = ContentFreshnessMonitor()
    return monitor.get_freshness_report(content_type)


# 测试
if __name__ == '__main__':
    monitor = ContentFreshnessMonitor()

    # 模拟生成一些重复内容
    print("🧪 模拟生成 30 条 GM posts（包含重复）...\n")

    test_posts = [
        "gm from the trenches",
        "gm",
        "gm 🥱",
        "gm from the trenches",  # 重复
        "gm builders",
        "gm from the data mines",
        "gm",  # 重复
        "gm from the trenches",  # 重复
        "gm debugging",
        "gm from the void",
    ] * 3  # 重复 3 遍

    for post in test_posts:
        monitor.record_generated_post(post, 'gm', {'theme': 'test'})

    print(f"✅ 已记录 {len(test_posts)} 条 GM posts\n")
    print("=" * 70)

    # 检查新鲜度
    print("\n" + monitor.get_freshness_report('gm'))
