# from fastapi import APIRouter, Request

import asyncio
import csv
import json
import logging
import os
import time

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter

from starlette.requests import Request

from utils.APIResponse import APIResponse
from utils.login_checker import check_login
from utils import redisUtils, ralte_limit_utils, context_utils
from framework import errorcode
from models.param_info import ADAccount, ADAccountParam
from service.account import art_account_service
from service.system import system_service
import uuid
from log import logger
from typing import Optional
from pydantic import BaseModel


router = APIRouter()


@router.post("/api/art/account/address/login")
async def login(body: ADAccountParam, request: Request):
    data = None
    address_type = body.type
    message = body.message
    signature = body.signature
    address = body.address
    invite_code = body.invite_code
    logger.info('art_login param = {}', body)
    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_art_account_address_register#{address}', limit=20, period=60)

    try:
        # 注册用户
        data = await art_account_service.login(address_type, address, message, signature, invite_code)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", body, e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/art/account/address/bind")
@check_login('art')
async def bind(body: ADAccount, request: Request):
    data = None
    user = await context_utils.get_current_user()
    if user is None:
        content_data = APIResponse(errorcode.REQUEST_PARAM_ILLEGAL, data, f" user_id is null ").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
    account_id = user.get('id', None)
    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_art_account_info#{account_id}', limit=20, period=60)
    address_type = body.type
    message = body.message
    signature = body.signature
    address = body.address
    try:
        # 绑定钱包
        data = await art_account_service.bind(account_id, address_type, address, message, signature)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/art/account/wallet/info")
@check_login('art')
async def get_account_wallet(request: Request):
    data = None
    user = await context_utils.get_current_user()
    if user is None:
        content_data = APIResponse(errorcode.REQUEST_PARAM_ILLEGAL, data, f" user_id is null ").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
    account_id = user.get('id', None)
    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_art_account_wallet_info#{account_id}', limit=20, period=60)

    try:
        # 查询推文内容，和验证码记录做比较
        data = await art_account_service.get_account_wallet(account_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
