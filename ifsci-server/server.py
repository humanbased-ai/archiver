import sys

from uvicorn import run
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

from framework import error_codes
from framework.exceptions import BusinessException
from fastapi.exceptions import RequestValidationError

import traceback
import logging
import json
from fastapi.responses import JSONResponse

from utils.scheduler_utils import scheduler, init_scheduler
from utils import message_utils
from utils import api_utils
import setting
from route import scheduler_web, chatgpt, ffs_twitter, ffs_account

from log import logger, Loggers


app = FastAPI()

# register router
app.include_router(scheduler_web.scheduler_router, prefix="")
app.include_router(scheduler_web.scheduler_router, prefix="/ifsci")
app.include_router(chatgpt.router, prefix="")
app.include_router(ffs_twitter.router, prefix="")
app.include_router(ffs_account.router, prefix="")

app.mount("/api/static", StaticFiles(directory="static"), name="static")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/ifsci/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# start event
app_name = 'ifsci-server'


@app.on_event("startup")
async def startup_event():
    env = setting.RUN_ENV
    # start apscheduler server
    if setting.init_scheduer == '1':
         init_scheduler()
    scheduler.start()
    logger.info(f"APScheduler start")

    logger.info(f"server {app_name} start successfully env = {env}")


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
        'code': error_codes.HTTP_PARAM_ILLEGAL,
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
        'code': error_codes.SYSTEM_ERROR,
        'message': "something error,please contact us"
    }
    traceback.print_exc()
    response = JSONResponse(status_code=200, content=dct)

    logger.error(f"something error {exc}")

    if setting.RUN_ENV == 'prod':
        title = 'Server Message'
        content = f'API {request.url.path} Exception {exc}'
        message_utils.send_message(title, content)

    return response


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080, log_config="log_config.json", log_level=logging.ERROR)
