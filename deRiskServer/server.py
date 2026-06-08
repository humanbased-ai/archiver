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
from route import question, secwarex, test, scheduler_web, ct_data

from log import logger, Loggers
import log

app = FastAPI()

# 注册router

app.include_router(question.router, prefix="")
app.include_router(secwarex.router, prefix="")
app.include_router(test.router, prefix="")
app.include_router(scheduler_web.scheduler_router, prefix="")
app.include_router(ct_data.router, prefix="")


app.mount("/api/static", StaticFiles(directory="static"), name="static")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 启动事件
app_name = 'derisk-server'


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
