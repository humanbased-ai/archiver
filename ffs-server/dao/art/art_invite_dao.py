import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def update_invite_record(data):
    db.update(data, "art_invite_record")


async def add_invite_record(data):
    id = db.insert(data, "art_invite_record", replace=True)
    return id


async def save_invite_record(data):
    id = data['id']
    if id is None:
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)
        id = await add_invite_record(data)
        data['id'] = id
    else:
        await update_invite_record(data)
    logger.info('art_invite_record data = {}', data)


async def get_record_data_by_account_id_and_new_account_id(account_id, new_account_id):
    data = None
    sql = f'select * from art_invite_record where deleted=0 and account_id = "{account_id}"'
    if new_account_id is not None:
        sql += f' and account_id = "{new_account_id}"'
    sql += ' limit 0, 1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_data_by_new_account_id(new_account_id):
    data = None
    sql = f'select * from art_invite_record where deleted=0 and new_account_id = "{new_account_id}"'
    sql += ' limit 0, 1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_data_by_id(id):
    data = None
    sql = f'select * from art_invite_record where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_record_count(account_id=None, status=None, status_list=None):
    num = 0
    sql = f'select count(*) as num from art_invite_record where 1 =1 '
    if status is not None:
        sql += f' and status="{status}"'
    if status_list is not None and len(status_list) > 0:
        str_lst = [str(item) for item in status_list]
        status_str = "'"+"','".join(str_lst)+"'"
        sql += f' and status in ({status_str})'
    if account_id is not None:
        sql += f' and account_id="{account_id}"'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_record_page(account_id=None, status=None, page_no=1, page_size=10, status_list=None):
    start = (page_no - 1) * page_size
    sql = f'select * from art_invite_record where 1 = 1 '

    if status is not None:
        sql += f' and status="{status}"'
    if status_list is not None and len(status_list) > 0:
        str_lst = [str(item) for item in status_list]
        status_str = "'"+"','".join(str_lst)+"'"
        sql += f' and status in ({status_str})'
    if account_id is not None:
        sql += f' and account_id="{account_id}"'
    sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas

