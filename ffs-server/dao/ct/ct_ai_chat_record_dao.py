import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def update_ai_chat_record(data):
    db.update(data, "ct_ai_chat_record")


async def add_ai_chat_record(data):
    id = db.insert(data, "ct_ai_chat_record", replace=True)
    return id


async def save_ai_chat_record(data):
    id = data['id']
    if id is None:
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)
        id = await add_ai_chat_record(data)
        data['id'] = id
    else:
        await update_ai_chat_record(data)
    logger.info('ct_ai_chat_record data = {}', data)


async def get_ai_chat_record_by_id(id):
    data = None
    sql = f'select * from ct_ai_chat_record where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_ai_chat_record_by_uid(uid):
    data = None
    sql = f'select * from ct_ai_chat_record where deleted=0 and uid = "{uid}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def find_ai_chat_records(user_id=None, status=None, chain_status=None, has_vote=None):

    sql = f'select * from ct_ai_chat_record where 1 = 1 '

    if has_vote == 1:
        sql += f' and evaluate is not null '
    if status is not None:
        sql += f' and status="{status}"'
    if chain_status is not None:
        sql += f' and chain_status="{chain_status}"'
    if user_id is not None and user_id != '':
        sql += f' and user_id="{user_id}"'
    sql += f' ORDER BY create_time asc '
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def total_chain_votes_count():
    num = 0
    sql = f'select count(*) as num from ct_ai_chat_record where status=2 and chain_status=2 '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def get_record_count(query_user_id=None, status=None, chain_status=None):
    num = 0
    sql = f'select count(*) as num from ct_ai_chat_record where 1 =1 '
    if status is not None:
        sql += f' and status="{status}"'
    if query_user_id is not None:
        sql += f' and user_id="{query_user_id}"'
    if chain_status is not None:
        sql += f' and chain_status="{chain_status}"'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_record_page(query_user_id=None, status=None, chain_status=None, order_condition=None, page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from ct_ai_chat_record where 1 = 1 '

    if status is not None:
        sql += f' and status="{status}"'
    if query_user_id is not None:
        sql += f' and user_id="{query_user_id}"'
    if chain_status is not None:
        sql += f' and chain_status="{chain_status}"'
    if order_condition is not None and order_condition != '':
        sql += f' ORDER BY {order_condition} '
    else:
        sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def add_ai_chat_history(data):
    id = db.insert(data, "ct_ai_chat_history", replace=True)
    return id


async def add_ai_chat_historys(datas):
    id = db.inserts(datas, "ct_ai_chat_history", replace=True)
    return id


async def get_max_index(uid):
    data = 0
    sql = f' SELECT max(chat_index) as max_index from ct_ai_chat_history where uid="{uid}" GROUP BY chat_index '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]['max_index']
    return data


async def get_ai_chat_history_list(uid=None, record_id=None, model=None):

    sql = f'select * from ct_ai_chat_history where deleted = 0 '
    if model is not None:
        sql += f' and model="{model}"'
    if uid is not None:
        sql += f' and uid="{uid}"'
    if record_id is not None and record_id != '':
        sql += f' and record_id="{record_id}"'
    sql += f' ORDER BY chat_index asc '
    db_datas = db.sql_to_dict(sql)
    return db_datas

