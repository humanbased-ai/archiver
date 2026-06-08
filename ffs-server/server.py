from datetime import datetime
import sys
import uuid
from uvicorn import run
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

from framework import errorcode
from framework.exceptions import BusinessException
from fastapi.exceptions import RequestValidationError
import time
import traceback
import logging
import json
from fastapi.responses import JSONResponse

from utils.scheduler_utils import scheduler, init_scheduler
from utils import messageUtils, context_utils, ApiUtils, url_utils
import setting

from service.account import account_service, oauth_service, ad_account_service, art_account_service, ct_account_service
from route import (chatgpt, ffs_twitter, ffs_account, account_checkin, score_reward,
                   tw_post_router, file_router, app_image, app_proxy)
from route.admin import (scheduler_web, admin_post_router, admin_checkin_router, dashboard
                         , system_config)
from route.app import api_oauth2, api_user_router
from route.a6d9 import user_register, ad_account, ad_browse_use
from route.art import art_account, art_avatar, art_invite
from route.ct import ct_ai_model

from log import logger, Loggers
import log

app = FastAPI()

# 注册router
app.include_router(scheduler_web.scheduler_router, prefix="")
app.include_router(scheduler_web.scheduler_router, prefix="/ifsci")
app.include_router(admin_post_router.router, prefix="")
app.include_router(admin_post_router.router, prefix="/ifsci")
app.include_router(admin_checkin_router.router, prefix="")
app.include_router(admin_checkin_router.router, prefix="/ifsci")
app.include_router(dashboard.router, prefix="")
app.include_router(dashboard.router, prefix="/ifsci")
app.include_router(system_config.router, prefix="")
app.include_router(system_config.router, prefix="/ifsci")

app.include_router(chatgpt.router, prefix="")
app.include_router(app_image.router, prefix="")
app.include_router(app_image.router, prefix="/ifsci")
app.include_router(app_proxy.router, prefix="")


app.include_router(ffs_twitter.router, prefix="")
app.include_router(ffs_account.router, prefix="")
app.include_router(tw_post_router.router, prefix="")
app.include_router(file_router.router, prefix="")
app.include_router(api_oauth2.router, prefix="")
app.include_router(api_user_router.router, prefix="")
app.include_router(account_checkin.router, prefix="")
app.include_router(score_reward.router, prefix="")

app.include_router(user_register.router, prefix="")
app.include_router(ad_account.router, prefix="")
app.include_router(ad_browse_use.router, prefix="")

app.include_router(art_account.router, prefix="")
app.include_router(art_avatar.router, prefix="")
app.include_router(art_invite.router, prefix="")

app.include_router(ct_ai_model.router, prefix="")

app.mount("/api/static", StaticFiles(directory="static"), name="static")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/ifsci/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 启动事件
app_name = 'ifsci-server'


@app.on_event("startup")
async def startup_event():
    #log.info(f"{app_name}开始启动")
    env = setting.RUN_ENV
    # 启动apscheduler服务
    if setting.init_scheduer == '1':
         init_scheduler()
    scheduler.start()
    logger.info(f"实例APScheduler定时任务启动成功")

    logger.info(f"{app_name}启动成功 env = {env}")


