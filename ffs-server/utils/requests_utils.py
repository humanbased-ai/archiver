import httpx
import asyncio
import aiohttp
from log import logger
import json


async def get(url, headers=None):
    """
    使用 httpx 发送异步 GET 请求
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(url=url, headers=headers)
        return response


async def post(url, json, headers=None, timeout=5):
    """
    使用 httpx 发送异步 POST 请求
    :param url: 请求的 URL
    :param payload: 要发送的数据（字典）
    :return: 响应的 JSON 数据
    """
    logger.info('http.post url = {}, param = {}, headers = {}', url, json, headers)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url=url, json=json, headers=headers)
        return response


async def post_data_by_aiohttp(url, param, headers=None):
    async with aiohttp.ClientSession() as session:
        async with session.post(url=url, json=param, headers=headers) as response:
            return response


async def download_file_httpx(url):
    """
    使用 httpx 异步流式下载文件
    :param url: 文件的 URL
    :param save_path: 本地保存路径
    """
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as response:
            return response


if __name__ == "__main__":  # debug

    url = 'http://127.0.0.1:8000'
    asyncio.run(
        download_file_httpx(url=url, json={"url": "http://www.baidu.com"})
    )