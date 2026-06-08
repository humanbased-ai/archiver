import json

from log import logger
from datetime import datetime, timedelta, timezone
from dateutil.parser import isoparse
import uuid
import setting
import asyncio
from service.bot.twitter import twitter_service, post_service, openai_service
from service.account import checkin_service, account_service, account_reward_service
from service.system import web_service
from utils import messageUtils


# 从推特获取提及到用户的评论存入数据库
async def fresh_comment_by_usernames():
    # 1.获取用户列表
    user_datas = await post_service.get_need_push_comment_users()
    if len(user_datas) == 0:
        logger.info('用户为空，请配置需要回复推特用户')
        return None

    index = 0
    for user in user_datas:
        index = index + 1
        logger.info('load num = {}, user = {}', index, user)
        await load_username_ref_comment(user)


# 从推特获取最新评论存入数据库
async def fresh_comment_by_users():
    # 1.获取用户列表
    user_datas = await post_service.get_need_push_comment_users()
    if len(user_datas) == 0:
        logger.info('用户为空，请配置需要回复推特用户')
        return None

    index = 0
    for user in user_datas:
        index = index + 1
        logger.info('load num = {}, user = {}', index, user)
        await load_user_ref_comment(user)


async def fresh_comment():
    # 1.获取帖子列表
    post_datas = await post_service.get_posts()
    if len(post_datas) == 0:
        logger.info('帖子为空，请配置需要回复评论的帖子')
        return None
    for post_data in post_datas:
        uid = post_data['uid']
        post_user_name = post_data['user_name']
        post_author_id = post_data['author_id']
        tweet_id = uid
        post_uid = uid
        logger.info('get_post post_size = {}, selected tweet_id = {}, post_data = {}', len(post_datas), tweet_id, post_data)

        # 2.获取最近的评论，并记录到数据库
        config_user_id = post_author_id
        twitter_comments = await twitter_service.get_comments(config_user_id, tweet_id, 100)
        twitter_comments = list(reversed(twitter_comments))
        await record_history_comments(twitter_comments, post_uid)
        if setting.RUN_ENV == 'dev':
            logger.info('免费的推特开发者号，暂时处理第一个')
            break
    return post_datas


# 通过用户角度回复信息
async def push_data_to_twitter_by_users():

    # 1.获取需要我推送的用户列表
    user_datas = await post_service.get_need_push_comment_users()
    if len(user_datas) == 0:
        logger.info('帖子为空，请配置需要回复推特用户')
        return None

    index = 0
    for user in user_datas:
        index = index + 1
        logger.info('push num = {}, user = {}', index, user)
        await push_user_comments(user)


async def push_user_comments(user):
    author_id = user['author_id']
    user_name = user['user_name']
    logger.info('push_user_comments  author_id = {}, user_name = {}', author_id, user_name)

    # 1.查询出最新的评论历史，筛选出需要评论的列表
    need_reply_comments = []
    comments = await post_service.get_need_reply_comments_by_author_id(author_id)
    last_comment = None
    if len(comments) > 0:
        last_comments = list(reversed(comments))
        for comment in last_comments:
            user_name = comment['user_name']

            images = comment['images']
            medias = []
            if images is not None and images != '':
                try:
                    medias = json.loads(images)
                except Exception as e:
                    logger.info('parse text = {} , error {}', images, e)
            if len(medias) == 0:
                logger.info('评论中没有图片，不回复信息')
                continue

            last_comment = comment
            need_reply_comments.append(comment)
            logger.info('最新评论， {}', last_comment)
            #break
    logger.info('need reply comment size = {}', len(need_reply_comments))

    # 逐个回复推文
    if len(need_reply_comments) > 0:
        for need_reply_comment in need_reply_comments:
            reply_id = need_reply_comment['comment_uid']
            await reply_comment_by_reply_id(author_id, reply_id)
            if setting.RUN_ENV != 'prod':
                logger.info('free 账号，开发测试环境，只推送一个回复')
                #break
    else:
        logger.info('没有需要回复的帖子评论，结束操作')
    return None


