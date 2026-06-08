import datetime
import json
import threading
import time
import logging
from starlette.requests import Request
from utils import redisUtils

from dao.models import RiskCheckLog, RiskMisReport
from models.check import CheckParam, SubRiskInfo, ReportParam
from utils.tools import DBM
import setting

from log import logger

db = DBM(setting.dbUrl)

table_name = RiskMisReport.table_name()


async def record_mis_report(body: ReportParam, request: Request):
    start_time = time.time()
    data = RiskMisReport()

    data.record_id = body.record_id
    data.user_id = body.user_id
    data.from_address = body.from_address
    data.to_address = body.to_address
    data.message = body.message
    data.gmt_create = datetime.datetime.now()

    db.insert(data, table_name, replace=True)
    log_use_time = time.time() - start_time
    logger.info("record_mis_report usetime = {} ms  : {}", int(log_use_time), data)

    return data


async def query_mis_report_count(from_address, to_address):
    data = 0
    try:
        sql = f'select count(*) as num from {table_name} where from_address="{from_address}" and to_address="{to_address}"'

        db_datas = db.sql_to_dict(sql)
        if len(db_datas) > 0:
            data = db_datas[0]['num']
        logger.info(f'query_mis_report_count from_address={from_address}, to_address{to_address} , count={data}')
    except Exception as e:
        logger.error(f'query_mis_report_count from_address={from_address}, to_address{to_address} , e={e}')

    return data
