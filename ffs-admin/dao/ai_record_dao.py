import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def update_ai_record(data):
    db.update(data, "open_ai_record")


async def add_ai_record(data):
    id = db.insert(data, "open_ai_record", replace=True)
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
    logger.info('open_ai_record data = {}', data)


async def get_record_count(status=None):
    num = 0
    sql = f'select count(*) as num from open_ai_record where 1 =1 '
    if status is not None:
        sql += f' and status="{status}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_record_page(status=None, page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from open_ai_record where 1 = 1 '

    if status is not None:
        sql += f' and status="{status}"'
    sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas

