"""
统一内容新鲜度监控系统
支持所有内容类型：GM、Main、Casual、Reply 等
"""

from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime
from .content_freshness_monitor import ContentFreshnessMonitor
from ..notifications.alert_system import send_freshness_alert
from ..core.logger import setup_logger

logger = setup_logger('unified_freshness_monitor')


class UnifiedFreshnessMonitor:
    """统一新鲜度监控器 - 管理所有内容类型"""

    # 支持的内容类型配置
    CONTENT_TYPES = {
        'gm': {
            'name': 'GM Posts',
            'description': '早安推文',
            'check_interval': 20,  # 每 20 条检查
            'enabled': True,
            'thresholds': {  # 可以为每种类型自定义阈值
                'high_severity': 0.35,
                'medium_severity': 0.50,
                'low_severity': 0.70
            }
        },
        'main': {
            'name': 'Main Posts',
            'description': '主要内容推文',
            'check_interval': 15,  # 主要内容更重要，15 条检查一次
            'enabled': False,  # 暂未启用（未训练）
            'thresholds': {
                'high_severity': 0.35,
                'medium_severity': 0.50,
                'low_severity': 0.70
            }
        },
        'casual': {
            'name': 'Casual Posts',
            'description': '休闲/晚间推文',
            'check_interval': 20,
            'enabled': False,  # 暂未启用（未训练）
            'thresholds': {
                'high_severity': 0.35,
                'medium_severity': 0.50,
                'low_severity': 0.70
            }
        },
        'reply': {
            'name': 'Reply Posts',
            'description': '回复推文',
            'check_interval': 30,  # 回复要求可以稍低
            'enabled': False,  # 暂未启用（未训练）
            'thresholds': {
                'high_severity': 0.30,
                'medium_severity': 0.45,
                'low_severity': 0.65
            }
        }
    }

    def __init__(self):
        """初始化统一监控器"""
        self.monitors = {}  # 每种类型一个独立的监控器
        self.generation_counters = {}  # 记录每种类型的生成计数

        # 为每种启用的内容类型创建监控器
        for content_type, config in self.CONTENT_TYPES.items():
            if config['enabled']:
                # 为每种类型使用独立的历史文件
                history_file = Path(__file__).parent.parent.parent / 'data' / f'history_{content_type}.json'
                self.monitors[content_type] = ContentFreshnessMonitor(history_file=str(history_file))
                self.generation_counters[content_type] = 0
                logger.info(f"Initialized monitor for {content_type}: {config['name']}")

    def record_post(self, content_type: str, post_text: str, metadata: dict = None):
        """记录生成的推文

        Args:
            content_type: 'gm', 'main', 'casual', 'reply'
            post_text: 推文内容
            metadata: 额外元数据
        """
        if content_type not in self.CONTENT_TYPES:
            logger.warning(f"Unknown content type: {content_type}")
            return

        config = self.CONTENT_TYPES[content_type]

        if not config['enabled']:
            logger.debug(f"Content type {content_type} not enabled for monitoring")
            return

        # 记录到对应的监控器
        monitor = self.monitors.get(content_type)
        if monitor:
            monitor.record_generated_post(
                post_text=post_text,
                content_type=content_type,
                metadata=metadata or {}
            )

            # 增加计数
            self.generation_counters[content_type] = self.generation_counters.get(content_type, 0) + 1

            logger.debug(f"Recorded {content_type} post #{self.generation_counters[content_type]}: {post_text[:50]}...")

    def check_and_alert(self, content_type: str, force: bool = False) -> dict:
        """检查新鲜度并在需要时提醒

        Args:
            content_type: 内容类型
            force: 强制检查（忽略计数间隔）

        Returns:
            {
                'checked': bool,
                'should_alert': bool,
                'freshness_result': dict (如果检查了)
            }
        """
        if content_type not in self.CONTENT_TYPES:
            return {'checked': False, 'should_alert': False, 'error': 'Unknown content type'}

        config = self.CONTENT_TYPES[content_type]

        if not config['enabled']:
            return {'checked': False, 'should_alert': False, 'error': 'Content type not enabled'}

        monitor = self.monitors.get(content_type)
        if not monitor:
            return {'checked': False, 'should_alert': False, 'error': 'Monitor not initialized'}

        # 检查是否到了检查间隔
        count = self.generation_counters.get(content_type, 0)
        check_interval = config['check_interval']

        should_check = force or (count > 0 and count % check_interval == 0)

        if not should_check:
            return {
                'checked': False,
                'should_alert': False,
                'next_check_at': check_interval - (count % check_interval)
            }

        # 执行检查
        logger.info(f"Checking freshness for {content_type} (generated: {count})")
        freshness_result = monitor.check_freshness(content_type)

        # 判断是否需要提醒
        score = freshness_result.get('freshness_score', 1.0)
        thresholds = config['thresholds']
        should_alert = score < thresholds['low_severity']

        if should_alert:
            logger.warning(f"⚠️ {content_type.upper()} freshness alert: {score:.2f}")

            # 发送提醒
            send_freshness_alert(freshness_result, content_type)

            return {
                'checked': True,
                'should_alert': True,
                'freshness_result': freshness_result
            }
        else:
            logger.info(f"✅ {content_type.upper()} freshness OK: {score:.2f}")
            return {
                'checked': True,
                'should_alert': False,
                'freshness_result': freshness_result
            }

    def get_all_statuses(self) -> dict:
        """获取所有内容类型的状态

        Returns:
            {
                'gm': {...},
                'main': {...},
                ...
            }
        """
        statuses = {}

        for content_type, config in self.CONTENT_TYPES.items():
            status = {
                'name': config['name'],
                'description': config['description'],
                'enabled': config['enabled'],
                'generated_count': self.generation_counters.get(content_type, 0),
                'check_interval': config['check_interval']
            }

            if config['enabled'] and content_type in self.monitors:
                monitor = self.monitors[content_type]
                freshness = monitor.check_freshness(content_type)
                status['freshness_score'] = freshness.get('freshness_score', 0)
                status['is_fresh'] = freshness.get('is_fresh', True)
                status['alerts_count'] = len(freshness.get('alerts', []))
            else:
                status['freshness_score'] = None
                status['is_fresh'] = None
                status['alerts_count'] = 0

            statuses[content_type] = status

        return statuses

    def enable_content_type(self, content_type: str):
        """启用某个内容类型的监控

        Args:
            content_type: 要启用的内容类型
        """
        if content_type not in self.CONTENT_TYPES:
            logger.error(f"Unknown content type: {content_type}")
            return False

        if self.CONTENT_TYPES[content_type]['enabled']:
            logger.info(f"{content_type} already enabled")
            return True

        # 启用
        self.CONTENT_TYPES[content_type]['enabled'] = True

        # 创建监控器
        history_file = Path(__file__).parent.parent.parent / 'data' / f'history_{content_type}.json'
        self.monitors[content_type] = ContentFreshnessMonitor(history_file=str(history_file))
        self.generation_counters[content_type] = 0

        logger.info(f"✅ Enabled monitoring for {content_type}")
        return True

    def disable_content_type(self, content_type: str):
        """禁用某个内容类型的监控

        Args:
            content_type: 要禁用的内容类型
        """
        if content_type not in self.CONTENT_TYPES:
            logger.error(f"Unknown content type: {content_type}")
            return False

        if not self.CONTENT_TYPES[content_type]['enabled']:
            logger.info(f"{content_type} already disabled")
            return True

        # 禁用
        self.CONTENT_TYPES[content_type]['enabled'] = False

        # 移除监控器
        if content_type in self.monitors:
            del self.monitors[content_type]
        if content_type in self.generation_counters:
            del self.generation_counters[content_type]

        logger.info(f"🚫 Disabled monitoring for {content_type}")
        return True

    def record_training_update(self, content_type: str, samples_added: int, notes: str = ""):
        """记录训练更新

        Args:
            content_type: 内容类型
            samples_added: 添加的样本数
            notes: 备注
        """
        if content_type not in self.CONTENT_TYPES:
            logger.warning(f"Unknown content type: {content_type}")
            return

        monitor = self.monitors.get(content_type)
        if monitor:
            monitor.record_training_update(
                training_type=content_type,
                samples_added=samples_added,
                notes=notes
            )
            logger.info(f"Recorded training update for {content_type}: +{samples_added} samples")

    def get_dashboard_summary(self) -> str:
        """生成仪表板摘要

        Returns:
            格式化的摘要字符串
        """
        lines = [
            "=" * 70,
            "📊 AI Content Studio - 统一内容新鲜度仪表板",
            "=" * 70,
            ""
        ]

        statuses = self.get_all_statuses()

        # 启用的内容类型
        enabled_types = [ct for ct, config in self.CONTENT_TYPES.items() if config['enabled']]
        disabled_types = [ct for ct, config in self.CONTENT_TYPES.items() if not config['enabled']]

        lines.append(f"✅ 启用监控: {len(enabled_types)} 种类型")
        lines.append(f"⚠️ 未启用: {len(disabled_types)} 种类型")
        lines.append("")

        # 各类型状态
        for content_type in enabled_types:
            status = statuses[content_type]
            config = self.CONTENT_TYPES[content_type]

            score = status.get('freshness_score')
            if score is not None:
                if score >= config['thresholds']['low_severity']:
                    status_icon = "✅"
                elif score >= config['thresholds']['medium_severity']:
                    status_icon = "📅"
                elif score >= config['thresholds']['high_severity']:
                    status_icon = "⚠️"
                else:
                    status_icon = "🚨"

                lines.append(f"{status_icon} {status['name']} ({content_type.upper()})")
                lines.append(f"   新鲜度: {score:.2f} / 1.00")
                lines.append(f"   已生成: {status['generated_count']} 条")
                lines.append(f"   检查间隔: 每 {config['check_interval']} 条")

                if status['alerts_count'] > 0:
                    lines.append(f"   ⚠️ 当前问题: {status['alerts_count']} 个")

                lines.append("")

        # 未启用的类型
        if disabled_types:
            lines.append("⚠️ 未启用监控的类型:")
            for content_type in disabled_types:
                config = self.CONTENT_TYPES[content_type]
                lines.append(f"   - {config['name']} ({content_type}): {config['description']}")
            lines.append("")
            lines.append("💡 提示: 添加训练数据后可以启用监控")
            lines.append("")

        lines.append("=" * 70)

        return "\n".join(lines)


# 全局单例
_unified_monitor = None


def get_unified_monitor() -> UnifiedFreshnessMonitor:
    """获取统一监控器单例"""
    global _unified_monitor
    if _unified_monitor is None:
        _unified_monitor = UnifiedFreshnessMonitor()
    return _unified_monitor


# 便捷函数
def record_post(content_type: str, post_text: str, metadata: dict = None):
    """记录生成的推文"""
    monitor = get_unified_monitor()
    monitor.record_post(content_type, post_text, metadata)


def check_and_alert(content_type: str, force: bool = False) -> dict:
    """检查并提醒"""
    monitor = get_unified_monitor()
    return monitor.check_and_alert(content_type, force)


def get_all_statuses() -> dict:
    """获取所有状态"""
    monitor = get_unified_monitor()
    return monitor.get_all_statuses()


def get_dashboard() -> str:
    """获取仪表板"""
    monitor = get_unified_monitor()
    return monitor.get_dashboard_summary()


# 测试
if __name__ == '__main__':
    monitor = get_unified_monitor()
    print(monitor.get_dashboard_summary())
