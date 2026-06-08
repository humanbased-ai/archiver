import requests
import os
import json
import asyncio
from log import logger
from datetime import datetime, timedelta, timezone
import uuid
from utils.sign import sign_utils
from utils import redisUtils
from utils.exceptions import BusinessException

import setting

from dao import ad_user_dao, ad_account_dao
from service.system import system_service

env = setting.RUN_ENV

default_rel_type = 'codata'


async def register(user_id, address, message, signature, sol_address):
    logger.info('register user_id = {},address = {}, message = {}, signature = {}, sol_address = {}'
                , user_id, address, message, signature, sol_address)
    user_detail = await get_user_detail_by_address(address=address)
    if user_detail is None:
        return {'flag': 0, 'message': 'user not found'}
    if user_detail['register_flag'] == 0:
        return {'flag': 0, 'message': 'user exist'}
    result = None
    try:
        flag = await sign_utils.eth_sign(address=address, message=message, signature=signature)
        #flag = await sign_utils.sol_sign(address=sol_address, message=message, signature=signature)
        if flag:
            data = {
                'rel_id': user_id,
                'rel_type': default_rel_type,
                'status': 1,
                'create_time': datetime.now(timezone.utc),
                'address': address,
                'sol_address': sol_address,
                'remarks': None,
            }
        await ad_user_dao.save_account(data=data)
        result = {
            'flag': 1, 'message': 'user register success'
        }
    except Exception as e:
        logger.error('wallet_check_sign error {}', e)
        result = {
            'flag': 0, 'message': 'user register fail'
        }
    return result


async def get_user_detail_by_address(address):
    result = None
    if address is None:
        return result

    sol_address = None
    register_flag = 1
    user_id = None
    # 查询sol地址
    user = await ad_user_dao.get_account_by_address(address)
    if user is not None and user['status'] == 1:
        sol_address = user['sol_address']
        #user_id = user['rel_id']
        register_flag = 0
    else:
        register_flag = 1

    # 查询用户是否有资格注册
    ''''''
    ad_white_address_flag = await system_service.get_config_data_type_value_by_key('ad_white_address')
    if ad_white_address_flag is not None and ad_white_address_flag == 1:
        if register_flag == 1:
            datas = await ad_user_dao.get_white_by_address(address=address)
            if len(datas) > 0:
                register_flag = 1
            else:
                register_flag = 0

    result = {
        'sol_address': sol_address,
        'register_flag': register_flag

    }
    return result


async def get_user_detail(user_id, rel_type=default_rel_type):
    result = None
    if user_id is None:
        return result

    sol_address = None
    register_flag = 0

    # 查询sol地址
    user = await ad_user_dao.get_account_by_rel(user_id, rel_type=rel_type)
    if user is not None and user['status'] == 1:
        sol_address = user['sol_address']

    # 查询用户是否有资格注册
    datas = await ad_user_dao.get_account_register_by(user_id=user_id)
    if len(datas) > 0:
        register_flag = 1

    result = {
        'sol_address': sol_address,
        'register_flag': register_flag,
        'user_id': user_id,
    }
    return result


score_type_map = {
    "contribution_codatta": 10000,
    "contribution_robotic": 10000,
    "p1": 10000,
    "p2": 10000,
    "p2": 10000
}


async def get_user_score(user_id):
    result = None
    user = await ad_user_dao.get_account_by_rel(user_id, rel_type=default_rel_type)
    if user is not None and user['status'] == 1:
        score_datas = await ad_user_dao.get_account_score_by_user_id(user_id)
        total_score = 0
        if len(score_datas) > 0:
            ad_score_str = await system_service.get_config_value_by_key('ad_score')
            score_type_map_data = {}
            if ad_score_str is not None:
                try:
                    score_type_map_data = json.loads(ad_score_str)
                except Exception as e:
                    logger.error('ad_score error {}', e)
            if score_type_map_data is None:
                score_type_map_data = score_type_map
            for score_data in score_datas:
                score_type = score_data['type']
                value = float(score_data['value'])
                score = score_type_map_data.get(score_type, 0)
                total_score += int(score*value)
        result = {
            'score': total_score,
            'user_id': user['rel_id'],
        }

    return result


async def check_app_expire(device_id, secret_key):

    status = 0
    info = ''
    app_account = await ad_user_dao.get_app_account(secret_key)
    if app_account is not None:
        if app_account['status'] == 1 and device_id is not None:
            db_device_id = app_account.get('device_id', None)
            if db_device_id is None or db_device_id == '':
                status = 1
                app_account['device_id'] = device_id
                await ad_user_dao.update_app_account(app_account)
            elif device_id == db_device_id:
                status = 1
        if status == 0:
            info = 'The key has expired. Thank you for your interest in the R6D9 project. We will release the public version soon'
    else:
        status = 0
        info = 'Please check the registered email and enter the correct access key'

    result = {
        'status': status,
        'info': info
    }
    logger.info('check_app_expire device_id = {}, secret_key = {}, status = {}', device_id, secret_key, status)
    return result


