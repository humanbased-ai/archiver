import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from log import logger

db = DBM(setting.dbUrl)


async def get_account_token(account_id, status=None):
    data = 0
    sql = f'select sum(score) as num from bot_account_redeem where deleted=0 '
    sql += f' and account_id = "{account_id}" '

    if status is not None and status != '':
        sql += f' and status="{status}" '

    sql += f'  '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]['num']
    return data


async def get_account_redeem(user_id, exchange_id, status=None):
    data = None
    sql = f'select * from bot_account_redeem where deleted=0 '
    sql += f' and user_id = "{user_id}" '
    sql += f' and exchange_id ="{exchange_id}" '
    if status is not None and status != '':
        sql += f' and status="{status}" '

    sql += f' order by id desc limit 0,1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_redeem_by_uid(uid, status=None):
    data = None
    sql = f'select * from bot_account_redeem where deleted=0 '
    sql += f' and uid = "{uid}" '
    if status is not None and status != '':
        sql += f' and status="{status}" '

    sql += f' order by id desc limit 0,1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def save_account_redeem(data):
    uid = data['uid']
    user_id = data['user_id']
    exchange_id = data['exchange_id']
    db_data = None
    if uid is None or uid == '':
        db_data = await get_account_redeem(user_id, exchange_id)
    else:
        db_data = await get_account_redeem_by_uid(uid)
    if db_data is None:
        id = await add_account_redeem(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        data['create_time'] = db_data['create_time']
        if db_data['start_time'] is not None:
            data['start_time'] = db_data['start_time']
        await update_account_redeem(data)
    return data


async def add_account_redeem(data):
    if data is None:
        return
    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now(timezone.utc)

    id = db.insert(data, "bot_account_redeem", replace=True)
    return id


async def update_account_redeem(data):
    db.update(data, "bot_account_redeem")


async def get_account_redeem_count_by_user_id(user_id, status):
    num = 0
    sql = f'select count(*) as num from bot_account_redeem where  deleted=0 and user_id = "{user_id}"'
    if status is not None:
        sql += f' and status="{status}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_account_redeem_page_by_user_id(user_id, status=None, page_no=1, page_size=10
                                              , assert_flag=None, reward_type=None):
    start = (page_no - 1) * page_size
    sql = f'select * from bot_account_redeem where  deleted=0 and user_id = "{user_id}"'

    if status is not None:
        sql += f' and status="{status}"'
    sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def find_account_redeem_page_by_status(status=None, status_list=None, page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from bot_account_redeem where  deleted=0'
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


