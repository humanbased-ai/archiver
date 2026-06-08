# from fastapi import APIRouter, Request

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

from utils.APIResponse import APIResponse
from utils.login_checker import check_login
from utils import redisUtils, ralte_limit_utils, context_utils
from framework import errorcode
from models.param_info import APPCheckinParam
from service.account import account_service, oauth_service, checkin_service

from log import logger


router = APIRouter()


@router.get("/api/v1/app/checkin/plan")
@check_login('oauth')
async def get_checkin_plan_page(request: Request):
    data = None
    user = await context_utils.get_current_user()
    try:
        body = request.query_params
        account_id = user['id']
        page_no = int(body.get('page_no', 1))
        page_size = int(body.get('page_size', 10))
        data = await checkin_service.get_checkin_plan_page(account_id=account_id, page_no=page_no, page_size=page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/v1/app/checkin/records")
@check_login('oauth')
async def get_checkin_record_page(request: Request):
    data = None
    user = await context_utils.get_current_user()
    try:
        body = request.query_params
        account_id = user['id']
        checkin_plan_id = body.get('plan_id', None)
        page_no = int(body.get('page_no', 1))
        page_size = int(body.get('page_size', 10))
        start_time = body.get('start_time')
        end_time = body.get('end_time')
        data = await checkin_service.get_checkin_record_page(account_id=account_id, checkin_plan_id=checkin_plan_id
                                                             , start_time=start_time, end_time=end_time
                                                             , page_no=page_no, page_size=page_size)

        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/v1/app/checkin/data")
@check_login('oauth')
async def get_checkin_record_data(request: Request):
    data = None
    user = await context_utils.get_current_user()
    try:
        body = request.query_params

        account_id = body.get('account_id', None)
        checkin_plan_id = body.get('plan_id', None)
        page_no = int(body.get('page_no', 1))
        page_size = int(body.get('page_size', 10))
        if page_no < 1:
            page_no = 1
        if page_size > 200:
            page_size = 200
        start_time = body.get('start_time')
        end_time = body.get('end_time')
        data = await checkin_service.get_checkin_data_page(account_id=account_id, checkin_plan_id=checkin_plan_id
                                                           , start_time=start_time, end_time=end_time
                                                           , page_no=page_no, page_size=page_size)

        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

