
from service.bot.ai import openai_image_service, chaintool_image
from log import logger
import threading
from dao import ai_record_dao
import asyncio
from starlette.requests import Request
import json
from datetime import datetime, timezone
from utils import file_oss, date_utils
import setting

img_domain = setting.OSS_IMAGE_DATA_DOMAIN

async def gen_image(content, image_count, model, ip_address, request: Request):

    if 'azuki' == model:
        result = await chaintool_image.get_image(content, image_count, 'azuki')
    else:
        result = await openai_image_service.get_image(content, image_count, model)

    #result = {}
    #await asyncio.sleep(10)
    record_data = {
        'ip_address': ip_address,
        'create_time': datetime.now(timezone.utc),
        'content': content,
        'model': model,
        'image_count': image_count,

        'status': 1
    }
    image_urls = result.get('image_urls', [])
    t = threading.Thread(target=save_record, kwargs={"record_data": record_data, 'image_urls': image_urls})
    t.start()
    return result


def save_record(record_data, image_urls):
    logger.info("async save_record record_data = {}, image_urls = {}", record_data, image_urls)
    images = []
    if image_urls is not None and len(image_urls) > 0:
        num = 0
        for image_url in image_urls:
            num = num + 1
            fpath = 'ffs/image/avatar/'+datetime.now().strftime('%Y%m%d%H%M%S')+f'_{num}.jpg'
            result = asyncio.run(file_oss.upload_oss_by_url(path=fpath, url=image_url))
            if result is not None:
                images.append(fpath)

    record_data['images'] = json.dumps(images)
    asyncio.run(ai_record_dao.add_ai_record(record_data))


async def gen_image_record_page(page_no, page_size,status=None):
    if page_size is None:
        page_size = 10
    if page_no is None:
        page_no = 1

    list_datas = []
    total = await ai_record_dao.get_record_count(status=status)
    if total > 0:
        datas = await ai_record_dao.find_record_page(
            page_no=page_no, page_size=page_size)
        if len(datas) > 0:
            for data in datas:
                create_time = date_utils.date_to_timestamp(data['create_time'])
                image_str = data['images']
                image_urls = []
                if image_str is not None and image_str !='':
                    images = json.loads(image_str)
                    for image in images:
                        image_url = f'{img_domain}/{image}'
                        image_urls.append(image_url)
                data['image_urls'] = image_urls
                data['create_time'] = create_time
                list_datas.append(data)

    count = total
    page_data = {
        'count': total,
        'pageNo': page_no,
        'pageSize': page_size,
        'list': list_datas
    }
    return page_data

