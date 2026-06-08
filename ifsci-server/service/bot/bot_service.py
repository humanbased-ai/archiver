import json

from log import logger
from datetime import datetime
from dateutil.parser import isoparse
import setting
import asyncio
from service.bot.twitter import twitter_service, post_service, openai_service, swarms_service, dspy_service


# Get the latest comments from Twitter and store them in the database
async def fresh_comment_by_users():
    # 1.Get User List
    user_datas = await post_service.get_need_push_comment_users()
    if len(user_datas) == 0:
        logger.info('The post is empty, please configure the need to reply to the Twitter user')
        return None

    index = 0
    for user in user_datas:
        index = index + 1
        logger.info('load num = {}, user = {}', index, user)
        await load_user_ref_comment(user)


async def fresh_comment():
    # 1.Get a list of posts
    post_datas = await post_service.get_posts()
    if len(post_datas) == 0:
        logger.info('The post is empty, please configure the need to reply to the Twitter user')
        return None
    for post_data in post_datas:
        uid = post_data['uid']
        post_user_name = post_data['user_name']
        post_author_id = post_data['author_id']
        tweet_id = uid
        post_uid = uid
        logger.info('get_post post_size = {}, selected tweet_id = {}, post_data = {}', len(post_datas), tweet_id, post_data)

        # 2.Get the most recent comments and save them to the database
        config_user_id = post_author_id
        twitter_comments = await twitter_service.get_comments(config_user_id, tweet_id, 100)
        twitter_comments = list(reversed(twitter_comments))
        await record_history_comments(twitter_comments, post_uid)
        if setting.RUN_ENV == 'dev':
            logger.info('Free Twitter developer account, temporarily handling the first one')
            break
    return post_datas


# Replying to messages from the user's perspective
async def push_data_to_twitter_by_users():

    # 1.Get the list of users who need me to push
    user_datas = await post_service.get_need_push_comment_users()
    if len(user_datas) == 0:
        logger.info('The post is empty, please configure the need to reply to the Twitter user')
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

    # 1.Query the latest comment history and filter out the list that needs to be commented on
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
                logger.info('No pictures in comments, no reply messages')
                continue

            last_comment = comment
            need_reply_comments.append(comment)
            logger.info('Latest Comments， {}', last_comment)
            #break
    logger.info('need reply comment size = {}', len(need_reply_comments))

    # Reply to tweets individually
    if len(need_reply_comments) > 0:
        for need_reply_comment in need_reply_comments:
            reply_id = need_reply_comment['comment_uid']
            await reply_comment_by_reply_id(author_id, reply_id)
            if setting.RUN_ENV != 'prod':
                logger.info('Free account, development and testing environment, only push one reply')
                break
    else:
        logger.info('There are no comments to reply to. End the operation')
    return None


# Create a reply and send a tweet based on the comment id
async def reply_comment_by_reply_id(post_author_id, reply_id, repost_flag=None):
    last_comment = await post_service.get_post_comment_by_comment_uid(reply_id)
    tweet_id = last_comment['uid']
    user_name = last_comment['user_name']
    if repost_flag is None:
        post_data = await post_service.get_post_by_uid(tweet_id)
        if post_data is None:
            repost_flag = 1
            post_comment_data = await post_service.get_post_comment_by_comment_uid(tweet_id)
            # This blogger's comments will not be forwarded
            if post_comment_data is not None and post_comment_data['author_id'] == post_author_id:
                repost_flag = 0
            # Tweet comments do not retweet
            if tweet_id != reply_id:
                repost_flag = 0
        else:
            # This blogger's tweets are not forwarded
            repost_flag = 0

    post_author = await post_service.get_user_by_author_id(post_author_id)
    chartgpt_record = await create_reply_comment(post_author, last_comment)
    if chartgpt_record is not None:
        await post_service.chartgpt_record_save(chartgpt_record)
        reply_text = chartgpt_record['response_content']
        comment_uid = chartgpt_record['comment_uid']
        logger.info('getOpenaiResponse tweet_id = {}, comment_uid = {}, reply_text = {}', tweet_id, comment_uid, reply_text)

        # Push reply to Twitter
        comment_data = await push_reply_comment(post_author, last_comment, chartgpt_record)

        # Record to database
        if comment_data is not None:
            await post_service.record_comment(comment_data)
            logger.info('record_comment {}', comment_data)
            if repost_flag == 1:
                # Retweet
                config_user_id = post_author_id
                await twitter_service.retweet(config_user_id=config_user_id, target_tweet_id=reply_id, content=reply_text)


