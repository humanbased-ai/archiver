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
from models.Question import QuestionParam
from service.question import question_service
from service.risk import check_service, risk_log_service
from utils.APIResponse import APIResponse

from framework import errorcode

from service.risk import check_service, risk_log_service, misreport_service, check_service_db
from log import logger

router = APIRouter()


@router.post("/api/secwarex/question/naire", summary="调查问卷")
async def question_naire(body: QuestionParam, request: Request):
    # print(body)
    data = None
    try:
        result = await question_service.save_naire(body)
        # 结果转化为字符串
        if isinstance(result, str):
            data = json.loads(result)
        else:
            data = result
        server = "question"
        await risk_log_service.record_check_log(server, body, data, request)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()

    except Exception as e:
        logger.error("check error param = {} {}", body.json(), e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    #print('body = ', body, ', result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)

