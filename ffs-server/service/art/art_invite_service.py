
from log import logger
from dao.art import art_avatar_dao, art_invite_dao, art_account_dao
from service.account import art_account_service
from service.art import art_reward_service, art_avatar_service
import asyncio
from starlette.requests import Request
import json
from datetime import datetime, timezone
from utils import file_oss, date_utils
import setting
import uuid
import hashlib
img_domain = setting.OSS_IMAGE_DATA_DOMAIN


def generate_invite_code(user_id):
    md5_hash = hashlib.md5(str(user_id).encode()).hexdigest()
    return md5_hash[:8]  # 取前8位


async def get_info(account_id):
    result = None
    if account_id is None:
        return result

    account = await art_account_service.get_account_by_id(account_id)
    if account is None:
        return result
    invite_code = account.get('invite_code', None)
    if invite_code is None or invite_code == '':
        invite_code = generate_invite_code(account_id)
        await art_account_dao.update_account({'id': account_id, 'invite_code': invite_code})

    # 邀请好友数量
    invite_num = await art_invite_dao.get_record_count(account_id=account_id, status_list=[1, 2])
    # 基础折扣,计算规则
    '''
        - 1-5 名好友：10% 基础折扣
        - 6-10 名好友：15% 基础折扣
        - 11-15 名好友：20% 基础折扣
        - 16-20 名好友：25% 基础折扣
        - 21 名及以上好友：30% 基础折扣
    '''
    basic_discount = 0
    if 0< invite_num and invite_num <= 5:
        basic_discount = 0.1
    elif 5 < invite_num and invite_num <= 10:
        basic_discount = 0.15
    elif 10 < invite_num and invite_num <= 15:
        basic_discount = 0.2
    elif 15 < invite_num and invite_num <= 20:
        basic_discount = 0.25
    elif 20 < invite_num:
        basic_discount = 0.3
    # 折扣券
    discount_coupons_list = []
    records = await art_reward_service.find_records(account_id=account_id, status=1)
    if records is not None and len(records) > 0:
        for record in records:
            discount_coupons = {
                'id': record['id'],
                'type': record['type'],
                'score': record['score'],
            }
            discount_coupons_list.append(discount_coupons)

    # 消费gas
    bnb_saved = await art_avatar_service.get_total_fees(account_id)

    result = {
        "invite_code": invite_code,
        "invite_num": invite_num,
        "basic_discount": basic_discount,
        "discount_coupons":  discount_coupons_list,
        "bnb_saved": bnb_saved,
        }
    return result


async def gen_invite_record_page(account_id, page_no, page_size, status=None):
    if page_size is None:
        page_size = 10
    if page_no is None:
        page_no = 1

    list_datas = []
    total = 0
    if account_id is not None:
        total = await art_invite_dao.get_record_count(account_id=account_id, status=status)
    if total > 0:
        datas = await art_invite_dao.find_record_page(
            account_id=account_id, page_no=page_no, page_size=page_size, status_list=[1, 2])
        if len(datas) > 0:
            for data in datas:
                create_time = date_utils.date_to_utc_str(data['create_time'])
                record = {
                    "record_id": data['id'],
                    "address": data['address'],
                    "invite_time": create_time,
                    "status": data['status'],
                }
                list_datas.append(record)

    page_data = {
        'count': total,
        'pageNo': page_no,
        'pageSize': page_size,
        'list': list_datas
    }
    return page_data


async def record_invite(invite_code, new_account):
    logger.info('record_invite start invite_code = {}, new_account = {}', invite_code, new_account)
    result = None
    if invite_code is None or invite_code == '':
        return result
    account = await art_account_dao.get_account_by_invite_code(invite_code)
    if account is None:
        return result
    account_id = account.get('id')
    new_account_id = new_account.get('id')
    db_record = await art_invite_dao.get_data_by_new_account_id(new_account_id)
    if db_record is None:
        record_data = {
            'code': invite_code,
            'account_id': account_id,
            'new_account_id': new_account_id,
            'address': new_account.get('user_id', None),
            'status': 1,
            'create_time': datetime.now(timezone.utc),
            'deleted': 0
        }
        id = await art_invite_dao.add_invite_record(record_data)
        result = id
        # 发放邀请人奖励5%
        #reward_type = 'invite_user'
        #uid = f'{reward_type}_{new_account_id}'
        #await art_reward_service.record_reward(uid=uid, account_id=account_id, reward_type=reward_type, score=0.05)

        # 新用户奖励10%
        reward_type2 = 'register'
        uid2 = f'{reward_type2}_{new_account_id}'
        await art_reward_service.record_reward(uid=uid2, account_id=new_account_id, reward_type=reward_type2, score=0.1)
    logger.info('record_invite end invite_code = {}, result = {}', invite_code, result)
    return result


async def update_invite_status(data_id, status=None):
    await art_invite_dao.update_invite_record({'id': data_id, 'status': status})


async def get_invite_data(new_account_id):
    result = None
    if new_account_id is None:
        return result
    db_data = await art_invite_dao.get_data_by_new_account_id(new_account_id=new_account_id)
    return db_data


async def get_invite_account_id(new_account_id):
    result = None
    if new_account_id is None:
        return result
    db_data = await art_invite_dao.get_data_by_new_account_id(new_account_id=new_account_id)
    if db_data is None:
        return result
    result = db_data.get('account_id', None)
    return result
