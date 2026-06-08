import asyncio
import csv
import json
import logging
import os
import time

from fastapi import APIRouter, status, FastAPI, File, UploadFile, Header
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter

from starlette.requests import Request

from utils.APIResponse import APIResponse
from utils.login_checker import check_login
from utils import redisUtils, ralte_limit_utils, file_oss
from framework import errorcode
from models.param_info import chatgpt_base, PostParam
from service.account import account_service
from service.bot.twitter import post_service
import uuid
from log import logger
import setting


router = APIRouter()


@router.post("/api/web/file/upload")
@check_login('web')
async def file_upload(file: UploadFile = File(...),
                      token: str = Header('token'),):
    data = None

    try:
        # 读取文件内容
        file_content = await file.read()
        filename = file.filename
        extension = filename.split('.')[-1]
        file_code = str(uuid.uuid4())[:20].replace('-', '')
        fpath = f'tw/img/{file_code}.{extension}'
        result = await file_oss.upload_oss_by_path(fpath, file_content)
        if result is not None:
            img_domain = setting.OSS_IMAGE_DATA_DOMAIN
            url = f'{img_domain}/{fpath}'
            data = {'filename': filename, 'url': url}
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

