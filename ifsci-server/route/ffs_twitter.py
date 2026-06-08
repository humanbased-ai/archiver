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
from utils import redis_utils, rate_limit_utils
from framework import error_codes
from models.param_info import ChatgptBase, ChatgptTest, FfsTwitter, FfsAccount
from service.bot.twitter import openai_service, twitter_service, post_service, user_service
import uuid
from log import logger


router = APIRouter()


@router.post("/api/ffs/twitter/code", summary="twitter验证码")
@check_login('ffs')
async def code(body: FfsTwitter, request: Request):
    data = None
    user_id = body.user_id

    codata_user_id = user_id

    # 10 times per minute per user
    await rate_limit_utils.rate_limit(request_key=f'api_ffs_twitter_code#{codata_user_id}', limit=20, period=60)

    try:
        data = await user_service.gen_twitter_code(user_id)
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/ffs/twitter/user", summary="twitter用户信息")
@check_login('ffs')
async def user(body: FfsTwitter, request: Request):
    data = None
    user_id = body.user_id

    codata_user_id = user_id
    # 10 times per minute per user
    await rate_limit_utils.rate_limit(request_key=f'api_ffs_twitter_user#{codata_user_id}', limit=20, period=60)

    try:
        twitter_user_name = await user_service.get_twitter_user_name(user_id)
        data = {
            'twitter_user_name': twitter_user_name
        }
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/ffs/twitter/verify", summary="twitter验证")
@check_login('ffs')
async def verify(body: FfsTwitter, request: Request):
    data = None
    user_id = body.user_id
    link = body.link
    codata_user_id = user_id
    # 10 times per minute per user
    await rate_limit_utils.rate_limit(request_key=f'api_ffs_twitter_verify#{codata_user_id}', limit=20, period=60)

    try:
        data = await user_service.verify_twitter_user(link, user_id)
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/ffs/twitter/unbind", summary="twitter解绑")
@check_login('ffs')
async def unbind(body: FfsTwitter, request: Request):
    data = None
    user_id = body.user_id
    codata_user_id = user_id
    # 10 times per minute per user
    await rate_limit_utils.rate_limit(request_key=f'api_ffs_twitter_unbind#{codata_user_id}', limit=20, period=60)

    try:
        data = await user_service.unbind_twitter_user(user_id)
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/ffs/post/page", summary="twitter验证码")
@check_login('ffs')
async def page(body: FfsAccount, request: Request):
    data = None
    user_id = body.user_id
    page_no = body.page_no
    page_size = body.page_size

    codata_user_id = user_id

    # 10 times per minute per user
    await rate_limit_utils.rate_limit(request_key=f'api_ffs_post_page#{codata_user_id}', limit=20, period=60)

    try:
        data = await post_service.get_user_post_page(user_id, page_no, page_size)
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)

