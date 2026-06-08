# from dotenv import load_dotenv, find_dotenv
from log import logger
from openai import OpenAI, BadRequestError, AsyncOpenAI
from typing import Union, Mapping, Optional, cast
import setting
import asyncio
import json
import threading
from datetime import datetime, timedelta, timezone
import concurrent.futures
from utils.exceptions import BusinessException

#client = OpenAI(api_key=setting.open_ai_key_image)
#clientSync = OpenAI(api_key=setting.open_ai_key_image)
client = AsyncOpenAI(api_key=setting.open_ai_key_image)


# 获取图片
async def get_image(message, image_count=1, model="m3"):
    result = {}
    image_urls = []

    if model == None or model == "":
        model = "m3"
    if image_count == None or image_count == "":
        image_count = 1
    if image_count > 5:
        image_count = 5
    logger.info('gen image model = {}, image_count = {}, message = {}', model, image_count, message)
    if model == "m3t":
        # 多线程批量创建
        prompt = f'''
            我的一个同事在参加一个活动，需要生成人物头像图片，图片的风格描述如下：
            "{message}"
            请根据描述生成一个人物头像图片。
            '''
        try:
            image_urls = await getOpenaiResponse_by_m3_pool(prompt, image_count)
            result['image_urls'] = image_urls
            result['error'] = ''
        except BadRequestError as e:
            logger.exception('getOpenaiResponse error = {}', e)
            result['error'] = e.message
            result['image_urls'] = []
            if e.code == 429:
                raise BusinessException(code=429, msg=e.message)
            else:
                raise BusinessException(code=500, msg=e.message)
        except Exception as e:
            logger.exception('getOpenaiResponse error = {}', e)
            result['error'] = f'{e}'
            result['image_urls'] = []
            raise BusinessException(code=500, msg=f"{e}")
    elif model == "m3":
        prompt = f'''
            我的一个同事在参加一个活动，需要生成人物头像图片，图片的风格描述如下：
            "{message}"
            请根据描述生成一个人物头像图片。
            '''
        for i in range(image_count):
            try:
                results = []
                results = await getOpenaiResponse_by_async_m3(prompt=prompt)
                image_urls = image_urls + results
                #await asyncio.sleep(10)
            except BadRequestError as e:
                logger.exception('getOpenaiResponse error = {}', e)
                result['error'] = e.message
                result['image_urls'] = []
                if e.code == 429:
                    raise BusinessException(code=429, msg=e.message)
                else:
                    raise BusinessException(code=500, msg=e.message)
            except Exception as e:
                logger.exception('getOpenaiResponse error = {}', e)
                result['error'] = f'{e}'
                result['image_urls'] = []
                raise BusinessException(code=500, msg=f"{e}")
        result['image_urls'] = image_urls
        result['error'] = ''
    elif model == "m2":
        prompt = f'''
        我的一个同事在参加一个活动，需要生成人物头像图片，图片的风格描述如下：
        "{message}"
        请根据描述生成一个人物头像图片。只有一个人物头像哦。
        '''
        try:
            results = await getOpenaiResponse_by_m2(prompt=prompt, image_count=image_count)
            image_urls = image_urls + results
            result['image_urls'] = image_urls
            #result['message'] = message
            result['error'] = ''
        except BadRequestError as e:
            logger.exception('getOpenaiResponse error = {}', e)
            result['error'] = e.message
            result['image_urls'] = []
            if e.code == 429:
                raise BusinessException(code=429, msg=e.message)
            else:
                raise BusinessException(code=500, msg=e.message)
        except Exception as e:
            logger.exception('getOpenaiResponse error = {}', e)
            result['error'] = f'{e}'
            result['image_urls'] = []
            raise BusinessException(code=500, msg=f"{e}")
    logger.info('gen image result = {}', result)
    return result


async def getOpenaiResponse_by_m3_pool(prompt, image_count):
    max_threads = 3
    results = []
    num = 0
    with concurrent.futures.ThreadPoolExecutor(max_threads) as executor:
        for i in range(image_count):
            num = num + 1
            future_to_prompt = {executor.submit(getOpenaiResponse_by_m3, prompt)}
        for future in concurrent.futures.as_completed(future_to_prompt):
            results.append(future.result())
    logger.info('gen finish image_count = {}, count = {}', image_count, num)
    return results


# 调用OpenAI获取对话
async def getOpenaiResponse_by_m2(prompt, image_count=1):
    image_urls = []
    response = await client.images.generate(
        model="dall-e-2",
        n=image_count,  # 生成 1 张图片,
        size="512x512",
        prompt=prompt
    )
    if response is not None:
        datas = response.data
        if datas is not None and len(datas) > 0:
            for data in datas:
                image_url = data.url
                image_urls.append(image_url)
    logger.info('create openai image content = {}', response)
    return image_urls


# 调用OpenAI获取对话
async def getOpenaiResponse_by_async_m3(prompt):
    image_urls = []
    response = await client.images.generate(
        model="dall-e-3",
        n=1,  # 生成 1 张图片,
        size="1024x1024",
        prompt=prompt
    )
    if response is not None:
        datas = response.data
        if datas is not None and len(datas) > 0:
            for data in datas:
                image_url = data.url
                image_urls.append(image_url)
    logger.info('create openai image content = {}', response)
    return image_urls


def getOpenaiResponse_by_m3(prompt):
    image_urls = []
    response = asyncio.run(client.images.generate(
        model="dall-e-3",
        n=1,  # 生成 1 张图片,
        size="1024x1024",
        prompt=prompt
    ))
    if response is not None:
        datas = response.data
        if datas is not None and len(datas) > 0:
            for data in datas:
                image_url = data.url
                image_urls.append(image_url)
    logger.info('create openai image content = {}', response)
    return image_urls


if __name__ == '__main__':

    content = asyncio.run(get_image(message="小说武侠人物", model="m3", image_count=2))
    print(content)
