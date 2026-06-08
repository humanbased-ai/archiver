import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def update_ai_chat_task(data):
    db.update(data, "ct_ai_chat_task")


async def add_ai_chat_task(data):
    id = db.insert(data, "ct_ai_chat_task", replace=True)
    return id


async def save_ai_chat_task(data):
    id = data['id']
    if id is None:
        if 'create_time' not in data or data['create_time'] is None:
            data['create_time'] = datetime.now(timezone.utc)
        id = await add_ai_chat_task(data)
        data['id'] = id
    else:
        await update_ai_chat_task(data)
    logger.info('ct_ai_chat_task data = {}', data)


async def get_ai_chat_task_by_id(id):
    data = None
    sql = f'select * from ct_ai_chat_task where deleted=0 and id = "{id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def find_ai_chat_tasks(code=None, status=None):

    sql = f'select * from ct_ai_chat_task where 1 = 1 '

    if status is not None:
        sql += f' and status="{status}"'
    if code is not None and code != '':
        sql += f' and code="{code}"'
    sql += f' ORDER BY create_time asc '
    db_datas = db.sql_to_dict(sql)
    return db_datas


