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
from models.param_info import chatgpt_base, chatgpt_test
from service.bot.twitter import openai_service, twitter_service, post_service

from log import logger


router = APIRouter()


@router.get("/api/chatgpt/info/get", summary="检查")
async def check( request: Request):
    # print(body)
    data = None

    try:
        twitter_food_starts = await post_service.get_chatgpt_base_info('twitter_food_start')
        twitter_food_ends = await post_service.get_chatgpt_base_info('twitter_food_end')
        data = {
            'twitter_food_starts': twitter_food_starts,
            'twitter_food_ends': twitter_food_ends
        }
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    # logger.info("recordCheckLog end")
    except Exception as e:
        logger.exception("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/chatgpt/info/save", summary="检查")
async def save(body: chatgpt_base, request: Request):
    # print(body)
    data = None

    try:
        id = body.id
        content = body.content
        data = {'id': id, 'content': content}
        if id is None or id == '':
            logger.exception('save error is null')
            data = 'fail'
        else:
            await post_service.save_chatgpt_base_info(data)
            data = 'success'
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    # logger.info("recordCheckLog end")
    except Exception as e:
        logger.exception("check error param = {} {}", body.json(), e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/chatgpt/info/run", summary="检查")
async def run(body: chatgpt_test, request: Request):
    # print(body)
    data = None
    content = body.content
    try:
        #messages = json.loads(content)
        messages = content
        data = await openai_service.getOpenaiResponse(messages)
        logger.info('openai_service.getOpenaiResponse {}', data)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", body.json(), e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/chatgpt/info/run", summary="检查")
async def run(body: chatgpt_test, request: Request):
    # print(body)
    data = None
    content = body.content
    try:
        messages = json.loads(content)
        data = await openai_service.getOpenaiResponse(messages)
        logger.info('openai_service.getOpenaiResponse {}', data)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", body.json(), e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/swarms/info/run", summary="检查")
async def run(body: chatgpt_test, request: Request):
    # print(body)
    data = None
    content = body.content
    try:

        #data = await swarms_service.getResponse(content)
        logger.info('swarms_service.getOpenaiResponse {}', data)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.exception("check error param = {} {}", body.json(), e)
        content_data = APIResponse(errorcode.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)

