#!/usr/bin/env python3
"""每日推文批量生成工具

每天生成 2-3 条推文:
1. GM post (必有)
2. 主要内容 (1条,根据星期主题)
3. Casual post (可选,周五/周末)
"""
import sys
import datetime
from src.intelligence.claude_client import ClaudeClient
from src.approval.lark_client import LarkClient
from src.storage.database import Database
from src.storage.models import OriginalContent
from src.core.logger import setup_logger

logger = setup_logger('generate_daily_tweets')

# 每周主题配置
WEEKLY_THEMES = {
    'Monday': {
        'main': [
            'Base ecosystem + data ownership - industry insight about AI on Base',
            'Data quality importance - why AI models need good training data'
        ],
        'casual': 'Monday motivation - another week of data cleaning, builder solidarity'
    },
    'Tuesday': {
        'main': [
            'AI industry unfairness - criticize $10B funding vs $3/hour labeling',
            'Data contributor rights - ownership vs extraction model'
        ],
        'casual': 'Duixian style - call out specific AI company practices'
    },
    'Wednesday': {
        'main': [
            'Absurd narrative - meme format (therapist/dad conversation about data labeling)',
            'AI agents need quality data - precision critical for agent training'
        ],
        'casual': 'Milady culture observation - community vibes, genuine energy'
    },
    'Thursday': {
        'main': [
            'x402/8004 builder daily - real work feelings, debugging, coffee',
            'Data labeling complexity - why labelers deserve more than $3/hour'
        ],
        'casual': 'Builder solidarity - shared struggles in the trenches'
    },
    'Friday': {
        'main': [
            'Week summary - reflection on AI/data progress this week',
            'Codatta mission - how data ownership fixes industry problems'
        ],
        'casual': 'Weekend vibes - survived another week of data cleaning'
    },
    'Saturday': {
        'main': [
            'Casual AI/data observation - lighter take on industry trends'
        ],
        'casual': 'Weekend thoughts - Milady community, memes, genuine moments'
    },
    'Sunday': {
        'main': [
            'Preparation thoughts - what next week in AI/data will bring'
        ],
        'casual': 'Sunday relaxation - no labels today, just vibes'
    }
}

def send_original_approval_card(lark, content_id, tweet_text, theme, content_type):
    """发送原创推文审核卡片"""
    import json

    # 获取 chat_id
    from src.core.config import Config
    chat_id = Config.LARK_CHAT_ID

    # 获取 access token
    access_token = lark._get_tenant_access_token()
    if not access_token:
        logger.error("Failed to get access token")
        return False

    # 构建卡片
    card = {
        "config": {
            "wide_screen_mode": True
        },
        "header": {
            "title": {
                "content": f"🎨 原创推文审核 ({content_type.upper()})",
                "tag": "plain_text"
            },
            "template": "blue"
        },
        "elements": [
            {
                "tag": "div",
                "text": {
                    "content": f"**类型**: {content_type}\n**主题**: {theme}",
                    "tag": "lark_md"
                }
            },
            {
                "tag": "hr"
            },
            {
                "tag": "div",
                "text": {
                    "content": f"**推文内容**:\n{tweet_text}",
                    "tag": "lark_md"
                }
            },
            {
                "tag": "hr"
            },
            {
                "tag": "note",
                "elements": [
                    {
                        "tag": "plain_text",
                        "content": f"Content ID: {content_id} | 字符数: {len(tweet_text)}"
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
                            "content": "✅ 批准发送"
                        },
                        "type": "primary",
                        "value": json.dumps({
                            "action": "approve_original",
                            "content_id": content_id
                        })
                    },
                    {
                        "tag": "button",
                        "text": {
                            "tag": "plain_text",
                            "content": "❌ 拒绝"
                        },
                        "type": "danger",
                        "value": json.dumps({
                            "action": "reject_original",
                            "content_id": content_id
                        })
                    }
                ]
            }
        ]
    }

    # 发送卡片
    import requests
    url = "https://open.larksuite.com/open-apis/im/v1/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "receive_id": chat_id,
        "msg_type": "interactive",
        "content": json.dumps(card)
    }
    params = {
        "receive_id_type": "chat_id"
    }

    response = requests.post(url, headers=headers, json=payload, params=params)
    data = response.json()

    if data.get('code') == 0:
        logger.info(f"✅ Sent approval card for content {content_id}")
        return True
    else:
        logger.error(f"Failed to send card: {data}")
        return False

