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
from service.admin import dashboard_service

import setting

router = APIRouter()


@router.get("/api/admin/dashboard/post/get")
async def get_post_data(request: Request):
    data = await dashboard_service.get_opt_post_data()
    content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))
