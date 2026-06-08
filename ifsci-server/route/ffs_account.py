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

from utils.api_response import APIResponse
from utils.login_checker import check_login
from utils import rate_limit_utils
from framework import error_codes
from models.param_info import FfsAccount
from service.account import account_service
import uuid
from log import logger


router = APIRouter()


@router.post("/api/ffs/account/code", summary="twitter验证")
async def login(body: FfsAccount, request: Request):
    data = None
    user_id = body.address

    # 10 times per minute per user
    await rate_limit_utils.rate_limit(request_key=f'api_ffs_twitter_code#{user_id}', limit=20, period=60)

    try:
        data = {"message": "Please log in "}
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.HTTP_NOT_ACCOUNT, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/ffs/account/login", summary="twitter验证")
async def login(body: FfsAccount, request: Request):
    data = None
    user_id = body.address
    code = body.message
    sign = body.signature

    # 10 times per minute per user
    await rate_limit_utils.rate_limit(request_key=f'api_ffs_twitter_verify#{user_id}', limit=20, period=60)

    try:
        data = await account_service.verify_user(user_id, code, sign)
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.HTTP_NOT_ACCOUNT, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)

