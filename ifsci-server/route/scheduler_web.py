from utils.api_response import APIResponse
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
from framework import error_codes

import threading
from utils.scheduler_utils import scheduler
from utils import scheduler_utils
from dao import scheduler_dao
from dao.models import SchedulerConfig
from log import logger, Loggers
from utils.login_checker import check_login
import setting

scheduler_router = APIRouter()


@scheduler_router.post("/api/task/config/save")
@check_login('admin')
async def save(body: SchedulerConfig, request: Request):

    schedulerConfig = body
    id = schedulerConfig.id

    data = {
        "id": id,
        "name": schedulerConfig.name,
        "remarks": schedulerConfig.remarks,
        "cron": schedulerConfig.cron,
        "service": schedulerConfig.service,

        "gmt_modified": datetime.now()
    }
    if id is None or id == '' or len(id) == 0 or id == 'null' or "undefined" == id:
        data['id'] = None
        data['status'] = 0
        data['gmt_create'] = datetime.now()
        scheduler_dao.add(data)
    else:
        old_db = scheduler_dao.get(id)

        data['status'] = old_db.status
        data['gmt_create'] = old_db.gmt_create
        scheduler_dao.update(data)

    data = 'success'
    content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@scheduler_router.get("/api/task/config/list")
@check_login('admin')
async def list_test(request: Request):
    logger.info("查询任务配置列表")

    #jobs = scheduler.get_jobs()
    datas = scheduler_dao.list()
    if len(datas) > 0:
        for data in datas:

            data['gmtCreate'] = data['gmt_create'].timestamp()*1000
            data['gmt_create'] = data['gmtCreate']
            data['gmt_modified'] = data['gmt_modified'].timestamp()*1000
    content_data = APIResponse(error_codes.SUCCESS, datas, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@scheduler_router.get("/api/task/config/jobs")
@check_login('admin')
async def list_test(request: Request):

    jobs = scheduler.get_jobs()
    datas = []
    if len(jobs) > 0:
        for job in jobs:
            data = {'id': job.id, 'name': job.name, 'func': job.func_ref, 'pending': job.pending}
            datas.append(data)
    content_data = APIResponse(error_codes.SUCCESS, datas, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@scheduler_router.post("/api/task/config/run")
@check_login('admin')
async def run(id: str, request: Request):
    data = None
    data = "start run task "

    id = id
    logger.info(f"run task id = {id}")
    scheduler_config = scheduler_dao.get(id)
    trigger = 'date'
    cron = scheduler_config.cron
    task_id = f'date_task_{id}'
    name = scheduler_config.name
    func = scheduler_config.service
    # func="scheduler.chainabuse_task:my_job"
    next_run_time = datetime.now()
    scheduler.add_job(id=task_id,
                      func=func, misfire_grace_time=3600,
                      name=name,
                      trigger=trigger,
                      next_run_time=next_run_time,
                      )

    #print(scheduler.get_jobs())
    content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@scheduler_router.post("/api/task/config/fresh")
@check_login('admin')
async def pause(ids: str,  datastatus: str, request: Request):
    data = None

    id = ids
    data_status = datastatus
    scheduler_config = scheduler_dao.get(id)

    id = scheduler_config.id
    name = scheduler_config.name
    func = scheduler_config.service

    try:
        scheduler_dao.set_status(id, data_status)
        if str(data_status) == '1':
            scheduler_utils.start_scheduler(scheduler_config)
        else:
            scheduler_utils.stop_scheduler(scheduler_config)
        data = 'success'
    except Exception as e:
        logger.error('fail', e)
        print(e)
        data = f'fail{e}'

    content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@scheduler_router.post("/api/task/config/remove")
@check_login('admin')
async def remove(id: str, request: Request):
    data = None
    data = "pause"

    scheduler.remove_job(id)
    content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)