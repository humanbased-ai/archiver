import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from log import logger

db = DBM(setting.dbUrl)


async def short_url_add(data):
    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now(timezone.utc)
    if 'status' not in data or data['status'] is None:
        data['status'] = 1
    db.insert(data, "bot_short_url", replace=True)


async def short_url_update(data):
    db.update(data, "bot_short_url")


async def short_url_save(data):
    url_type = data['type']
    uid = data['uid']
    db_data = await get_short_url_by_type_uid(url_type=url_type, uid=uid)
    if db_data is not None:
        data['id'] = db_data['id']
        await short_url_update(data)
    else:
        await short_url_add(data)


async def get_short_url_by_type_uid(url_type, uid):
    data = None
    sql = f'select * from bot_short_url where deleted = 0'
    sql = sql + f' and type="{url_type}" '
    sql = sql + f' and uid="{uid}" '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_short_url_by_code(code, url_type=None):
    data = None
    sql = f'select * from bot_short_url where deleted = 0 and status=1 '
    sql = sql + f' and code="{code}" '
    if url_type is not None and url_type != '':
        sql = sql + f' and url_type="{url_type}" '

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data

