"""
主动提醒系统
当检测到内容新鲜度问题时，通过多种方式主动通知
"""

import json
import requests
from datetime import datetime
from pathlib import Path
from ..core.logger import setup_logger
from ..core.config import Config

logger = setup_logger('alert_system')


class AlertSystem:
    """多渠道提醒系统"""

    def __init__(self):
        self.alerts_log = Path(__file__).parent.parent.parent / 'data' / 'alerts.log'
        self.alerts_log.parent.mkdir(parents=True, exist_ok=True)

    def send_alert(self, alert_type: str, message: str, severity: str = 'MEDIUM', details: dict = None):
        """发送提醒到所有配置的渠道

        Args:
            alert_type: 'freshness_low', 'duplicate_high', 'training_needed'
            message: 提醒消息
            severity: 'LOW', 'MEDIUM', 'HIGH'
            details: 额外详情
        """
        alert_record = {
            'timestamp': datetime.now().isoformat(),
            'type': alert_type,
            'severity': severity,
            'message': message,
            'details': details or {}
        }

        # 1. 写入日志文件（总是执行）
        self._log_to_file(alert_record)

        # 2. 控制台输出（带颜色）
        self._print_to_console(alert_record)

        # 3. 尝试发送 Lark 通知（如果配置了）
        if hasattr(Config, 'LARK_WEBHOOK_URL') and Config.LARK_WEBHOOK_URL:
            self._send_to_lark(alert_record)

        # 4. 写入提醒文件（让其他进程能读取）
        self._write_alert_file(alert_record)

        logger.info(f"Alert sent: {alert_type} - {severity}")

    def _log_to_file(self, alert: dict):
        """记录到日志文件"""
        with open(self.alerts_log, 'a', encoding='utf-8') as f:
            f.write(json.dumps(alert, ensure_ascii=False) + '\n')

    def _print_to_console(self, alert: dict):
        """控制台输出（带颜色和格式）"""
        severity_icons = {
            'LOW': '📅',
            'MEDIUM': '⚠️',
            'HIGH': '🚨'
        }

        icon = severity_icons.get(alert['severity'], '📢')

        print("\n" + "=" * 70)
        print(f"{icon} 【AI Content Studio 提醒】 {icon}")
        print("=" * 70)
        print(f"时间: {alert['timestamp'][:19]}")
        print(f"类型: {alert['type']}")
        print(f"严重程度: {alert['severity']}")
        print()
        print(alert['message'])
        print()
        print("=" * 70)
        print()

    def _send_to_lark(self, alert: dict):
        """发送飞书/Lark 通知"""
        try:
            webhook_url = Config.LARK_WEBHOOK_URL

            severity_colors = {
                'LOW': 'grey',
                'MEDIUM': 'orange',
                'HIGH': 'red'
            }

            severity_icons = {
                'LOW': '📅',
                'MEDIUM': '⚠️',
                'HIGH': '🚨'
            }

            # 构建 Lark 消息卡片
            card = {
                "msg_type": "interactive",
                "card": {
                    "header": {
                        "title": {
                            "tag": "plain_text",
                            "content": f"{severity_icons[alert['severity']]} AI Content Studio 内容新鲜度提醒"
                        },
                        "template": severity_colors[alert['severity']]
                    },
                    "elements": [
                        {
                            "tag": "div",
                            "text": {
                                "tag": "lark_md",
                                "content": f"**类型**: {alert['type']}\n**严重程度**: {alert['severity']}\n**时间**: {alert['timestamp'][:19]}"
                            }
                        },
                        {
                            "tag": "hr"
                        },
                        {
                            "tag": "div",
                            "text": {
                                "tag": "lark_md",
                                "content": alert['message']
                            }
                        }
                    ]
                }
            }

            # 如果有详情，添加详情字段
            if alert['details']:
                details_text = "\n".join([f"- {k}: {v}" for k, v in alert['details'].items()])
                card['card']['elements'].append({
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": f"**详细信息**:\n{details_text}"
                    }
                })

            # 添加操作按钮
            card['card']['elements'].append({
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {
                            "tag": "plain_text",
                            "content": "查看训练指南"
                        },
                        "type": "default",
                        "url": "https://github.com/your-repo/docs/TRAINING_GUIDE.md"
                    }
                ]
            })

            response = requests.post(webhook_url, json=card, timeout=5)
            response.raise_for_status()
            logger.info("Lark notification sent successfully")

        except Exception as e:
            logger.warning(f"Failed to send Lark notification: {e}")

    def _write_alert_file(self, alert: dict):
        """写入提醒文件（其他进程可以读取）"""
        alert_file = Path(__file__).parent.parent.parent / 'data' / 'latest_alert.json'
        with open(alert_file, 'w', encoding='utf-8') as f:
            json.dump(alert, f, ensure_ascii=False, indent=2)


