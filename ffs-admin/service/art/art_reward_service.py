
from log import logger
from dao.art import art_avatar_dao, art_invite_dao, art_account_dao, art_reward_dao
from service.account import art_account_service
import asyncio
from starlette.requests import Request
import json
from datetime import datetime, timezone
from utils import file_oss, date_utils
import setting
import uuid
import hashlib
img_domain = setting.OSS_IMAGE_DATA_DOMAIN


async def record_reward(uid, account_id,  reward_type,  score):
    record = {
        'uid': uid,
        'account_id': account_id,
        'type': reward_type,
        'score': score,
        'status': 1,
        'create_time': datetime.now(timezone.utc),
    }
    logger.info('record_reward start uid = {}, record = {}', uid, record)
    result = None
    if account_id is None or uid is None or uid == '':
        return result

    db_record = await art_reward_dao.get_data_by_uid(uid)
    if db_record is not None:
        logger.info('reward has exist uid = {}', uid)
        return result

    id = await art_reward_dao.add_award_record(record)
    logger.info('record_reward success uid = {}, record_id = {}', uid, id)
    return id


async def discount_use(discount_ids, account_id=None):
    if discount_ids is None or len(discount_ids) == 0:
        return None

    for discount_id in discount_ids:
        if discount_id is None or discount_id == '':
            continue
        data = {'id': discount_id, 'status': 2, 'use_time': datetime.now(timezone.utc)}
        await art_reward_dao.update_award_record(data)
    logger.info('use  award_record discount_ids = {} ', discount_ids)


async def find_records(account_id, status=1):
    result = []
    if account_id is None or account_id == '':
        return result
    result = await art_reward_dao.find_records(account_id=account_id, status=status)

    return result



