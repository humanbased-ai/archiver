import setting
from datetime import datetime
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)


async def get_users(status):
    sql = f'select * from bot_user where deleted=0 and status = "{status}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_user_by_author_id(author_id):
    data = None
    sql = f'select * from bot_user where deleted=0 and author_id = "{author_id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_user_by_user_name(user_name):
    data = None
    sql = f'select * from bot_user where deleted=0 and user_name = "{user_name}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_posts(status):
    sql = f'select * from bot_post where deleted=0 and status = "{status}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_post_by_id(id):
    data = None
    sql = f'select * from bot_post where id = {id}'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_post_by_uid(uid):
    data = None
    sql = f'select * from bot_post where uid = "{uid}"'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_post_detail_by_uid(uid):
    post_data = await get_post_by_uid(uid)
    if post_data is not None:
        comments = await get_post_comments_by_uid(uid)
        post_data['comments'] = comments
    return post_data


async def get_need_reply_comments_by_uid(uid):

    sql = f'''
    SELECT p.* from bot_post_comment p 
    LEFT JOIN bot_post_comment c on p.comment_uid = c.parent_comment_uid
    where p.uid={uid} and c.id is null and p.status = 1 and p.deleted=0 
    '''

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_need_reply_comments_by_author_id(author_id):

    sql = f'''
    SELECT p.* from bot_post_comment p 
    LEFT JOIN bot_post_comment c on p.comment_uid = c.parent_comment_uid and p.parent_user_id = c.author_id and c.status = 1
    where p.parent_user_id={author_id} and p.status = 1 and p.deleted=0  and c.id is null
    '''

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_post_comments_by_uid(uid):

    sql = f'select * from bot_post_comment where uid = "{uid}"'

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_comment_by_comment_uid(comment_uid):
    data = None
    sql = f'select * from bot_post_comment where comment_uid = "{comment_uid}" order by create_time'

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_comments_by_author_id_and_parent_user_id(uid, author_id, parent_user_id):
    db_datas = []

    sql = f'select * from bot_post_comment where status=1 and deleted = 0 and uid="{uid}" '
    sql = sql + f' and ('
    sql = sql + f'  ( author_id = "{author_id}" and parent_user_id="{parent_user_id}" ) or ( parent_user_id = "{author_id}" and author_id="{parent_user_id}" )'
    sql = sql + f' ) '
    sql = sql + f' order by create_time '
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def post_comment_add(data):
    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now()
    if 'status' not in data or data['status'] is None:
        data['status'] = 1
    db.insert(data, "bot_post_comment", replace=True)


async def post_comment_update(data):
    db.update(data, "bot_post_comment")


async def post_comment_save(comment_data):
    comment_uid = comment_data['comment_uid']

    db_post_comment = await get_comment_by_comment_uid(comment_uid)
    if db_post_comment is None:
        await post_comment_add(comment_data)
    else:
        comment_data['id'] = db_post_comment['id']
        if db_post_comment['reply_type'] is not None and db_post_comment['reply_type'] !='':
            comment_data['reply_type'] = db_post_comment['reply_type']
        await post_comment_update(comment_data)

    return 1


async def chartgpt_record_save(data):

    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now()
    if 'status' not in data or data['status'] is None:
        data['status'] = 1
    db.insert(data, "bot_chartgpt_record", replace=True)
    return 1


async def twitter_record_save(data):

    if 'create_time' not in data or data['create_time'] is None:
        data['create_time'] = datetime.now()
    if 'status' not in data or data['status'] is None:
        data['status'] = 1
    db.insert(data, "bot_twitter_record", replace=True)
    return 1


async def get_chatgpt_base_infos_by_type(type):
    db_datas = []
    sql = f'select * from bot_chartgpt_base where status=1 and deleted = 0 and type="{type}"'
    sql = sql + f' order by sequence '
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def save_chatgpt_base_info(data):
    db.update(data, "bot_chartgpt_base")


async def add_chatgpt_base_info(data):
    db.insert(data, "bot_chartgpt_base", replace=True)