# 根据评论id，创建回复并且发送推文
async def reply_comment_by_reply_id(post_author_id, reply_id, repost_flag=None):
    last_comment = await post_service.get_post_comment_by_comment_uid(reply_id)
    tweet_id = last_comment['uid']
    user_name = last_comment['user_name']
    if repost_flag is None:
        post_data = await post_service.get_post_by_uid(tweet_id)
        if post_data is None:
            repost_flag = 1
            post_comment_data = await post_service.get_post_comment_by_comment_uid(tweet_id)
            # 本博主评论不予转发
            if post_comment_data is not None and post_comment_data['author_id'] == post_author_id:
                repost_flag = 0
            # 推文评论不转发
            #if tweet_id != reply_id:
                #repost_flag = 0
        else:
            # 本博主推文不转发
            repost_flag = 0


    post_author = await post_service.get_user_by_author_id(post_author_id)
    chartgpt_record = await create_reply_comment(post_author, last_comment)
    if chartgpt_record is not None:
        await post_service.chartgpt_record_save(chartgpt_record)
        response_content = chartgpt_record['response_content']
        response_content_data = json.loads(response_content)
        reply_text = response_content_data['tweet']
        comment_uid = chartgpt_record['comment_uid']
        logger.info('getOpenaiResponse tweet_id = {}, comment_uid = {}, reply_text = {}', tweet_id, comment_uid, reply_text)

        # has_food_image = response_content_data['has_food_image']
        # 在一天内是否有积分
        score = None
        has_food_image = None
        reply_text = None
        eating_time = None
        eating_flag = None
        if response_content_data is not None:
            if 'has_food_image' in response_content_data:
                has_food_image = response_content_data['has_food_image']
            if 'eating_time' in response_content_data:
                eating_time = response_content_data['eating_time']
        if has_food_image is not None and has_food_image is True:
            #score = await post_service.get_score_by_user_comment_id(comment_uid)
            score = await account_reward_service.record_push_post_score(comment_uid=comment_uid)
            eating_flag = await checkin_service.record_checkin_by_eating_time(comment_uid, eating_time)

        last_comment_data = {'id': last_comment['id'], 'comment_uid': comment_uid, 'analyze_result': response_content
            , 'food_post_score': score}
        await post_service.post_comment_update(last_comment_data)

        # 推送回复到推特
        comment_data = None
        comment_data = await push_reply_comment(post_author, last_comment, chartgpt_record, eating_flag)

        # 记录到数据库
        if comment_data is not None:
            comment_data['analyze_result'] = response_content
            await post_service.record_comment(comment_data)
            logger.info('record_comment {}', comment_data)
            if repost_flag == 1:
                # 转发推文
                config_user_id = post_author_id
                current_reply_text = comment_data['content']
                config_twitter_repy_flag = str(setting.config_twitter_repy_flag)
                if config_twitter_repy_flag == '1':
                    await twitter_service.retweet(config_user_id=config_user_id, target_tweet_id=reply_id, content=current_reply_text)


