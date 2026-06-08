import setting
from datetime import datetime
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)

bot_user_colums = f'`id`, `author_id`, `user_name`, `url`, `status`, `remarks`'


async def get_users(status):
    sql = f'select {bot_user_colums} from bot_user where deleted=0 and status = "{status}"'
    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_user_by_author_id(author_id):
    data = None
    sql = f'select {bot_user_colums} from bot_user where deleted=0 and author_id = "{author_id}"'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_user_by_user_name(user_name):
    data = None
    sql = f'select {bot_user_colums} from bot_user where deleted=0 and user_name = "{user_name}"'
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
    JOIN bot_post a on a.uid = p.uid and a.author_id!=p.author_id
    LEFT JOIN bot_post_comment c on p.comment_uid = c.parent_comment_uid
    where p.uid={uid} and c.id is null and p.status = 1 and p.deleted=0 and p.author_id !=p.parent_user_id
    '''

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def get_need_reply_comments_by_author_id(author_id):

    sql = f'''
    SELECT p.* from bot_post_comment p 
    LEFT JOIN bot_post_comment c on p.comment_uid = c.parent_comment_uid and p.parent_user_id = c.author_id and c.status = 1
    where p.parent_user_id={author_id} and p.status = 1 and p.deleted=0  
    and c.id is null and p.author_id !=p.parent_user_id and p.images !='[]'
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


async def get_comment_map_by_comment_uids(uids):
    uidMap = {}
    if uids is None or len(uids) == 0:
        return uidMap
    str_lst = [str(item) for item in uids]
    uid_list_str = "'"+"','".join(str_lst)+"'"

    sql = f'select * from bot_post_comment where comment_uid in ({uid_list_str})'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        for item in db_datas:
            uid = item['comment_uid']
            uidMap[uid] = item
    return uidMap


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
        if 'status' not in comment_data or comment_data['status'] is None:
            comment_data['status'] = 1
        await post_comment_add(comment_data)
    else:
        comment_data['id'] = db_post_comment['id']
        if db_post_comment['reply_type'] is not None and db_post_comment['reply_type'] !='':
            comment_data['reply_type'] = db_post_comment['reply_type']
        comment_data['status'] = db_post_comment['status']
        await post_comment_update(comment_data)

    return 1


async def batch_post_comment(comment_datas):
    if comment_datas is None or len(comment_datas) == 0:
        logger.info('record_comments allsize = 0')
        return 0

    comment_uids = []
    for comment_data in comment_datas:
        comment_uid = None
        if 'comment_uid' in comment_data:
            comment_uid = comment_data['comment_uid']
        if comment_uid is not None and comment_uid not in comment_uids:
            comment_uids.append(comment_uid)
    uidMap = await get_comment_map_by_comment_uids(comment_uids)
    insert_comments = []
    update_comments = []
    for comment in comment_datas:
        uid = comment['comment_uid']
        if uid not in uidMap:
            if 'status' not in comment or comment['status'] is None:
                comment['status'] = 1
            insert_comments.append(comment)
        else:
            comment['id'] = uidMap[uid]['id']
            update_comments.append(comment)
    if len(insert_comments) > 0:
        db.inserts(insert_comments, 'bot_post_comment', replace=True)
    if len(update_comments) > 0:
        for comment in update_comments:
            db.update(comment, 'bot_post_comment')
    logger.info('post_comment add_count = {}, update_count = {}', len(insert_comments), len(update_comments))
    return 1


async def update_post_comment_status(comment_data):
    comment_uid = comment_data['comment_uid']

    db_post_comment = await get_comment_by_comment_uid(comment_uid)
    if db_post_comment is not None:
        comment_data['id'] = db_post_comment['id']
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


async def get_user_info(rel_type, user_id):
    data = None
    sql = f'select * from bot_rel_user where deleted=0 '

    sql = sql + f' and rel_type = "{rel_type}" '
    sql = sql + f' and user_id = "{user_id}" '

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data


async def get_user_infos(rel_type, user_name):
    data = None
    sql = f'select * from bot_rel_user where deleted=0 '

    sql = sql + f' and rel_type = "{rel_type}" '
    sql = sql + f' and rel_name = "{user_name}" '

    db_datas = db.sql_to_dict(sql)
    return db_datas


async def save_rel_user_info(data):
    db.update(data, "bot_rel_user")


async def add_rel_user_info(data):
    db.insert(data, "bot_rel_user", replace=True)


async def get_user_config(twitter_user_id):
    data = None
    sql = f'select * from bot_user where deleted=0 and status = 1'
    if twitter_user_id is not None:
        sql = sql + f' and author_id = "{twitter_user_id}" '
    sql = sql + f' limit 0,1'
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data

