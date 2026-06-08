import requests
import os
import json
import asyncio
import time
import setting
from log import logger
from datetime import datetime, timedelta, timezone
from dateutil.parser import isoparse
from requests_oauthlib import OAuth1Session
from dao import twitter_dao
from utils import messageUtils


#bearer_token = os.environ.get("BEARER_TOKEN", "<TWITTER_BEARER_REDACTED>")
# consumer_key = os.environ.get("consumer_key", "<TWITTER_CONSUMER_KEY_REDACTED>")
# consumer_secret = os.environ.get("consumer_secret", "<TWITTER_CONSUMER_SECRET_REDACTED>")
# access_token = os.environ.get("access_token", "<TWITTER_ACCESS_TOKEN_REDACTED>")
# access_secret = os.environ.get("access_secret", "<TWITTER_ACCESS_SECRET_REDACTED>")

# consumer_key = os.environ.get("consumer_key", "<TWITTER_CONSUMER_KEY_REDACTED>")
# consumer_secret = os.environ.get("consumer_secret", "<TWITTER_CONSUMER_SECRET_REDACTED>")
# access_token = os.environ.get("access_token", "<TWITTER_ACCESS_TOKEN_REDACTED>")
# access_secret = os.environ.get("access_secret", "<TWITTER_ACCESS_SECRET_REDACTED>")

bearer_token = os.environ.get("BEARER_TOKEN", "<TWITTER_BEARER_REDACTED>")
consumer_key = os.environ.get("consumer_key", "<TWITTER_CONSUMER_KEY_REDACTED>")
consumer_secret = os.environ.get("consumer_secret", "<TWITTER_CONSUMER_SECRET_REDACTED>")
access_token = os.environ.get("access_token", "<TWITTER_ACCESS_TOKEN_REDACTED>")
access_secret = os.environ.get("access_secret", "<TWITTER_ACCESS_SECRET_REDACTED>")

post_url = "https://api.twitter.com/2/tweets"
search_url = "https://api.twitter.com/2/tweets/search/recent"
query_params = {'query': '(from:twitterdev -is:retweet) OR #twitterdev', 'tweet.fields': 'author_id'}


def is_dev_env():
    if setting.RUN_ENV == 'dev1':
        return True
    return False


# 查询推特配置
async def get_user_config(config_user_id):
    user_config = None
    user = await twitter_dao.get_user_config(config_user_id)
    if user is not None:
        api_content = user['content']
        if api_content is not None:
            api_content = api_content.strip()
            if api_content.startswith('{') and api_content.endswith('}'):
                user_config = json.loads(api_content)
    if user_config is None:
        raise Exception('No twitter user config')
    return user_config


async def get_headers_bearer_oauth(config_user_id=None):
    """
    Method required by bearer token authentication.
    """
    api_bearer_token = None
    if is_dev_env() or config_user_id is None:
        api_bearer_token = bearer_token
    else:
        config = await get_user_config(config_user_id)
        if config is not None:
            api_bearer_token = config['bearer_token']
    if api_bearer_token is None:
        raise Exception('No twitter user config')
    headers = {
        "Authorization": f"Bearer {api_bearer_token}",
        "User-Agent": "v2RecentSearchPython"
    }
    return headers


# 获取推特session
async def get_OAuth1Session(config_user_id):
    oauth = None
    if is_dev_env():
        api_consumer_key = consumer_key
        api_consumer_secret = consumer_secret
        api_access_token = access_token
        api_access_secret = access_secret
        oauth = OAuth1Session(
            client_key=api_consumer_key,
            client_secret=api_consumer_secret,
            resource_owner_key=api_access_token,
            resource_owner_secret=api_access_secret,
        )
    else:
        config = await get_user_config(config_user_id)
        if config is not None:
            api_consumer_key = config['consumer_key']
            api_consumer_secret = config['consumer_secret']
            api_access_token = config['access_token']
            api_access_secret = config['access_secret']

            oauth = OAuth1Session(
                client_key=api_consumer_key,
                client_secret=api_consumer_secret,
                resource_owner_key=api_access_token,
                resource_owner_secret=api_access_secret,
            )
    return oauth


