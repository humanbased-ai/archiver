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
from dao import account_dao, checkin_dao, twitter_dao, account_reward_dao
from service.bot.twitter import user_service, post_service


reward_type_map = {
    'food_post': 'Food Analysis',
    'annotation': 'Food Annotation',
    'checkin': 'Daily Check in',
}


async def get_account_score(user_id):
    total_score = 0
    if user_id is not None:
        total_score = await account_reward_dao.get_account_reward_score_by_user_id(user_id=user_id,
                                                                            status=1, assert_flag=0)
    return total_score


async def check_user_post_task():
    end_time = datetime.now(timezone.utc)
    yesterday = end_time - timedelta(days=1)
    # TODO


async def record_push_post_score(comment_uid):
    score = 0
    post_comment = await post_service.get_post_comment_by_comment_uid(comment_uid)
    if post_comment is not None:
        author_id = post_comment['author_id']
        rel_user = await user_service.get_rel_user_by_twitter(author_id)
        if rel_user is None:
            logger.info('record_push_post_score fail comment_uid = {}, author_id = {}, rel_user = {}', comment_uid, author_id, rel_user)
            return score
        user_id = rel_user['user_id']
        account_id = rel_user['account_id']
        score = await post_service.get_score_by_user_comment_id(comment_uid)
        if score is not None and score > 0:
            reward_type = 'food_post'
            await record_account_reward(
                account_id=account_id,
                user_id=user_id,
                reward_type=reward_type,
                rel_uid=comment_uid,
                score=score,
                user_rel_id=author_id,
                reward_time=datetime.now(timezone.utc),
                status=1
            )
    return score


async def record_annotation_score(annotation_record_id):
    score = 0
    db_annotation_record = await twitter_dao.get_annotation_data_by_id(annotation_record_id)
    if db_annotation_record is not None:
        account_id = db_annotation_record['account_id']
        user_id = db_annotation_record['account_user_id']
        comment_uid = db_annotation_record['comment_uid']
        author_id = None
        score = db_annotation_record['score']

        if score is not None and score > 0:
            reward_type = 'annotation'
            await record_account_reward(
                account_id=account_id,
                user_id=user_id,
                reward_type=reward_type,
                rel_uid=comment_uid,
                score=score,
                user_rel_id=author_id,
                reward_time=datetime.now(timezone.utc),
                status=1
            )
    return score


async def record_checkin():
    # TODO 定时检查


    return None


async def record_account_reward(account_id, user_id, reward_type, rel_uid, score, user_rel_id, reward_time, status):

    uid = None
    if reward_time is None:
        reward_time = datetime.now(timezone.utc)
    if score is None:
        #raise Exception("score is null")
        logger.warning('record_account_reward score is null user_id = {}, reward_type = {}, rel_uid = {}'
                       , user_id, reward_type, rel_uid)
        return None
    data = {
        'account_id': account_id,
        'user_id': user_id,
        'user_rel_id': user_rel_id,
        'reward_type': reward_type,
        'rel_uid': rel_uid,
        'score': score,
        'reward_time': reward_time,
        'status': status,
        'uid': uid
    }

    await account_reward_dao.save_account_reward(data)

    return data


async def send_add_assert(uid):
    result = None
    assert_flag = 0
    account_reward = await account_reward_dao.get_account_reward_by_uid(uid=uid)
    id = None
    if account_reward is not None:
        score = account_reward['score']
        id = account_reward['id']
        assert_flag = account_reward['assert_flag']
        if assert_flag == 1:
            logger.info('account_reward uid={} has set assert_flag = 1', uid)
            return None
        # TODO
        param = {'score': score}
        host = setting.IFSIC_ASSERT_HOST
        url = f'{host}/api/'
        headers = {'Content-Type': 'application/json'}

        response = await requests_utils.post(url, json=param, headers=headers)
        if response.status_code == 200:
            data = response.json()
            logger.info(f' post {url}, param = {param}, data = {data}')
            if data is not None and 'errorCode' in data and data['errorCode'] != 0:
                result = None
                if data['errorMessage'] == 'data has been submitted':
                    result = data['errorMessage']
            else:
                result = 'success'
                assert_flag = 1
    if assert_flag is not None and assert_flag == 1:
        reward_update = {'assert_flag': assert_flag, 'id': id}
        await account_reward_dao.update_account_reward(reward_update)
    logger.info('send_add_assert uid = {}, flag = {}', uid, assert_flag)
    return result


