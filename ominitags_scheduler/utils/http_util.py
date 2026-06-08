import logging
import requests

logger = logging.getLogger(__name__)

CONTENT_TYPE_K = "content-type"
CONTENT_TYPE_V = "application/json"
ACCEPT_KEY = "accept"
X_API_KEY = "x-api-key"


async def http_post(url, headers, body, json):
    logger.info(f"http_post url:{url}")
    response = requests.post(url, headers=headers, data=body, json=json, timeout=60000)

    # check response status
    if response.status_code == 200:
        # 如果响应内容是JSON格式，可以使用 response.json() 来获取
        logger.info(f"HTTP request success，code: {response.status_code},response:{response.text}")
        return response.json()

    else:
        logger.info(f"HTTP request fail，code：{response.status_code},response:{response.text}")
        return None


async def http_post_with_timeout(url, headers, body, json, timeout):
    response = requests.post(url, headers=headers, data=body.encode(), json=json, timeout=timeout)

    # check response status
    if response.status_code == 200:
        # 如果响应内容是JSON格式，可以使用 response.json() 来获取
        logger.info(f"HTTP request success，code: {response.status_code},response:{response.text}")
        return response.json()

    else:
        logger.info(f"HTTP request fail，code：{response.status_code},response:{response.text}")
        return None


async def http_get(url, headers, params):
    response = requests.get(url, headers=headers, params=params)

    # 检查响应状态码
    if response.status_code == 200:
        # 如果响应内容是JSON格式，可以使用 response.json() 来获取
        return response.json()

    else:
        logger.info(f"HTTP request fail，code：{response.status_code},response:{response.text}")
        return None
