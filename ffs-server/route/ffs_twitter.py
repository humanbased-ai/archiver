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
from utils import redisUtils, ralte_limit_utils
from framework import errorcode
from models.param_info import chatgpt_base, chatgpt_test, ffs_twitter, ffs_account
from service.bot.twitter import openai_service, twitter_service, post_service, user_service
import uuid
from log import logger


router = APIRouter()


@router.post("/api/web/twitter/code", summary="twitter验证码")
@check_login('web')
async def code(body: ffs_twitter, request: Request):
    data = None
    user_id = body.user_id

    codata_user_id = user_id

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_twitter_code#{codata_user_id}', limit=20, period=60)

    try:
        data = await user_service.gen_twitter_code(user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/twitter/user", summary="twitter用户信息")
@check_login('web')
async def user(body: ffs_twitter, request: Request):
    data = None
    user_id = body.user_id

    codata_user_id = user_id
    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_twitter_user#{codata_user_id}', limit=20, period=60)

    try:
        twitter_user_name = await user_service.get_twitter_user_name(user_id)
        data = {
            'twitter_user_name': twitter_user_name
        }
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/twitter/verify", summary="twitter验证")
@check_login('web')
async def verify(body: ffs_twitter, request: Request):
    data = None
    user_id = body.user_id
    link = body.link
    codata_user_id = user_id
    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_twitter_verify#{codata_user_id}', limit=20, period=60)

    try:
        # 查询推文内容，和验证码记录做比较
        data = await user_service.verify_twitter_user(link, user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/twitter/unbind", summary="twitter解绑")
@check_login('web')
async def unbind(body: ffs_twitter, request: Request):
    data = None
    user_id = body.user_id
    codata_user_id = user_id
    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_twitter_unbind#{codata_user_id}', limit=20, period=60)

    try:
        # 解除绑定
        data = await user_service.unbind_twitter_user(user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


