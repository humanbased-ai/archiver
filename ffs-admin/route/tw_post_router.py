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
from utils.exceptions import BusinessException
from framework import errorcode
from models.param_info import chatgpt_base, PostParam, AnnotationParam
from service.account import account_service
from service.bot.twitter import post_service, point_openai_service
from service.system import web_service
import uuid
from log import logger


router = APIRouter()


@router.post("/api/web/post/get")
async def get_post_detail(body: PostParam, request: Request):
    data = None
    code = body.code
    comment_uid = code
    user_id = body.user_id
    await ralte_limit_utils.rate_limit(request_key=f'api_web_post_code#{code}', limit=100, period=60)
    try:
        uid = await web_service.get_twitter_uid(code)
        if uid is not None:
            comment_uid = uid
        data = await post_service.get_post_detail(comment_uid, user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/post/page")
async def post_page(body: PostParam, request: Request):
    data = None
    user_id = body.user_id
    page_no = body.page_no
    page_size = body.page_size
    annotation_user_id = body.annotation_user_id
    codata_user_id = user_id
    await ralte_limit_utils.rate_limit(request_key=f'api_web_post_page#{codata_user_id}', limit=100, period=60)

    try:
        data = await post_service.get_user_post_page(user_id, annotation_user_id, page_no, page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/web/annotation/check")
async def get_annotation_result(body: PostParam, request: Request):
    data = None
    user_id = body.user_id
    code = body.code
    comment_uid = code
    try:
        uid = await web_service.get_twitter_uid(code)
        if uid is not None:
            comment_uid = uid
        data = await post_service.get_annotation_enable(user_id, comment_uid)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", body, e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/web/annotation/result")
async def get_annotation_result(body: PostParam, request: Request):
    data = None

    user_id = body.user_id
    code = body.code
    comment_uid = code
    try:
        uid = await web_service.get_twitter_uid(code)
        if uid is not None:
            comment_uid = uid
        data = await post_service.get_annotation_data(user_id, comment_uid)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/annotation/submit")
@check_login('web')
async def submit_annotation(body: AnnotationParam, request: Request):
    data = None
    user_id = body.user_id
    comment_uid = body.comment_uid
    images = body.images
    content = body.content
    category = body.category
    region = body.region
    brand = body.brand
    content_data = None
    params = json.loads(body.json())
    await ralte_limit_utils.rate_limit(request_key=f'api_web_annotation_submit#{user_id}', limit=20, period=60)
    if user_id is None or user_id == '' or comment_uid is None or comment_uid == '':
        content_data = APIResponse(errorcode.HTTP_PARAM_ILLEGAL, data, "param error")
    else:
        try:
            data = await post_service.submit_annotation(user_id, comment_uid, content, images, category, region, brand, params)
            content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
        except BusinessException as e:
            logger.exception("check error param = {} {}", body, e)
            code = e.code
            if code is None:
                code = errorcode.HTTP_PARAM_ILLEGAL
            content_data = APIResponse(code, data, e.msg).set_api_dict()
        except Exception as e:
            logger.exception("check error param = {} {}", body, e)
            content_data = APIResponse(errorcode.ERROR, data, f"Network Server error ").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/annotation/page")
async def get_annotation_result_page(body: PostParam, request: Request):
    data = None
    user_id = body.user_id
    page_no = body.page_no
    page_size = body.page_size

    await ralte_limit_utils.rate_limit(request_key=f'api_web_post_page#{user_id}', limit=100, period=60)

    try:
        data = await post_service.get_annotation_result_page(user_id, page_no, page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

