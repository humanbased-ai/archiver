import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


bot_account_colums = f'`id`, `user_id`, `user_name`, `source_type`, `account_code`, `status`, `remarks`, consumer_id, consumer_token '


async def get_accounts(status):
    sql = f'select {bot_account_colums} from ad_account where deleted=0 and status = "{status}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_account_by_id(id):
    data = None
    sql = f'select {bot_account_colums} from ad_account where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_by_token(account_code):
    data = None
    sql = f'select {bot_account_colums} from ad_account where deleted=0 and account_code = "{account_code}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_by_address(address, source_type="address"):
    data = None
    sql = f'select {bot_account_colums} from ad_account where deleted=0 and source_type="{source_type}" and user_id = "{address}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def update_account(data):
    db.update(data, "ad_account")


async def add_account(data):
    id = db.insert(data, "ad_account", replace=True)
    return id


async def save_account(data):
    address = data['user_id']
    db_data = await get_account_by_address(address)
    if db_data is None:
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)
        id = await add_account(data)
        data['id'] = id
    else:
        if 'create_time' in db_data and db_data['create_time'] is not None:
            data['create_time'] = db_data['create_time']
        data['id'] = db_data['id']
        await update_account(data)
    logger.info('ad_account data = {}', data)


async def get_account_address_list(account_id):
    data = None
    sql = f'select * from ad_account_address where deleted=0 and account_id = "{account_id}" '
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_account_address_by_address(address):
    data = None
    sql = f'select * from ad_account_address where deleted=0 and address = "{address}" '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def save_account_address(data):
    address = data['address']
    db_data = await get_account_address_by_address(address)
    if db_data is None:
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)
        id = await add_account_address(data)
        data['id'] = id
    else:
        if 'create_time' in db_data and db_data['create_time'] is not None:
            data['create_time'] = db_data['create_time']
        data['id'] = db_data['id']
        await update_account_address(data)
    logger.info('ad_account data = {}', data)


async def update_account_address(data):
    db.update(data, "ad_account_address")


async def add_account_address(data):
    db.insert(data, "ad_account_address", replace=True)

