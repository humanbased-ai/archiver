import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from log import logger

db = DBM(setting.dbUrl)


async def get_checkin_plan_by_account_id(account_id):
    data = None
    sql = f'select * from bot_checkin_plan where account_id = "{account_id}" order by id desc limit 0,1'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_checkin_plan(user_id):
    data = None
    sql = f'select * from bot_checkin_plan where user_id = "{user_id}" order by id desc limit 0,1'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def save_checkin_plan(data):
    user_id = data['user_id']
    db_data = await get_checkin_plan(user_id)
    if db_data is None:
        id = await add_checkin_plan(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        await update_checkin_plan(data)
    return data


async def add_checkin_plan(data):
    if data is None:
        return
    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now(timezone.utc)
    if 'status' not in data or data['status'] is None:
        data['status'] = 1
    id = db.insert(data, "bot_checkin_plan", replace=True)
    return id


async def update_checkin_plan(data):
    db.update(data, "bot_checkin_plan")


async def get_checkin_record(user_id, comment_uid):
    data = None
    sql = f'select * from bot_checkin_record where user_id = "{user_id}" and comment_uid ="{comment_uid}" order by id desc limit 0,1'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def save_checkin_record(data):
    user_id = data['user_id']
    comment_uid = data['comment_uid']
    db_data = await get_checkin_record(user_id, comment_uid)
    if db_data is None:
        id = await add_checkin_record(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        data['create_time'] = db_data['create_time']
        await update_checkin_record(data)
    return data


async def add_checkin_record(data):
    if data is None:
        return
    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now(timezone.utc)
    if 'status' not in data or data['status'] is None:
        data['status'] = 1
    id = db.insert(data, "bot_checkin_record", replace=True)
    return id


async def update_checkin_record(data):
    db.update(data, "bot_checkin_record")


async def get_checkin_map_by_user_comment_uids(comment_uids, status=None):
    uidMap = {}
    uids = comment_uids
    if uids is None or len(uids) == 0:
        return uidMap
    str_lst = [str(item) for item in uids]
    uid_list_str = "'"+"','".join(str_lst)+"'"

    sql = f'select * from bot_checkin_record where comment_uid in ({uid_list_str})'
    if status is not None and status != '':
        sql += f' and status="{status}" '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        for item in db_datas:
            uid = item['comment_uid']
            uidMap[uid] = item
    return uidMap


async def get_checkin_data(user_id, start_time, end_time, start=0, size=200):

    sql = f'select * from bot_checkin_record where deleted=0 and status=1 '
    sql += f'and user_id = "{user_id}" '
    sql += f' and create_time BETWEEN "{start_time}" and "{end_time}" '
    sql += f' order by id desc limit {start},{size} '
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_checkin_record_count(account_id, checkin_plan_id, start_time, end_time):
    num = 0
    sql = f'select count(*) as num from bot_checkin_record where deleted=0 and status=1 '
    if account_id is not None:
        sql += f'and account_id = "{account_id}" '
    if checkin_plan_id is not None and checkin_plan_id != '':
        sql += f' and checkin_plan_id = "{checkin_plan_id}"'
    if start_time is not None and start_time != '':
        sql += f' and create_time >= "{start_time}" '
    if end_time is not None and end_time != '':
        sql += f' and create_time <= "{end_time}" '
    sql += f' order by id desc  '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def get_checkin_records(account_id, checkin_plan_id, start_time, end_time, page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from bot_checkin_record where deleted=0 and status=1 '
    if account_id is not None:
        sql += f'and account_id = "{account_id}" '
    if checkin_plan_id is not None and checkin_plan_id != '':
        sql += f' and checkin_plan_id = "{checkin_plan_id}"'
    if start_time is not None and start_time != '':
        sql += f' and create_time >= "{start_time}" '
    if end_time is not None and end_time != '':
        sql += f' and create_time <= "{end_time}" '
    sql += f' order by id desc limit {start},{page_size} '
    db_datas = db.sql_to_dict(sql)
    return db_datas



async def get_current_checkin_cycle():
    data = None
    sql = f'select * from bot_checkin_cycle where status = 1 order by id asc limit 0,1'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_checkin_cycle(uid):
    data = None
    sql = f'select * from bot_checkin_cycle where uid = "{uid}" order by id desc limit 0,1'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def save_checkin_cycle(data):
    uid = data['uid']
    db_data = await get_checkin_cycle(uid)
    if db_data is None:
        id = await add_checkin_record(data)
        data['id'] = id
    else:
        data['id'] = db_data['id']
        data['create_time'] = db_data['create_time']
        await update_checkin_record(data)
    return data


async def add_checkin_cycle(data):
    if data is None:
        return
    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now(timezone.utc)
    if 'status' not in data or data['status'] is None:
        data['status'] = 1
    id = db.insert(data, "bot_checkin_cycle", replace=True)
    return id


async def update_checkin_cycle(data):
    db.update(data, "bot_checkin_cycle")


async def get_user_checkin_days(start_time, end_time, checkin_days):
    sql = f'''
    SELECT
        a.user_id, a.account_id,
        r.rel_name,
        count(DISTINCT tim) AS day_num,
        count(a.comment_uid) AS count
    FROM
        (
            SELECT
                user_id, account_id,
                checkin_time,
                comment_uid,
                DATE_FORMAT(
                    create_time ,
                    '%Y-%m-%d'
                ) tim
            FROM
                bot_checkin_record
            WHERE
                `status` = 1
            AND create_time BETWEEN "{start_time}"
            AND "{end_time}"
            ORDER BY
                user_id,
                tim
        ) a
    LEFT JOIN bot_rel_user r ON r.account_id = a.account_id
    GROUP BY
        a.account_id,a.user_id,r.id
    HAVING
        day_num >= {checkin_days}
    ORDER BY
        day_num DESC
    '''
    db_datas = db.sql_to_dict(sql)
    return db_datas