async def log_limit_info(url=None, response=None):
    if response is None:
        return
    try:
        limit = response.headers.get("x-rate-limit-limit")
        remaining = response.headers.get("x-rate-limit-remaining")
        reset_time = response.headers.get("x-rate-limit-reset")

        reset_time_readable = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(int(reset_time)))

        #print(f"API 限制总数: {limit}")
        #print(f"剩余请求次数: {remaining}")
        #print(f"重置时间: {reset_time_readable}")
        logger.info('url = {}, 限制总数 limit = {}, 剩余请求次数 remaining = {}, 重置时间 reset_time_readable = {}'
                    , url, limit, remaining, reset_time_readable)
    except Exception as e:
        logger.error('get rate-limit error {}', e)
    return


# 获取推特评论列表
async def get_comments(config_user_id, target_tweet_id, max_results=10):
    #url = f'{search_url}/?query=conversation_id:{target_tweet_id}&max_results={max_results}&tweet.fields=author_id,created_at&expansions=attachments.media_keys&media.fields=url'
    url = search_url
    params = {
        "query": f"conversation_id:{target_tweet_id} is:reply",
        "max_results": max_results,
        "tweet.fields": "id,text,author_id,created_at,lang,source,in_reply_to_user_id,referenced_tweets,conversation_id",
        "expansions": "attachments.media_keys,author_id",
        "user.fields": "id,name,username",
        "media.fields": "url"
    }
    comments = []
    json_response = {}
    response_content = None
    response_status = 200
    try:
        headers = await get_headers_bearer_oauth(config_user_id)
        response = requests.get(url, headers=headers, params=params)
        logger.info('requests url = {}, params = {}, response status_code = {}'
                    , url, params, response.status_code)
        if response.status_code == 200:
            json_response = response.json()
            response_content = json.dumps(json_response, indent=4, sort_keys=True)
        else:
            logger.error('request  status_code =  {}, error = {}', response.status_code, response.text)
            response_content = response.text
        response_status = response.status_code
    except Exception as e:
        logger.error('get_comments url = {}, params = {}, error  = {}', url, params,  e)
        response_content = f'{e}'
        response_status = 500
        messageUtils.send_message(title="获取评论失败", content=response_content)

    #json_response = deresponse_data
    #logger.info('get_replays {}', json_response)

    request_content = json.dumps(params)
    twitter_record = {'request_type': 'get_comments', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.now(timezone.utc), 'response_status': response_status,
                      'uid': target_tweet_id
                      }
    await twitter_dao.twitter_record_save(twitter_record)

    comments = load_comments(json_response)
    return comments


def load_comments(json_response):
    comments = []
    if json_response is not None and 'data' in json_response:
        comments = json_response['data']
        user_id_map = {}
        reply_id_media_map = {}
        if 'includes' in json_response and json_response['includes'] is not None:
            includes_data = json_response['includes']
            if 'media' in includes_data:
                medias = includes_data['media']
                if len(medias)>0:
                    for media in medias:
                        media_key = media['media_key']
                        reply_id_media_map[media_key] = media
            if 'users' in includes_data:
                users = includes_data['users']
                if len(users)>0:
                    for user in users:
                        user_id = user['id']
                        user_id_map[user_id] = user
        if len(comments) > 0:
            for comment in comments:
                reply_id = comment['id']
                author_id = comment['author_id']
                author = {'id': author_id, 'name': '', 'username': ''}
                if author_id in user_id_map:
                    user = user_id_map[author_id]
                    if user is not None:
                        author = user
                medias = []
                if 'attachments' in comment and comment['attachments'] is not None:
                    attachments = comment['attachments']
                    if 'media_keys' in attachments and attachments['media_keys'] is not None:
                        media_keys = attachments['media_keys']
                        for media_key in media_keys:
                            media = reply_id_media_map[media_key]
                            if media is not None:
                                medias.append(media)
                comment['author'] = author
                comment['medias'] = medias
    return comments


