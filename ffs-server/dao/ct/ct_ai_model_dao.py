import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def update_ai_model(data):
    db.update(data, "ct_ai_model")


async def add_ai_model(data):
    id = db.insert(data, "ct_ai_model", replace=True)
    return id


async def save_ai_model(data):
    id = data['id']
    if id is None:
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)
        id = await add_ai_model(data)
        data['id'] = id
    else:
        await update_ai_model(data)
    logger.info('ct_ai_model data = {}', data)


async def get_ai_model_by_id(id):
    data = None
    sql = f'select * from ct_ai_model where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_ai_model_by_uid(name):
    data = None
    sql = f'select * from ct_ai_model where deleted=0 and name = "{name}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def find_ai_models(org=None, status=None, order_type=None):

    sql = f'select * from ct_ai_model where 1 = 1 '

    if status is not None:
        sql += f' and status="{status}"'
    if org is not None and status != '':
        sql += f' and org="{org}"'
    if order_type is None or order_type == '':
        sql += f' ORDER BY create_time asc '
    else:
        sql += f' ORDER BY {order_type}'
    db_datas = db.sql_to_dict(sql)
    return db_datas


