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
from models.param_info import ADAccount
from service.account import ad_account_service
from service.system import system_service
import uuid
from log import logger
from typing import Optional
from pydantic import BaseModel


router = APIRouter()


@router.post("/api/ad/account/register")
async def register(body: ADAccount, request: Request):
    data = None
    user_id = body.user_id
    message = body.message
    sign = body.signature
    address = body.address
    sol_address = body.sol_address
    '''if user_id is None:
        content_data = APIResponse(errorcode.REQUEST_PARAM_ILLEGAL, data, f" user_id is null ").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
    if sol_address is None or sol_address == '':
        content_data = APIResponse(errorcode.REQUEST_PARAM_ILLEGAL, data, f" sol_address is null ").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
        '''
    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_ad_account_register#{address}', limit=20, period=60)

    try:
        # 注册用户
        data = await ad_account_service.register(user_id, address, message, sign, sol_address)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/ad/account/info")
#@check_login('codata')
async def info(body: ADAccount, request: Request):
    data = None
    user_id = body.user_id
    if user_id is None:
        content_data = APIResponse(errorcode.REQUEST_PARAM_ILLEGAL, data, f" user_id is null ").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_ad_account_info#{user_id}', limit=20, period=60)

    try:
        # 查询推文内容，和验证码记录做比较
        data = await ad_account_service.get_user_detail_by_address(user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/ad/account/score")
#@check_login('codata')
async def get_score(body: ADAccount, request: Request):
    data = None
    user_id = body.user_id
    if user_id is None:
        content_data = APIResponse(errorcode.REQUEST_PARAM_ILLEGAL, data, f" user_id is null ").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_ad_account_info#{user_id}', limit=20, period=60)

    try:
        # 查询推文内容，和验证码记录做比较
        data = await ad_account_service.get_user_score(user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/ad/app/expire")
async def check_app_expire(body: ADAccount, request: Request):
    data = None
    device_id = body.device_id
    secret_key = body.secret_key

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_ad_app_expire#{secret_key}', limit=20, period=60)

    try:
        data = await ad_account_service.check_app_expire(device_id, secret_key)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))



class VerificationResponse(BaseModel):
    result: dict = {"isValid": bool}
    error: Optional[str] = None


@router.get("/api/task/verification")
async def task_verification(request: Request):
    data = None
    address = request.query_params.get('address', None)
    is_valid = False
    try:
        if address is not None:
            address = address.lower()
            ad_task_address_list = await system_service.get_config_data_type_value_by_key('ad_task_address_list')
            if ad_task_address_list is not None:
                ad_task_address_list = str(ad_task_address_list).lower().split(',')
                if address in ad_task_address_list:
                    is_valid = True
        data = {}
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        is_valid = False
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return VerificationResponse(result={"isValid": is_valid}, error=None)
