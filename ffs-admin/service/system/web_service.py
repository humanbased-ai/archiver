from dao import web_dao
from log import logger
import setting
import uuid
from datetime import datetime, timedelta, timezone

twitter_type = 'twitter'


async def make_short_url(uid, url_type):
    links = None
    db_data = await web_dao.get_short_url_by_type_uid(uid=uid, url_type=url_type)
    if db_data is not None:
        links = db_data['links']
        return links
    if twitter_type == url_type:
        web_domain = setting.WEB_DOMAIN
        short_id = str(uuid.uuid4())[:8].replace('-', '')
        links = f'{web_domain}/s/{short_id}'
        data = {'type': url_type, 'uid': uid, 'code': short_id, 'links': links}
        await save_short_url(data)
    return links


async def save_short_url(data):
    await web_dao.short_url_save(data)


async def get_twitter_uid(code):
    uid = None
    if code is not None:
        data = await web_dao.get_short_url_by_code(code=code)
        if data is not None:
            uid = data['uid']
    return uid


