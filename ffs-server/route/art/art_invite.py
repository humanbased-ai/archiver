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
from service.art import art_avatar_service, art_invite_service, art_reward_service
from service.account import art_account_service
from log import logger


router = APIRouter()


@router.get("/api/art/invite/get")
async def gen_avatar(request: Request):
    account_id = request.query_params.get("account_id")
    if account_id is None:
        account_id = await context_utils.get_account_id()

    ip_address = await url_utils.get_ip(request)
    content_data = None
    data = None
    try:
        data = await art_invite_service.get_info(account_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except BusinessException as e:
        logger.exception("check error param = {}, {}", account_id, e)
        if e.code == 429:
            content_data = APIResponse(errorcode.HTTP_RATE_LIMIT, data, f"Too many operations, please try again later").set_api_dict()
        else:
            content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/art/invite/page")
@check_login('art')
async def get_invite_records(body: AIAvatarParam,  request: Request):
    page_size = body.page_size
    page_no = body.page_no
    data = None
    address = body.address
    account_id = body.account_id
    if account_id is None:
        if address is not None and address != "":
            account = await art_account_service.get_account_by_address(address)
            if account is not None:
                account_id = account.get('id', None)
    if account_id is None:
        account_id = await context_utils.get_account_id()
    try:
        data = await art_invite_service.gen_invite_record_page(account_id, page_no, page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/art/discount/use")
@check_login('art')
async def discount_use(request: Request):
    discount_ids = request.query_params.get('discount_ids', '')
    account_id = request.query_params.get('account_id', None)
    if account_id is None:
        account_id = await context_utils.get_account_id()
    data = None
    try:
        data = await art_reward_service.discount_use(discount_ids.split(','), account_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
