import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


bot_account_colums = f' `id`, status, `address`, `status`, `remarks` , sol_address ,rel_id, rel_type'


async def get_accounts(status):
    sql = f'select {bot_account_colums} from ad_user where deleted=0 and status = "{status}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_account_by_id(id):
    data = None
    sql = f'select {bot_account_colums} from ad_user where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_by_rel(rel_id, rel_type=None):
    data = None
    sql = f'select {bot_account_colums} from ad_user where deleted=0 and rel_id = "{rel_id}"'
    if rel_type is not None:
        sql += f' and rel_type = "{rel_type}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_account_by_address(address):
    data = None
    sql = f'select {bot_account_colums} from ad_user where deleted=0 and address = "{address}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def update_account(data):
    db.update(data, "ad_user")


async def add_account(data):
    db.insert(data, "ad_user", replace=True)


async def save_account(data):
    address = data['address']
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
    logger.info('ad_user data = {}', data)


async def get_account_score_by_user_id(user_id):
    data = None
    sql = f'''
        SELECT user_id,type, `value` from ad_user_score where user_id = "{user_id}"
        UNION all
        SELECT * from (
        SELECT a.user_id ,a.type, 1.0/b.num as value
         from ad_user_mintchain_detail a 
        LEFT JOIN (
        SELECT type,count(DISTINCT address) as num from ad_user_mintchain_detail  
        GROUP BY type
        ORDER BY num 
        ) b on b.type = a.type
        where a.user_id is not null  and user_id = "{user_id}"
        GROUP BY a.type,a.user_id,b.num
        ORDER BY a.type ) b
    '''
    db_datas = db.sql_to_dict(sql)

    return db_datas


async def get_account_register_by(user_id):

    sql = f'''
    SELECT user_id from ad_user_mintchain_detail where user_id = "{user_id}"
    UNION
    SELECT user_id from ad_user_score where user_id = "{user_id}"
    '''
    db_datas = db.sql_to_dict(sql)

    return db_datas


async def get_white_by_address(address):

    sql = f'''
    SELECT * from ad_white_address where address = "{address}" 
    and status=1
    '''
    db_datas = db.sql_to_dict(sql)

    return db_datas


async def get_app_account(secret_key):
    data = None
    sql = f'select * from ad_app_account where deleted=0 and secret_key = "{secret_key}" '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def update_app_account(data):
    db.update(data, "ad_app_account")


async def add_app_account(data):
    db.insert(data, "ad_app_account", replace=True)

