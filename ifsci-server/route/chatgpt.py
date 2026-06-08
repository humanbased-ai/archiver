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

from utils.api_response import APIResponse
from framework import error_codes
from models.param_info import ChatgptBase, ChatgptTest
from service.bot.twitter import openai_service, post_service

from log import logger


router = APIRouter()


@router.get("/api/chatgpt/info/get", summary="")
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
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    # logger.info("recordCheckLog end")
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/chatgpt/info/save", summary="")
async def save(body: ChatgptBase, request: Request):
    # print(body)
    data = None

    try:
        id = body.id
        content = body.content
        data = {'id': id, 'content': content}
        if id is None or id == '':
            logger.error('save error is null')
            data = 'fail'
        else:
            await post_service.save_chatgpt_base_info(data)
            data = 'success'
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    # logger.info("recordCheckLog end")
    except Exception as e:
        logger.error("check error param = {} {}", body.json(), e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)


@router.post("/api/chatgpt/info/run", summary="")
async def run(body: ChatgptTest, request: Request):
    # print(body)
    data = None
    content = body.content
    try:
        messages = json.loads(content)
        data = await openai_service.get_response(messages)
        logger.info('openai_service.getOpenaiResponse {}', data)
        content_data = APIResponse(error_codes.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", body.json(), e)
        content_data = APIResponse(error_codes.ERROR, data, "error").set_api_dict()
    # print('result = ', data)
    return JSONResponse(status_code=status.HTTP_200_OK, content=content_data)
