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


@router.post("/api/web/checkin/plan/save")
@check_login('web')
async def save_checkin(body: CheckinParam, request: Request):
    data = None
    user_id = body.user_id

    # 每个用户每分钟10次
    await ralte_limit_utils.rate_limit(request_key=f'api_web_checkin_save#{user_id}', limit=20, period=60)

    try:
        params = json.loads(body.json())
        account_data = await account_service.get_user_info(user_id)
        if account_data is not None:
            account_id = account_data['id']
            params['account_id'] = account_id
        data = await checkin_service.save_checkin_plan(params)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/web/checkin/plan/get")
async def save_checkin(body: CheckinParam, request: Request):
    data = None
    user_id = body.user_id

    await ralte_limit_utils.rate_limit(request_key=f'api_web_checkin_get#{user_id}', limit=100, period=60)

    try:
        data = await checkin_service.get_checkin_plan(user_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

