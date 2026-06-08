import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def update_ai_record(data):
    db.update(data, "art_avatar_record")


async def add_ai_record(data):
    id = db.insert(data, "art_avatar_record", replace=True)
    return id


async def save_ai_record(data):
    id = data['id']
    if id is None:
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)
        id = await add_ai_record(data)
        data['id'] = id
    else:
        await update_ai_record(data)
    logger.info('art_avatar_record data = {}', data)


async def get_data_by_id(id):
    data = None
    sql = f'select * from art_avatar_record where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_total_fees(account_id, status=None):
    num = 0
    sql = f'select sum(chain_fees) as num from art_avatar_record where 1 =1 '
    if status is not None:
        sql += f' and status="{status}"'
    if account_id is not None:
        sql += f' and account_id="{account_id}"'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def get_record_count(account_id=None, status=None):
    num = 0
    sql = f'select count(*) as num from art_avatar_record where 1 =1 '
    if status is not None:
        sql += f' and status="{status}"'
    if account_id is not None:
        sql += f' and account_id="{account_id}"'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_record_page(account_id=None, status=None, page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from art_avatar_record where 1 = 1 '

    if status is not None:
        sql += f' and status="{status}"'
    if account_id is not None:
        sql += f' and account_id="{account_id}"'
    sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas

