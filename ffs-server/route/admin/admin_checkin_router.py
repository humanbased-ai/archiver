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
from service.admin import admin_checkin_service
from models.param_info import chatgpt_base, PostParam, AnnotationParam
import setting

router = APIRouter()


@router.post("/api/admin/checkin/cycle/page")
@check_login('admin')
async def find_checkin_page(body: PostParam, request: Request):
    logger.info("查询post列表 {}", body)
    data = await admin_checkin_service.find_checkin_cycle_page(body)
    content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

