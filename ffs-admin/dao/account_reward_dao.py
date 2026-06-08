import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from log import logger

db = DBM(setting.dbUrl)


async def get_account_score(user_id, status=1, reward_types=None):
    data = 0
    sql = f'select sum(score) as num from bot_account_reward where deleted=0 '
    sql += f' and user_id = "{user_id}" '
    if reward_types is not None and len(reward_types) > 0:
        uids = reward_types
        str_lst = [str(item) for item in uids]
        uid_list_str = "'"+"','".join(str_lst)+"'"
        sql += f' and reward_type  in ({uid_list_str}) '

    if status is not None and status != '':
        sql += f' and status="{status}" '

    sql += f'  '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]['num']
    return data


async def get_account_reward(user_id, reward_type, rel_uid, status=None):
    data = None
    sql = f'select * from bot_account_reward where deleted=0 '
    sql += f' and user_id = "{user_id}" '
    sql += f' and reward_type ="{reward_type}" '
    sql += f' and rel_uid ="{rel_uid}" '
    if status is not None and status != '':
        sql += f' and status="{status}" '

    sql += f' order by id desc limit 0,1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_reward_by_uid(uid, status=1):
    data = None
    sql = f'select * from bot_account_reward where deleted=0 '
    sql += f' and uid = "{uid}" '
    if status is not None and status != '':
        sql += f' and status="{status}" '

    sql += f' order by id desc limit 0,1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def save_account_reward(data):
    user_id = data['user_id']
    reward_type = data['reward_type']
    rel_uid = data['rel_uid']
    db_data = await get_account_reward(user_id, reward_type, rel_uid)
    if db_data is None:
        id = await add_account_reward(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        data['create_time'] = db_data['create_time']
        await update_account_reward(data)
    return data


async def add_account_reward(data):
    if data is None:
        return
    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now(timezone.utc)

    id = db.insert(data, "bot_account_reward", replace=True)
    return id


async def add_account_rewards(datas):
    logger.info('add_account_rewards size = {}', len(datas))
    if len(datas) == 0:
        return
    for data in datas:
        if data is None:
            continue
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)

    db.inserts(datas, "bot_account_reward", replace=True)
    return


async def update_account_reward(data):
    db.update(data, "bot_account_reward")


async def update_account_reward_assert_flag_by_ids(ids: str, assert_flag: int):
    logger.info('update_account_reward_assert_flag_by_ids ids = {}, assert_flag = {}', ids, assert_flag)
    sql = f'update bot_account_reward SET `assert_flag` = {assert_flag} WHERE id in({ids}) '
    db.execute_sql(sql)


async def get_account_reward_score_by_user_id(user_id, status=None, start_time=None, end_time=None, assert_flag=None):
    num = 0
    sql = f'select sum(score) as num from bot_account_reward where  deleted=0 and user_id = "{user_id}"'
    if status is not None:
        sql += f' and status="{status}"'
    if start_time is not None:
        sql += f' and reward_time >= "{start_time}"'
    if end_time is not None:
        sql += f' and reward_time <= "{end_time}"'
    if assert_flag is not None:
        if assert_flag == 0:
            sql += f' and (assert_flag is null or assert_flag = 0)'
        else:
            sql += f' and assert_flag = "{assert_flag}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def get_account_rewards_by_user(user_ids=None, account_ids=None, status=None, start_time=None, end_time=None, reward_type=None, rel_uid=None):
    sql = f'select * from bot_account_reward where  deleted=0'
    if user_ids is not None and len(user_ids) > 0:
        str_lst = [str(item) for item in user_ids]
        uid_list_str = "'"+"','".join(str_lst)+"'"
        sql += f' and user_id in ({uid_list_str})'
    if account_ids is not None and len(account_ids) > 0:
        str_lst1 = [str(item) for item in account_ids]
        uid_list_str1 = "'"+"','".join(str_lst1)+"'"
        sql += f' and account_id in ({uid_list_str1})'
    if status is not None:
        sql += f' and status="{status}"'
    if start_time is not None:
        sql += f' and reward_time >= "{start_time}"'
    if end_time is not None:
        sql += f' and reward_time <= "{end_time}"'
    if reward_type is not None:
        sql += f' and reward_type = "{reward_type}" '
    if rel_uid is not None:
        sql += f' and rel_uid = "{rel_uid}" '
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_account_rewards_by_user_id(user_id, status=None, start_time=None, end_time=None, assert_flag=None):
    sql = f'select * from bot_account_reward where  deleted=0 and user_id = "{user_id}"'
    if status is not None:
        sql += f' and status="{status}"'
    if start_time is not None:
        sql += f' and reward_time >= "{start_time}"'
    if end_time is not None:
        sql += f' and reward_time <= "{end_time}"'
    if assert_flag is not None:
        if assert_flag == 0:
            sql += f' and (assert_flag is null or assert_flag = 0)'
        else:
            sql += f' and assert_flag = "{assert_flag}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_account_reward_count_by_user_id(user_id, status):
    num = 0
    sql = f'select count(*) as num from bot_account_reward where  deleted=0 and user_id = "{user_id}"'
    if status is not None:
        sql += f' and status="{status}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_account_reward_page_by_user_id(user_id, status=None, page_no=1, page_size=10
                                              , assert_flag=None, reward_type=None):
    start = (page_no - 1) * page_size
    sql = f'select * from bot_account_reward where  deleted=0 and user_id = "{user_id}"'

    if status is not None:
        sql += f' and status="{status}"'
    if assert_flag is not None:
        sql += f' and assert_flag="{assert_flag}"'
    if reward_type is not None:
        sql += f' and reward_type="{reward_type}"'
    sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_exchange_session_count_by_status(status=None, status_list=None):
    num = 0
    sql = f'select count(*) as num from bot_exchange_session where  deleted=0 '
    if status is not None:
        sql += f' and status="{status}"'
    if status_list is not None and len(status_list) > 0:
        str_lst = [str(item) for item in status_list]
        status_str = "'"+"','".join(str_lst)+"'"
        sql += f' and status in ({status_str})'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def get_exchange_session_by_id(id):
    data = 0
    sql = f'select * from bot_exchange_session where  deleted=0 and id="{id}" '

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def find_exchange_session_page_by_status(status=None, status_list=None, page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from bot_exchange_session where  deleted=0 '

    if status is not None:
        sql += f' and status="{status}"'
    if status_list is not None and len(status_list) > 0:
        str_lst = [str(item) for item in status_list]
        status_str = "'"+"','".join(str_lst)+"'"
        sql += f' and status in ({status_str})'
    sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas

