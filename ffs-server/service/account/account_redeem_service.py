import requests
import os
import json
import asyncio
from log import logger
from datetime import datetime, timedelta, timezone
from utils.exceptions import BusinessException
from utils import requests_utils, date_utils
import uuid
import setting
from dao import account_dao, checkin_dao, twitter_dao, account_reward_dao, account_redeem_dao
from service.bot.twitter import user_service, post_service
from service.account import account_service
from models.param_info import ffs_account, ExchangeParam, RewardParam, RedeemParam

reward_type_map = {
    'food_post': 'Food Analysis',
    'annotation': 'Food Annotation',
    'checkin': 'Daily Check in',
}


async def save_score_exchange(body: ExchangeParam):
    result = None
    exchange_id = body.exchange_id
    user_id = body.user_id
    score = body.score
    token = body.token
    uid = body.hash
    input_claim_status = body.claim_status
    account = await account_service.get_user_info(user_id)
    if account is None:
        logger.warn('Account not found user_id = {}', user_id)
        raise BusinessException(code=500, msg='Account not found')
    account_id = account['id']
    redeem_data = {
        "uid": uid,
        "exchange_id": exchange_id,
        "user_id": user_id,
        "account_id": account_id,
        "start_time": datetime.now(timezone.utc),
        "score": score,
        "token": token,
        "remarks": None,
    }
    if input_claim_status is not None:
        redeem_data['status'] = input_claim_status
    # 记录兑换
    await account_redeem_dao.save_account_redeem(redeem_data)

    db_data = await account_redeem_dao.get_account_redeem(user_id, exchange_id)
    if db_data is not None:
        try:
            claimed = await check_redeem_status(db_data)
            if claimed is True:
                input_claim_status = 3
        except Exception as e:
            logger.error('check_redeem_status redeem = {}, error = {}', db_data, e)
    result = {
        "claim_status": input_claim_status,
        "exchange_record_id": 1
    }
    logger.info(' update redeem_data = {}', redeem_data)
    return result


async def find_score_page(user_id, page_no, page_size):
    page_datas = []
    total = 0
    status = 2
    status_list = [2, 3]
    reward_type = None
    if user_id is not None:
        total = await account_reward_dao.get_exchange_session_count_by_status(status_list=status_list)
    if total > 0:
        datas = await account_reward_dao.find_exchange_session_page_by_status(
            status_list=status_list, page_no=page_no, page_size=page_size)
        if len(datas) > 0:

            # 查询分值
            exchange_id_score_map = {}
            for data in datas:
                exchange_id = data['id']
                start_time = data['start_time']
                end_time = data['end_time']
                score = await account_reward_dao.get_account_reward_score_by_user_id(user_id=user_id, status=1
                                                        , start_time=start_time, end_time=end_time)
                exchange_id_score_map[exchange_id] = score

            for data in datas:
                exchange_id = data['id']
                create_time = date_utils.date_to_timestamp(data['create_time'])
                start_time = date_utils.date_to_timestamp(data['start_time'])
                end_time = date_utils.date_to_timestamp(data['end_time'])
                release_time = date_utils.date_to_timestamp(data['release_time'])
                claim_status = 2
                redeem_data = await account_redeem_dao.get_account_redeem(user_id=user_id, exchange_id=exchange_id)
                if redeem_data is None:
                    claim_status = 1
                else:
                    claim_status = redeem_data['status']
                if claim_status is None:
                    claim_status = 2
                score = exchange_id_score_map.get(exchange_id, 0)
                if score is None or score == 0:
                    claim_status = 3
                 #   continue

                result = {
                    'exchange_id': exchange_id
                    , 'name': data['name']
                    , 'start_time': start_time
                    , 'end_time': end_time
                    , 'claim_status': claim_status
                    , 'score': score
                    , 'release_time': release_time
                    }
                page_datas.append(result)
    count = total
    page_data = {
        'count': count,
        'page_no': page_no,
        'page_size': page_size,
        'list': page_datas
    }

    return page_data


async def get_account_token(account_id):
    token = 0
    if account_id is not None:
        token = await account_redeem_dao.get_account_token(account_id=account_id, status=3)
    return token


async def find_redeem_page(user_id, page_no, page_size, status=None, reward_type=None):
    page_datas = []
    total = 0
    if user_id is not None:
        total = await account_redeem_dao.get_account_redeem_count_by_user_id(user_id=user_id, status=status)
    if total > 0:
        datas = await account_redeem_dao.find_account_redeem_page_by_user_id(
            user_id=user_id, status=status, page_no=page_no, page_size=page_size, reward_type=reward_type)
        if len(datas) > 0:
            for data in datas:
                finish_time = date_utils.date_to_timestamp(data['finish_time'])
                token = data['token']
                if token is None:
                    token = 0
                score = data['score']
                if score is None:
                    score = 0
                result = {
                    'id': data['id'],
                    'status': data['status'],
                    'hash': data['uid'],
                    'redeemed_points': score,
                    'earned_tokens': token,
                    'finish_time': finish_time}
                page_datas.append(result)
    count = total
    page_data = {
        'count': count,
        'page_no': page_no,
        'page_size': page_size,
        'list': page_datas
    }

    return page_data


async def check_token_status():

    datas = await account_redeem_dao.find_account_redeem_page_by_status(status_list=[1, 2])
    logger.info('check_token_status size = {}', len(datas))
    if len(datas) == 0:
        return True
    for data in datas:
        try:
            await check_redeem_status(data)
        except Exception as e:
            logger.error('check_redeem_status param = {}, error  = {}', data, e)
    return


async def check_redeem_status(param_data):
    exchange_id = param_data['exchange_id']
    token = param_data['user_id']
    address = param_data['user_id']
    param = {'publicKey': address}
    host = setting.IFSIC_NODE_HOST
    url = f'{host}/api/web/airdrop/status'
    headers = {'Content-Type': 'application/json', 'token': token}
    claimed = None
    response = await requests_utils.post(url, json=param, headers=headers)
    logger.info(f' post {url}, param = {param}, data = {param_data}')
    if response.status_code == 200:
        response_data = response.json()
        if 'data' in response_data:
            result = response_data['data']
            if 'claimed' in result:
                claimed = result['claimed']
    logger.info('check_redeem_status address = {}, status = {}', token, claimed)

    if claimed is True:
        redeem_data = {'id': param_data['id'], 'status': 3, 'finish_time': datetime.now(timezone.utc)}
        await account_redeem_dao.update_account_redeem(redeem_data)

        exchange_session =await account_reward_dao.get_exchange_session_by_id(exchange_id)
        if exchange_session is not None:
            start_time = exchange_session['start_time']
            end_time = exchange_session['end_time']
            user_id = token
            account_rewards = await account_reward_dao.get_account_rewards_by_user_id(user_id=user_id, status=1
                                                                                 , start_time=start_time, end_time=end_time)
            if len(account_rewards) > 0:
                ids = []
                assert_flag = 1
                for account_reward in account_rewards:
                    ids.append(account_reward['id'])
                    account_reward_update = {'id': account_reward['id'], 'assert_flag': 1}
                    #await account_reward_dao.update_account_reward(account_reward_update)
                if len(ids) > 0:
                    str_lst = [str(item) for item in ids]
                    ids_str = "'"+"','".join(str_lst)+"'"
                    await account_reward_dao.update_account_reward_assert_flag_by_ids(ids_str, assert_flag)
    return claimed


if __name__ == "__main__":
    asyncio.run(check_token_status())
    print('test')


