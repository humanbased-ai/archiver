import json
from log import logger
from datetime import datetime, timezone
import uuid
from utils.sign import sign_utils
from utils import redisUtils
from dao.art import art_account_dao
from service.art import art_invite_service

import setting

env = setting.RUN_ENV

redis_prefix = 'art_'


async def get_account_by_id(account_id):
    result = None
    if account_id is None:
        return result
    result = await art_account_dao.get_account_by_id(account_id)
    return result


async def get_account_by_invite_code(invite_code):
    result = None
    if invite_code is None:
        return result
    result = await art_account_dao.get_account_by_invite_code(invite_code)
    return result


async def get_account_wallet(account_id):
    result = None
    if account_id is None:
        return result

    datas = await art_account_dao.get_account_address_list(account_id=account_id)

    wallets = []
    for data in datas:
        wallet_data = {
            'address': data['address'],
            'id': data['id'],
            'type': data['type'],
        }
        wallets.append(wallet_data)

    result = {
        "account_id": 1,
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

    account = await art_account_dao.get_account_by_token(token)
    if account is not None and account['status'] == 1:
        result = account
    return result


async def get_account_by_address(address=None):
    account = None
    if address is None:
        return account
    account_address = await art_account_dao.get_account_address_by_address(address=address)
    if account_address is not None and account_address['status'] == 1:
        account_id = account_address['account_id']
        account = await art_account_dao.get_account_by_id(account_id)
    if account is None:
        account = await art_account_dao.get_account_by_address(address)
    return account


async def login(address_type, address, message, signature, invite_code):
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
        elif 'bnb' == address_type:
            flag = await sign_utils.bnb_sign(address=address, message=message, signature=signature)
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
                await art_account_dao.add_account(insert_account)
                account = await art_account_dao.get_account_by_address(address=address)
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
                await art_account_dao.save_account_address(account_address)

                # 记录邀请信息
                try:
                    await art_invite_service.record_invite(invite_code, account)
                except Exception as e:
                    logger.error("record invite {} , account = {}, error = {}", invite_code, account, e)

            else:
                # update user
                account_code = account['account_code']
                if account_code is None or account_code == '':
                    account_code = token
                    update_account = {'id': account_id, 'account_code': account_code}
                    await art_account_dao.update_account(data=update_account)
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
    account_address = await art_account_dao.get_account_address_by_address(address=address)
    if account_address is not None:
        return {'flag': 0, 'message': 'The address is already bound'}
    flag = False
    try:
        if 'eth' == address_type:
            flag = await sign_utils.eth_sign(address=address, message=message, signature=signature)
        elif 'bnb' == address_type:
            flag = await sign_utils.bnb_sign(address=address, message=message, signature=signature)
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
        await art_account_dao.save_account_address(account_address)
        result = {
            'flag': 1, 'message': 'Bind success'
        }
    else:
        result = {
            'flag': 0, 'message': 'Bind verification failed'
        }
    return result