@app.middleware("http")
async def user_context_middleware(request: Request, call_next):
    # 假设通过请求头获取用户信息
    uri = None
    start_time = time.time()
    account = None
    user_id = None
    response = None

    env = setting.RUN_ENV
    token = None

    trace_id = str(uuid.uuid4()).replace('-', '')
    request_id = request.headers.get("x-request-id", trace_id)
    if request_id is not None and request_id != '':
        trace_id = request_id
    logger.configure(extra={"trace_id": trace_id})
    context_utils.trace_id.set(trace_id)
    log.trace_id.set(trace_id)
    try:
        uri = request.url.path
        token = request.headers.get("token", None)
        if token == '' or token == 'null' or token == 'NULL':
            token = None
        if uri is not None:
            if '/admin/' in uri or uri.startswith('/ifsci/'):
                account = await account_service.get_account_by_admin(token)
            elif uri.startswith('/api/ad/'):
                if token is None or token == '':
                    token = request.headers.get("Authorization", None)
                    if token is not None and token.startswith('Bearer'):
                        token = token.split('Bearer')[1]
                        token = token.strip().replace(' ','')
                account = await ad_account_service.get_account_by_account_id_from_cache(token)
            elif uri.startswith('/api/art/'):
                account = await art_account_service.get_account_by_account_id_from_cache(token)
            elif '/app/' in uri or '/api/oauth' in uri:
                authorization = request.headers.get("Authorization", None)
                account = await oauth_service.get_account_by_token_from_cache(authorization)
            elif uri.startswith('/api/ct/'):
                uid = request.headers.get("uid", None)
                if uid is not None and uid != '':
                   account = {'user_id': uid, 'type': 'codata'}
                else:
                   account = await ct_account_service.get_account_by_account_id_from_cache(token)

        if account is None:
            account = await account_service.get_account_by_token_from_cache(token)

        user_info = None
        if account is not None:
            account_type = account.get('type', None)
            if 'appId' in account:
                user_info = account
            elif account_type == 'codata':
                account_id = account["user_id"]
                user_id = account["user_id"]
                account_status = 1
                user_info = {
                    "token": token,
                    "id": account_id,
                    "status": account_status,
                    "user_id": user_id,
                }
            else:
                account_id = account["id"]
                user_id = account["user_id"]
                account_status = account["status"]
                if account_status == 1:
                    user_info = {
                        "token": token,
                        "id": account_id,
                        "status": account_status,
                        "user_id": user_id,
                        "account_code": account["account_code"],
                        "source_type": account["source_type"],
                        "user_name": account["user_name"],
                    }
                else:
                    user_info = None
        await context_utils.record_user(user_info)
        response = await call_next(request)
    finally:
        total_use_time = time.time() - start_time
        status_code = ''
        if response is not None:
            status_code = response.status_code
        try:
            if check_log_uri(uri):
                query_params = dict(request.query_params)
                ip_info = await url_utils.get_ip(request)
                if ip_info is None:
                    ip_info = ''
                method = request.method
                headers = request.headers
                # 不打印header
                headers = ""
                logger.info("user[{}],request = [{}]-{}-{}-{},total_usetime = {} ms"
                            ", params = {}, headers = {}"
                            , user_id, ip_info, status_code, method, uri, int(total_use_time*1000)
                            , query_params
                            , headers)
        except Exception as e:
            logger.error("logger request = {}, error {}", request, e)

        try:
            # 转换为毫秒
            ms_time = int(total_use_time*1000)
            ApiUtils.recordAPIcount(uri, ms_time)
        except Exception as e:
            logger.error("warn_times error {}", e)
        # 请求结束时清理上下文变量
        await context_utils.clear_user()
        log.trace_id.set(None)
        context_utils.trace_id.set(None)
        logger.configure(extra={"trace_id": None})
    return response


def check_log_uri(uri: str):
    flag = True
    web_static_uri_prefixs = setting.web_static_uri_prefixs
    for web_static_uri_prefix in web_static_uri_prefixs:
        if uri.startswith(web_static_uri_prefix):
            flag = False
            break
    return flag


@app.get("/", response_class=PlainTextResponse)
async def app_root():

    return "ok"


@app.get("/api/health", response_class=PlainTextResponse)
async def app_check():

    return "ok"


@app.get("/api/main")
async def read_root(request: Request):
    message = "Hello from FastAPI!"
    return templates.TemplateResponse("index.html", {"request": request, "message": message})


# 自定义异常处理器
@app.exception_handler(BusinessException)
async def business_exception_handler(request: Request, exc: BusinessException):
    dct = {
        'code': exc.code,
        'message': exc.msg
    }
    traceback.print_exc()
    response = JSONResponse(status_code=200, content=dct)

    logger.error(f"Exception error{exc.msg}")
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        errors = exc.errors()
        message = "param illegal:"+json.dumps(errors)
    except:
        print(exc.errors())
        message = "param illegal"

    dct = {
        'code': errorcode.HTTP_PARAM_ILLEGAL,
        'message':  message
    }
    traceback.print_exc()
    response = JSONResponse(status_code=200, content=dct)

    logger.error(f"something error {exc}")
    return response


@app.exception_handler(Exception)
async def exception_handler(request: Request, exc: Exception):
    if isinstance(exc, BusinessException):
        return await business_exception_handler(request, exc)
    dct = {
        'code': errorcode.SYSTEM_ERROR,
        'message': "something error,please contact us"
    }
    traceback.print_exc()
    response = JSONResponse(status_code=200, content=dct)

    logger.error(f"something error {exc}")

    if setting.RUN_ENV == 'prod':
        title = '服务消息'
        content = f'接口{request.url.path} 处理异常 {exc}'
        messageUtils.send_message(title, content)

    return response


if __name__ == '__main__':

    uvicorn.run(app, host='0.0.0.0', port=8080,  log_config="log_config.json", log_level=logging.ERROR)
