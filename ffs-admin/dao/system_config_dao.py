import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def get_configs(status=1, type=None):
    db_datas = {}
    sql = f'select * from system_config where deleted=0'
    if status is not None:
        sql += f' and `status` = {status}'
    if type is not None and type !='':
        sql += f' and `type` = "{type}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_config(name=None, status=1):
    db_data = None
    sql = f'select * from system_config where deleted=0'
    if name is not None and name != '':
        sql += f' and `name` = "{name}"'
    if status is not None:
        sql += f' and `status` = {status}'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        db_data = db_datas[0]
    return db_data


async def get_config_by_id(id):
    db_data = None
    if id is None or id == '':
        return None

    sql = f'select * from system_config where deleted=0 and id={id}'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        db_data = db_datas[0]
    return db_data


async def update_config(data):
    db.update(data, "system_config")


async def add_config(data):
    db.insert(data, "system_config", replace=True)


async def save_config(data):
    id = data['id']
    db_data = await get_config_by_id(id)
    if db_data is None:
        id = await add_config(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        await update_config(data)
    logger.info('save_config data = {}', data)


async def get_config_count(name=None, type=None, data_type=None, status=None):
    num = 0
    sql = f'select count(*) as num from system_config where deleted=0 '
    if name is not None:
        sql += f'and name="{name}"'
    if type is not None:
        sql += f' and type="{type}"'
    if data_type is not None:
        sql += f' and data_type="{data_type}"'
    if status is not None:
        sql += f' and status="{status}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_config_page(name=None, type=None, data_type=None, status=None,  page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from system_config where deleted=0 '
    if name is not None:
        sql += f'and name="{name}"'
    if type is not None:
        sql += f' and type="{type}"'
    if data_type is not None:
        sql += f' and data_type="{data_type}"'
    if status is not None:
        sql += f' and status="{status}"'
    sql += f' ORDER BY id desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas

