import requests
import os
import json
import asyncio

import setting
from log import logger
from datetime import datetime, timedelta, timezone
from requests_oauthlib import OAuth1Session
import uuid
import urllib.parse
from dao import twitter_dao
from service.bot.twitter import twitter_service, post_service, openai_service
from service.account import account_service

rel_twitter_type = 'twitter'


# 查询用户信息
async def get_user_info(rel_type, user_id):
    user = await twitter_dao.get_user_info(rel_type, user_id)

    return user


# 通过推特用户ID 获取 账号ID
async def get_rel_user_by_twitter(rel_id):
    user = None
    if rel_id is not None:
        rel_type = rel_twitter_type
        user = await twitter_dao.get_user_info_by_rel_id(rel_type, rel_id)
    return user


async def get_user_id_by_rel_id(rel_id, rel_type=rel_twitter_type):
    user_id = None
    if rel_id is not None:
        user = await twitter_dao.get_user_info_by_rel_id(rel_type, rel_id)
        if user is not None:
            user_id = user['user_id']
    return user_id


async def get_user_by_rel_id(rel_id, rel_type=rel_twitter_type):
    user = None
    if rel_id is not None:
        user = await twitter_dao.get_user_info_by_rel_id(rel_type, rel_id)
    return user


async def get_twitter_config_user():
    config_twitter_user_id = setting.config_twitter_user_id
    bot_user = await post_service.get_user_by_author_id(config_twitter_user_id)
    return bot_user


async def get_twitter_user_name(user_id):
    twitter_user_name = None
    if user_id is not None:
        user = await get_user_info(rel_twitter_type, user_id)
        if user is not None and user['status'] == 1:
            twitter_user_name = user['rel_name']
            rel_id = user['rel_id']
            if rel_id is None:
                twitter_user_name = None

    return twitter_user_name


async def verify_twitter_user(link, user_id):
    tweet_id = None
    twitter_user_name = None

    if link is not None and link.startswith('https://x.com/') and '/status/' in link:
        tweet_id = link.split('/')[-1]
        twitter_user_name = link.split('/')[-3]

    rel_code = None
    user_status = 0
    rel_id = None
    post_text = None
    message = None
    if tweet_id is not None and twitter_user_name is not None:
        other_users = await twitter_dao.get_user_infos(rel_twitter_type, user_name=twitter_user_name)
        if len(other_users) > 1:
            user_status = 2
        elif len(other_users) == 1:
            other_user = other_users[0]
            other_user_id = other_user['rel_id']
            if other_user_id != user_id:
                 user_status = 2
        user = await get_user_info(rel_twitter_type, user_id)
        if user is not None:
            rel_code = user['rel_code']
            if rel_code is not None:
                post_data = await twitter_service.get_tweet(tweet_id=tweet_id)
                if post_data is not None:
                    rel_id = post_data['data']['author_id']
                    post_text = post_data['data']['text']
                    twitter_user = post_data['includes']['users'][0]
                    # 推文中包含验证码
                    if post_text is not None and rel_code in post_text:
                        user_status = 1
            else:
                user_status = 3

            # 更新推文内容
            if user_status == 1:
                user['status'] = 1
                user['rel_name'] = twitter_user_name
                user['rel_id'] = rel_id
                user['rel_time'] = datetime.now(timezone.utc)
                await twitter_dao.save_rel_user_info(user)
    if user_status == 2:
        message = 'This X account is already linked to Fasting & Food Science. Please remove the existing binding first.'
    elif user_status == 0:
        message = 'Please ensure that the entered link is the verify post share link.'
    elif user_status == 3:
        message = 'Please fresh page.'
    elif user_status == 1:
        message = 'Binding successful.'
    result = {
        "status": user_status,
        "twitter_user_name": twitter_user_name,
        "message": message
    }
    logger.info('verify user_id = {}, post_text = {}, link = {},  result = {}', user_id, post_text, link, result)
    return result


# 生产推特码
async def gen_twitter_code(user_id):
    rel_code = str(uuid.uuid4())[:20].replace('-', '')
    user = await get_user_info(rel_twitter_type, user_id)
    if user is None:
        account = None
        account_id = None
        account_data = await account_service.get_user_info(user_id)
        if account_data is not None:
            account_id = account_data['id']
        user = {
            'user_id': user_id,
            'account_id': account_id,
            'account': account,
            'rel_type': rel_twitter_type,
            'status': 1,
            'rel_code': rel_code,
            'create_time': datetime.now(timezone.utc)
        }
        await twitter_dao.add_rel_user_info(user)
    else:
        #user['status'] = 1
        db_rel_code = user['rel_code']
        if db_rel_code is not None and db_rel_code != '' and len(db_rel_code) > 0:
            # 不更新验证码
            rel_code = db_rel_code
        else:
            # 更新验证码
            user['rel_code'] = rel_code
            await twitter_dao.save_rel_user_info(user)
    twitter_user_name = ''
    twitter_config_user = await get_twitter_config_user()
    if twitter_config_user is not None:
        twitter_user_name = twitter_config_user['user_name']
    tweet_text = f'Verify my X account for $IFSCI\nid: {rel_code} @{twitter_user_name}'
    tweet_text = urllib.parse.quote(tweet_text)
    url = f'https://twitter.com/intent/tweet?text={tweet_text}'
    return {'code': rel_code, 'link': url}


async def unbind_twitter_user(user_id):
    user = await get_user_info(rel_twitter_type, user_id)
    if user is None:
        return {'status': 0, 'message': 'user not found'}
    user_data = {
        'id': user['id'],
        'status': 0,
        'rel_name': None,
        'rel_id': None,
        'rel_time': None,
        'rel_code': None
    }
    await twitter_dao.save_rel_user_info(user_data)
    return {'status': 1, 'message': 'unbinded successfully'}