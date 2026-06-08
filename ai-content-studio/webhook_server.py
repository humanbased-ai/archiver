"""Lark 交互式 Webhook 服务器"""
from flask import Flask, request, jsonify
from src.storage.database import Database
from src.twitter.client import TwitterClient
from src.core.logger import setup_logger
from src.bots.lark_meme_bot import LarkMemeBot
from src.core.config import Config
import json
import os

app = Flask(__name__)
logger = setup_logger('webhook_server')

db = Database()
twitter = TwitterClient()

# 初始化 Meme Bot
meme_bot = LarkMemeBot(
    app_id=os.getenv("LARK_APP_ID", Config.LARK_APP_ID),
    app_secret=os.getenv("LARK_APP_SECRET", Config.LARK_APP_SECRET),
    verification_token=os.getenv("LARK_VERIFICATION_TOKEN", Config.LARK_VERIFICATION_TOKEN)
)

# 消息去重：记录已处理的消息ID
processed_message_ids = set()
MAX_PROCESSED_IDS = 1000  # 最多记录1000个消息ID

@app.route('/lark/callback', methods=['POST'])
def lark_callback():
    """处理 Lark 交互式卡片回调"""
    try:
        data = request.json
        logger.info(f"Received callback: {json.dumps(data, indent=2)}")

        # Lark 会先发送 url_verification 请求（旧格式）
        if data.get('type') == 'url_verification':
            challenge = data.get('challenge', '')
            logger.info(f"URL verification: {challenge}")
            return jsonify({'challenge': challenge})

        # 处理消息事件（接收 Lark 消息）
        if data.get('header', {}).get('event_type') == 'im.message.receive_v1':
            return handle_message(data)

        # 处理新格式的回调（schema 2.0）
        header = data.get('header', {})
        event_type = header.get('event_type', '')

        if event_type == 'card.action.trigger':
            event = data.get('event', {})
            action = event.get('action', {})
            value_str = action.get('value', '{}')

            # value 可能是双重转义的 JSON 字符串，需要解析
            try:
                # 第一次解析
                value = json.loads(value_str)
                # 如果结果还是字符串，再解析一次
                if isinstance(value, str):
                    value = json.loads(value)
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Failed to parse action value: {value_str}, error: {e}")
                return jsonify({'error': 'Invalid action value'}), 400

            action_type = value.get('action')
            tweet_id = value.get('tweet_id')
            content_id = value.get('content_id')
            reply_type = value.get('reply_type', 'medium')  # 默认中等

            logger.info(f"Action: {action_type}, Tweet ID: {tweet_id}, Content ID: {content_id}, Reply Type: {reply_type}")

            # 处理回复推文
            if action_type == 'approve':
                return handle_approve(tweet_id, reply_type)
            elif action_type == 'reject':
                return handle_reject(tweet_id)
            elif action_type == 'edit':
                return handle_edit(tweet_id)

            # 处理原创推文
            elif action_type == 'approve_original':
                return handle_approve_original(content_id)
            elif action_type == 'reject_original':
                return handle_reject_original(content_id)
            elif action_type == 'regenerate_original':
                return handle_regenerate_original(content_id)

        # 处理旧格式的卡片交互（兼容）
        if data.get('type') == 'card_action':
            action = data.get('action', {})
            value = action.get('value', {})

            action_type = value.get('action')
            tweet_id = value.get('tweet_id')
            content_id = value.get('content_id')
            reply_type = value.get('reply_type', 'medium')  # 默认中等

            logger.info(f"Action: {action_type}, Tweet ID: {tweet_id}, Content ID: {content_id}, Reply Type: {reply_type}")

            # 处理回复推文
            if action_type == 'approve':
                return handle_approve(tweet_id, reply_type)
            elif action_type == 'reject':
                return handle_reject(tweet_id)
            elif action_type == 'edit':
                return handle_edit(tweet_id)

            # 处理原创推文
            elif action_type == 'approve_original':
                return handle_approve_original(content_id)
            elif action_type == 'reject_original':
                return handle_reject_original(content_id)
            elif action_type == 'regenerate_original':
                return handle_regenerate_original(content_id)

        return jsonify({'success': True})

    except Exception as e:
        logger.error(f"Error handling callback: {e}")
        return jsonify({'error': str(e)}), 500

