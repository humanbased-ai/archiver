from fastapi import APIRouter
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from utils.login_checker import check_login
from log import logger
import httpx
import json
import io

router = APIRouter()

# 目标服务器映射
TARGET_SERVERS = {
    "openai":
        {
            "host": "https://api.openai.com",
            "key": "<OPENAI_KEY_REDACTED>"
        },
    "deepseek":
        {
            "host": "https://api.deepseek.com",
            "key": ""
         }
}


@router.api_route("/api/ad/{server_name}/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
@check_login('ad')
async def proxy_request(server_name: str, full_path: str, request: Request):


    # 解析请求 Body
    body = await request.body()
    json_body = json.loads(body.decode("utf-8"))  # 转换为 Python 字典

    logger.info(' server = {}, full_url = {}, headers = {}', server_name, full_path, body)

    # 根据 Header 选择目标服务
    target_server = TARGET_SERVERS.get(server_name, None)
    if not target_server:
        return {"error": "Invalid target service"}

    # 构造完整的目标 URL
    host = target_server.get('host', None)
    full_url = f"{host}/{full_path}"
    app_key = target_server.get('key', None)

    # 使用 httpx 转发请求
    header_items = dict(request.headers)
    if 'host' in header_items:
        del header_items['host']
    if 'accept-encoding' in header_items:
        del header_items['accept-encoding']

    header_items['authorization'] = f'Bearer {app_key}'

    headers = {'Content-Type': 'application/json', 'authorization': f'Bearer {app_key}'}
    header_items = headers
    logger.info(' server = {}, full_url = {}, headers = {}', server_name, full_url, header_items)
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.request(
            method=request.method,
            url=full_url,
            headers=header_items,
            params=request.query_params,
            content=json.dumps(json_body)
        )

        # 检查 Content-Type
        content_type = response.headers.get('Content-Type', '')
        logger.info(" open_ai response.status_code ={},  text = {}", response.status_code, response.text)
        if 'application/json' in content_type:

            try:
                # 尝试解析为 JSON
                content_data = response.json()
            except json.JSONDecodeError:
                # 如果解析 JSON 失败，记录警告并返回原始文本
                content_data = response.text
                logger.warning(f"Failed to decode JSON from response: {response.text}")
        else:
            # 如果不是 JSON，直接返回原始二进制数据（如图片、文件等）
            logger.info(" open_ai response: {}", response.content)
            content_data = response.content
            return StreamingResponse(io.BytesIO(content_data), media_type=content_type)

        return JSONResponse(content=jsonable_encoder(content_data), status_code=response.status_code)








