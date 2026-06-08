import requests
import os
import json
import asyncio
from log import logger
from datetime import datetime, timedelta, timezone
import uuid
from utils import date_utils
from dao import account_dao, checkin_dao, twitter_dao
from service.bot.twitter import user_service, post_service
from service.account import account_reward_service



async def get_checkin_plan(user_id):
    plan_data = None
    if user_id is not None:
        data = await checkin_dao.get_checkin_plan(user_id)
        if data is not None:
            plan_data = {
                "id": data['id'],
                "user_id": data['user_id'],
                "checkin_type": data['checkin_type'],
                "start_time": data['start_time'],
                "end_time": data['end_time'],

            }

    return plan_data


async def get_checkin_plan_page(account_id, page_no=1, page_size=10):
    plan_data_page = None
    if account_id is not None:
        data = await checkin_dao.get_checkin_plan_by_account_id(account_id=account_id)
        plan_datas = []
        if data is not None:
            plan_data = {
                "id": data['id'],
                "checkin_type": data['checkin_type'],
                "start_time": data['start_time'],
                "end_time": data['end_time'],
            }
            plan_datas = [plan_data]
        plan_data_page = {
            'list': plan_datas,
            'page_no': page_no,
            'page_size': page_size,
            'total': 1
        }
    return plan_data_page


async def save_checkin_plan(data):

    await checkin_dao.save_checkin_plan(data)
    return data


async def record_checkin_by_eating_time(comment_uid, eating_time):

    post_comment = await twitter_dao.get_comment_by_comment_uid(comment_uid)
    if post_comment is None:
        return None
    author_id = post_comment['author_id']

    rel_user = await user_service.get_rel_user_by_twitter(author_id)
    if rel_user is None:
        return None
    account_id = rel_user['account_id']
    user_id = rel_user['user_id']
    checkin_plan = await get_checkin_plan(user_id)
    if checkin_plan is None:
        return None
    checkin_plan_id = checkin_plan['id']
    checkin_type = checkin_plan['checkin_type']
    start_time = checkin_plan['start_time']
    end_time = checkin_plan['end_time']

    flag = await check_time_in_area(eating_time, start_time, end_time)
    status = 2
    if flag is True:
        status = 1
    checkin_record = {'account_id': account_id, 'user_id': user_id, 'author_id': author_id, 'comment_uid': comment_uid,
                      'checkin_time': eating_time, 'checkin_type': checkin_type, 'status': status
                      , 'create_time': datetime.now(timezone.utc), 'checkin_plan_id': checkin_plan_id
                      }
    await checkin_dao.save_checkin_record(checkin_record)
    logger.info('记录用户打卡信息，author_id = {}, comment_uid = {}, eating_time = {},  结果 flag = {}'
                , author_id, comment_uid, eating_time, flag)
    return flag


# format 06:11, 11:10,  13:12
async def check_time_in_area(time_to_check, start_time, end_time):
    flag = None
    try:

        start_date = datetime.strptime(start_time, "%H:%M")
        end_date = datetime.strptime(end_time, "%H:%M")
        time_to_check_date = datetime.strptime(time_to_check, "%H:%M")

        start_hour = int(start_time.split(':')[0])
        end_hour = int(end_time.split(':')[0])
        if start_hour <= end_hour:
            if start_date <= time_to_check_date <= end_date:
                flag = True
            else:
                flag = False
        else:
            # 打卡跨天情况，分两段时间判断 [ 11:00 , 23:59] 和 [00:00,08:11]
            pre_date_end = datetime.strptime("23:59", "%H:%M")
            current_date_start = datetime.strptime("00:00", "%H:%M")
            if start_date <= time_to_check_date <= pre_date_end or current_date_start <= time_to_check_date <= end_date:
                flag = True
            else:
                flag = False

    except Exception as e:
        logger.error('check_time_in_area {} in [{}, {}] error {}', time_to_check, start_time, end_time,  e)
    logger.info('check_time_in_area {} in [{}, {}] = {}', time_to_check, start_time, end_time, flag)
    return flag


async def get_checkin_map_by_user_comment_uids(comment_uids):
    resultMap = {}
    uidMap = await checkin_dao.get_checkin_map_by_user_comment_uids(comment_uids)
    if uidMap is not None:
        for uid in uidMap:
            data = uidMap[uid]
            data_status = 0
            checkin_time = None
            if data is not None:
                data_status = data['status']
                checkin_time = data['checkin_time']
            result = {
                'checkin_time': checkin_time,
                'status': data_status
            }
            resultMap[uid] = result

    return resultMap


async def get_checkin_data(user_id, start_time, end_time):
    result = []
    datas = await checkin_dao.get_checkin_data(user_id, start_time, end_time)
    if datas is not None and len(datas) > 0:
        for data in datas:
            try:

                date = data['create_time'].strftime("%Y-%m-%d")
                checkin_time = data['checkin_time']
                item = {
                    'date': f'{date} ',
                    'checkin_time': checkin_time,
                    'status': 'completed',
                    'comment_uid': data['comment_uid'],
                    'create_time':  date_utils.date_to_timestamp(data['create_time']),
                }
                result.append(item)
            except Exception as e:
                logger.error('get_checkin_data {} in [{}, {}] error {}', data, start_time, end_time, e)

    return result


