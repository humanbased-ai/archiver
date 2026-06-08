# from fastapi import APIRouter, Request

import asyncio
import csv
import json
import logging
import os
import time

from fastapi import APIRouter, status, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter
from datetime import datetime
from starlette.requests import Request

from utils.APIResponse import APIResponse
from utils.login_checker import check_login
from utils import redisUtils, ralte_limit_utils, context_utils
from framework import errorcode
from models.param_info import OAuth2Param
from service.account import account_service, oauth_service
import uuid
from oauthlib.oauth2 import WebApplicationClient
from log import logger


router = APIRouter()


@router.get("/api/consumer/info")
@check_login('web')
async def get_consumer_info(request: Request):
    data = None
    query_params = request.query_params
    client_id = query_params.get('client_id')
    try:
        data = await oauth_service.get_consumer(client_id)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.ERROR, data, f"error {e}").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/oauth/authorize")
@check_login('web')
async def authorize(request: Request):
    data = None
    query_params = request.query_params

    token = request.headers['token']
    response_type = query_params.get('response_type')
    client_id = query_params.get('client_id')
    state = query_params.get('state')
    scope = query_params.get('scope')
    redirect_uri = query_params.get('redirect_uri')
    try:

        data = await oauth_service.authorize(token, client_id, response_type, scope, state, redirect_uri)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/oauth/token")
async def token(body: OAuth2Param,request: Request):
    data = None

    #query_params = request.query_params
    #token = request.headers['token']
    grant_type = body.grant_type
    client_id = body.client_id
    client_secret = body.client_secret
    redirect_uri = body.redirect_uri
    code = body.code
    content_data = None
    try:
        data = await oauth_service.gen_access_token(client_id, grant_type, client_secret, code, redirect_uri)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.post("/api/oauth/refresh")
async def refresh_access_token(refresh_token: str):
    data = None
    try:
        data = await oauth_service.refresh_access_token(refresh_token)
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, f"error {e}").set_api_dict()
    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))


@router.get("/api/oauth/user")
async def get_user(request: Request):
    data = None
    user = await context_utils.get_current_user()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    try:
        account_id = user['id']
        data = {
            "account_id": account_id,
        }
        content_data = APIResponse(errorcode.SUCCESS, data, "success").set_api_dict()
    except Exception as e:
        logger.error("check error param = {} {}", '', e)
        content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, data, f"error {e}").set_api_dict()

    return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(content_data))