async def get_account_wallet(account_id):
    result = None
    if account_id is None:
        return result

    datas = await ad_account_dao.get_account_address_list(account_id=account_id)

    wallets = []
    for data in datas:
        wallet_data = {
            'address': data['address'],
            'id': data['id'],
            'type': data['type'],
        }
        wallets.append(wallet_data)

    result = {
        "account_id": account_id,
        "wallets": wallets
    }
    return result


async def get_account_by_account_id_from_cache(token):
    account = None
    if token is None:
        return account
    key = f'{token}'
    if env == 'dev':
        account = await get_account_by_token(key)
    else:
        redis_key = f'ad_account_id:{key}'
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

    account = await ad_account_dao.get_account_by_token(token)
    if account is not None and account['status'] == 1:
        result = account
    return result


async def get_account_by_address(address=None):
    account = None
    if address is None:
        return account
    account_address = await ad_account_dao.get_account_address_by_address(address=address)
    if account_address is not None and account_address['status'] == 1:
        account_id = account_address['account_id']
        account = await ad_account_dao.get_account_by_id(account_id)
    if account is None:
        account = await ad_account_dao.get_account_by_address(address)
    return account


async def login(address_type, address, message, signature):
    logger.info('login address_type = {},address = {}, message = {}, signature = {}'
                , address_type, address, message, signature)
    opt_type = "register"
    account = await get_account_by_address(address=address)
    account_id = None
    if account is not None:
        account_id = account['id']
        if account['status'] == 0:
            return {'flag': 0, 'message': 'Account has been deactivated'}
        opt_type = "login"
    result = None
    try:
        flag = False
        if 'eth' == address_type:
            flag = await sign_utils.eth_sign(address=address, message=message, signature=signature)
        elif 'sol' == address_type:
            flag = await sign_utils.sol_sign(address=address, message=message, signature=signature)
        else:
            return {'flag': 0, 'message': 'This type of address login is not supported'}

        if flag is True:
            token = str(uuid.uuid4())[:20].replace('-', '')
            if account is None:
                # add user
                account_code = token
                insert_account = {
                    'user_id': address,
                    'account_code': account_code,
                    'source_type': "address",
                    'status': 1,
                    'create_time': datetime.now(timezone.utc)
                }
                await ad_account_dao.add_account(insert_account)
                account = await ad_account_dao.get_account_by_address(address=address)
                account_id = account['id']
                remarks = None
                account_address = {
                    'account_id': account_id,
                    'address': address,
                    'type': address_type,
                    'status': 1,
                    'remarks': remarks,
                    'create_time': datetime.now(timezone.utc)
                }
                await ad_account_dao.save_account_address(account_address)
            else:
                # update user
                account_code = account['account_code']
                if account_code is None or account_code == '':
                    account_code = token
                    update_account = {'id': account_id, 'account_code': account_code}
                    await ad_account_dao.update_account(data=update_account)
                else:
                    token = account_code
            result = {
                'flag': 1, 'message': 'user register success', 'token': token
                , 'type': opt_type
            }
        else:
            return {'flag': 0, 'message': 'Login verification failed'}
    except Exception as e:
        logger.error('wallet_check_sign error {}', e)
        result = {
            'flag': 0, 'message': 'Login verification failed'
        }
    return result


async def bind(account_id, address_type, address, message, signature):
    logger.info('bind_address  account_id = {}, type = {},address = {}, message = {}, signature = {}'
                , account_id, type, address, message, signature)
    result = None
    if account_id is None:
        return result
    account_address = await ad_account_dao.get_account_address_by_address(address=address)
    if account_address is not None:
        return {'flag': 0, 'message': 'The address is already bound'}
    flag = False
    try:
        if 'eth' == address_type:
            flag = await sign_utils.eth_sign(address=address, message=message, signature=signature)
        elif 'sol' == address_type:
            flag = await sign_utils.sol_sign(address=address, message=message, signature=signature)
        else:
            return {'flag': 0, 'message': 'This type of address login is not supported'}
    except Exception as e:
        logger.error('wallet_check_sign error {}', e)
        flag = False

    if flag is True:
        remarks = None
        account_address = {
            'account_id': account_id,
            'address': address,
            'type': address_type,
            'status': 1,
            'remarks': remarks,
            'create_time': datetime.now(timezone.utc)
        }
        await ad_account_dao.save_account_address(account_address)
        result = {
            'flag': 1, 'message': 'Bind success'
        }
    else:
        result = {
            'flag': 0, 'message': 'Bind verification failed'
        }
    return result