def generate_daily_tweets(target_day: str = None):
    """生成每日推文

    Args:
        target_day: 指定星期几 (Monday, Tuesday, etc.), 默认今天
    """
    # 初始化
    claude = ClaudeClient()
    lark = LarkClient()
    db = Database()

    # 获取今天是星期几
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    if target_day:
        day_of_week = target_day
    else:
        day_of_week = days[datetime.datetime.now().weekday()]

    logger.info(f"🗓️  Generating tweets for {day_of_week}")

    themes = WEEKLY_THEMES[day_of_week]
    generated_tweets = []

    # 1. 生成 GM post (工作日必有)
    if day_of_week in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
        logger.info("🌅 Generating GM post...")
        try:
            gm_tweet = claude.generate_original(
                theme='Good morning from data janitor',
                day_of_week=day_of_week,
                content_type='gm'
            ).strip()

            # 保存到数据库
            session = db.get_session()
            try:
                content = OriginalContent(
                    theme='GM post',
                    content=gm_tweet,
                    day_of_week=day_of_week,
                    approval_status='pending'
                )
                session.add(content)
                session.commit()
                content_id = content.id

                # 发送审核卡片
                send_original_approval_card(lark, content_id, gm_tweet, 'GM post', 'gm')

                generated_tweets.append(('GM', content_id, gm_tweet))
                logger.info(f"✅ Generated GM post (ID: {content_id})")
            except Exception as e:
                session.rollback()
                logger.error(f"Error saving GM post: {e}")
            finally:
                session.close()
        except Exception as e:
            logger.error(f"Error generating GM post: {e}")

    # 2. 生成主要内容 (可能有多条)
    main_themes = themes['main']
    if main_themes:
        # 如果是列表,逐个生成
        if isinstance(main_themes, list):
            for idx, theme in enumerate(main_themes, 1):
                logger.info(f"📝 Generating main content {idx}/{len(main_themes)}: {theme[:50]}...")
                try:
                    main_tweet = claude.generate_original(
                        theme=theme,
                        day_of_week=day_of_week,
                        content_type='main'
                    ).strip()

                    # 检查长度
                    if len(main_tweet) > 280:
                        main_tweet = main_tweet[:277] + '...'

                    # 保存到数据库
                    session = db.get_session()
                    try:
                        content = OriginalContent(
                            theme=theme,
                            content=main_tweet,
                            day_of_week=day_of_week,
                            approval_status='pending'
                        )
                        session.add(content)
                        session.commit()
                        content_id = content.id

                        # 发送审核卡片
                        send_original_approval_card(lark, content_id, main_tweet, theme[:100], f'main-{idx}')

                        generated_tweets.append((f'MAIN-{idx}', content_id, main_tweet))
                        logger.info(f"✅ Generated main content {idx} (ID: {content_id})")
                    except Exception as e:
                        session.rollback()
                        logger.error(f"Error saving main content {idx}: {e}")
                    finally:
                        session.close()
                except Exception as e:
                    logger.error(f"Error generating main content {idx}: {e}")
        else:
            # 单个主题(向后兼容)
            logger.info(f"📝 Generating main content: {main_themes[:50]}...")
            try:
                main_tweet = claude.generate_original(
                    theme=main_themes,
                    day_of_week=day_of_week,
                    content_type='main'
                ).strip()

                # 检查长度
                if len(main_tweet) > 280:
                    main_tweet = main_tweet[:277] + '...'

                # 保存到数据库
                session = db.get_session()
                try:
                    content = OriginalContent(
                        theme=main_themes,
                        content=main_tweet,
                        day_of_week=day_of_week,
                        approval_status='pending'
                    )
                    session.add(content)
                    session.commit()
                    content_id = content.id

                    # 发送审核卡片
                    send_original_approval_card(lark, content_id, main_tweet, main_themes[:100], 'main')

                    generated_tweets.append(('MAIN', content_id, main_tweet))
                    logger.info(f"✅ Generated main content (ID: {content_id})")
                except Exception as e:
                    session.rollback()
                    logger.error(f"Error saving main content: {e}")
                finally:
                    session.close()
            except Exception as e:
                logger.error(f"Error generating main content: {e}")

    # 3. 生成 casual post (如果有主题)
    if themes['casual']:
        logger.info(f"😎 Generating casual content: {themes['casual'][:50]}...")
        try:
            casual_tweet = claude.generate_original(
                theme=themes['casual'],
                day_of_week=day_of_week,
                content_type='casual'
            ).strip()

            # 保存到数据库
            session = db.get_session()
            try:
                content = OriginalContent(
                    theme=themes['casual'],
                    content=casual_tweet,
                    day_of_week=day_of_week,
                    approval_status='pending'
                )
                session.add(content)
                session.commit()
                content_id = content.id

                # 发送审核卡片
                send_original_approval_card(lark, content_id, casual_tweet, themes['casual'][:100], 'casual')

                generated_tweets.append(('CASUAL', content_id, casual_tweet))
                logger.info(f"✅ Generated casual content (ID: {content_id})")
            except Exception as e:
                session.rollback()
                logger.error(f"Error saving casual content: {e}")
            finally:
                session.close()
        except Exception as e:
            logger.error(f"Error generating casual content: {e}")

    # 总结
    logger.info(f"\n{'='*60}")
    logger.info(f"🎉 Generated {len(generated_tweets)} tweets for {day_of_week}")
    logger.info(f"{'='*60}")
    for content_type, content_id, tweet_text in generated_tweets:
        logger.info(f"\n[{content_type}] ID: {content_id}")
        logger.info(f"Content: {tweet_text[:100]}...")
    logger.info(f"{'='*60}\n")

    return generated_tweets

if __name__ == '__main__':
    # 支持命令行参数指定星期
    if len(sys.argv) > 1:
        target_day = sys.argv[1]  # e.g., python3 generate_daily_tweets.py Monday
    else:
        target_day = None  # 默认今天

    generate_daily_tweets(target_day)
