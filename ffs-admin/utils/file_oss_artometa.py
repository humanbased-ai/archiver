from datetime import datetime, timedelta, timezone
import re
from lxml import etree
from bs4 import BeautifulSoup
from urllib.request import urlopen
import requests
import json
import oss2
import asyncio
import aiofiles
import httpx
import aiohttp
from oss2.credentials import EnvironmentVariableCredentialsProvider
from itertools import islice
from log import logger

import setting
import os
from concurrent.futures import ThreadPoolExecutor


os.environ['OSS_ACCESS_KEY_ID'] = setting.OSS_ACCESS_KEY_ID
os.environ['OSS_ACCESS_KEY_SECRET'] = setting.OSS_ACCESS_KEY_SECRET

auth = oss2.ProviderAuthV4(EnvironmentVariableCredentialsProvider())
# 填写Bucket所在地域对应的Endpoint。以华东1（杭州）为例，Endpoint填写为https://oss-cn-hangzhou.aliyuncs.com。
endpoint = "https://oss-ap-southeast-1.aliyuncs.com"

# 填写Endpoint对应的Region信息，例如cn-hangzhou。注意，v4签名下，必须填写该参数
region = "ap-southeast-1"
spiderBucketName = "artometa"
# yourBucketName填写存储空间名称。
bucket = oss2.Bucket(auth, endpoint, spiderBucketName, region=region)

# 线程池执行器
executor = ThreadPoolExecutor()


async def exist_file(oss_object_key):
    """
    异步检查 OSS 对象是否存在
    :param bucket: oss2.Bucket 实例
    :param object_name: 要检查的对象路径（文件名）
    :return: True 如果对象存在，否则 False
    """


    exist = False
    if oss_object_key is not None and oss_object_key !='':
        loop = asyncio.get_event_loop()
        try:
            # 在线程池中执行同步方法
            exist = await loop.run_in_executor(executor, bucket.object_exists, oss_object_key)
        except oss2.exceptions.NoSuchKey:
            logger.error('f object_exists NoSuchKey {}', oss_object_key)
        except Exception as e:
            logger.error('f object_exists error {}, {}', oss_object_key, e)
        #exist = bucket.object_exists(oss_object_key)
    return exist


async def get_object(oss_object_key):
    logger.info('get object from oss object {}', oss_object_key)
    response = None
    #response = bucket.get_object(oss_object_key)
    if oss_object_key is not None and oss_object_key !='':
        loop = asyncio.get_event_loop()
        try:
            # 在线程池中执行同步方法
            response = await loop.run_in_executor(executor, bucket.get_object, oss_object_key)
        except Exception as e:
            logger.error('f object_exists error {}, {}', oss_object_key, e)
    return response


# 生成有效期为2小时的URL
async def get_oss_url_by_path(oss_object_key, timeout=60*60*2):
    url = ''
    '''exist = bucket.object_exists(oss_object_key)
    if exist:
        url = bucket.sign_url('GET', key=oss_object_key, expires=timeout)
        '''
    if oss_object_key is not None and oss_object_key !='':
        loop = asyncio.get_event_loop()
        try:
            # 在线程池中执行同步方法
            url = await loop.run_in_executor(executor, bucket.sign_url, 'GET', oss_object_key, timeout)
        except Exception as e:
            logger.error('f sign_url error {}, {}', oss_object_key, e)
    return url


async def get_oss_content_by_path(oss_object_key, timeout=60*60*2):
    content = ''
    if oss_object_key is not None and oss_object_key !='':
        loop = asyncio.get_event_loop()
        try:
            # 在线程池中执行同步方法
            result = await loop.run_in_executor(executor, bucket.get_object, oss_object_key)
            if result.status == 200:
                content = result.read()
        except Exception as e:
            logger.error('f get_object error {}, {}', oss_object_key, e)
    '''exist = bucket.object_exists(oss_object_key)
    if exist:
        result = bucket.get_object(oss_object_key)
        if result.status == 200:
            content = result.read()
            '''
    return content


