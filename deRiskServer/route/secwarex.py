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
from service.risk import risk_log_service, misreport_service, check_service_db
from log import logger

router = APIRouter()


@router.post("/api/secwarex/risk/check", summary="检查")
@check_login()
async def check(body: CheckParam, request: Request):
    # print(body)
    data = None

    try:

        check_data, mid_risk_result_json = await check_service_db.check(body)

        # 结果转化为字符串
        if isinstance(check_data, str):
            data = json.loads(check_data)
        else:
            data = check_data

        # logger.info("recordCheckLog start")
        server = "secwarex"
        await risk_log_service.record_check_log(server=server, check_param=body, tag_risk_info=data, mid_risk_result_json=mid_risk_result_json, request=request)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    # logger.info("recordCheckLog end")
    except Exception as e:
        logger.error("check error param = {} {}", body.json(), e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/secwarex/misinformation/subbmit", summary="提交误报信息")
@check_login()
async def misinformation_subbmit(body: ReportParam, request: Request):
    # print(body)
    data = 1
    if body.user_id.strip() == '' or body.from_address.strip() == '' or body.to_address.strip() == '':
        content_data = APIResponse(errorcode.HTTP_PARAM_ILLEGAL, 0, "请检查参数").set_api_dict()
        return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)

    try:
        result = await misreport_service.record_mis_report(body, request)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("misinformation_subbmit error param = {}, {}", body.json(), e)
        data = 0
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