async def push_comment(config_user_id, target_tweet_id, reply_text, has_food_image):
    '''
    oauth = OAuth1Session(
        consumer_key,
        client_secret=consumer_secret,
        resource_owner_key=access_token,
        resource_owner_secret=access_secret,
    )'''
    oauth = await get_OAuth1Session(config_user_id)
    payload = {
        "text": reply_text,
        "reply": {
            "in_reply_to_tweet_id": target_tweet_id
        }
    }
    # Making the request
    url = post_url
    response_content = None
    json_response = None
    response_status = None
    try:
        reply_text_len = 0
        if reply_text is not None:
            reply_text_len = len(reply_text)
        if reply_text_len > 270:
            response_content = f'回复内容长度size :  {reply_text_len} > 270个字符， 不调用推特API push_reply_comment'
            logger.error(' 回复内容长度size :  {} > 270个字符， 不调用推特API push_reply_comment, {}', reply_text_len, reply_text_len)
            response_status = 400
        elif has_food_image is None or has_food_image is False or reply_text is None:
            response_content = f'回复信息不包含食物， 不调用推特API push_reply_comment {reply_text}'
            logger.error(' 回复信息不包含食物， 不调用推特API push_reply_comment, {}',  reply_text)
            response_status = 400
            post_comment = {'comment_uid': target_tweet_id, 'status': 0}
            await twitter_dao.update_post_comment_status(post_comment)
        else:
            response = oauth.post(
                url=url,
                json=payload,
            )
            await log_limit_info(url, response)
            if response.status_code == 201:
                post_comment = {'comment_uid': target_tweet_id, 'status': 2}
                await twitter_dao.update_post_comment_status(post_comment)
                logger.info("Success Response code: {}".format(response.status_code))
            elif response.status_code == 403:
                post_comment = {'comment_uid': target_tweet_id, 'status': 0}
                await twitter_dao.update_post_comment_status(post_comment)
            else:
                logger.info("Request returned an error: {} {}".format(response.status_code, response.text))
                #raise Exception( "Request returned an error: {} {}".format(response.status_code, response.text))

            response_status = response.status_code
            response_content = response.text
            json_response = response.json()

            response_content = json.dumps(json_response, indent=4, sort_keys=True)
            logger.info(response_content)
    except Exception as e:
        logger.error('push_comment url = {}, params = {}, error  = {}', url, payload, e)
        response_content = f'{e}'
        msg = f'tweet_id:{target_tweet_id}, error = {response_content}'
        messageUtils.send_message(title="回复评论失败", content=msg)

    # Saving the response as JSON
    request_content = json.dumps(payload)
    twitter_record = {'request_type': 'push_comment', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.now(timezone.utc), 'response_status': response_status,
                      'uid': target_tweet_id
                      }
    await twitter_dao.twitter_record_save(twitter_record)
    return json_response


async def repush_post(config_user_id, target_tweet_id, user_name, content=''):
    if content != '':
        content = f'\n{content}'
    reply_text = f'RT @{user_name}: https://twitter.com/{user_name}/status/{target_tweet_id} {content}'

    oauth = await get_OAuth1Session(config_user_id)
    payload = {
        "text": reply_text
    }
    # Making the request
    url = post_url
    response_content = None
    json_response = None
    response_status = None
    try:
        reply_text_len = len(reply_text)
        if reply_text_len > 270:
            response_content = f'回复内容长度size :  {reply_text_len} > 270个字符， 不调用推特API push_reply_comment'
            logger.error(' 回复内容长度size :  {} > 270个字符， 不调用推特API push_reply_comment, {}', reply_text_len, reply_text_len)
            response_status = 400
        else:
            response = oauth.post(
                url=url,
                json=payload,
            )

            if response.status_code != 201:
                logger.info("Request returned an error: {} {}".format(response.status_code, response.text))
                #raise Exception( "Request returned an error: {} {}".format(response.status_code, response.text))

            else:
                logger.info("Response code: {}".format(response.status_code))
            await log_limit_info(url, response)
            response_status = response.status_code
            response_content = response.text
            json_response = response.json()

            response_content = json.dumps(json_response, indent=4, sort_keys=True)
            logger.info(response_content)
    except Exception as e:
        logger.error('push_comment url = {}, params = {}, error  = {}', url, payload, e)
        response_content = f'{e}'
        msg = f'tweet_id:{target_tweet_id}, error = {response_content}'
        messageUtils.send_message(title="转发评论失败", content=msg)

    # Saving the response as JSON
    request_content = json.dumps(payload)
    twitter_record = {'request_type': 'repush_post', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.now(timezone.utc), 'response_status': response_status,
                      'uid': target_tweet_id
                      }
    await twitter_dao.twitter_record_save(twitter_record)
    return json_response


