from utils.APIResponse import APIResponse
import asyncio
import csv
import json
import logging
import os
import time

from datetime import datetime, timedelta
from dateutil.parser import isoparse
from fastapi import APIRouter, status, Form, Request
from fastapi.responses import JSONResponse
from fastapi import APIRouter
from framework import errorcode
from fastapi.encoders import jsonable_encoder
import threading
from utils.scheduler_utils import scheduler
from utils import scheduler_utils
from dao import scheduler_dao
from log import logger, Loggers
from utils.login_checker import check_login
from service.system import system_service
from models.param_info import ConfigParam
import setting

router = APIRouter()


@router.get("/api/admin/system/config/base")
@check_login('admin')
async def get_base_data(request: Request):

    data = await system_service.get_base_data()
    content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/admin/system/config/get")
@check_login('admin')
async def get_data(request: Request):
    id = request.query_params.get('id')
    data = await system_service.get_by_id(id)
    content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/admin/system/config/save")
@check_login('admin')
async def get_post_data(body: ConfigParam, request: Request):

    id = None
    if body.id is not None and body.id != '':
        id = int(body.id)
    param = {
        'id': id,
        'name': body.name,
        'type': body.type,
        'data_type': body.data_type,
        'status': body.status,
        'remarks': body.remarks,
        'value': body.value,
    }
    data = await system_service.save_config(param)

    content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/admin/system/config/page")
@check_login('admin')
async def find_post_page(body: ConfigParam, request: Request):
    logger.info("查询post列表 {}", body)
    data = await system_service.find_config_page(body)
    content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))



