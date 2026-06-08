#!/usr/bin/env python3
"""创建原创推文工具"""
import sys
import datetime
from src.intelligence.claude_client import ClaudeClient
from src.approval.lark_client import LarkClient
from src.storage.database import Database
from src.core.logger import setup_logger

logger = setup_logger("create_tweet")


def create_original_tweet(theme: str = None):
    """
    创建原创推文

    Args:
        theme: 推文主题（可选）
    """
    # 获取今天是星期几
    days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    today = days[datetime.datetime.now().weekday()]

    # 默认主题
    if not theme:
        theme = "Codatta - data ownership, AI training, data labeling"

    logger.info(f"Creating original tweet for {today}")
    logger.info(f"Theme: {theme}")

    # 生成原创内容
    claude = ClaudeClient()
    tweet_text = claude.generate_original(theme=theme, day_of_week=today).strip()

    # 检查长度
    if len(tweet_text) > 280:
        logger.warning(f"Tweet too long ({len(tweet_text)} chars), truncating...")
        tweet_text = tweet_text[:277] + "..."

    logger.info(f"Generated tweet ({len(tweet_text)} chars): {tweet_text[:100]}...")

    # 保存到数据库
    db = Database()
    from src.storage.models import OriginalContent

    session = db.get_session()
    try:
        content = OriginalContent(
            theme=theme,
            content=tweet_text,
            day_of_week=today,
            approval_status="pending",
        )
        session.add(content)
        session.commit()
        content_id = content.id
        logger.info(f"Saved to database with ID: {content_id}")
    except Exception as e:
        session.rollback()
        logger.error(f"Error saving to database: {e}")
        return False
    finally:
        session.close()

    # 发送到 Lark 审核
    lark = LarkClient()
    success = send_original_approval_card(
        lark=lark, content_id=content_id, tweet_text=tweet_text, theme=theme
    )

    if success:
        logger.info(f"✅ Original tweet approval card sent to Lark")
        print(f"\n✅ 原创推文已生成并发送到 Lark 审核")
        print(f"ID: {content_id}")
        print(f"内容: {tweet_text}")
        print(f"字符数: {len(tweet_text)}")
        return True
    else:
        logger.error("Failed to send approval card")
        print(f"\n❌ 发送审核卡片失败")
        return False


def send_original_approval_card(
    lark, content_id: int, tweet_text: str, theme: str
) -> bool:
    """发送原创推文审核卡片"""
    import json

    card = {
        "config": {"wide_screen_mode": True},
        "header": {
            "title": {"content": "📝 原创推文待审核", "tag": "plain_text"},
            "template": "green",
        },
        "elements": [
            {"tag": "div", "text": {"content": f"**主题**: {theme}", "tag": "lark_md"}},
            {"tag": "hr"},
            {
                "tag": "div",
                "text": {"content": f"**推文内容**:\n{tweet_text}", "tag": "lark_md"},
            },
            {
                "tag": "div",
                "text": {
                    "content": f"**字符数**: {len(tweet_text)}/280",
                    "tag": "lark_md",
                },
            },
            {
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": "✅ 批准并发送"},
                        "type": "primary",
                        "value": json.dumps(
                            {"action": "approve_original", "content_id": content_id}
                        ),
                    },
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": "🔄 重新生成"},
                        "type": "default",
                        "value": json.dumps(
                            {"action": "regenerate_original", "content_id": content_id}
                        ),
                    },
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": "❌ 拒绝"},
                        "type": "danger",
                        "value": json.dumps(
                            {"action": "reject_original", "content_id": content_id}
                        ),
                    },
                ],
            },
            {
                "tag": "note",
                "elements": [
                    {"tag": "plain_text", "content": f"Content ID: {content_id}"}
                ],
            },
        ],
    }

    try:
        access_token = lark._get_tenant_access_token()
        if not access_token:
            return False

        url = "https://open.larksuite.com/open-apis/im/v1/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "receive_id": lark.chat_id,
            "msg_type": "interactive",
            "content": json.dumps(card),
        }
        params = {"receive_id_type": "chat_id"}

        import requests

        response = requests.post(url, headers=headers, json=payload, params=params)
        data = response.json()

        return data.get("code") == 0
    except Exception as e:
        logger.error(f"Error sending card: {e}")
        return False


if __name__ == "__main__":
    # 从命令行参数获取主题（可选）
    theme = sys.argv[1] if len(sys.argv) > 1 else None
    create_original_tweet(theme)
