import asyncio
import csv
import json
import logging
import os
import time

from fastapi import APIRouter, status, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import threading
from fastapi import APIRouter
from datetime import datetime
from starlette.requests import Request

from utils.exceptions import BusinessException
from utils.APIResponse import APIResponse
from utils.login_checker import check_login
from utils import redisUtils, ralte_limit_utils, context_utils, url_utils
from framework import errorcode
from models.param_info import CTChatParam
from service.ct import ai_model_service, chat_service, chat_chain_task
from log import logger


router = APIRouter()


@router.get("/api/ct/model/leaderboard")
async def get_model_leaderboard(request: Request):
    account_id = request.query_params.get("account_id")
    if account_id is None:
        account_id = await context_utils.get_account_id()

    order_type = request.query_params.get("order_type", '')
    order_column = request.query_params.get("order_column")
    if order_type not in ['asc', 'desc']:
        order_type = ''
    if order_column not in ["org", "org_name", "license", "link", "image_url", "name", "show_name", "description", "weight", "api_key", "host", "uri", "status", "arena_score", "ci", "votes", "correct_rate", "create_time"]:
        order_column = None
    ip_address = await url_utils.get_ip(request)
    content_data = None
    data = None
    try:
        order_condition = None
        if order_column is None:
            order_condition = f' arena_score desc '
        else:
            order_condition = f' {order_column} {order_type} '
        data = await ai_model_service.get_al_model_leaderboard(order_condition)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_codata_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_codata_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/ct/model/list")
async def get_models(request: Request):
    account_id = request.query_params.get("account_id")
    if account_id is None:
        account_id = await context_utils.get_account_id()

    ip_address = await url_utils.get_ip(request)
    content_data = None
    data = None
    try:
        data = await ai_model_service.get_al_models()
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_codata_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_codata_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/ct/model/sse")
async def sse(request: Request):

    task_id = request.query_params.get("task_id", None)
    # 给每个连接分配一个唯一 id
    user_id = str(task_id)
    queue = asyncio.Queue()
    chat_service.user_queues[user_id] = queue

    async def event_stream():
        try:
            while True:
                # 如果客户端断开连接，停止生成数据
                if await request.is_disconnected():
                    break

                message = await queue.get()
                yield f"data: {message}\n\n"
                #await asyncio.sleep(2)
        finally:
            chat_service.user_queues.pop(user_id, None)

    # 启动后台任务模拟发送数据（你可以替换成自己的逻辑）
    #asyncio.create_task(ai_model_service.run_chat_by_model(task_id))
    t = threading.Thread(target=ai_model_service.run_chat_record, kwargs={"uid": task_id})
    t.start()
    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/api/ct/model/chat")
#@check_login('ct')
async def model_chat(body: CTChatParam,  request: Request):
    data = None
    content = body.content
    task_id = body.task_id
    account_id = await context_utils.get_account_id()
    try:
        data = await ai_model_service.run_chat(user_id=account_id, task_id=task_id, content=content)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_codata_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_codata_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/ct/model/evaluate")
@check_login('ct')
async def model_evaluate(body: CTChatParam,  request: Request):
    data = None
    evaluate = body.evaluate
    task_id = body.task_id
    account_id = await context_utils.get_account_id()
    try:
        data = await ai_model_service.evaluate_model(user_id=account_id, uid=task_id, evaluate_result=evaluate)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_codata_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_codata_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/ct/chat/get")
async def get_chat_detail(request: Request):
    data = None
    task_id = request.query_params.get("task_id", None)
    account_id = await context_utils.get_account_id()
    try:
        data = await ai_model_service.get_chat_detail(task_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_codata_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_codata_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/ct/model/chain/records")
async def chain_records(body: CTChatParam, request: Request):
    data = None
    try:
        page_no = body.page_no
        page_size = body.page_size
        query_user_id = body.user_id
        order_type = body.order_type
        order_column = body.order_column
        order_condition = None
        if order_column not in ['chain_time', 'user_id', 'block_number', 'tx_hash']:
            order_column = None
        if order_column is not None:
            order_condition = f' {order_column} '
            if order_type == 'asc':
                order_condition = f'{order_column} asc '
            elif order_type == 'desc':
                order_condition = f' {order_column} desc'
        if query_user_id == '':
            query_user_id = None
        data = await ai_model_service.find_chain_records(page_no, page_size, query_user_id, order_condition)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_codata_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_codata_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/ct/chat/chain")
async def run_chain(request: Request):
    data = None
    try:
        data = await chat_chain_task.batch_chain_task()
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_codata_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"Please try again later").set_codata_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))