class FreshnessAlertBuilder:
    """新鲜度提醒消息构建器"""

    @staticmethod
    def build_message(freshness_result: dict, content_type: str = 'gm') -> dict:
        """根据新鲜度检查结果构建提醒消息

        Args:
            freshness_result: check_freshness() 的返回结果
            content_type: 内容类型

        Returns:
            {
                'alert_type': str,
                'message': str,
                'severity': str,
                'details': dict
            }
        """
        score = freshness_result.get('freshness_score', 0)
        alerts = freshness_result.get('alerts', [])
        stats = freshness_result.get('stats', {})
        recommendations = freshness_result.get('recommendations', [])

        # 确定严重程度（根据新阈值）
        if score < 0.35:
            severity = 'HIGH'
        elif score < 0.50:
            severity = 'MEDIUM'
        else:
            severity = 'LOW'

        # 构建消息
        message_lines = [
            f"📊 **{content_type.upper()} 内容新鲜度报告**",
            f"得分: **{score:.2f} / 1.00**",
            ""
        ]

        if alerts:
            message_lines.append("⚠️ **检测到的问题**:")
            for alert in alerts:
                message_lines.append(f"  - {alert['message']}")
            message_lines.append("")

        if recommendations:
            message_lines.append("💡 **建议行动**:")
            for i, rec in enumerate(recommendations[:3], 1):
                message_lines.append(f"  {i}. {rec}")
            message_lines.append("")

        message_lines.append("🔧 **快速操作**:")
        message_lines.append("```bash")
        message_lines.append("# 查看详情")
        message_lines.append(f"python3 manage_training.py check --type {content_type}")
        message_lines.append("")
        message_lines.append("# 生成训练模板")
        message_lines.append(f"python3 manage_training.py template --type {content_type} --output new.json")
        message_lines.append("```")

        return {
            'alert_type': 'content_freshness_low',
            'message': '\n'.join(message_lines),
            'severity': severity,
            'details': {
                'content_type': content_type,
                'freshness_score': score,
                'exact_duplicate_rate': f"{stats.get('exact_duplicate_rate', 0)*100:.1f}%",
                'similar_duplicate_rate': f"{stats.get('similar_duplicate_rate', 0)*100:.1f}%",
                'phrase_reuse_rate': f"{stats.get('phrase_reuse_rate', 0)*100:.1f}%",
                'days_since_training': stats.get('days_since_training', 'N/A')
            }
        }


# 便捷函数
def send_freshness_alert(freshness_result: dict, content_type: str = 'gm'):
    """快速发送新鲜度提醒"""
    alert_data = FreshnessAlertBuilder.build_message(freshness_result, content_type)
    alert_system = AlertSystem()
    alert_system.send_alert(**alert_data)


# 测试
if __name__ == '__main__':
    # 模拟一个低新鲜度报告
    test_result = {
        'is_fresh': False,
        'freshness_score': 0.45,
        'alerts': [
            {
                'severity': 'HIGH',
                'type': 'exact_duplicate',
                'message': '⚠️ 完全重复率过高: 15.0% (阈值: 10%)'
            },
            {
                'severity': 'MEDIUM',
                'type': 'phrase_reuse',
                'message': '⚠️ 短语重复率过高: 42.0% (阈值: 40%)'
            }
        ],
        'stats': {
            'exact_duplicate_rate': 0.15,
            'similar_duplicate_rate': 0.18,
            'phrase_reuse_rate': 0.42,
            'days_since_training': 35
        },
        'recommendations': [
            '立即添加新的训练样本，避免生成重复内容',
            '高频短语: from the trenches, neural nets, data mines',
            '建议收集 5-10 个新样本'
        ]
    }

    send_freshness_alert(test_result, 'gm')
