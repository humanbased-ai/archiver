import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


bot_account_colums = f'`id`, `user_id`, `user_name`, `source_type`, `account_code`, `status`, `remarks`, consumer_id, consumer_token '


async def get_accounts(status):
    sql = f'select {bot_account_colums} from bot_account where deleted=0 and status = "{status}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_account_by_id(id):
    data = None
    sql = f'select {bot_account_colums} from bot_account where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_by_user_id(user_id):
    data = None
    sql = f'select {bot_account_colums} from bot_account where deleted=0 and user_id = "{user_id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_by_code(account_code, source_type=None):
    data = None
    sql = f'select {bot_account_colums} from bot_account where deleted=0 '
    sql = sql + f' and account_code = "{account_code}" '
    if source_type is not None:
        sql = sql + f' and source_type = "{source_type}" '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_by_user_name(user_name):
    data = None
    sql = f'select {bot_account_colums} from bot_account where deleted=0 and user_name = "{user_name}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def update_account(data):
    db.update(data, "bot_account")


async def add_account(data):
    db.insert(data, "bot_account", replace=True)


async def save_account(data):
    user_id = data['user_id']
    db_data = await get_account_by_user_id(user_id)
    if db_data is None:
        id = await add_account(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        await update_account(data)
    logger.info('save_account data = {}', data)


