from urllib.parse import urlparse, parse_qsl
from utils.ip_region import ip_utils
from log import logger
import random


async def get_params(url):
    # 解析 URL
    parsed_url = urlparse(url)

    # 获取查询参数部分
    query_params = parse_qsl(parsed_url.query)

    # 将查询参数转换为字典（每个参数只取一个值）
    query_dict = {key: value for key, value in query_params}
    return query_dict


async def get_location_from_request(request):
    ip_address = await get_ip(request)
    data = await get_location(ip_address)
    return data


async def get_ip(request):
    ip_address = None
    try:
        if request is not None and request.headers is not None:
            forwarded_for = None
            if "X-Forwarded-For" in request.headers:
                forwarded_for = request.headers.get("X-Forwarded-For",None)
                if forwarded_for:
                    ip_address = forwarded_for.split(',')[0]
                else:
                    ip_address = request.client.host
    except Exception as e:
        logger.error('get_ip error = {}', e)
    return ip_address


async def get_location(ip_address):
    area = None
    country = None
    city = None
    if ip_address is not None:
        ip_data = ip_utils.ip_utils.search(ip_address)
        if ip_data is not None:
            logger.info('ip_data =  {}', ip_data)
            country = ip_data.split('|')[0]
            if '|' in ip_data:
                ip_datas = ip_data.split('|')
                if len(ip_datas) == 2:
                    city = ip_data.split('|')[1]
                if len(ip_datas) == 3:
                    city = ip_data.split('|')[2]

    return {'area': area, 'country': country, 'city': city}


if __name__ == "__main__":
    page_max_size = 10
    page_size = int(random.uniform(1, page_max_size))
    print(page_size)