async def upload_oss_by_text(file_content, path):
    result = None
    logger.info('upload file {}', path)
    oss_object_key = path
    if oss_object_key is not None and oss_object_key !='':
        loop = asyncio.get_event_loop()
        try:
            # 在线程池中执行同步方法
            result = await loop.run_in_executor(executor, bucket.put_object, oss_object_key, file_content)
            if result.status == 200:
                return result
            else:
                logger.error('upload oss upload error {}', result.status_code)
        except Exception as e:
            logger.error('upload {} oss upload error {}', path, e)
            msg = f'{e}'
            if 'surrogates not allowed' in msg:
                file_content2 = file_content.encode('utf-8', 'replace').decode()
                result = await loop.run_in_executor(executor, bucket.put_object, oss_object_key, file_content2)
                if result.status == 200:
                    return result
    '''
    try:
        result = bucket.put_object(path, file_content)
        if result.status == 200:
            return result
        else:
            logger.error('upload oss upload error {}', result.status_code)
    except Exception as e:
        logger.error('upload {} oss upload error {}', path, e)
    '''

    return result


# 异步下载文件
async def download_file(url, local_file_path):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            with open(local_file_path, 'wb') as f:
                f.write(await response.read())


# 同步上传文件到OSS
def upload_file_to_oss(local_file_path, object_name):
    result = bucket.put_object_from_file(object_name, local_file_path)
    return result


async def async_upload_oss_by_local_path(local_path, path):
    loop = asyncio.get_event_loop()
    result = None
    with ThreadPoolExecutor() as pool:
        times = datetime.now(timezone.utc).timestamp()
        # 同步上传文件到OSS（在线程池中运行以避免阻塞）
        result = await loop.run_in_executor(pool, upload_file_to_oss, local_path, path)
    logger.info('async_upload_oss_by_local_path {} => {}, result = {}', local_path, path, result)
    return result


# TODO 待优化
async def async_upload_oss_by_url(url, path):
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        times = datetime.now(timezone.utc).timestamp()
        
        filename = f'/tmp/local_file{times}.tmp'
        # 异步下载文件
        await loop.run_in_executor(pool, download_file, url, filename)
        # 同步上传文件到OSS（在线程池中运行以避免阻塞）
        result = await loop.run_in_executor(pool, upload_file_to_oss, filename, path)
    return result


async def upload_oss_by_url(url, path):
    input = None
    oss_object_key = path
    exist = await exist_file(oss_object_key)
    if exist:
        logger.info('file exist {}', path)
        return path
    try:
        #input = await requests_utils.download_file_httpx(url)
        input = requests.get(url, stream=True)
        #input = proxy_utils.get(url,'local')
    except Exception as e:
        logger.error('get http file error {}', e)
    if input is None:
        return None

    result = None
    if input.status_code == 200:
        logger.info('upload file {}', path)
        result = await upload_oss_by_path(path, input)
    else:
        logger.error('upload oss get File error {}, {}', input.status_code, input.text)
    return result


async def upload_oss_by_path(oss_object_key, input):
    result = None
    if oss_object_key is not None and oss_object_key !='':
        loop = asyncio.get_event_loop()
        try:
            # 在线程池中执行同步方法
            result = await loop.run_in_executor(executor, bucket.put_object, oss_object_key, input)
            if result.status != 200:
                logger.error('upload oss upload error {}', result.status_code)
        except Exception as e:
            logger.error('f put_object error {}, {}', oss_object_key, e)
    return result


def test_list_file():
    for b in islice(oss2.ObjectIterator(bucket), 10):
        print(b.key)


def test_get():
    path = 'instagram/img/20241031180022.jpg'
    exist = bucket.object_exists(path)
    if exist:
        result = bucket.get_object(path)
        #生成有效期为2小时的URL
        timeout = 60*60*2
        url = bucket.sign_url('GET', key=path, expires=timeout)
        print(url)
        resut = bucket.get_object(path)
        if resut.status == 200:
            content = resut.read()
            print(resut)


