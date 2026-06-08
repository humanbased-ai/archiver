import requests
import os
import json
import asyncio
from log import logger
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import FastAPI, Depends, HTTPException, status
import uuid
from dao import account_dao, oauth_dao
from service.account import account_service
from typing import Optional
import setting


# 配置
SECRET_KEY = setting.OAUTH_SECRET_KEY  # 替换为你的密钥
ALGORITHM = setting.OAUTH_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = setting.OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_SECRET_KEY = setting.OAUTH_REFRESH_SECRET_KEY  # 替换为你的刷新密钥
REFRESH_TOKEN_EXPIRE_DAYS = setting.OAUTH_REFRESH_TOKEN_EXPIRE_DAYS

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 依赖项
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_consumer(client_id):

    consumer = None
    if client_id is not None:
        data = await oauth_dao.get_consumer_by_client_id(client_id)
        if data is not None:
            consumer = {
                "client_id": data["client_id"],
                "avatar_url": data['avatar_url'],
                "name": data['name'],
            }
    return consumer


async def authorize(token, client_id, response_type, scope, state, redirect_uri):
    param = {
        "client_id": client_id,
        "response_type": response_type,
        "scope": scope,
        "state": state,
        "redirect_uri": redirect_uri
    }
    authorization_code = None
    user = await account_service.get_user_by_code(token)
    account_id = user['id']
    data = await oauth_dao.get_consumer_by_client_id(client_id)
    if data is not None:
        consumer_id = data["id"]
        client_id = data["client_id"]
        if 'code' == response_type:
            code = str(uuid.uuid4())[:20].replace('-', '')
            authorization_code = code
            data = {"authorization_code": authorization_code}

            record = {
                "consumer_id": consumer_id,
                "account_id": account_id,
                "client_id": client_id,
                "state": state,
                "code": code,
                "status": 1,
                "request_content": json.dumps(param),
                "response_content": json.dumps(data),
                "create_time": datetime.now(timezone.utc),
            }
            await oauth_dao.save_authorize_record(record)
            account_data = {'id': account_id, 'consumer_id': client_id}
            await account_service.update_account(account_data)

    return data


async def gen_access_token(client_id, grant_type, client_secret, code, redirect_uri):

    if 'authorization_code' != grant_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid grant_type: {grant_type}")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    authorize_record = await oauth_dao.get_authorize_record_by_code(code)
    if authorize_record is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code")
    account_id = authorize_record['account_id']
    user = await account_service.get_user_by_id(account_id)
    if user is None or user['status'] != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid account_id")

    account_id = user['id']
    consumer_data = await oauth_dao.get_consumer_by_client_id(client_id)
    if consumer_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid client_id")

    db_client_id = user["consumer_id"]
    db_client_secret = consumer_data['client_secret']
    if db_client_id != client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid client_id")
    if client_secret != db_client_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid client_secret")

    access_token = create_token(
        data={"account_id": account_id}, secret_key=SECRET_KEY, expires_delta=access_token_expires
    )
    refresh_token = create_token(
        data={"account_id": account_id, "jti": str(uuid.uuid4())},  # 使用 jti 唯一标识
        secret_key=REFRESH_SECRET_KEY,
        expires_delta=refresh_token_expires
    )

    account_data = {'id': account_id, 'consumer_token': access_token}
    await account_service.update_account(account_data)
    data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": int(access_token_expires.total_seconds()),
        "token_type": "bearer"
    }

    return data


async def refresh_access_token(refresh_token: str):
    # 验证 refresh_token
    payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
    account_id: str = payload.get("account_id")
    if account_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    account = await account_service.get_user_by_id(account_id)
    if account is None or account['status'] != 1:
        raise HTTPException(status_code=401, detail="Invalid token")
    # 创建新的 access_token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_token(
        data={"account_id": account_id},
        secret_key=SECRET_KEY,
        expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_token(
        data={"account_id": account_id, "jti": str(uuid.uuid4())},  # 使用 jti 唯一标识
        secret_key=REFRESH_SECRET_KEY,
        expires_delta=refresh_token_expires
    )
    data = {"access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": int(access_token_expires.total_seconds()),
            "token_type": "bearer"}

    account_data = {'id': account_id, 'consumer_token': access_token}
    await account_service.update_account(account_data)

    return data


def create_token(data: dict, secret_key: str, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt


async def parse_access_token(access_token):

    payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])

    return payload


async def get_account_by_token_from_cache(authorization):
    account = None
    if authorization is not None and authorization.startswith("Bearer "):
        access_token = authorization.split(" ")[1]
        payload = await parse_access_token(access_token)
        account_id: str = payload.get("account_id")
        account = await account_service.get_account_by_account_id_from_cache(account_id)
    return account


