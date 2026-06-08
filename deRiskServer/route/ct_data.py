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
from utils import redisUtils
from framework import errorcode
from models.check import CheckParam, ReportParam
from service.ct import crypto_service
from log import logger

router = APIRouter()


@router.post("/api/crypto/data/query", summary="")
@check_login()
async def query_data(body: dict, request: Request):
    data = None
    content_data = None
    try:
        chain_str = body.get("chain")
        if not chain_str:
            content_data = APIResponse(errorcode.ERROR, data, "param chain is empty").set_api_dict()
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=content_data)
        address_str = body.get("address")
        page_num = body.get("page_num")
        page_size = body.get("page_size")
        if page_num:
            page_num = int(page_num)
        else:
            page_num = 1
        if page_size:
            page_size = int(page_size)
        else:
            page_size = 10
        data = await crypto_service.query_data(chain_str, address_str, page_num, page_size)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", body, e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)