def handle_approve(tweet_id: str, reply_type: str = 'medium'):
    """处理批准操作"""
    try:
        # 从数据库获取推文信息
        import sqlite3
        conn = sqlite3.connect('jessie.db')
        cursor = conn.cursor()

        cursor.execute(
            'SELECT text, reply_short, reply_medium, reply_long, approval_status, posted FROM tweets WHERE id = ?',
            (tweet_id,)
        )
        result = cursor.fetchone()
        conn.close()

        if not result:
            return jsonify({'error': 'Tweet not found'}), 404

        original_text, reply_short, reply_medium, reply_long, approval_status, posted = result

        # 根据 reply_type 选择对应的回复
        reply_map = {
            'short': reply_short,
            'medium': reply_medium,
            'long': reply_long
        }
        selected_reply = reply_map.get(reply_type, reply_medium)

        # 检查是否已经处理过
        if approval_status == 'approved' and posted:
            return jsonify({
                'toast': {
                    'type': 'warning',
                    'content': '⚠️ 该推文已经批准并发送过了'
                }
            })

        if approval_status == 'rejected':
            return jsonify({
                'toast': {
                    'type': 'warning',
                    'content': '⚠️ 该推文已被拒绝'
                }
            })

        # 发送回复到 Twitter
        success = twitter.post_tweet(selected_reply, reply_to=tweet_id)

        if success:
            # 更新数据库
            conn = sqlite3.connect('jessie.db')
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE tweets SET approval_status = ?, posted = ?, posted_at = datetime("now"), selected_reply = ? WHERE id = ?',
                ('approved', True, reply_type, tweet_id)
            )
            conn.commit()
            conn.close()

            logger.info(f"✅ Approved and posted reply ({reply_type}) for tweet {tweet_id}")

            # 返回更新后的卡片（禁用按钮）
            reply_type_map = {
                'short': '1️⃣ 简短',
                'medium': '2️⃣ 中等',
                'long': '3️⃣ 详细'
            }
            reply_label = reply_type_map.get(reply_type, '2️⃣ 中等')

            return jsonify({
                'toast': {
                    'type': 'success',
                    'content': f'✅ 已发送回复 {reply_label}！'
                },
                'card': {
                    "config": {
                        "wide_screen_mode": True
                    },
                    "header": {
                        "title": {
                            "content": "✅ 已批准并发送",
                            "tag": "plain_text"
                        },
                        "template": "green"
                    },
                    "elements": [
                        {
                            "tag": "div",
                            "text": {
                                "content": f"**推文 ID**: {tweet_id}\n\n**选择的回复**: {reply_label}\n**内容**: {selected_reply}\n\n**状态**: 已批准并成功发送到 Twitter",
                                "tag": "lark_md"
                            }
                        },
                        {
                            "tag": "note",
                            "elements": [
                                {
                                    "tag": "plain_text",
                                    "content": "操作已完成，所有按钮已禁用"
                                }
                            ]
                        }
                    ]
                }
            })
        else:
            return jsonify({
                'toast': {
                    'type': 'error',
                    'content': '❌ 发送失败，请查看日志'
                }
            })

    except Exception as e:
        logger.error(f"Error approving tweet: {e}")
        return jsonify({'error': str(e)}), 500

