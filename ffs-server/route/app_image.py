import asyncio
import csv
import json
import logging
import os
import time

from fastapi import APIRouter, status, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter
from datetime import datetime
from starlette.requests import Request

from utils.exceptions import BusinessException
from utils.APIResponse import APIResponse
from utils.login_checker import check_login
from utils import redisUtils, ralte_limit_utils, context_utils, url_utils
from framework import errorcode
from models.param_info import AIAvatarParam
from service.bot.ai import image_service
from service.art import art_avatar_service

from log import logger


router = APIRouter()


@router.post("/api/ai/gen/avatar")
async def gen_avatar(body: AIAvatarParam,  request: Request):
    content = body.content
    image_count = body.image_count
    model = body.model
    data = None

    ip_address = await url_utils.get_ip(request)
    content_data = None
    account_id = await context_utils.get_account_id()
    try:
        # 每个用户每分钟10次
        await ralte_limit_utils.rate_limit(request_key=f'api_ai_avatar#{ip_address}', limit=5, period=60)
    except Exception as e:
        content_data = APIResponse(errorcode.HTTP_RATE_LIMIT, data, f"Too many operations, please try again later").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
    try:
        if image_count is None:
            image_count = 3
        if image_count > 5:
            image_count = 5
        data = await art_avatar_service.gen_image(account_id, content, image_count, model, ip_address, request)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except BusinessException as e:
        logger.exception("check error param = {}, {}", body, e)
        if e.code == 429:
            content_data = APIResponse(errorcode.HTTP_RATE_LIMIT, data, f"Too many operations, please try again later").set_api_dict()
        else:
            content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        #content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/ai/gen/records")
async def gen_avatar_records(body: AIAvatarParam,  request: Request):
    page_size = body.page_size
    page_no = body.page_no
    data = None
    account_id = body.account_id
    try:
        data = await art_avatar_service.find_image_record_page(account_id, page_no, page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