async def send_reduce_assert(uid):
    result = None
    assert_flag = None
    account_reward = await account_reward_dao.get_account_reward_by_uid(uid=uid)
    id = None
    if account_reward is not None:
        score = account_reward['score']
        id = account_reward['id']
        assert_flag = account_reward['assert_flag']
        if assert_flag == 0:
            logger.info('account_reward uid={} has set assert_flag = 1', uid)
            return None
        # TODO
        param = {'score': score}
        host = setting.IFSIC_ASSERT_HOST
        url = f'{host}/api/'
        headers = {'Content-Type': 'application/json'}
        response = await requests_utils.post(url, json=param, headers=headers)
        if response.status_code == 200:
            data = response.json()
            logger.info(f' post {url}, param = {param}, data = {data}')
            if data is not None and 'errorCode' in data and data['errorCode'] != 0:
                result = None
                if data['errorMessage'] == 'data has been submitted':
                    result = data['errorMessage']
            else:
                result = 'success'
                assert_flag = 0
    if assert_flag is not None and assert_flag == 0:
        reward_update = {'assert_flag': assert_flag, 'id': id}
        await account_reward_dao.update_account_reward(reward_update)
    logger.info('send_reduce_assert uid = {}, flag = {}', uid, assert_flag)
    return result


async def get_assert_data(uid):

    # TODO
    param = {'score': 0}
    host = setting.IFSIC_ASSERT_HOST
    url = f'{host}/api/'
    headers = {'Content-Type': 'application/json'}
    response = await requests_utils.post(url, json=param, headers=headers)
    if response.status_code == 200:
        data = response.json()
        logger.info(f' post {url}, param = {param}, data = {data}')
        if data is not None and 'errorCode' in data and data['errorCode'] != 0:
            result = None
            if data['errorMessage'] == 'data has been submitted':
                result = data['errorMessage']
        else:
            result = 'success'

    return


async def find_reward_page(user_id, page_no, page_size, status=1, reward_type=None):
    page_datas = []
    total = 0
    if user_id is not None:
        total = await account_reward_dao.get_account_reward_count_by_user_id(user_id=user_id, status=status)
    if total > 0:
        datas = await account_reward_dao.find_account_reward_page_by_user_id(
            user_id=user_id, status=status, page_no=page_no, page_size=page_size, reward_type=reward_type)
        if len(datas) > 0:
            for data in datas:
                create_time = date_utils.date_to_timestamp(data['create_time'])
                reward_type_name = ''
                reward_type = data['reward_type']
                if reward_type is not None and reward_type in reward_type_map:
                    reward_type_name = reward_type_map[reward_type]
                result = {
                    'id': data['id']
                    , 'reward_type_name': reward_type_name
                    , 'score': data['score']
                    , 'create_time': create_time}
                page_datas.append(result)
    count = total
    page_data = {
        'count': count,
        'page_no': page_no,
        'page_size': page_size,
        'list': page_datas
    }

    return page_data


async def get_user_reward_map_by_account_ids(account_ids, reward_type, rel_uid):
    account_id_map = {}
    user_rewards = await account_reward_dao.get_account_rewards_by_user(account_ids=account_ids
                                                                          , reward_type=reward_type, rel_uid=rel_uid)
    if len(user_rewards) > 0:
        for user_reward in user_rewards:
            account_id = user_reward['account_id']
            account_id_map[account_id] = user_reward
    return account_id_map


async def batch_add(insert_datas):
    await account_reward_dao.add_account_rewards(insert_datas)
    return


if __name__ == "__main__":

    print('test')
