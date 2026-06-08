import json
from log import logger
from datetime import datetime, timezone
import uuid
from utils.sign import sign_utils
from utils import redisUtils
from dao.art import art_account_dao
from service.art import art_invite_service
from utils.exceptions import BusinessException
from utils import requests_utils
import setting
import jwt
from framework import errorcode

env = setting.RUN_ENV

redis_prefix = 'art_'


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


async def get_account_by_account_id_from_cache(token):
    account = None
    if token is None:
        return account
    key = f'{token}'
    if env == 'dev':
        account = await get_account_by_token(key)
    else:
        redis_key = f'{redis_prefix}account_id:{key}'
        try:
            data_str = await redisUtils.getData(redis_key)
            if data_str is not None:
                account = json.loads(data_str)
        except Exception as e:
            logger.error(f"get account from redis error = {e}")
        if account is None:
            account = await get_account_by_token(key)
            if account is None:
                return None
            if account is not None:
                try:
                    await redisUtils.setData(redis_key, json.dumps(account), setting.redisExpire)
                except Exception as e:
                    logger.error(f"save ad account to redis error = {e}")
    return account


async def get_account_by_token(token=None):
    result = None
    if token is None:
        return result

    #account = token_decode(token)
    uri = '/api/v2/user/get/user_info'
    host = setting.codata_host
    url = f'{host}{uri}'
    url = setting.get_user_url
    headers = {'Content-Type': 'application/json', 'token': token}
    response = await requests_utils.post(url=url, json=None, headers=headers)

    if response is not None and response.status_code == 200:
        response_data = response.json()
        data = response_data.get('data')
        if data is not None:
            user_data = data.get('user_data')
            if user_data is not None:
                user_id = user_data["user_id"]
                result = {'user_id': user_id, 'type': 'codata'}
    return result



