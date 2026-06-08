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
from utils.exceptions import BusinessException
from utils import redisUtils, ralte_limit_utils, context_utils
from framework import errorcode
from models.param_info import ffs_account, ExchangeParam, RewardParam, RedeemParam
from service.account import account_service, checkin_service, account_reward_service, account_redeem_service
import uuid
from log import logger


router = APIRouter()


@router.post("/api/web/account/reward/page")
async def reward_page(body: RewardParam, request: Request):
    data = None
    user_id = body.user_id
    try:
        data = await account_reward_service.find_reward_page(body.user_id, body.page_no, body.page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/account/score/page")
async def score_page(body: RedeemParam, request: Request):
    data = None
    user_id = body.user_id
    try:
        data = await account_redeem_service.find_score_page(body.user_id, body.page_no, body.page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/account/score/exchange")
@check_login('web')
async def save_score_exchange(body: ExchangeParam, request: Request):
    data = None
    user_id = body.user_id
    try:
        data = await account_redeem_service.save_score_exchange(body)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except BusinessException as e:
        logger.exception("Business error param = {} {}", body, e.msg)
        message = e.msg
        content_data = APIResponse(errorcode.ERROR, data, message).set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/account/redeem/page")
async def redeem_page(body: RedeemParam, request: Request):
    data = None
    user_id = body.user_id
    try:
        data = await account_redeem_service.find_redeem_page(body.user_id, body.page_no, body.page_size, body.status)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