def handle_reject(tweet_id: str):
    """处理拒绝操作"""
    try:
        # 检查当前状态
        import sqlite3
        conn = sqlite3.connect('jessie.db')
        cursor = conn.cursor()

        cursor.execute(
            'SELECT approval_status, posted FROM tweets WHERE id = ?',
            (tweet_id,)
        )
        result = cursor.fetchone()

        if not result:
            conn.close()
            return jsonify({'error': 'Tweet not found'}), 404

        approval_status, posted = result

        # 检查是否已经处理过
        if approval_status == 'approved' and posted:
            conn.close()
            return jsonify({
                'toast': {
                    'type': 'warning',
                    'content': '⚠️ 该推文已经批准并发送，无法拒绝'
                }
            })

        if approval_status == 'rejected':
            conn.close()
            return jsonify({
                'toast': {
                    'type': 'warning',
                    'content': '⚠️ 该推文已被拒绝过了'
                }
            })

        # 更新数据库
        cursor.execute(
            'UPDATE tweets SET approval_status = ? WHERE id = ?',
            ('rejected', tweet_id)
        )
        conn.commit()
        conn.close()

        logger.info(f"❌ Rejected tweet {tweet_id}")

        return jsonify({
            'toast': {
                'type': 'info',
                'content': '❌ 已拒绝该推文'
            },
            'card': {
                "config": {
                    "wide_screen_mode": True
                },
                "header": {
                    "title": {
                        "content": "❌ 已拒绝",
                        "tag": "plain_text"
                    },
                    "template": "grey"
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {
                            "content": f"**推文 ID**: {tweet_id}\n\n**状态**: 已拒绝，不会发送到 Twitter",
                            "tag": "lark_md"
                        }
                    },
                    {
                        "tag": "note",
                        "elements": [
                            {
                                "tag": "plain_text",
                                "content": "操作已完成，所有按钮已禁用"
                            }
                        ]
                    }
                ]
            }
        })

    except Exception as e:
        logger.error(f"Error rejecting tweet: {e}")
        return jsonify({'error': str(e)}), 500

def handle_edit(tweet_id: str):
    """处理修改操作"""
    try:
        # 返回提示，让用户使用命令行工具修改
        return jsonify({
            'toast': {
                'type': 'info',
                'content': f'请使用命令行修改: python3 approve.py edit {tweet_id}'
            }
        })

    except Exception as e:
        logger.error(f"Error handling edit: {e}")
        return jsonify({'error': str(e)}), 500

def handle_approve_original(content_id: int):
    """处理批准原创推文"""
    try:
        # 从数据库获取内容
        import sqlite3
        conn = sqlite3.connect('jessie.db')
        cursor = conn.cursor()

        cursor.execute(
            'SELECT content, approval_status, posted FROM original_content WHERE id = ?',
            (content_id,)
        )
        result = cursor.fetchone()

        if not result:
            conn.close()
            return jsonify({'error': 'Content not found'}), 404

        content, approval_status, posted = result

        # 检查是否已经处理过
        if approval_status == 'approved' and posted:
            conn.close()
            return jsonify({
                'toast': {
                    'type': 'warning',
                    'content': '⚠️ 该推文已经批准并发送过了'
                }
            })

        # 发送推文到 Twitter
        success = twitter.post_tweet(content)

        if success:
            # 更新数据库
            cursor.execute(
                'UPDATE original_content SET approval_status = ?, posted = ?, posted_at = datetime("now") WHERE id = ?',
                ('approved', True, content_id)
            )
            conn.commit()
            conn.close()

            logger.info(f"✅ Approved and posted original tweet {content_id}")

            return jsonify({
                'toast': {
                    'type': 'success',
                    'content': '✅ 已批准并发送原创推文！'
                },
                'card': {
                    "config": {"wide_screen_mode": True},
                    "header": {
                        "title": {"content": "✅ 已发送", "tag": "plain_text"},
                        "template": "green"
                    },
                    "elements": [
                        {
                            "tag": "div",
                            "text": {
                                "content": f"**推文内容**: {content}\n\n**状态**: 已批准并成功发送到 Twitter",
                                "tag": "lark_md"
                            }
                        }
                    ]
                }
            })
        else:
            conn.close()
            return jsonify({
                'toast': {
                    'type': 'error',
                    'content': '❌ 发送到 Twitter 失败'
                }
            })

    except Exception as e:
        logger.error(f"Error approving original tweet: {e}")
        return jsonify({'error': str(e)}), 500

