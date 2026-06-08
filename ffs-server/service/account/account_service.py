import requests
import os
import json
import asyncio
from log import logger
from datetime import datetime, timedelta, timezone
import uuid
from dao import account_dao
from service.bot.twitter import twitter_service, post_service, openai_service, user_service
from service.account import account_reward_service, account_redeem_service
from utils.sign import sign_utils
from utils import redisUtils
import setting
import jwt
from framework import errorcode
from utils.exceptions import BusinessException

env = setting.RUN_ENV


# 密钥，用于签署和验证令牌
secret_key = '<SECRET_KEY_REDACTED>'
algorithm = 'HS256'


def token_decode(token):
    try:
        # options = {"verify_signature": False}
        decoded_payload = jwt.decode(token, secret_key,
                                     algorithms=[algorithm], verify=False)
        if decoded_payload is None:
            raise BusinessException(errorcode.USER_TOKEN_INVALID,
                                    "The JWT token is invalid. parse result is None.")
        return decoded_payload
    except jwt.ExpiredSignatureError:
        raise BusinessException(errorcode.USER_TOKEN_INVALID, "The JWT token has expired. Please regenerate the "
                                                              "token.")
    except jwt.InvalidTokenError:
        raise BusinessException(errorcode.USER_TOKEN_INVALID, "The JWT token is invalid. Please verify that the "
                                                              "token is correct.")
    except ValueError:
        raise BusinessException(errorcode.USER_TOKEN_INVALID,
                                "The secret key is invalid. Please verify that the "
                                "secret key is correct.")


async def get_account_by_token_from_cache(token: str):
    account = None
    if token is None:
        return account
    key = f'{token}'
    if env == 'dev':
        account = await get_user_by_code(key)
    else:
        redis_key = f'account:{key}'
        try:
            data_str = await redisUtils.getData(redis_key)
            if data_str is not None:
                account = json.loads(data_str)
        except Exception as e:
            logger.error(f"get account from redis error = {e}")
        if account is None:
            account = await get_user_by_code(key)
            if account is None:
                return None
            if account is not None:
                try:
                    await redisUtils.setData(redis_key, json.dumps(account), setting.redisExpire)
                except Exception as e:
                    logger.error(f"save account to redis error = {e}")
    return account


async def get_account_by_account_id_from_cache(account_id):
    account = None
    if account_id is None:
        return account
    key = f'{account_id}'
    if env == 'dev':
        account = await get_user_by_id(key)
    else:
        redis_key = f'account_id:{key}'
        try:
            data_str = await redisUtils.getData(redis_key)
            if data_str is not None:
                account = json.loads(data_str)
        except Exception as e:
            logger.error(f"get account from redis error = {e}")
        if account is None:
            account = await get_user_by_id(key)
            if account is None:
                return None
            if account is not None:
                try:
                    await redisUtils.setData(redis_key, json.dumps(account), setting.redisExpire)
                except Exception as e:
                    logger.error(f"save account to redis error = {e}")
    return account


async def update_account(data):
    await account_dao.update_account(data)


# get account info
async def get_user_detail(user_id):
    info = None
    user = await get_user_info(user_id)
    if user is None:
        return info
    account_id = user['id']
    score = await account_reward_service.get_account_score(user_id=user_id)
    twitter_name = await user_service.get_twitter_user_name(user_id=user_id)
    if score is None:
        score = 0
    token = await account_redeem_service.get_account_token(account_id=account_id)
    if token is None:
        token = 0
    info = {
        'user_id': user_id,
        'twitter_name': twitter_name,
        'score': score,
        'token': token
    }
    return info


async def get_user_info(user_id):
    user = await account_dao.get_account_by_user_id(user_id)

    return user


async def get_user_by_id(id):
    user = await account_dao.get_account_by_id(id)
    return user


async def get_user_by_code(code):
    user = await account_dao.get_account_by_code(code)
    return user


# gen code
async def gen_code(user_id):
    account_code = str(uuid.uuid4())[:20].replace('-', '')
    user = await get_user_info(user_id)
    if user is None:
        account = None
        user = {
            'user_id': user_id,
            'account_code': account_code,
            'source_type': "address",
            'status': 0,
            'create_time': datetime.now(timezone.utc)
        }
        await account_dao.add_account(user)
    else:
        # user['status'] = 1
        db_account_code = user['account_code']
        if db_account_code is not None and db_account_code != '' and len(db_account_code) > 0:
            # 不更新验证码
            account_code = db_account_code
        else:
            # 更新验证码
            user['account_code'] = account_code
            await account_dao.save_account(user)
    return {'code': account_code}


async def verify_user(user_id, message, signature):
    user = await get_user_info(user_id)
    logger.info('verify_user user = {}', user)

    public_key = user_id
    await verify_signature(public_key, signature, message)
    account_code = str(uuid.uuid4())[:40].replace('-', '')
    user = {
        'user_id': user_id,
        'account_code': account_code,
        'source_type': "address",
        'status': 1,
        'create_time': datetime.now(timezone.utc)
    }
    await account_dao.save_account(user)
    result = {
        'token': account_code,
    }
    return result


async def verify_signature(public_key, signature, message):
    result = await sign_utils.sol_sign(address=public_key, signature=signature, message=message)
    return result


async def unbind_user(user_id):
    user = await get_user_info(user_id)
    if user is None:
        return {'status': 0, 'message': 'user not found'}

    user['status'] = 0
    await account_dao.update_account(user)
    return {'status': 1, 'message': 'unbinded successfully'}


async def get_account_by_admin(token):
    account = None
    if token is None or token == "" or token == 'null':
        return account
    resp = None
    url = ''
    try:
        url = setting.admin_host
        url += '/api/auth/getUserInfo'
        resp = requests.get(url=url, headers={'token': f'{token}'})
        if resp.status_code == 200:
            account = resp.json()['data']
        else:
            logger.warning('resp status_code = {}, text = {}', resp.status_code, resp.text)

    except Exception as e:
        logger.error('get_account url = {}, token = {}, error = {}', url, token, e)
    return account


async def get_account_by_codata(token, uid=None):
    response = None
    account = None
    if token is None or token == "" or token == 'null':
        return response
    resp = None
    url = ''
    try:
        user_account = token_decode(token)
        if user_account is not None:
            user_account['user_id'] = uid

            user_account['type'] = 'codata'
            return user_account

        url = setting.codata_host
        url += '/api/user/details'
        resp = requests.get(url=url, headers={'token': f'{token}', 'uid': f'{uid}'})
        response = resp.json()
        if resp.status_code == 200:
            account = resp.json()['data']
        else:
            logger.warning('resp status_code = {}, text = {}', resp.status_code, resp.text)
    except BusinessException as e:
        response = {"data": None, "success": False,
                    "errorCode": e.code,
                    "errorMessage": e.msg}
        logger.error('get_account url = {}, token = {}, uid= {}, error = {}', url, token, uid, e)
    except Exception as e:
        logger.error('get_account url = {}, token = {}, uid= {}, error = {}', url, token, uid, e)
    return account
