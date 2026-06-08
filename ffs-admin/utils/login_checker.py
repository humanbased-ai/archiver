from functools import wraps
from utils import redisUtils
import setting
from framework import errorcode
from starlette.requests import Request
import asyncdb
import json
import base64
import time
import datetime
from utils import messageUtils, ApiUtils, context_utils
from utils.exceptions import BusinessException
from service.account import account_service
from fastapi import APIRouter, status, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from utils.APIResponse import APIResponse

import jwt
import requests
from log import logger


def check_login(code_check=False):
    def decorator(target_function):
        @wraps(target_function)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get('request')
            env = setting.RUN_ENV
            account = await context_utils.get_current_user()
            auth_fail_message = f'Account authentication failed'
            if code_check in ['web']:
                if account is None and env != 'dev':
                    return {'code': errorcode.HTTP_NOT_ACCOUNT, 'data': None, 'message': auth_fail_message}
            elif code_check in ['admin', 'codata', 'ad', 'art', 'ct']:
                if account is None and 'dev' != env:
                    content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, None, auth_fail_message).set_api_dict()
                    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content=jsonable_encoder(content_data))
            elif code_check == 'oauth':
                if account is None and 'dev' != env:
                    content_data = APIResponse(errorcode.HTTP_NOT_ACCOUNT, None, auth_fail_message).set_api_dict()
                    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content=jsonable_encoder(content_data))
            ret = await target_function(*args, **kwargs)
            return ret
        return wrapper

    return decorator