def handle_reject_original(content_id: int):
    """处理拒绝原创推文"""
    try:
        import sqlite3
        conn = sqlite3.connect('jessie.db')
        cursor = conn.cursor()

        cursor.execute(
            'UPDATE original_content SET approval_status = ? WHERE id = ?',
            ('rejected', content_id)
        )
        conn.commit()
        conn.close()

        logger.info(f"❌ Rejected original tweet {content_id}")

        return jsonify({
            'toast': {
                'type': 'info',
                'content': '❌ 已拒绝该原创推文'
            },
            'card': {
                "config": {"wide_screen_mode": True},
                "header": {
                    "title": {"content": "❌ 已拒绝", "tag": "plain_text"},
                    "template": "grey"
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {
                            "content": f"**Content ID**: {content_id}\n\n**状态**: 已拒绝",
                            "tag": "lark_md"
                        }
                    }
                ]
            }
        })

    except Exception as e:
        logger.error(f"Error rejecting original tweet: {e}")
        return jsonify({'error': str(e)}), 500

def handle_regenerate_original(content_id: int):
    """处理重新生成原创推文"""
    try:
        # 返回提示
        return jsonify({
            'toast': {
                'type': 'info',
                'content': '🔄 请使用命令行重新生成: python3 create_tweet.py'
            }
        })

    except Exception as e:
        logger.error(f"Error regenerating original tweet: {e}")
        return jsonify({'error': str(e)}), 500