async def retweet(config_user_id, target_tweet_id, content=''):
    reply_text = content
    oauth = await get_OAuth1Session(config_user_id)
    payload = {
        "text": reply_text,
        "quote_tweet_id": target_tweet_id
    }
    # Making the request
    url = post_url
    response_content = None
    json_response = None
    response_status = None
    try:
        reply_text_len = len(reply_text)
        if reply_text_len > 270:
            response_content = f'回复内容长度size :  {reply_text_len} > 270个字符， 不调用推特API push_reply_comment'
            logger.error(' 回复内容长度size :  {} > 270个字符， 不调用推特API push_reply_comment, {}', reply_text_len, reply_text_len)
            response_status = 400
        else:
            response = oauth.post(
                url=url,
                json=payload,
            )

            if response.status_code != 201:
                logger.info("Request returned an error: {} {}".format(response.status_code, response.text))
                #raise Exception( "Request returned an error: {} {}".format(response.status_code, response.text))
            else:
                logger.info("Response code: {}".format(response.status_code))
            await log_limit_info(url, response)
            response_status = response.status_code
            response_content = response.text
            json_response = response.json()

            response_content = json.dumps(json_response, indent=4, sort_keys=True)
            logger.info(response_content)
    except Exception as e:
        logger.error('push_comment url = {}, params = {}, error  = {}', url, payload, e)
        response_content = f'{e}'
        msg = f'tweet_id:{target_tweet_id}, error = {response_content}'
        messageUtils.send_message(title="转发评论失败", content=msg)

    # Saving the response as JSON
    request_content = json.dumps(payload)
    twitter_record = {'request_type': 'repush_post', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.now(timezone.utc), 'response_status': response_status,
                      'uid': target_tweet_id
                      }
    await twitter_dao.twitter_record_save(twitter_record)
    return json_response


async def get_tweet(tweet_id, config_user_id=None):
    url = f"https://api.twitter.com/2/tweets/{tweet_id}"
    headers = None
    if config_user_id is not None:
        headers = await get_headers_bearer_oauth(config_user_id)
    else:
        headers = {
            "Authorization": f"Bearer {bearer_token}",
            "User-Agent": "v2RecentSearchPython"
        }
    params = {
        "tweet.fields": "id,text,author_id,created_at,lang,source,in_reply_to_user_id,referenced_tweets,conversation_id",
        "expansions": "attachments.media_keys,author_id",
        "user.fields": "id,name,username",
        "media.fields": "url"
    }
    response = requests.get(url, headers=headers, params=params)
    logger.info('get_tweet tweet_id = {}, response = {}', tweet_id, response.text)
    if response.status_code == 200:
        return response.json()
    else:
        logger.error(f"Error: {response.status_code}, {response.text}")
        return None


async def send_message_to_user(config_user_id, recipient_user_id, message):
    oauth = await get_OAuth1Session(config_user_id)

    recipient_id = recipient_user_id

    # 构造 API 请求
    url = f"https://api.twitter.com/2/dm_conversations/with/{recipient_id}/messages"
    payload = {
        "text": message
    }
    headers = {
        "Content-Type": "application/json"
    }

    # 发送请求
    response = requests.post(url, json=payload, headers=headers, auth=oauth)

    # 打印响应
    if response.status_code == 201:
        logger.info("Message sent successfully!")
    else:
        logger.info(f"Failed to send message: {response.status_code}, {response.text}")
    return response.json()


