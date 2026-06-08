import json
import asyncio
import setting
from datetime import datetime
from utils.tools import DBM
from log import logger

db = DBM(setting.dbUrl)


async def get_reply_post_data(start_date, end_date):
    result = {}
    sql = f'''
        SELECT
            DATE_FORMAT( create_time+ INTERVAL 8 HOUR, '%Y-%m-%d' ) tim,
            count(*) count
        FROM
            bot_post_comment
        WHERE 
            status =2  and create_time is not null 
            
            and create_time+ INTERVAL 8 HOUR BETWEEN '{start_date}' and '{end_date}'
        GROUP BY
            tim
        ORDER BY tim DESC
    '''
    db_datas = db.sql_to_dict(sql)
    for data in db_datas:
        result[data['tim']] = data['count']
    return result



