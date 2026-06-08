from log import logger
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

access_key = 'N6_z0EniAxwNfjuLoWiszg'
secret_key = '<LIBLIB_SECRET_REDACTED>'
host = 'https://openapi.liblibai.cloud'


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
async def get_image(message, image_count=1, model="21df5d84cca74f7a885ba672b5a80d19", templateUuid="e10adc3949ba59abbe56e057f20f883e"):
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
        "templateUuid": templateUuid,
        "generateParams": {
            "checkPointId": model,
            "prompt":  prompt,
            "sampler": 15,
            "steps": 20,
            "cfgScale": 7,
            "width": 768,
            "height": 1024,
            "imgCount": image_count
        }
    }
    
    param = {
          "templateUuid": "6f7c4652458d4802969f8d089cf5b91f", # 参数模板ID
          "generateParams": { # 基础参数

            "prompt": "azuki style lora,filmfotos, Asian portrait,A young woman wearing a green baseball cap,covering one eye with her hand", # 选填
            "steps": 20, # 采样步数
            "width": 768, # 宽
            "height": 1024, # 高
            "imgCount": 1, # 图片数量
            "seed": -1, # 随机种子值，-1表示随机
            "restoreFaces": 0,  # 面部修复，0关闭，1开启 # Lora添加，最多5个，不添加lora时请删除此结构体
            "additionalNetwork": [
                {
                    "modelId": "ad1cb6fdc1944d11bb2acbd27f2e7cfd", #LoRA的模型版本uuid
                    "weight": 1.0 # LoRA权重
                }
            ]
        }
    }
    path = '/api/generate/webui/text2img'
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


async def get_mode(versionUuid):
    if versionUuid is None:
        logger.error('versionUuid is None')
        return None
    param = {'versionUuid': versionUuid}

    path = '/api/model/version/get'
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

if __name__ == '__main__':
    #asyncio.run(get_mode(versionUuid='13bf69a0127a6a382b88f38d78f84f1f'))
    asyncio.run(get_image(message="an asian girl,20 years old,realistic,masterpiece,best quality"))