# 获取最提及评论 包括不公开的评论
async def get_comments_by_username(config_user_id, user_name, max_results=100):
    #url = f'{search_url}/?query=conversation_id:{target_tweet_id}&max_results={max_results}&tweet.fields=author_id,created_at&expansions=attachments.media_keys&media.fields=url'
    url = search_url

    now = datetime.now(timezone.utc)
    twelve_hours_ago = now - timedelta(hours=12)
    # 获取当天的起始时间
    start_time = datetime(twelve_hours_ago.year, twelve_hours_ago.month, twelve_hours_ago.day)

    # 转换为 ISO 8601 格式
    iso_start_time = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    start_time = iso_start_time
    params = {
        "query": f"@{user_name}",
        "start_time": start_time,
        "max_results": max_results,
        "tweet.fields": "id,text,author_id,created_at,lang,source,in_reply_to_user_id,referenced_tweets,conversation_id",
        "expansions": "attachments.media_keys,author_id",
        "user.fields": "id,name,username",
        "media.fields": "url"
    }
    comments = []
    json_response = {}
    response_content = None
    response_status = 200
    try:
        headers = await get_headers_bearer_oauth(config_user_id)
        response = requests.get(url, headers=headers, params=params)
        logger.info('requests url = {}, params = {}, response status_code = {}'
                    , url, params, response.status_code)
        if response.status_code == 200:
            json_response = response.json()
            response_content = json.dumps(json_response, indent=4, sort_keys=True)
            await log_limit_info(url, response)
        else:
            logger.error('request  status_code =  {}, error = {}', response.status_code, response.text)
            response_content = response.text
        response_status = response.status_code
    except Exception as e:
        logger.error('get_comments url = {}, params = {}, error  = {}', url, params,  e)
        response_content = f'{e}'
        response_status = 500
        messageUtils.send_message(title="获取评论失败", content=response_content)

    #json_response = deresponse_data
    #logger.info('get_replays {}', json_response)

    request_content = json.dumps(params)
    twitter_record = {'request_type': 'get_comments_by_username', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.now(timezone.utc), 'response_status': response_status,
                      'uid': user_name
                      }
    await twitter_dao.twitter_record_save(twitter_record)

    comments = load_comments(json_response)
    return comments


# 查询 @ 提及
async def get_mentions(config_user_id, user_id):
    headers = await get_headers_bearer_oauth(config_user_id)

    url = f'https://api.twitter.com/2/users/{user_id}/mentions'

    now = datetime.now(timezone.utc)
    twelve_hours_ago = now - timedelta(hours=12)
    # 获取当天的起始时间
    start_time = datetime(twelve_hours_ago.year, twelve_hours_ago.month, twelve_hours_ago.day)

    # 转换为 ISO 8601 格式
    iso_start_time = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    start_time = iso_start_time

    params = {
        "start_time": start_time,
        "max_results": 100,
        "tweet.fields": "id,text,author_id,created_at,lang,source,in_reply_to_user_id,referenced_tweets,conversation_id,geo",
        "expansions": "attachments.media_keys,author_id",
        "user.fields": "id,name,username",
        "media.fields": "url,preview_image_url,alt_text"
    }

    response = requests.get(url, headers=headers, params=params)
    #logger.info('response, code = {}, text = {}', response.status_code, response.text)
    comments = []
    if response.status_code == 200:
        mentions = response.json()
        comments = load_comments(mentions)
        #for comment in comments:
            #logger.info('comment = {}', comment)
        #for tweet in mentions['data']:
            #print(f"Tweet ID: {tweet['id']}")
            #print(f"Tweet Text: {tweet['text']}")
            #logger.info(f"Tweet : {tweet}")
        logger.info(' get_mentions url = {}, params = {}, comments len = {}'
                    , url, params, len(comments))
        await log_limit_info(url, response)
    else:
        logger.error(f"Error: {response.status_code} - {response.text}")
        response_content = response.text
        status_code = response.status_code
        msg = f'user_id:{user_id}, error = {status_code}, {response_content}'
        messageUtils.send_message(title="查询关联失败", content=msg)
    return comments


def comment_test():
    target_tweet_id = 1873618522955481426
    config_user_id = '1861681427068207104'
    content = asyncio.run(get_comments(config_user_id, target_tweet_id, 100))
    logger.info(content)


def push_comment_test():
    target_tweet_id = "1864872295359221977"
    data1 = datetime.now(timezone.utc)
    reply_text = f"@bison84742 今天是几号，吃哪些食物比较健康？"
    content = asyncio.run(push_comment(target_tweet_id, reply_text))
    logger.info(content)


def send_message_test():
    message = "请查看这个推文，https://x.com/zouqone/status/1864872295359221977 ，是否对你有帮助？"
    recipient_user_id = "1826500315316977664"
    content = asyncio.run(send_message_to_user(recipient_user_id=recipient_user_id, message=message))
    logger.info(content)


async def get_user_info(user_name):
    headers = await get_headers_bearer_oauth()

    url = f'https://api.twitter.com/2/users/by'

    params = {
        "usernames": user_name,
        "user.fields": "id,name,username,public_metrics"
    }

    response = requests.get(url, headers=headers, params=params)
    logger.info('get_user_info, user_name = {}, code = {}, text = {}', user_name, response.status_code, response.text)
    user = None
    if response.status_code == 200:
        response_data = response.json()['data']
        users = response_data
        if len(users) > 0:
            user = users[0]
    return user


