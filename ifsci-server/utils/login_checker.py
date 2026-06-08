from functools import wraps
from utils import redis_utils
import setting
from framework import error_codes
from starlette.requests import Request
import asyncdb
import json
import base64
import time
import datetime
from utils import message_utils, api_utils
from utils.exceptions import BusinessException
from service.account import account_service
import jwt
import requests
from log import logger


async def get_account_by_key(key:str):
    account = None
    app_key = key
    if key is None:
        return None
    redis_key = 'account:'+key
    try:
        data_str = await redis_utils.getData(redis_key)
        if data_str is not None:
            account = json.loads(data_str)
    except Exception as e:
        logger.error(f"get account from redis error = {e}")
    if account is None:
        account = await account_service.get_user_by_code(key)

        if account is None:
            return {'code': error_codes.HTTP_NOT_ACCOUNT, 'data': None, 'message': 'Account authentication failed'}
        if account is not None:
            try:
                await redis_utils.setData(redis_key, json.dumps(account), setting.redisExpire)
            except Exception as e:
                logger.error(f"save account to redis error = {e}")
    return account


async def get_account_by_admin(env, token):
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


def check_login(code_check=False):
    def decorator(target_function):
        @wraps(target_function)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            request: Request = kwargs.get('request')
            app_key = None
            app_secret = None
            app_time = None
            uri = None
            token = None
            uid = None
            uri = request.url.path
            env = setting.RUN_ENV
            account = None
            if code_check == 'ffs':
                response = None
                if request is not None and request.headers is not None:
                    if 'token' in request.headers:
                        token = request.headers['token']
                    if 'uid' in request.headers:
                        uid = request.headers['uid']

                    response = await get_account_by_key(token)
                if env != 'dev':
                    try:
                        if response is None:
                            return {'code': error_codes.HTTP_NOT_ACCOUNT, 'data': None, 'message': 'Account authentication failed'}
                    except Exception as e:
                        logger.error('get_account response = {}, token = {}, error = {}', response, token, e)
                        return response
                    account = response
                if account is None:
                    account = {'name': 'ffs'}
                else:
                    username = ''
                    if username is None or username == '':
                        if 'user_id' in account:
                            username = account['user_id']
                    account['name'] = username
            elif code_check == 'admin':
                if request is not None and request.headers is not None:
                    if 'token' in request.headers:
                        token = request.headers['token']
                    account = await get_account_by_admin(env, token)
                if account is None and 'dev' != env:
                    return {'code': error_codes.HTTP_NOT_ACCOUNT, 'data': None, 'message': 'Account authentication failed'}

            if account is None or 'name' not in account:
                account = {'name': ''}
            auth_use_time = time.time() - start_time
            # logger.info("check auth usetime = {} ms", int(auth_use_time*1000))
            ret = await target_function(*args, **kwargs)
            total_use_time = time.time() - start_time
            logger.info("user[{}] uri = {} total_usetime = {} ms", account['name'], uri, int(total_use_time*1000))

            try:
                # Convert to milliseconds
                ms_time = int(total_use_time*1000)
                api_utils.recordAPIcount(uri, ms_time)
            except Exception as e:
                logger.error("warn_times error {}", e)
            return ret

        return wrapper

    return decorator
