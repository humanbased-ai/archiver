import datetime
import json
import threading
import time
import logging
from starlette.requests import Request
from utils import redisUtils

from dao.models import RiskCheckLog
from models.check import CheckParam, SubRiskInfo
from utils.tools import DBM
import setting

from log import logger

db = DBM(setting.dbUrl)


async def record_check_log(server: str,check_param: CheckParam, tag_risk_info: SubRiskInfo, mid_risk_result_json: str, request: Request):
    start_time = time.time()
    try:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(',')[0]
        else:
            ip_address = request.client.host
    except:
        ip_address = ''

    mid_result = None
    if mid_risk_result_json is not None:
        if isinstance(mid_risk_result_json, str):
            mid_result = mid_risk_result_json
        else:
            mid_result = json.dumps(mid_risk_result_json)

    risk_check_log = RiskCheckLog()
    risk_check_log.param = check_param.json()
    risk_check_log.result = json.dumps(tag_risk_info)
    risk_check_log.mid_result = mid_result

    risk_check_log.request_time = datetime.datetime.now()
    risk_check_log.uri = request.url.path
    risk_check_log.server = server
    risk_check_log.ip = ip_address
    # print(' RiskCheckLog db start')
    logFlag = await redisUtils.getData('log_flag')
    if logFlag is None or logFlag == "1":
        #await RiskCheckLog.save(risk_check_log)
        # 为加快接口速度，单独启用线程异步执行保存业务日志
        t = threading.Thread(target=aysnc_save_risk_check_log, kwargs={"risk_check_log": risk_check_log})
        t.start()
    # print(' RiskCheckLog db end')
    log_use_time = time.time() - start_time
    logger.info("usetime = {} ms risk_check_log_{} : {}", int(log_use_time), server, risk_check_log)


def save_risk_check_log(risk_check_log):
    RiskCheckLog.save(risk_check_log)
    #print(' save_risk_check_log db ', risk_check_log)


def aysnc_save_risk_check_log(risk_check_log):
    start_time = time.time()
    db.insert(risk_check_log, RiskCheckLog.table_name(), replace=True)
    log_use_time = time.time() - start_time
    logger.info("aysnc_save_risk_check_log usetime = {} ms  : {},", int(log_use_time), risk_check_log)