async def get_post_info(post_id):
    headers = await get_headers_bearer_oauth()

    url = f'https://api.twitter.com/2/tweets/{post_id}'

    response = requests.get(url, headers=headers)
    logger.info('get_user_info, post_id = {}, code = {}, text = {}', post_id, response.status_code, response.text)
    user = None
    if response.status_code == 200:
        response_data = response.json()['data']
        users = response_data
        if len(users) > 0:
            user = users[0]
    return user


async def get_rate_limit_status():
    url = "https://api.twitter.com/1.1/application/rate_limit_status.json?resources=statuses"

    headers = await get_headers_bearer_oauth('1873054420570914818')

    response = requests.get(url, headers=headers)
    rate_limit_data = response.json()

    # 获取特定 API 端点的限额
    user_timeline_limit = rate_limit_data['resources']['statuses']['/statuses/user_timeline']

    remaining = user_timeline_limit['remaining']
    reset_time = user_timeline_limit['reset']

    # 计算重置时间
    reset_time_readable = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(reset_time))

    print(f"剩余请求次数: {remaining}")
    print(f"重置时间: {reset_time_readable}")
    return


async def get_author_followers(USER_ID=None):
    # 你的 Twitter API Bearer Token
    BEARER_TOKEN = "your_bearer_token_here"

    # 目标博主的 Twitter 用户 ID（需要先查到）
    if USER_ID is None:
        USER_ID = "1873054420570914818"  # 这里替换成目标博主的用户 ID，例如 Elon Musk

    # API 请求 URL
    url = f"https://api.twitter.com/2/users/{USER_ID}/followers"

    # 发送请求

    headers = await get_headers_bearer_oauth('1873054420570914818')
    response = requests.get(url, headers=headers)

    # 解析 JSON 响应
    if response.status_code == 200:
        data = response.json()
        print("以下是该博主的粉丝列表：")
        for user in data["data"]:
            print(f"{user['name']} (@{user['username']})")
    else:
        print(f"请求失败: {response.status_code}, {response.text}")


async def get_author_following(USER_ID=None):

    # 目标博主的 Twitter 用户 ID（需要先查到）
    if USER_ID is None:
        USER_ID = "1873054420570914818"  # 这里替换成目标博主的用户 ID，例如 Elon Musk





if __name__ == '__main__':
    twitter_user_id = '1861681427068207104'
    #comment_test()
    #push_comment_test()
    #send_message_test()
    #asyncio.run(get_mentions(twitter_user_id, '1861681427068207104'))
    #asyncio.run(get_rate_limit_status())


    #asyncio.run(get_comments_by_username(1873054420570914818, "adesciagent",100))
    content = '''1. Pumpkin bread, approx. 150g per slice, baked, 300 kcal per slice, 14g fat, 45g carbs, 4g protein.  
Total for 2 slices: 600 kcal, 28g fat, 90g carbs, 8g protein.'''
    #asyncio.run(repush_post('1870061600151142900', 'bison84742', content))
   # asyncio.run(retweet('1870061600151142900', 'bison84742', content))

    #asyncio.run(get_tweet(None, '1860462399226331523'))
    #asyncio.run(get_user_info('adesciagent'))
    asyncio.run(get_author_followers())
    #asyncio.run(get_author_following())
    print('#push_comment_test')