async def get_checkin_record_page(account_id, checkin_plan_id, start_time, end_time, page_no=1, page_size=10):
    page_data = None
    if account_id is not None:
        records = []
        count = await checkin_dao.get_checkin_record_count(account_id=account_id, checkin_plan_id=checkin_plan_id,
                                                           start_time=start_time, end_time=end_time)
        if count > 0:
            records = await checkin_dao.get_checkin_records(account_id=account_id, checkin_plan_id=checkin_plan_id,
                                                            start_time=start_time, end_time=end_time,
                                                            page_no=page_no, page_size=page_size)
        record_datas = []
        if len(records) > 0:
            for record in records:
                create_time = record['create_time']
                checkin_time = record['checkin_time']
                datetime.now().now()
                opt_time_str = create_time.strftime("%Y-%m-%d")+' '+checkin_time+':00'
                datetime_obj = datetime.strptime(opt_time_str, '%Y-%m-%d %H:%M:%S')
                checkin_time_opt = datetime_obj.isoformat(timespec='seconds') + ".000Z"
                record_data = {
                    'record_id': record['id'],
                    'plan_id': record['checkin_plan_id'],
                    'comment_uid': record['comment_uid'],
                    'checkin_time': checkin_time_opt
                }
                record_datas.append(record_data)

        page_data = {
            'list': record_datas,
            'page_no': page_no,
            'page_size': page_size,
            'total': count
        }
    return page_data


async def get_checkin_data_page(account_id, checkin_plan_id, start_time, end_time, page_no=1, page_size=10):
    page_data = None

    records = []

    count = await checkin_dao.get_checkin_record_count(account_id=account_id, checkin_plan_id=checkin_plan_id,
                                                       start_time=start_time, end_time=end_time)
    if count > 0:
        records = await checkin_dao.get_checkin_records(account_id=account_id, checkin_plan_id=checkin_plan_id,
                                                        start_time=start_time, end_time=end_time,
                                                        page_no=page_no, page_size=page_size)
    record_datas = []
    if len(records) > 0:
        comment_uids = []
        for record in records:
            comment_uid = record['comment_uid']
            if comment_uid not in comment_uids:
                comment_uids.append(comment_uid)
        comment_uid_post_map = await post_service.get_uid_post_data_detail_map(comment_uids)
        for record in records:
            create_time = record['create_time']
            checkin_time = record['checkin_time']
            datetime.now().now()
            opt_time_str = create_time.strftime("%Y-%m-%d")+' '+checkin_time+':00'
            datetime_obj = datetime.strptime(opt_time_str, '%Y-%m-%d %H:%M:%S')
            checkin_time_opt = datetime_obj.isoformat(timespec='seconds') + ".000Z"
            comment_uid = record['comment_uid']
            post_data = comment_uid_post_map.get(comment_uid, None)
            if post_data is not None:
                post_data.__delitem__('food_post_score')

                post_create_time_timestamp = post_data.get('create_time', None)
                if post_create_time_timestamp is not None:
                    post_create_time = datetime.fromtimestamp(post_create_time_timestamp)
                    post_create_time_str = post_create_time.isoformat(timespec='seconds') + ".000Z"
                    post_data['create_time'] = post_create_time_str
            record_data = {
                'account_id': record['account_id'],
                'record_id': record['id'],
                'plan_id': record['checkin_plan_id'],
                'comment_uid': comment_uid,
                'checkin_time': checkin_time_opt,
                'post': post_data
            }
            record_datas.append(record_data)

    page_data = {
        'list': record_datas,
        'page_no': page_no,
        'page_size': page_size,
        'total': count
    }
    return page_data


async def checkin_reward_task():
    # 查询当前周期满足条的打开用户
    checkin_cycle = await checkin_dao.get_current_checkin_cycle()
    if checkin_cycle is None:
        logger.info('checkin_reward_task: checkin_cycle is null')
        return

    reward_type = 'checkin'
    rel_uid = checkin_cycle['id']
    start_time = checkin_cycle['start_time']
    end_time = checkin_cycle['end_time']
    checkin_days = checkin_cycle['checkin_days']
    reward_score = checkin_cycle['reward_score']
    user_checkin_days = await checkin_dao.get_user_checkin_days(start_time, end_time, checkin_days)
    logger.info('checkin_reward_task : user_checkin_days.size = {}', len(user_checkin_days))
    if len(user_checkin_days) == 0:
        return

    account_ids = []
    for user_checkin_day in user_checkin_days:
        account_id = user_checkin_day['account_id']
        if account_id is not None and account_id not in account_ids:
            account_ids.append(account_id)

    account_id_reward_map = await account_reward_service.get_user_reward_map_by_account_ids(account_ids=account_ids
                                                                            , reward_type=reward_type, rel_uid=rel_uid)
    insert_datas = []
    for user_checkin_day in user_checkin_days:
        account_id = user_checkin_day['account_id']
        user_id = user_checkin_day['user_id']
        if account_id is None:
            continue
        user_reward = account_id_reward_map.get(account_id, None)
        if user_reward is not None:
            continue
        user_rel_id = None
        score = reward_score
        reward_time = datetime.now(timezone.utc)
        user_reward = {
            'account_id': account_id,
            'user_id': user_id,
            'user_rel_id': user_rel_id,
            'reward_type': reward_type,
            'rel_uid': rel_uid,
            'score': score,
            'reward_time': reward_time,
            'status': 1,
            'uid': None,
            'create_time': datetime.now(timezone.utc)
        }
        insert_datas.append(user_reward)
    logger.info('checkin_reward batch_add size = {}', len(insert_datas))
    await account_reward_service.batch_add(insert_datas)
    return


if __name__ == "__main__":
    #asyncio.run(check_time_in_area(time_to_check="09:11", start_time="18:00", end_time="08:00"))
    asyncio.run(checkin_reward_task())