# Create a reply
async def create_reply_comment(post_author, last_comment):
    uid = last_comment['uid']
    post_author_id = post_author['author_id']
    post_uid = uid

    messages = []
    image_url = ''
    if last_comment is not None:
        target_tweet_id = last_comment['comment_uid']
        target_author_id = last_comment['author_id']
        comment_uid = last_comment['comment_uid']

        # Query Response History
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
        logger.info('No new comments, no push notifications, end operation')
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
        if setting.RUN_ENV == 'swarms_env':
            prompt = ''
            for message in messages:
                if 'content' in message:
                    content = message['content']
                    if content is not None:
                        prompt = f'{prompt} {content}'
            response_data = await swarms_service.get_response(prompt, image_url)
            if response_data is not None:
                reply_text = response_data['choices'][0]['message']
        elif setting.RUN_ENV == 'dspy_env':
            prompt = ''
            for message in messages:
                if 'content' in message:
                    content = message['content']
                    if content is not None:
                        prompt = f'{prompt} {content}'
            # TODO
            reply_text = ''
        else:
            reply_text = await openai_service.get_response(messages)
    except Exception as e:
        response_status = '500'
        logger.error('getOpenaiResponse error {}', e)
    chartgpt_record = None
    if reply_text is not None:
        chartgpt_record = {'uid': post_uid, 'comment_uid': target_tweet_id, 'url': None
            , 'videos': None, 'images': None, 'status': 1, 'request_content': json.dumps(messages)
            , 'response_content': reply_text, 'response_status': response_status
            , 'remarks': remarks, 'create_time': datetime.now()
                           }

    return chartgpt_record


# Push reply to Twitter
async def push_reply_comment(post_author, last_comment, chartgpt_record):
    uid = last_comment['uid']
    post_user_name = post_author['user_name']
    post_author_id = post_author['author_id']
    target_author_id = last_comment['author_id']
    target_tweet_id = chartgpt_record['comment_uid']
    reply_text = chartgpt_record['response_content']

    if post_author_id == target_author_id:
        logger.error('push_comment error post_author_id == target_author_id {}', post_author_id)
        return None
    config_user_id = post_author_id
    reply_response = await twitter_service.push_comment(config_user_id, target_tweet_id, reply_text)
    logger.info('push_comment target_tweet_id = {}, reply_text = {}, reply_response = {}'
                , target_tweet_id, reply_text, reply_response)

    if reply_response is None or 'data' not in reply_response:
        logger.info('Push reply【{}】error End Operation', target_tweet_id)
        return None
    # Record comment content
    reply_type = 2
    reply_comment_uid = None
    if 'data' in reply_response and reply_response['data'] is not None:
        reply_data = reply_response['data']
        reply_comment_uid = reply_data['id']

    comment_url = f'https://x.com/{post_user_name}/status/{reply_comment_uid}'
    comment_data = {'reply_type': reply_type, 'uid': uid, 'comment_uid': reply_comment_uid
        , 'author_id': post_author_id, 'user_name': post_user_name
        , 'url': comment_url, 'status': 1, 'content': reply_text
        , 'create_time': datetime.now()
        , 'parent_user_id': target_author_id
        , 'parent_comment_uid': target_tweet_id,
                    }
    return comment_data


# Load user related comments
async def load_user_ref_comment(user):
    author_id = user['author_id']
    user_name = user['user_name']
    logger.info('load_user_ref_comment  author_id = {}, user_name = {}', author_id, user_name)

    # Get the most recent comments and save them to the database
    config_user_id = author_id
    twitter_comments = await twitter_service.get_mentions(config_user_id=config_user_id, user_id=author_id)
    twitter_comments = list(reversed(twitter_comments))
    await record_history_comments(twitter_comments=twitter_comments, reply_author_id=author_id)


# Record tweets to database
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
        history_comment_data = {
            'reply_type': 1, 'uid': conversation_id, 'parent_user_id': parent_user_id
            , 'parent_comment_uid': parent_comment_uid, 'comment_uid': reply_comment_uid
            , 'author_id': author_id, 'user_name': user_name
            , 'url': comment_url, 'content': reply_text
            , 'create_time': create_time, 'remarks': remarks, 'images': images
        }
        history_comment_datas.append(history_comment_data)
    await post_service.record_comments(history_comment_datas)


if __name__ == '__main__':
    #asyncio.run(fresh_comment())
    #asyncio.run(push_data_to_twitter())
    #asyncio.run(fresh_comment_by_users())
    asyncio.run(push_data_to_twitter_by_users())