deresponse_data = {
    "data": [
        {
            "lang": "zh",
            "in_reply_to_user_id": "1824001917464551424",
            "id": "1865378616634466784",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-07T12:51:33.000Z",
            "edit_history_tweet_ids": [
                "1865378616634466784"
            ],
            "text": "@bison84742 当然，我很乐意帮助您！无论您有什么问题或需求，请随时告知，我会尽力为您提供支持。",
            "author_id": "1824001917464551424",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1865374660629762085"
                }
            ]
        },
        {
            "lang": "zh",
            "in_reply_to_user_id": "1824001917464551424",
            "id": "1865375686355279985",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-07T12:39:55.000Z",
            "edit_history_tweet_ids": [
                "1865375686355279985"
            ],
            "text": "@zouqone 土豆有益健康吗",
            "author_id": "1826500315316977664",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1865253828649717992"
                }
            ]
        },
        {
            "lang": "zh",
            "in_reply_to_user_id": "1824001917464551424",
            "id": "1865374660629762085",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-07T12:35:50.000Z",
            "edit_history_tweet_ids": [
                "1865374660629762085"
            ],
            "text": "@bison84742 很高兴为您提供帮助！如果有任何问题或需要，请随时告诉我。",
            "author_id": "1824001917464551424",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1865253828649717992"
                }
            ]
        },
        {
            "lang": "zh",
            "in_reply_to_user_id": "1824001917464551424",
            "id": "1865373488774774902",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-07T12:31:11.000Z",
            "edit_history_tweet_ids": [
                "1865373488774774902"
            ],
            "text": "@bison84742 时间是2024年12月7日中午12点35分。有什么我可以帮助您的吗？",
            "author_id": "1824001917464551424",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1865253828649717992"
                }
            ]
        },
        {
            "lang": "zh",
            "in_reply_to_user_id": "1826500315316977664",
            "id": "1865253828649717992",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-07T04:35:42.000Z",
            "edit_history_tweet_ids": [
                "1865253828649717992"
            ],
            "text": "@bison84742 现在的时间是 2024-12-07 12:35:41.571116",
            "author_id": "1824001917464551424",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1864880854146949207"
                }
            ]
        },
        {
            "lang": "zh",
            "in_reply_to_user_id": "1826500315316977664",
            "id": "1864884515166130578",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-06T04:08:10.000Z",
            "edit_history_tweet_ids": [
                "1864884515166130578"
            ],
            "text": "@bison84742 这张图片显示了一碗炸酱面。以下是预估的营养信息：\n    请注意，这些只是估算值，实际值可能会根据具体食材和烹饪方法有所不同。",
            "author_id": "1824001917464551424",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1864880854146949207"
                }
            ]
        },
        {
            "lang": "zh",
            "in_reply_to_user_id": "1824001917464551424",
            "id": "1864880854146949207",
            "conversation_id": "1864872295359221977",
            "attachments": {
                "media_keys": [
                    "3_1864880851181592576"
                ]
            },
            "created_at": "2024-12-06T03:53:38.000Z",
            "edit_history_tweet_ids": [
                "1864880854146949207"
            ],
            "text": "@zouqone 我喜欢吃面 https://t.co/xZdRPA2QpP",
            "author_id": "1826500315316977664",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1864872295359221977"
                }
            ]
        },
        {
            "lang": "en",
            "in_reply_to_user_id": "1826500315316977664",
            "id": "1864878875647578614",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-06T03:45:46.000Z",
            "edit_history_tweet_ids": [
                "1864878875647578614"
            ],
            "text": "@bison84742 app is very nick 2024-12-06 11:45:45.864505",
            "author_id": "1824001917464551424",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1864872797446787132"
                }
            ]
        },
        {
            "lang": "en",
            "in_reply_to_user_id": "1826500315316977664",
            "id": "1864877693231419601",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-06T03:41:04.000Z",
            "edit_history_tweet_ids": [
                "1864877693231419601"
            ],
            "text": "@bison84742 app is very nick 2024-12-06 11:41:03.980083",
            "author_id": "1824001917464551424",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1864872797446787132"
                }
            ]
        },
        {
            "lang": "en",
            "in_reply_to_user_id": "1824001917464551424",
            "id": "1864872797446787132",
            "conversation_id": "1864872295359221977",
            "created_at": "2024-12-06T03:21:37.000Z",
            "edit_history_tweet_ids": [
                "1864872797446787132"
            ],
            "text": "@zouqone l like apple",
            "author_id": "1826500315316977664",
            "referenced_tweets": [
                {
                    "type": "replied_to",
                    "id": "1864872295359221977"
                }
            ]
        }
    ],
    "includes": {
        "users": [
            {
                "id": "1824001917464551424",
                "name": "邹庆华",
                "username": "zouqone"
            },
            {
                "id": "1826500315316977664",
                "name": "bisonRisk1",
                "username": "bison84742"
            }
        ],
        "media": [
            {
                "media_key": "3_1864880851181592576",
                "type": "photo",
                "url": "https://pbs.twimg.com/media/GeFjQOsbYAANAI8.jpg"
            }
        ]
    },
    "meta": {
        "newest_id": "1865378616634466784",
        "oldest_id": "1864872797446787132",
        "result_count": 10
    }
}