# 创建回复内容
async def create_reply_comment(post_author, last_comment):
    uid = last_comment['uid']
    post_author_id = post_author['author_id']
    post_uid = uid

    messages = []
    '''init_messages = openai_service.init_message
    if len(init_messages) > 0:
        for init_message in init_messages:
            messages.append(init_message)
    '''

    if last_comment is not None:
        target_tweet_id = last_comment['comment_uid']
        target_author_id = last_comment['author_id']
        comment_uid = last_comment['comment_uid']

        # 查询回复历史
        historys = await post_service.get_comment_historys(comment_uid)
        if len(historys) > 0:
            for history in historys:
                author_id = history['author_id']
                last_reply_text = history['content']
                if ' ' in last_reply_text and last_reply_text.startswith('@'):
                    name1 = last_reply_text.split(' ')[0]
                    last_reply_text = last_reply_text[len(name1):]
                    if last_reply_text.strip().startswith('https://t.co'):
                        last_reply_text = None
                images = history['images']
                medias = []
                if images is not None and images != '':
                    try:
                        medias = json.loads(images)
                    except Exception as e:
                        logger.info('parse text = {} , error {}', images, e)
                new_contents = []
                image_flag = 0
                if medias is not None and len(medias) > 0:
                    for media in medias:
                        if 'photo' == media['type']:
                            image_url = media['url']
                            item = {"type": "image_url", "image_url": {"url": image_url}}
                            new_contents.append(item)
                            image_flag = 1
                if last_reply_text is not None and last_reply_text != '':
                    new_contents.append({"type": "text", "text": last_reply_text})
                role = 'user'
                if type == 2 or author_id == post_author_id:
                    role = 'assistant'
                message = {"role": role, "content": new_contents}
                messages.append(message)
    else:
        logger.info('没有新评论， 不推送消息, 结束操作')
        return

    reply_text = None
    response_status = None
    remarks = None
    try:
        init_message = await post_service.get_chatgpt_base_info('twitter_food_start')
        if init_message is None or len(init_message) == 0:
            init_message = openai_service.init_message
        if init_message is None:
            init_message = []

        end_message = await post_service.get_chatgpt_base_info('twitter_food_end')
        if end_message is None or len(end_message) == 0:
            end_message = openai_service.end_message
        if end_message is None:
            end_message = []

        messages = init_message + messages + end_message
        reply_text = await openai_service.getOpenaiResponse(messages)
        if reply_text is not None and len(reply_text) > 0:
            json_data = json.loads(reply_text[reply_text.find('{'):reply_text.rfind('}') + 1])
            has_food_image = json_data['has_food_image']
            if 'tweet' in json_data:
                remarks = json_data['tweet']
            else:
                json_data['tweet'] = None
            reply_text = json.dumps(json_data)
        else:
            reply_text = None
    except Exception as e:
        msg = f'getOpenaiResponse error = {reply_text}'
        messageUtils.send_message(title="获取chatgpt 回复失败", content=msg)
        reply_text = None
        response_status = '500'
        logger.error('getOpenaiResponse error {}', e)

    '''if reply_text is None:
        json_data = {'tweet': None, 'has_food_image': False}
        reply_text = json.dumps(json_data)
        raise Exception(" getOpenaiResponse error ")'''
    chartgpt_record = None
    if reply_text is not None:
        chartgpt_record = {'uid': post_uid, 'comment_uid': target_tweet_id, 'url': None
            , 'videos': None, 'images': None, 'status': 1, 'request_content': json.dumps(messages)
            , 'response_content': reply_text, 'response_status': response_status
            , 'remarks': remarks, 'create_time': datetime.now(timezone.utc), 'type': 'reply'
                           }

    return chartgpt_record


# 推送回复到推特
async def push_reply_comment(post_author, last_comment, chartgpt_record, eating_flag=None):
    uid = last_comment['uid']
    post_user_name = post_author['user_name']
    post_author_id = post_author['author_id']
    target_author_id = last_comment['author_id']
    target_tweet_id = chartgpt_record['comment_uid']
    response_content = chartgpt_record['response_content']
    response_content_data = json.loads(response_content)
    has_food_image = None
    reply_text = None
    if response_content_data is not None:
        if 'has_food_image' in response_content_data:
            has_food_image = response_content_data['has_food_image']
        if 'tweet' in response_content_data:
            reply_text = response_content_data['tweet']
    if reply_text is not None:
        if has_food_image is not None and has_food_image is True:
            links = await web_service.make_short_url(target_tweet_id, 'twitter')
            reply_text = f'{reply_text}\nAI issues? Annotate here: {links}'
    if eating_flag is not None:
        post_expression = ''
        if eating_flag is True:
            post_expression ='👀💪 '
        elif eating_flag is False:
            post_expression = '😥 '
        reply_text = f'{post_expression}{reply_text}'

    '''
    if reply_text is None or (has_food_image is not None and has_food_image != True):
        logger.warning('over opt has_food_image = {}, reply_text = {}', has_food_image, reply_text)
        return
    '''
    if post_author_id == target_author_id:
        logger.error('push_comment error post_author_id == target_author_id {}', post_author_id)
        return None
    config_user_id = post_author_id
    reply_response = await twitter_service.push_comment(config_user_id, target_tweet_id, reply_text, has_food_image)
    logger.info('push_comment target_tweet_id = {}, has_food_image = {}, reply_text = {}, reply_response = {}'
                , target_tweet_id, has_food_image, reply_text, reply_response)

    if reply_response is None or 'data' not in reply_response:
        logger.info('推文【{}】失败结束操作', target_tweet_id)
        return None
    # 记录评论内容
    reply_type = 2
    reply_comment_uid = None
    if 'data' in reply_response and reply_response['data'] is not None:
        reply_data = reply_response['data']
        reply_comment_uid = reply_data['id']

    comment_url = f'https://x.com/{post_user_name}/status/{reply_comment_uid}'
    comment_data = {'reply_type': reply_type, 'uid': uid, 'comment_uid': reply_comment_uid
        , 'author_id': post_author_id, 'user_name': post_user_name
        , 'url': comment_url, 'status': 1, 'content': reply_text
        , 'create_time': datetime.now(timezone.utc)
        , 'parent_user_id': target_author_id
        , 'parent_comment_uid': target_tweet_id,
                    }
    return comment_data


