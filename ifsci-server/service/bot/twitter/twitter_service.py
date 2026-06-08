import requests
import os
import json
import asyncio

import setting
from log import logger
import datetime
from requests_oauthlib import OAuth1Session
from dao import twitter_dao


bearer_token = os.environ.get("BEARER_TOKEN")
post_url = "https://api.twitter.com/2/tweets"
search_url = "https://api.twitter.com/2/tweets/search/recent"
query_params = {'query': '(from:twitterdev -is:retweet) OR #twitterdev', 'tweet.fields': 'author_id'}


def is_dev_env():
    if setting.RUN_ENV == 'dev':
        return True
    return False


# Query Twitter configuration
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


# Get Twitter session
async def get_OAuth1Session(config_user_id):
    oauth = None
    if is_dev_env():
        api_consumer_key = ''
        api_consumer_secret = ''
        api_access_token = ''
        api_access_secret = ''
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


# Get Twitter comments list
async def get_comments(config_user_id, target_tweet_id, max_results=10):
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

    # logger.info('get_replays {}', json_response)

    request_content = json.dumps(params)
    twitter_record = {'request_type': 'get_comments', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.datetime.now(), 'response_status': response_status,
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


async def push_comment(config_user_id, target_tweet_id, reply_text):
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
        reply_text_len = len(reply_text)
        if reply_text_len > 270:
            response_content = f'Reply content length :  {reply_text_len} > 270 characters, do not call Twitter API push_reply_comment'
            logger.error('Reply content length : {} > 270 characters, do not call Twitter API, {}', reply_text_len, reply_text_len)
            response_status = 400
        elif not (reply_text.startswith('1') or 'Total:' in reply_text):
            response_content = f'Reply to messages that do not contain food, do not call Twitter API push_reply_comment {reply_text}'
            logger.error(' Reply to messages that do not contain food, do not call Twitter API push_reply_comment, {}',  reply_text)
            response_status = 400
            post_comment = {'comment_uid': target_tweet_id, 'status': 0}
            await twitter_dao.update_post_comment_status(post_comment)
        else:
            response = oauth.post(
                url=url,
                json=payload,
            )

            if response.status_code != 201:
                logger.info("Request returned an error: {} {}".format(response.status_code, response.text))
                # raise Exception( "Request returned an error: {} {}".format(response.status_code, response.text))
            else:
                logger.info("Response code: {}".format(response.status_code))
            response_status = response.status_code
            response_content = response.text
            json_response = response.json()

            response_content = json.dumps(json_response, indent=4, sort_keys=True)
            logger.info(response_content)
    except Exception as e:
        logger.error('push_comment url = {}, params = {}, error  = {}', url, payload, e)
        response_content = f'{e}'

    # Saving the response as JSON
    request_content = json.dumps(payload)
    twitter_record = {'request_type': 'push_comment', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.datetime.now(), 'response_status': response_status,
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
            response_content = f'Reply content length :  {reply_text_len} > 270 characters, do not call Twitter APIAPI push_reply_comment'
            logger.error(' Reply content length: {} > 270 characters, do not call Twitter APIAPI push_reply_comment, {}', reply_text_len, reply_text_len)
            response_status = 400
        else:
            response = oauth.post(
                url=url,
                json=payload,
            )

            if response.status_code != 201:
                logger.info("Request returned an error: {} {}".format(response.status_code, response.text))
                # raise Exception( "Request returned an error: {} {}".format(response.status_code, response.text))
            else:
                logger.info("Response code: {}".format(response.status_code))
            response_status = response.status_code
            response_content = response.text
            json_response = response.json()

            response_content = json.dumps(json_response, indent=4, sort_keys=True)
            logger.info(response_content)
    except Exception as e:
        logger.error('push_comment url = {}, params = {}, error  = {}', url, payload, e)
        response_content = f'{e}'

    # Saving the response as JSON
    request_content = json.dumps(payload)
    twitter_record = {'request_type': 'repush_post', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.datetime.now(), 'response_status': response_status,
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
            response_content = f'Reply content length:  {reply_text_len} > 270 characters, do not call Twitter API push_reply_comment'
            logger.error('Reply content length: {} > 270 characters, do not call Twitter API push_reply_comment, {}', reply_text_len, reply_text_len)
            response_status = 400
        else:
            response = oauth.post(
                url=url,
                json=payload,
            )

            if response.status_code != 201:
                logger.info("Request returned an error: {} {}".format(response.status_code, response.text))
                # raise Exception( "Request returned an error: {} {}".format(response.status_code, response.text))
            else:
                logger.info("Response code: {}".format(response.status_code))
            response_status = response.status_code
            response_content = response.text
            json_response = response.json()

            response_content = json.dumps(json_response, indent=4, sort_keys=True)
            logger.info(response_content)
    except Exception as e:
        logger.error('push_comment url = {}, params = {}, error  = {}', url, payload, e)
        response_content = f'{e}'

    # Saving the response as JSON
    request_content = json.dumps(payload)
    twitter_record = {'request_type': 'repush_post', 'status': 1, 'url': url,
                      'request_content': request_content, 'response_content': response_content,
                      'create_time': datetime.datetime.now(), 'response_status': response_status,
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

    # Constructing API requests
    url = f"https://api.twitter.com/2/dm_conversations/with/{recipient_id}/messages"
    payload = {
        "text": message
    }
    headers = {
        "Content-Type": "application/json"
    }
    response = requests.post(url, json=payload, headers=headers, auth=oauth)
    if response.status_code == 201:
        logger.info("Message sent successfully!")
    else:
        logger.info(f"Failed to send message: {response.status_code}, {response.text}")
    return response.json()


# Search @mentions
async def get_mentions(config_user_id, user_id):
    headers = await get_headers_bearer_oauth(config_user_id)
    url = f'https://api.twitter.com/2/users/{user_id}/mentions'
    params = {
        "max_results": 100,
        "tweet.fields": "id,text,author_id,created_at,lang,source,in_reply_to_user_id,referenced_tweets,conversation_id",
        "expansions": "attachments.media_keys,author_id",
        "user.fields": "id,name,username",
        "media.fields": "url,preview_image_url,alt_text"
    }

    response = requests.get(url, headers=headers, params=params)
    # logger.info('response, code = {}, text = {}', response.status_code, response.text)
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
    else:
        logger.error(f"Error: {response.status_code} - {response.text}")
    return comments


def comment_test():
    target_tweet_id = 1873618522955481426
    config_user_id = '1861681427068207104'
    content = asyncio.run(get_comments(config_user_id, target_tweet_id, 100))
    logger.info(content)


def push_comment_test():
    target_tweet_id = "1864872295359221977"
    data1 = datetime.datetime.now()
    reply_text = f"What day is today? What foods are healthier to eat?"
    content = asyncio.run(push_comment(target_tweet_id, reply_text))
    logger.info(content)


def send_message_test():
    message = "What day is today? What foods are healthier to eat?"
    recipient_user_id = "1826500315316977664"
    content = asyncio.run(send_message_to_user(recipient_user_id=recipient_user_id, message=message))
    logger.info(content)


async def get_user_info(user_name):
    headers = await get_headers_bearer_oauth()

    url = f'https://api.twitter.com/2/users/by'

    params = {
        "usernames": user_name,
        "user.fields": "id,name,username,public_metrics,bio"
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


if __name__ == '__main__':
    twitter_user_id = '1861681427068207104'
    #comment_test()
    #push_comment_test()
    #send_message_test()
    #asyncio.run(get_mentions(twitter_user_id, '1861681427068207104'))

    content = '''1. Pumpkin bread, approx. 150g per slice, baked, 300 kcal per slice, 14g fat, 45g carbs, 4g protein.  
Total for 2 slices: 600 kcal, 28g fat, 90g carbs, 8g protein.'''
    #asyncio.run(repush_post('1870061600151142900', 'bison84742', content))
   # asyncio.run(retweet('1870061600151142900', 'bison84742', content))

    asyncio.run(get_tweet(None, '1860462399226331523'))
    #asyncio.run(get_user_info('SaintAI_Bot'))
    #asyncio.run(get_user_info('SaintAI_Bot'))
    print('#push_comment_test')

