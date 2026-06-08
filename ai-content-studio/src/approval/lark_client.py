"""Lark 通知客户端"""
import requests
import json
from typing import Dict, Optional
from ..core.config import Config
from ..core.logger import setup_logger

logger = setup_logger('lark_client')

class LarkClient:
    """Lark 客户端"""

    def __init__(self):
        self.app_id = Config.LARK_APP_ID
        self.app_secret = Config.LARK_APP_SECRET
        self.chat_id = Config.LARK_CHAT_ID
        self.webhook_url = Config.LARK_WEBHOOK_URL  # Backup
        self._access_token = None

    def _get_tenant_access_token(self) -> Optional[str]:
        """获取 tenant_access_token"""
        try:
            url = "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal"
            payload = {
                "app_id": self.app_id,
                "app_secret": self.app_secret
            }

            response = requests.post(url, json=payload)
            data = response.json()

            if data.get('code') == 0:
                self._access_token = data['tenant_access_token']
                return self._access_token
            else:
                logger.error(f"Failed to get access token: {data}")
                return None
        except Exception as e:
            logger.error(f"Error getting access token: {e}")
            return None
    
    def send_approval_card(
        self,
        tweet_id: str,
        original_text: str,
        author: str,
        reply_short: str,
        reply_medium: str,
        reply_long: str,
        priority: str,
        reason: str
    ) -> bool:
        """
        发送审核卡片

        Args:
            tweet_id: 推文ID
            original_text: 原始推文
            author: 作者
            reply_short: 简短回复
            reply_medium: 中等回复
            reply_long: 详细回复
            priority: 优先级
            reason: 互动原因
        """

        # 构建Twitter链接
        tweet_url = f"https://twitter.com/{author}/status/{tweet_id}"
        author_url = f"https://twitter.com/{author}"

        # 使用消息卡片格式（而非旧的 card 格式）
        card = {
            "config": {
                "wide_screen_mode": True
            },
            "header": {
                "title": {
                    "content": f"🔔 新推文需要互动 - {priority.upper()}",
                    "tag": "plain_text"
                },
                "template": self._get_color(priority)
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "content": f"**作者**: [@{author}]({author_url})\n**优先级**: {priority}\n**原因**: {reason}",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**原推文**:\n{original_text}\n\n[📱 在Twitter查看]({tweet_url})",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": "**建议回复 (3个版本)**:",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**1️⃣ 简短**: {reply_short}",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**2️⃣ 中等**: {reply_medium}",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**3️⃣ 详细**: {reply_long}",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {
                                "tag": "plain_text",
                                "content": "✅ 发送 1"
                            },
                            "type": "primary",
                            "value": json.dumps({"action": "approve", "tweet_id": tweet_id, "reply_type": "short"})
                        },
                        {
                            "tag": "button",
                            "text": {
                                "tag": "plain_text",
                                "content": "✅ 发送 2"
                            },
                            "type": "primary",
                            "value": json.dumps({"action": "approve", "tweet_id": tweet_id, "reply_type": "medium"})
                        },
                        {
                            "tag": "button",
                            "text": {
                                "tag": "plain_text",
                                "content": "✅ 发送 3"
                            },
                            "type": "primary",
                            "value": json.dumps({"action": "approve", "tweet_id": tweet_id, "reply_type": "long"})
                        }
                    ]
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {
                                "tag": "plain_text",
                                "content": "❌ 拒绝"
                            },
                            "type": "danger",
                            "value": json.dumps({"action": "reject", "tweet_id": tweet_id})
                        }
                    ]
                },
                {
                    "tag": "note",
                    "elements": [
                        {
                            "tag": "plain_text",
                            "content": f"Tweet ID: {tweet_id}\n\n💡 按钮已启用，点击即可操作\n命令行备用: python3 approve.py [approve/reject/edit] {tweet_id}"
                        }
                    ]
                }
            ]
        }

        # Use OpenAPI to send message to chat
        try:
            access_token = self._get_tenant_access_token()
            if not access_token:
                logger.error("Failed to get access token, falling back to webhook")
                # Fallback to webhook
                return self._send_via_webhook(card)

            url = "https://open.larksuite.com/open-apis/im/v1/messages"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "receive_id": self.chat_id,
                "msg_type": "interactive",
                "content": json.dumps(card)  # Convert to JSON string
            }
            params = {
                "receive_id_type": "chat_id"
            }

            response = requests.post(url, headers=headers, json=payload, params=params)
            data = response.json()

            if data.get('code') == 0:
                logger.info(f"Sent approval card for tweet {tweet_id}")
                return True
            else:
                logger.error(f"Failed to send card: {data}")
                # Fallback to webhook
                return self._send_via_webhook(card)

        except Exception as e:
            logger.error(f"Error sending Lark message: {e}")
            # Fallback to webhook
            return self._send_via_webhook(card)

    def _send_via_webhook(self, card: dict) -> bool:
        """通过 webhook 发送消息（备用方案）"""
        try:
            payload = {
                "msg_type": "interactive",
                "card": card
            }
            response = requests.post(self.webhook_url, json=payload)
            if response.status_code == 200:
                logger.info("Sent card via webhook (fallback)")
                return True
            else:
                logger.error(f"Webhook failed: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return False
    
    def _get_color(self, priority: str) -> str:
        """根据优先级返回颜色"""
        colors = {
            'highest': 'red',
            'high': 'orange',
            'medium': 'blue',
            'original': 'green'
        }
        return colors.get(priority, 'grey')
    
    def send_notification(self, message: str) -> bool:
        """发送简单通知"""
        try:
            access_token = self._get_tenant_access_token()
            if not access_token:
                logger.error("Failed to get access token for notification")
                return False

            url = "https://open.larksuite.com/open-apis/im/v1/messages"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "receive_id": self.chat_id,
                "msg_type": "text",
                "content": f'{{"text":"{message}"}}'
            }
            params = {
                "receive_id_type": "chat_id"
            }

            response = requests.post(url, headers=headers, json=payload, params=params)
            data = response.json()

            return data.get('code') == 0
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False

    def send_text_message(self, user_id: str, message: str, id_type: str = "open_id") -> bool:
        """发送文本消息给指定用户或群聊

        Args:
            user_id: 用户 open_id 或群聊 chat_id
            message: 消息内容
            id_type: 'open_id' 或 'chat_id'
        """
        try:
            access_token = self._get_tenant_access_token()
            if not access_token:
                logger.error("Failed to get access token")
                return False

            url = "https://open.larksuite.com/open-apis/im/v1/messages"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "receive_id": user_id,
                "msg_type": "text",
                "content": json.dumps({"text": message})
            }
            params = {
                "receive_id_type": id_type
            }

            response = requests.post(url, headers=headers, json=payload, params=params)
            data = response.json()

            if data.get('code') == 0:
                logger.info(f"Sent text message to {user_id}")
                return True
            else:
                logger.error(f"Failed to send text message: {data}")
                return False

        except Exception as e:
            logger.error(f"Error sending text message: {e}")
            return False