def test_put():
    url = 'https://scontent.cdninstagram.com/v/t51.29350-15/454149014_4184685555091363_5402756850729200430_n.webp?stp=dst-jpg_e35&efg=eyJ2ZW5jb2RlX3RhZyI6ImltYWdlX3VybGdlbi43Njh4Nzc3LnNkci5mMjkzNTAuZGVmYXVsdF9pbWFnZSJ9&_nc_ht=scontent.cdninstagram.com&_nc_cat=107&_nc_ohc=WAYgFmAptCgQ7kNvgE6EpPy&_nc_gid=8725b624adca49158a5597d98620f7c6&edm=APs17CUBAAAA&ccb=7-5&ig_cache_key=MzQyODA5MjE5Njc0Mjc0NDIzMw%3D%3D.3-ccb7-5&oh=00_AYC7M1d24EpP8Om8WuLDWKrJkkn7X2CAdZjrL9BmCfR5uA&oe=67291D87&_nc_sid=10d13b'

    path = 'instagram/img/'+datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")+'.jpg'
    result = upload_oss_by_url(url, path)
    logger.info('upload result = {}', result)


if __name__ == "__main__":  # debug
    #test_list_file()
    #test_put()
    test_get()
    #upload_oss_by_text('<html>ss</html>','instagram/html/post/test.html')
    upload_oss_by_url('https://dl.snapcdn.app/get?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJodHRwczovL3Njb250ZW50LmNkbmluc3RhZ3JhbS5jb20vbzEvdi90MTYvZjEvbTg2L0U4NDcwMThGM0U1QUE4QTc1RkZDQUVBNDc3REY1MEFBX3ZpZGVvX2Rhc2hpbml0Lm1wND9lZmc9ZXlKNGNIWmZZWE56WlhSZmFXUWlPamcwTkRZMU9ERTJOREl5TWpBeU9Td2lkbVZ1WTI5a1pWOTBZV2NpT2lKNGNIWmZjSEp2WjNKbGMzTnBkbVV1U1U1VFZFRkhVa0ZOTGtOTVNWQlRMa016TGpjeU1DNWtZWE5vWDJKaGMyVnNhVzVsWHpGZmRqRWlmUSZfbmNfaHQ9c2NvbnRlbnQtYXJuMi0xLmNkbmluc3RhZ3JhbS5jb20mX25jX2NhdD0xMDImdnM9Y2JlN2FmM2I3YWY2NGQ4Jl9uY192cz1IQmtzRlFJWVVtbG5YM2h3ZGw5eVpXVnNjMTl3WlhKdFlXNWxiblJmYzNKZmNISnZaQzlGT0RRM01ERTRSak5GTlVGQk9FRTNOVVpHUTBGRlFUUTNOMFJHTlRCQlFWOTJhV1JsYjE5a1lYTm9hVzVwZEM1dGNEUVZBQUxJQVFBVkFoZzZjR0Z6YzNSb2NtOTFaMmhmWlhabGNuTjBiM0psTDBkSU1EWjFlSE50YVZGdmRsWlNTVU5CVFZoV1pVTjBPRVZ6V21OaWNWOUZRVUZCUmhVQ0FzZ0JBQ2dBR0FBYkFvZ0hkWE5sWDI5cGJBRXhFbkJ5YjJkeVpYTnphWFpsWDNKbFkybHdaUUV4RlFBQUpwcWhydDNKallBREZRSW9Ba016TEJkQU52ZEx4cWZ2bmhnU1pHRnphRjlpWVhObGJHbHVaVjh4WDNZeEVRQjFfZ2NBJmNjYj05LTQmb2g9MDBfQVlESmFteVp2MjJaQTI2SG9abFB0X2w1ZGE0aTE4UHhIUEVCdnRjWnNnWHVXdyZvZT02NzM1NTkxOCZfbmNfc2lkPTFkNTc2ZCIsImZpbGVuYW1lIjoiU25hcFZpZC5OZXRfRTg0NzAxOEYzRTVBQThBNzVGRkNBRUE0NzdERjUwQUFfdmlkZW9fZGFzaGluaXQubXA0IiwibmJmIjoxNzMxNDI5ODgwLCJleHAiOjE3MzE0MzM0ODAsImlhdCI6MTczMTQyOTg4MH0.3pdBL9D81BMksRa4PM5cotOVV5ltNzKKJNCcNI0U8r4'
                      ,'instagram/video/file1.mp4')


