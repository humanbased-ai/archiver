from functools import wraps
from utils import redisUtils
import setting
from framework import errorcode
from starlette.requests import Request
import asyncdb
import json
import base64
import time
import datetime
from utils import messageUtils, ApiUtils
from log import logger


async def get_account_by_key(key:str):
    account = None
    app_key = key
    redis_key = 'account:'+key
    try:
        data_str = await redisUtils.getData(redis_key)
        if data_str is not None:
            account = json.loads(data_str)
    except Exception as e:
        logger.error(f"get account from redis error = {e}")
    if account is None:
        accounts = await asyncdb.sql_to_dict(
            f""" SELECT * from app_account where app_key= %s """, app_key)

        if not accounts:
            return {'code': errorcode.HTTP_NOT_ACCOUNT, 'data': None, 'message': 'Account authentication failed'}
        account = accounts[0]
        if account is not None:
            try:
                await redisUtils.setData(redis_key, json.dumps(account), setting.redisExpire)
            except Exception as e:
                logger.error(f"save account to redis error = {e}")
    return account


def check_login(code_check=False):
    def decorator(target_function):
        @wraps(target_function)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            #logger.info("check start")
            request: Request = kwargs.get('request')

            if 'x-api-key' not in request.headers:
                #raise {"code": 401, 'message':'missing header Token!'}
                #raise BusinessException(1002, 'x-api-key!')
                return {'code': errorcode.HTTP_NOT_ACCOUNT, 'data': None,'message': 'x-api-key is null,Permission authentication failed'}

            app_key = None
            app_secret = None
            app_time = None
            uri = None
            try:
                api_key = request.headers['x-api-key']
                api_keyStr = base64.b64decode(api_key).decode()
                api_keys = api_keyStr.split("_")
                app_key = api_keys[0]
                app_secret = api_keys[1]
                if len(api_keys) > 2:
                    app_time = api_keys[2]
            except:
                return {'code': errorcode.HTTP_NOT_ACCOUNT, 'data': None,'message': 'Account authentication failed'}
            if app_time is not None:
                # 当前时间的时间戳
                current_timestamp = time.time()
                # 时间差（秒）
                if len(app_time) > 10:
                    time_difference = current_timestamp - float(app_time)/1000
                else:
                    time_difference = current_timestamp - float(app_time)
                # 将时间差转换为分钟
                minutes_difference = time_difference // 60
                if minutes_difference > 10:
                    return {'code': errorcode.HTTP_NOT_ACCOUNT, 'data': None, 'message': 'Expired  Account authentication'}
            # 查询app账号信息
            account = await get_account_by_key(app_key)
            if account is None or account['status'] != 1:
                return {'code': errorcode.HTTP_NOT_ACCOUNT, 'data': None, 'message': 'Account authentication failed'}

            secret = account['app_secret']
            config = account['config']

            if secret != app_secret:
                return {'code': errorcode.HTTP_NOT_ACCOUNT, 'data': None, 'message': 'Account authentication failed'}
            try:
                uri = request.url.path
                json_data = json.loads(config)
                auth_uri_list = json_data['auth_uri_list']
                if not auth_uri_list:
                    return {'code': errorcode.HTTP_NOT_PERMISSON, 'data': None, 'message': 'Permission authentication failed'}
                flag = 0
                for auri in auth_uri_list:
                    if uri.startswith(auri):
                        flag = 1
                        break
                if flag == 0:
                    return {'code': errorcode.HTTP_NOT_PERMISSON, 'data': None,'message': 'Permission authentication failed'}
            except:
                return {'code': errorcode.HTTP_NOT_PERMISSON, 'data': None, 'message': 'Permission authentication failed'}
            auth_use_time = time.time() - start_time
            # logger.info("check auth usetime = {} ms", int(auth_use_time*1000))
            ret = await target_function(*args, **kwargs)
            total_use_time = time.time() - start_time
            logger.info(" uri total usetime = {} ms", int(total_use_time*1000) )

            try:
                # 转换为毫秒
                ms_time = int(total_use_time*1000)
                ApiUtils.recordAPIcount(uri, ms_time)
            except Exception as e:
                logger.error("warn_times error {}", e)
            return ret

        return wrapper

    return decorator