def handle_message(data):
    """处理 Lark 消息"""
    try:
        event = data.get('event', {})
        message = event.get('message', {})
        message_id = message.get('message_id')
        message_type = message.get('message_type')
        content = message.get('content', '{}')
        mentions = message.get('mentions', [])

        # 消息去重：检查是否已处理过此消息
        global processed_message_ids
        if message_id in processed_message_ids:
            logger.info(f"⏭️ Skipping duplicate message: {message_id}")
            return jsonify({"code": 0})

        # 记录消息ID
        processed_message_ids.add(message_id)

        # 限制集合大小，避免内存泄漏
        if len(processed_message_ids) > MAX_PROCESSED_IDS:
            # 移除最旧的消息ID（简单实现：清空一半）
            processed_message_ids = set(list(processed_message_ids)[MAX_PROCESSED_IDS//2:])
            logger.info(f"🧹 Cleaned up processed message IDs, now {len(processed_message_ids)} entries")

        # 只处理文本消息
        if message_type != 'text':
            return jsonify({})

        # 检查是否 @了机器人
        # mentions 是一个列表,每个元素包含被 @的用户信息
        # 如果机器人被 @,列表中会有机器人的信息
        bot_mentioned = False

        # 获取机器人自己的 app_id（从 Config 中）
        from src.core.config import Config
        bot_app_id = Config.LARK_APP_ID

        for mention in mentions:
            # mention 包含 id, name, tenant_key 等
            # 检查是否是机器人自己
            mention_id = mention.get('id', {})
            if mention_id.get('open_id') or mention_id.get('user_id'):
                # 如果有任何 mention,我们认为是 @了机器人
                # Lark API 中,机器人被 @时会出现在 mentions 中
                bot_mentioned = True
                break

        # 如果机器人没有被 @提及,忽略消息
        if not bot_mentioned:
            logger.info(f"Bot not mentioned, ignoring message")
            return jsonify({})

        # 解析消息内容
        content_data = json.loads(content)
        text = content_data.get('text', '').strip()

        # 清理 @ 提及（飞书消息格式可能包含 @用户）
        import re
        text = re.sub(r'@[^\s]+', '', text).strip()

        logger.info(f"Received message (bot mentioned): {text}")

        # 处理斜杠命令
        if text.startswith('/tweet'):
            return handle_tweet_command(text, event)

        # 处理 /milady help 命令 - 显示使用指南
        if text.startswith('/milady help') or text.startswith('/milady guide'):
            logger.info(f"📖 Detected help command: {text}")
            return handle_milady_help(event)

        # 处理梗图命令 - 直接交给 Meme Bot
        if text.startswith('/meme') or text.startswith('/memegen') or text.startswith('/milady'):
            logger.info(f"🎨 Detected meme command: {text}")
            # 刷新 access token (Lark token 有效期约 2 小时)
            try:
                meme_bot.get_tenant_access_token()
                logger.info("✅ Access token refreshed")
            except Exception as e:
                logger.error(f"⚠️ Failed to refresh access token: {e}")
            meme_bot.process_message(data)
            return jsonify({"code": 0})

        text_lower = text.lower()

        # 优先检测梗图生成请求（关键词，不是命令）
        meme_keywords = (
            '梗图' in text_lower or
            '表情包' in text_lower or
            'gm' in text_lower or
            'wen moon' in text_lower or
            'milady' in text_lower or
            'nft' in text_lower or
            '墨镜' in text_lower or
            'sunglasses' in text_lower or
            'liminal' in text_lower or
            'illusion' in text_lower or
            'vaporwave' in text_lower or
            'cyberpunk' in text_lower
        )

        if meme_keywords:
            # 使用 Meme Bot 处理
            logger.info(f"🎨 Detected meme generation request: {text}")
            meme_bot.process_message(data)
            return jsonify({"code": 0})

        # 优先检测查询类请求（避免误触发生成）
        query_keywords = (
            '哪些' in text_lower or
            '查看' in text_lower or
            '列出' in text_lower or
            '查询' in text_lower or
            '安排' in text_lower or
            'list' in text_lower or
            'show' in text_lower or
            '有几条' in text_lower or
            '几条' in text_lower
        )

        if query_keywords and ('推文' in text_lower or 'tweet' in text_lower or '推' in text_lower):
            return handle_query_request(text, event)

        # 处理生成推文请求
        generate_keywords = (
            ('生成' in text_lower and '推文' in text_lower) or
            ('写' in text_lower and '推文' in text_lower) or
            ('创建' in text_lower and '推文' in text_lower) or
            ('帮我' in text_lower and '推文' in text_lower) or
            '原创' in text_lower
        )

        if generate_keywords:
            return handle_natural_language_request(text, event)

        # 不是推文相关的消息，忽略
        return jsonify({})

    except Exception as e:
        logger.error(f"Error handling message: {e}")
        return jsonify({})

def handle_tweet_command(text: str, event: dict):
    """处理 /tweet 命令 - 立即响应，后台生成"""
    try:
        import threading

        # 解析命令
        parts = text.split(maxsplit=1)
        theme = parts[1] if len(parts) > 1 else None

        if not theme:
            theme = 'Codatta - data ownership, AI training, data labeling'

        logger.info(f"Received /tweet command with theme: {theme}")

        # 在后台线程中生成推文（异步处理）
        thread = threading.Thread(
            target=_generate_tweet_async,
            args=(theme,)
        )
        thread.daemon = True
        thread.start()

        # 立即返回，用户不会感觉到延迟
        return jsonify({})

    except Exception as e:
        logger.error(f"Error handling tweet command: {e}")
        return jsonify({})

def _generate_tweet_async(theme: str):
    """后台异步生成推文"""
    try:
        from src.intelligence.claude_client import ClaudeClient
        from src.approval.lark_client import LarkClient
        from src.storage.models import OriginalContent
        import datetime

        # 获取今天是星期几
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        today = days[datetime.datetime.now().weekday()]

        logger.info(f"🤖 Generating tweet with theme: {theme}")

        # 生成推文
        claude = ClaudeClient()
        tweet_text = claude.generate_original(
            theme=theme,
            day_of_week=today
        ).strip()

        # 检查长度
        if len(tweet_text) > 280:
            tweet_text = tweet_text[:277] + '...'

        # 保存到数据库
        session = db.get_session()
        try:
            content = OriginalContent(
                theme=theme,
                content=tweet_text,
                day_of_week=today,
                approval_status='pending'
            )
            session.add(content)
            session.commit()
            content_id = content.id
            logger.info(f"💾 Saved original tweet with ID: {content_id}")
        except Exception as e:
            session.rollback()
            logger.error(f"Error saving to database: {e}")
            return
        finally:
            session.close()

        # 发送审核卡片
        from create_tweet import send_original_approval_card
        lark = LarkClient()
        send_original_approval_card(
            lark=lark,
            content_id=content_id,
            tweet_text=tweet_text,
            theme=theme
        )

        logger.info(f"✅ Generated and sent tweet for approval (ID: {content_id})")

    except Exception as e:
        logger.error(f"Error generating tweet async: {e}")

def handle_natural_language_request(text: str, event: dict):
    """处理自然语言生成推文请求 - 立即响应，后台生成"""
    try:
        import threading

        logger.info(f"Received natural language request: {text}")

        # 在后台线程中处理
        thread = threading.Thread(
            target=_generate_from_natural_language_async,
            args=(text,)
        )
        thread.daemon = True
        thread.start()

        # 立即返回
        return jsonify({})

    except Exception as e:
        logger.error(f"Error handling natural language request: {e}")
        return jsonify({})

def handle_query_request(text: str, event: dict):
    """处理查询推文的请求"""
    try:
        from src.approval.lark_client import LarkClient
        import datetime

        logger.info(f"Received query request: {text}")

        # 获取 chat_id
        event_message = event.get('message', {})
        chat_id = event_message.get('chat_id')

        # 解析查询类型
        text_lower = text.lower()

        # 判断是查询哪天的
        if '今天' in text_lower or 'today' in text_lower:
            target_date = datetime.datetime.now().date()
        elif '明天' in text_lower or 'tomorrow' in text_lower:
            target_date = datetime.datetime.now().date() + datetime.timedelta(days=1)
        elif '周一' in text_lower or 'monday' in text_lower:
            target_date = None
            day_filter = 'Monday'
        elif '周二' in text_lower or 'tuesday' in text_lower:
            target_date = None
            day_filter = 'Tuesday'
        elif '周三' in text_lower or 'wednesday' in text_lower:
            target_date = None
            day_filter = 'Wednesday'
        elif '周四' in text_lower or 'thursday' in text_lower:
            target_date = None
            day_filter = 'Thursday'
        elif '周五' in text_lower or 'friday' in text_lower:
            target_date = None
            day_filter = 'Friday'
        elif '周六' in text_lower or 'saturday' in text_lower:
            target_date = None
            day_filter = 'Saturday'
        elif '周日' in text_lower or 'sunday' in text_lower:
            target_date = None
            day_filter = 'Sunday'
        else:
            # 默认查询所有待审核的
            target_date = None
            day_filter = None

        # 查询数据库
        import sqlite3
        conn = sqlite3.connect('jessie.db')
        cursor = conn.cursor()

        # 查询原创推文
        if day_filter:
            cursor.execute(
                'SELECT id, content, theme, day_of_week, approval_status, created_at FROM original_content WHERE day_of_week = ? ORDER BY created_at DESC',
                (day_filter,)
            )
        elif target_date:
            cursor.execute(
                'SELECT id, content, theme, day_of_week, approval_status, created_at FROM original_content WHERE DATE(created_at) = ? ORDER BY created_at DESC',
                (str(target_date),)
            )
        else:
            cursor.execute(
                'SELECT id, content, theme, day_of_week, approval_status, created_at FROM original_content WHERE approval_status = "pending" ORDER BY created_at DESC LIMIT 10'
            )

        results = cursor.fetchall()
        conn.close()

        # 构建回复消息
        if not results:
            reply_message = "📭 没有找到符合条件的推文"
        else:
            reply_message = f"📋 找到 {len(results)} 条推文:\n\n"
            for idx, (content_id, content, theme, day, status, created_at) in enumerate(results, 1):
                status_emoji = {
                    'pending': '⏳',
                    'approved': '✅',
                    'rejected': '❌'
                }.get(status, '❓')

                reply_message += f"{idx}. {status_emoji} **{day}** (ID: {content_id})\n"
                reply_message += f"   主题: {theme}\n"
                reply_message += f"   内容: {content[:100]}{'...' if len(content) > 100 else ''}\n"
                reply_message += f"   状态: {status}\n\n"

        # 发送消息到 Lark 群聊
        lark = LarkClient()

        if chat_id:
            # 发送到群聊
            lark.send_text_message(chat_id, reply_message, id_type='chat_id')

        logger.info(f"✅ Sent query response with {len(results)} results")

        return jsonify({})

    except Exception as e:
        logger.error(f"Error handling query request: {e}")
        return jsonify({})

def _generate_from_natural_language_async(text: str):
    """从自然语言异步生成推文"""
    try:
        from src.intelligence.claude_client import ClaudeClient
        from src.approval.lark_client import LarkClient
        from src.storage.models import OriginalContent
        import datetime

        # 使用 Claude 理解用户意图
        claude = ClaudeClient()

        # 提取主题的 prompt
        theme_prompt = f"""The user said: "{text}"

They want to generate a tweet. Extract the theme/topic they want to tweet about.

If they mentioned a specific topic (like "data ownership", "AI training", "Codatta"), return that.
If they mentioned a day of week (like "Monday", "周一"), note that but still extract the theme.
If no specific theme, return "Codatta - data ownership, AI training, data labeling"

Return ONLY the theme in English, nothing else."""

        theme = claude.generate_content(theme_prompt, max_tokens=100).strip()

        # 获取今天是星期几
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        today = days[datetime.datetime.now().weekday()]

        logger.info(f"🤖 Natural language - extracted theme: {theme}")

        # 生成推文
        tweet_text = claude.generate_original(
            theme=theme,
            day_of_week=today
        ).strip()

        # 检查长度
        if len(tweet_text) > 280:
            tweet_text = tweet_text[:277] + '...'

        # 保存到数据库
        session = db.get_session()
        try:
            content = OriginalContent(
                theme=theme,
                content=tweet_text,
                day_of_week=today,
                approval_status='pending'
            )
            session.add(content)
            session.commit()
            content_id = content.id
            logger.info(f"💾 Saved tweet with ID: {content_id}")
        except Exception as e:
            session.rollback()
            logger.error(f"Error saving to database: {e}")
            return
        finally:
            session.close()

        # 发送审核卡片
        from create_tweet import send_original_approval_card
        lark = LarkClient()
        send_original_approval_card(
            lark=lark,
            content_id=content_id,
            tweet_text=tweet_text,
            theme=theme
        )

        logger.info(f"✅ Generated tweet from natural language (ID: {content_id})")

    except Exception as e:
        logger.error(f"Error generating from natural language: {e}")

def handle_milady_help(event: dict):
    """处理 /milady help 命令 - 显示使用指南"""
    try:
        from src.approval.lark_client import LarkClient

        logger.info(f"📖 Sending Milady help guide")

        # 获取 chat_id
        event_message = event.get('message', {})
        chat_id = event_message.get('chat_id')

        if not chat_id:
            logger.error("No chat_id found in event")
            return jsonify({})

        # 构建帮助消息（高级模式）
        help_message = """📖 **Milady AI 风格转换命令指南**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **重要说明**

使用 AI 模型进行风格转换，支持多种场景和风格。
需要明确指定完整的 prompt 和参数。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 **使用格式**

```
@我是机器人 /milady_illusion NFT编号
effect_strength: 数值
positive_prompt: 完整描述
negative_prompt: 负面词（可选）
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ **参数说明**

**effect_strength** (特效强度)
• 0.6-0.8 = 微调（最保留原图）⭐ 推荐
• 0.9-1.1 = 适中
• 1.2-1.5 = 强烈（明显风格转换）
• 范围: 0.0 - 2.5

**positive_prompt** (正向提示词) - 必需
• 详细描述你想要的场景、风格、氛围
• 推荐格式: `{场景描述}, {风格}, {质量词}`
• 常用关键词:
  - 风格: photorealistic, superrealistic, cyberpunk, fantasy, watercolor
  - 光线: golden light, dramatic lighting, soft lighting, neon lights
  - 氛围: ethereal, dreamy, cinematic, cozy atmosphere
  - 质量: high quality, detailed, sharp focus, masterpiece

**negative_prompt** (负向提示词) - 可选
• 推荐: `low quality, blurry, distorted`
• 可添加: boring, ugly, text, watermark
• 默认值: low quality, blurry, bad anatomy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **推荐案例**

1️⃣ 乡村日出风格
```
@我是机器人 /milady_illusion 3274
effect_strength: 1.2
positive_prompt: Beautiful countryside sunrise over rolling hills covered in thick morning fog. Warm golden light illuminating the mist. A rustic wooden fence line (or dirt path) cutting diagonally across the landscape caught in the sunlight. Dew on grass, silhouettes of oak trees, ethereal, dreamy atmosphere, landscape photography.
negative_prompt: low quality
```

2️⃣ 纽约日落风格
```
@我是机器人 /milady_illusion 3261
effect_strength: 1.2
positive_prompt: A spectacular sunset sky over New York City streets, capturing the Manhattanhenge phenomenon. The setting sun is perfectly aligned with the street grid, casting intense molten gold and fiery orange light down the urban canyon. Clouds are ablaze with vibrant reds, purples, and pinks. Silhouetted skyscrapers like the Empire State Building frame the dramatic sky. Cinematic lighting, photorealistic, wide angle landscape.
negative_prompt: clear sky (unless using scheme 3), boring sky, low quality, blurry, pixelated, painting, cartoon, ugly, text, watermark
```

3️⃣ 冬季雪景
```
@我是机器人 /milady_illusion 3456
effect_strength: 1.2
positive_prompt: winter wonderland, snowy street, cozy atmosphere, soft lighting, night scene, peaceful, high quality
negative_prompt: low quality, blurry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **最佳实践**

1. **effect_strength 控制保留度** - 越低越保留原图，越高风格转换越明显
2. **详细描述场景和风格** - 具体的场景描述能获得更好的效果
3. **使用质量关键词** - 添加 high quality, detailed, cinematic 等提升质量

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **查看完整指南**

• `MILADY_COMMAND_GUIDE.md` - 命令使用指南
• `PROMPT_TEMPLATE_GUIDE.md` - Prompt 模板指南
• `REPLICATE_BILLING_GUIDE.md` - 购买额度指南

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 **需要帮助？**

发送 `@我是机器人 /milady help` 查看本指南
"""

        # 发送消息到 Lark 群聊
        lark = LarkClient()
        lark.send_text_message(chat_id, help_message, id_type='chat_id')

        logger.info(f"✅ Sent Milady help guide to chat {chat_id}")

        return jsonify({})

    except Exception as e:
        logger.error(f"Error handling milady help: {e}")
        return jsonify({})

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    from pathlib import Path

    PORT = 8000

    # 创建输出目录
    Path("output/lark").mkdir(parents=True, exist_ok=True)

    logger.info("🚀 Starting Lark webhook server...")
    logger.info("=" * 70)
    logger.info(f"📡 Listening on http://0.0.0.0:{PORT}")
    logger.info(f"🔗 Callback URL: http://YOUR_SERVER_IP:{PORT}/lark/callback")
    logger.info("")
    logger.info("📋 功能列表:")
    logger.info("   1. Twitter 推文生成和审批")
    logger.info("   2. Milady Meme 梗图生成")
    logger.info("=" * 70)

    app.run(host='0.0.0.0', port=PORT, debug=False)
