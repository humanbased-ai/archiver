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
import hmac
from hashlib import sha1
import base64
import time
import uuid

access_key = '9jpI3c3M-wAfymR2xUj80g'
secret_key = '<LIBLIB_SECRET_REDACTED>'
host = os.getenv('liblibai_url', 'https://openapi.liblibai.cloud')


def make_sign(uri):
    """
    生成签名
    """

    # API访问密钥
    #secret_key = '<LIBLIB_SECRET_REDACTED>'

    # 请求API接口的uri地址
    #uri = "/api/genImg"
    # 当前毫秒时间戳
    timestamp = str(int(time.time() * 1000))
    # 随机字符串
    signature_nonce = str(uuid.uuid4())
    # 拼接请求数据
    content = '&'.join((uri, timestamp, signature_nonce))

    # 生成签名
    digest = hmac.new(secret_key.encode(), content.encode(), sha1).digest()
    # 移除为了补全base64位数而填充的尾部等号
    sign = base64.urlsafe_b64encode(digest).rstrip(b'=').decode()
    return {'sign': sign, 'timestamp': timestamp, 'signature_nonce': signature_nonce}


# 获取图片
async def get_image(message, image_count=1, model="5d7e67009b344550bc1aa6ccbfa1d7f4", modelId=None):
    result = {}
    image_urls = []
    start_time = time.time()

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

    param = {
                "templateUuid": model,
                "generateParams": {
                    "prompt": prompt,
                    "aspectRatio": "portrait",
                    "imageSize": {
                        "width": 768,
                        "height": 1024
                    },
                    "imgCount": image_count,
                    "steps": 30,

                }
    }
    if modelId is not None:
        param['generateParams']['additionalNetwork'] = [{'modelId': modelId, "weight": 1.0}]
    path = '/api/generate/webui/text2img/ultra'
    signature_data = make_sign(path)
    signature = signature_data.get('sign')
    ts = signature_data.get('timestamp')
    signature_nonce = signature_data.get('signature_nonce')
    url = f'{host}{path}?AccessKey={access_key}&Signature={signature}&Timestamp={ts}&SignatureNonce={signature_nonce}'
    headers = {'Content-Type': 'application/json'}

    response = requests.post(url=url, json=param, headers=headers, timeout=20)
    logger.info(' gen image param = {}, url = {}, response = {}', param, url, response.text)
    generateUuid = None
    if response.status_code == 200:
        response_data = response.json()
        print(response_data)
        if response_data.get('code') == 0:
            generateUuid = response_data.get('data').get('generateUuid')
    if generateUuid is not None:
        num = 0
        while True:
            await asyncio.sleep(3)
            num = num + 1
            datas = await get_status(generateUuid)
            logger.info('get_status num = {}, datas= {}', num, datas)
            if datas is not None:
                for image_data in datas:
                    image_urls.append(image_data.get('imageUrl'))
                logger.info(' get_image_success generateUuid = {}, image = {}', generateUuid, image_urls)
                break
            if num > 20:
                break

    result['image_urls'] = image_urls
    result['error'] = ''
    total_use_time = time.time() - start_time
    logger.info(" total_usetime = {}秒，generateUuid = {}, image_urls = {}"
                , int(total_use_time), generateUuid, image_urls)
    return result


async def get_status(generateUuid):
    param = {
        "generateUuid": generateUuid,
    }
    path = '/api/generate/webui/status'
    signature_data = make_sign(path)
    signature = signature_data.get('sign')
    ts = signature_data.get('timestamp')
    signature_nonce = signature_data.get('signature_nonce')
    url = f'{host}{path}?AccessKey={access_key}&Signature={signature}&Timestamp={ts}&SignatureNonce={signature_nonce}'
    headers = {'Content-Type': 'application/json'}

    response = requests.post(url=url, json=param, headers=headers, timeout=20)
    logger.info(' gen image param = {}, url = {}, response = {}', param, url, response.text)
    if response.status_code == 200:
        response_data = response.json()
        print(response_data)
        data = response_data.get('data')
        generateStatus = data.get('generateStatus')
        if generateStatus == 5:
            images = data.get('images')
            return images
    return None



if __name__ == '__main__':
    asyncio.run(get_image(message='IT精英',
                          image_count=1, model="5d7e67009b344550bc1aa6ccbfa1d7f4"
                          )
                )
    #asyncio.run(get_status('918137b2310e4be8a00b2fc5a8bca905'))

