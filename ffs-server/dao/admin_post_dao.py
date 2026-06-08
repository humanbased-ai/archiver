import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from log import logger

db = DBM(setting.dbUrl)


async def get_post_comment_count(comment_uid, user_name, author_id, status=None, has_img=True):
    num = 0
    sql = f'select count(*) as num from bot_post_comment where 1=1 '
    if comment_uid is not None:
        sql += f'and comment_uid="{comment_uid}"'
    if user_name is not None:
        sql += f' and user_name like "%{user_name}%"'
    if author_id is not None:
        sql += f' and author_id="{author_id}"'
    if status is not None:
        sql += f' and status="{status}"'
    if has_img is True:
        sql += f' and images !="[]" and images is not null '
    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        num = db_datas[0]['num']
    return num


async def find_post_comment_page(comment_uid, user_name, author_id, status=None, has_img=True,  page_no=1, page_size=10):
    start = (page_no - 1) * page_size
    sql = f'select * from bot_post_comment where 1=1 '
    if comment_uid is not None:
        sql += f'and comment_uid="{comment_uid}"'
    if user_name is not None:
        sql += f' and user_name like "%{user_name}%"'
    if author_id is not None:
        sql += f' and author_id="{author_id}"'
    if status is not None:
        sql += f' and status="{status}"'
    if has_img is True:
        sql += f' and images !="[]" and images is not null '
    sql += f' ORDER BY create_time desc '
    sql += f' limit {start},{page_size}'

    db_datas = db.sql_to_dict(sql)
    return db_datas
