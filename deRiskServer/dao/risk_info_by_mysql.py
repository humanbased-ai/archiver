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


# 通过address_hash单个查询
def get_dk_risk_details_by_address_hash(address_hash: str):
    db_datas = []
    if address_hash is not None and address_hash != '':
        sql = f'select * from dk_label_risk_detail_dd where  address_hash="{address_hash}"'
        db_datas = db.sql_to_dict(sql)
    return db_datas


# 通过多个address_hash批量查询
def get_dk_risk_details_by_address_hash_list(address_hash_list: []):
    db_datas = []
    if address_hash_list is not None and len(address_hash_list) > 0:
        where_sql = 'where 1=1'
        str_lst = [str(item) for item in address_hash_list]
        address_list_str = "'"+"','".join(str_lst)+"'"
        where_sql += f' and address_hash in ({address_list_str})'
        sql = f'select * from dk_label_risk_detail_dd {where_sql}'
        db_datas = db.sql_to_dict(sql)
    return db_datas