# 加载用户相关评论
async def load_username_ref_comment(user):
    author_id = user['author_id']
    user_name = user['user_name']
    logger.info('load_username_ref_comment  author_id = {}, user_name = {}', author_id, user_name)

    # 获取最近12小时评论
    config_user_id = author_id
    user_name = user['user_name']
    twitter_comments = await twitter_service.get_comments_by_username(config_user_id=config_user_id, user_name=user_name)
    twitter_comments = list(reversed(twitter_comments))
    await record_history_comments(twitter_comments=twitter_comments, reply_author_id=author_id)


# 加载用户相关评论
async def load_user_ref_comment(user):
    author_id = user['author_id']
    user_name = user['user_name']
    logger.info('load_user_ref_comment  author_id = {}, user_name = {}', author_id, user_name)

    # 获取最近的评论，并记录到数据库
    config_user_id = author_id
    twitter_comments = await twitter_service.get_mentions(config_user_id=config_user_id, user_id=author_id)
    twitter_comments = list(reversed(twitter_comments))
    await record_history_comments(twitter_comments=twitter_comments, reply_author_id=author_id)


# 记录推文到数据库
async def record_history_comments(twitter_comments, post_uid=None, reply_author_id=None):
    if twitter_comments is None or len(twitter_comments) == 0:
        return

    history_comment_datas = []
    for twitter_comment in twitter_comments:
        conversation_id = twitter_comment['conversation_id']
        reply_comment_uid = twitter_comment['id']
        medias = twitter_comment['medias']
        author = twitter_comment['author']
        author_id = author['id']
        user_name = author['username']
        remarks = author['name']
        reply_text = twitter_comment['text']
        create_time = isoparse(twitter_comment['created_at'])
        comment_url = f'https://x.com/{user_name}/status/{reply_comment_uid}'
        parent_user_id = None
        if 'in_reply_to_user_id' in twitter_comment:
            parent_user_id = twitter_comment['in_reply_to_user_id']

        parent_comment_uid = None
        if 'referenced_tweets' in twitter_comment:
            referenced_tweets = twitter_comment['referenced_tweets']
            if referenced_tweets is not None and len(referenced_tweets) > 0:
                for referenced_tweet in referenced_tweets:
                    if referenced_tweet is not None and referenced_tweet['type'] == 'replied_to':
                        parent_comment_uid = referenced_tweet['id']
                        break

        if parent_user_id is None and parent_comment_uid is None:
            parent_user_id = reply_author_id
        images = json.dumps(medias)
        rel_user_id = reply_author_id

        history_comment_data = {
            'rel_user_id': rel_user_id,
            'reply_type': 1, 'uid': conversation_id, 'parent_user_id': parent_user_id
            , 'parent_comment_uid': parent_comment_uid, 'comment_uid': reply_comment_uid
            , 'author_id': author_id, 'user_name': user_name
            , 'url': comment_url, 'content': reply_text
            , 'create_time': create_time, 'remarks': remarks, 'images': images
        }
        #await post_service.record_comment(history_comment_data)
        history_comment_datas.append(history_comment_data)
    await post_service.record_comments(history_comment_datas)

if __name__ == '__main__':
    #comments = [{"content": "我想吃大饼，你简单告诉我下有没危害？ 回复在100个文字以内"}]
    #asyncio.run(fresh_comment())
    #asyncio.run(push_data_to_twitter())
    asyncio.run(fresh_comment_by_users())
    #asyncio.run(push_data_to_twitter_by_users())



