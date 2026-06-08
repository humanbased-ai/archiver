import jwt
import os
from fastapi import Header
from typing import Optional
from .APIResponse import APIResponse
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from fastapi import status
from jwt.exceptions import InvalidSignatureError, ExpiredSignatureError, DecodeError
key = os.urandom(32)


def jwt_token(data: dict, expires_delta: timedelta):
    jwt_dict = data.copy()
    expired = datetime.utcnow() + expires_delta
    jwt_dict.update({'exp': expired})
    token = jwt.encode(jwt_dict, key, algorithm="HS256")
    return token


async def verify_jwt(token: Optional[str] = Header(None)):
    if token is None:
        return JSONResponse(status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                            content=APIResponse(405, None, "用户未登录").set_api_dict())
    else:
        try:
            res = jwt.decode(token, key, "HS256")
            return res['userID']
        except InvalidSignatureError as e:
            # 无效签名验证
            return JSONResponse(status_code=status.HTTP_403_FORBIDDEN,
                                content=APIResponse(403, None, "无效的用户签名").set_api_dict())
        except ExpiredSignatureError as e:
            # 签名过期验证
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED,
                                content=APIResponse(401, None, "用户签名已过期").set_api_dict())
        except DecodeError as e:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED,
                                content=APIResponse(401, None, "错误的签名").set_api_dict())
