from fastapi import APIRouter
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from utils.login_checker import check_login
from log import logger
import httpx
import json
import io
from service.system import system_service
import setting
from utils import redisUtils

router = APIRouter()

# 目标服务器映射
TARGET_SERVERS = {
    "twitterapi":
        {
            "host": "https://api.twitterapi.io",
            "headers": {
                "X-API-Key": "1a7f72c172ba41048e71a02b10359000"
            }
        },
    "coingecko":
        {
            "host": "https://api.coingecko.com",
            "headers": {
                "x-cg-demo-api-key": "CG-F6xRpFbWjzFNbJ4R7HTsZ3m9"
            }
        },
    "tavilyapi":
        {
            "host": "https://api.tavily.com",
            "headers": {
                "Authorization": "Bearer <TAVILY_TOKEN_REDACTED>"
            }
        }
}


async def get_server_config(server_name: str):
    target_server = None
    api_proxy_str: str = None
    config_key = 'api_proxy'
    if setting.RUN_ENV == 'dev1':
        #api_proxy_str = await system_service.get_config_data_type_value_by_key(config_key)
        target_server = TARGET_SERVERS.get(server_name, None)
    else:
        api_proxy_str = await system_service.get_config_data_type_value_from_redis_by_key(config_key)
        if api_proxy_str is not None and api_proxy_str != '':
            api_proxy_data = json.loads(str(api_proxy_str))
            target_server = api_proxy_data.get(server_name, None)
    return target_server


@router.api_route("/api/server/{server_name}/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_request(server_name: str, full_path: str, request: Request):

    host = request.query_params.get('host')
    # 获取服务信息
    target_server = await get_server_config(server_name)
    config_headers = None
    if target_server is not None:
        if host is None or host == '':
            host = target_server.get('host', None)
        config_headers = target_server.get('headers', None)

    '''if host is None or host == '':
        # 根据 Header 选择目标服务
        target_server = TARGET_SERVERS.get(server_name, None)
        if target_server is None:
            return JSONResponse(content=jsonable_encoder("Invalid target service"), status_code=404)
        host = target_server.get('host', None)'''

    # 解析请求 Body
    body = await request.body()
    json_body = None
    try:
        json_body = json.loads(body.decode("utf-8"))  # 转换为 Python 字典
    except Exception as e:
        logger.error('body to json error ', e)
    logger.info(' server = {}, full_url = {}, query_params = {}, body = {}', server_name, full_path,request.query_params, body)

    full_url = f"{host}/{full_path}"

    # 使用 httpx 转发请求
    header_items = dict(request.headers)
    if 'host' in header_items:
        del header_items['host']
    if 'accept-encoding' in header_items:
        del header_items['accept-encoding']

    use_config = header_items.get('use_config', None)
    if target_server is not None:
        if use_config is None:
            use_config = target_server.get('use_config', '0')

    # 设置header信息
    if config_headers is not None and (use_config == '1' or use_config == 1):
        for header_name in config_headers:
            header_value = config_headers.get(header_name, None)

            org_header_name = str(header_name).lower()
            org_header_value = header_items.get(org_header_name, None)

            # 如果header中key未存在或者值为空,则存入配置中的值
            if header_value is not None and header_value != '':
                header_items[org_header_name] = header_value

    logger.info(' server = {}, full_url = {}, headers = {}, json_body = {}', server_name, full_url, header_items, json_body)
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.request(
            method=request.method,
            url=full_url,
            headers=header_items,
            params=request.query_params,
            content=body if request.method in ["POST", "PUT"] else None
        )
        # 检查 Content-Type
        content_type = response.headers.get('Content-Type', '')
        logger.info(" proxy_request response.status_code ={}, content_type={},  text = {}"
                    , response.status_code, content_type, response.text)
        content_data = response.text
        if 'application/json' in content_type:
            content_data = response.json()
        else:
            return StreamingResponse(response.aiter_bytes(), media_type=response.headers.get("Content-Type", "application/octet-stream"))

        return JSONResponse(content=content_data, status_code=response.status_code)

