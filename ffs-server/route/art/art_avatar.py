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
from service.art import art_avatar_service
from service.account import art_account_service
from log import logger


router = APIRouter()


@router.post("/api/art/avatar/gen")
#@check_login('art')
async def gen_avatar(body: AIAvatarParam,  request: Request):
    content = body.content
    image_count = body.image_count
    model = body.model
    tool = body.tool
    account_id = body.account_id
    if account_id is None:
        account_id = await context_utils.get_account_id()

    ip_address = await url_utils.get_ip(request)
    content_data = None
    data = None
    try:
        # 每个用户每分钟10次
        await ralte_limit_utils.rate_limit(request_key=f'api_art_ai_avatar#{ip_address}', limit=5, period=60)
    except Exception as e:
        content_data = APIResponse(errorcode.HTTP_RATE_LIMIT, data, f"Too many operations, please try again later").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
    try:
        if image_count is None:
            image_count = 3
        if image_count > 5:
            image_count = 5
        data = await art_avatar_service.gen_image(account_id, content, image_count, model, ip_address, request, tool)
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


@router.post("/api/art/avatar/chain")
@check_login('art')
async def avatar_chain(body: AIAvatarParam,  request: Request):
    image_url = body.image_url
    chain_hash = body.chain_hash
    record_id = body.record_id
    nft_name = body.nft_name
    nft_description = body.nft_description
    chain_fees = body.chain_fees
    data = None

    user = await context_utils.get_current_user()
    account_id = body.account_id
    if account_id is None:
        account_id = await context_utils.get_account_id()
    ip_address = await url_utils.get_ip(request)
    content_data = None
    try:
        # 每个用户每分钟10次
        await ralte_limit_utils.rate_limit(request_key=f'api_art_avatar_chain#{ip_address}', limit=5, period=60)
    except Exception as e:
        content_data = APIResponse(errorcode.HTTP_RATE_LIMIT, data, f"Too many operations, please try again later").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
    try:
        data = await art_avatar_service.avatar_chain(account_id, image_url, chain_hash, record_id, nft_name
                                                     , nft_description, chain_fees)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except BusinessException as e:
        logger.exception("check error param = {}, {}", body, e)
        if e.code == 429:
            content_data = APIResponse(errorcode.HTTP_RATE_LIMIT, data, f"Too many operations, please try again later").set_api_dict()
        else:
            content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", body, e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/art/avatar/page")
@check_login('art')
async def gen_avatar_records(body: AIAvatarParam,  request: Request):
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
        data = await art_avatar_service.gen_image_record_page(account_id, page_no, page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/art/avatar/get")
async def get_avatar_record(request: Request):

    record_id = request.query_params.get('record_id', None)

    try:
        data = await art_avatar_service.get_avatar_record(record_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

