from log import logger
import asyncio
from starlette.requests import Request
import json
from datetime import datetime, timezone
from utils import file_oss, date_utils, requests_utils
import setting
import requests
import os
import asyncio

chaintool_azuki_host = os.getenv('chaintool_azuki_host', '<INTERNAL_HOST_REDACTED>')


# 获取图片
async def get_image(message, image_count=1, model="azuki"):
    result = {}
    image_urls = []

    prompt = ''
    # 数据格式转换 girl with pink hair style:Cyberpunk - 》girl with pink hair style, Cyberpunk
    prompts = []
    messages = message.split(':')
    for ms in messages:
        if ms == '' or 'No Style' in ms:
            continue
        prompts.append(ms)
    prompt = ','.join(prompts)

    if prompt == '':
        return image_urls

    param = {'model': model,
             'n': image_count,
             "size": "512x512",
             "prompt": prompt
             }
    url = chaintool_azuki_host+'/generate'
    headers = {'Content-Type': 'application/json'}
    response = await requests_utils.post(url=url, json=param, headers=headers,timeout=120)
    #response = requests.post(url=url, json=param, headers=headers, timeout=20)
    logger.info(' gen image url = {}, response = {}', url, response.text)
    if response.status_code == 200:
        response_data = response.json()
        if 'images' in response_data:
            images = response_data['images']
            if images is not None and len(images) > 0:
                for image in images:
                    image_urls.append(image['url'])
    result['image_urls'] = image_urls
    result['error'] = ''
    return result


if __name__ == '__main__':
    asyncio.run(get_image(message='Azuki style, azuki art, azuki', image_count=2, model="azuki"))