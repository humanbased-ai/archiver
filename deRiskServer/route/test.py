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
from service.risk import check_service, risk_log_service, misreport_service, check_service_db
from log import logger
import setting

router = APIRouter()


@router.get("/api/secwarex/risk/get", summary="检查")
async def get_url(request: Request):
    #data = redisUrl
    data = "ok"

    return JSONResponse(status_code=status.HTTP_200_OK, content=APIResponse(errorcode.SUCCESS, data, "获取成功").set_api_dict())


@router.get("/api/secwarex/risk/get_redis", summary="检查")
async def redis_get(key: str,request: Request):
    data = None
    data1 = await redisUtils.getData(key)
    if data1 is not None:
        if isinstance(data1, bytes):
            data = data1.decode()
        else:
            data = data1
    #print(data)

    return JSONResponse(status_code=status.HTTP_200_OK, content=APIResponse(errorcode.SUCCESS, data, "获取成功").set_api_dict())


@router.get("/api/secwarex/risk/set_redis", summary="检查")
async def redis_set(key: str, value: str, time: int = None):
    await redisUtils.setData(key, value, time)
    data = key
    return JSONResponse(status_code=status.HTTP_200_OK, content=APIResponse(errorcode.SUCCESS, data, "修改成功").set_api_dict())


@router.get("/api/secwarex/risk/del_redis", summary="检查")
async def redis_del(key: str,request: Request):
    redis_key = setting.redisPrefix+":"+key
    data = setting.redisPrefix+":"+key

    await redisUtils.delData(key)
    return JSONResponse(status_code=status.HTTP_200_OK,content=APIResponse(errorcode.SUCCESS, data, "获取成功").set_api_dict())
