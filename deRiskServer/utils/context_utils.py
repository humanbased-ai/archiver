from fastapi import FastAPI, Request
from contextvars import ContextVar
from log import logger
import threading

# 创建一个 ContextVar 用于存储用户信息
current_user: ContextVar[dict] = ContextVar("current_user", default=None)
trace_id: ContextVar[str] = ContextVar("trace_id", default=None)
#thread_local = threading.local()


async def record_user(user):
    if user is None:
        current_user.set(None)
    else:
        current_user.set(user)
        #logger.debug('record_user user to contextvars:  {}', user)
    #thread_local.user = user
    return user


async def clear_user():
    current_user.set(None)
    #thread_local.user = None


async def get_current_user():
    user = current_user.get()
    #user = getattr(thread_local, "user", None)
    return user


async def get_account_id():
    account_id = None
    #user = getattr(thread_local, "user", None)
    user = await get_current_user()
    if user is not None and 'id' in user:
        account_id = user['id']
    return account_id






