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
from models.param_info import ffs_account, CheckinParam, RewardParam, RedeemParam
from service.account import account_service, checkin_service, account_reward_service, account_redeem_service
import uuid
from log import logger


router = APIRouter()


@router.post("/api/web/account/code")
async def login(body: ffs_account, request: Request):
    data = None
    user_id = body.address

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_account_code#{user_id}', limit=20, period=60)

    try:
        # 查询推文内容，和验证码记录做比较
        data = {"message": "Please log in "}
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/account/login")
async def login(body: ffs_account, request: Request):
    data = None
    user_id = body.address
    code = body.message
    sign = body.signature

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_accountr_login#{user_id}', limit=20, period=60)

    try:
        # 查询推文内容，和验证码记录做比较
        data = await account_service.verify_user(user_id, code, sign)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/account/info")
async def info(body: ffs_account, request: Request):
    data = None
    user_id = body.user_id

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_account_info#{user_id}', limit=20, period=60)

    try:
        # 查询推文内容，和验证码记录做比较
        data = await account_service.get_user_detail(user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

