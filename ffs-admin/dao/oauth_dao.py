import setting
from datetime import datetime
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def get_consumer_by_client_id(client_id):
    data = None
    sql = f'select * from bot_consumer where deleted=0 and status = 1'
    sql += f' and client_id = "{client_id}" limit 0, 1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_authorize_record_by_code(code):
    data = None
    sql = f'select * from bot_consumer_authorize_record where deleted=0 and status = 1'
    sql += f' and code = "{code}" limit 0, 1 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def update_authorize_record(data):
    db.update(data, "bot_consumer_authorize_record")


async def add_authorize_record(data):
    db.insert(data, "bot_consumer_authorize_record", replace=True)


async def save_authorize_record(data):
    code = data['code']
    db_data = await get_authorize_record_by_code(code)
    if db_data is None:
        id = await add_authorize_record(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        await update_authorize_record(data)
    logger.info('save_authorize_record data = {}', data)

