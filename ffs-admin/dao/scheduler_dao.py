import setting
from datetime import datetime, timedelta, timezone
from utils.tools import DBM
from dao.models import SchedulerConfig
from log import logger

db = DBM(setting.dbUrl)

table_name = SchedulerConfig.table_name()


def add(data):

    db.insert(data, table_name, replace=True)


def update(data):
    db.update(data, table_name)

def set_status(id,status):
    sql = f'update {table_name} SET `status` = {status} WHERE id = {id}'
    db.execute_sql(sql)

def delete(id):
    sql = 'delete from {} where id = {}'.format(table_name, id)
    db.execute_sql(sql)


def list():
    sql = f'select * from {table_name}'
    db_datas = db.sql_to_dict(sql)

    return db_datas


def get(id):
    data = None
    sql = 'select * from {} where id = {}'.format(table_name, id)

    db_datas = db.sql_to_dict(sql)
    if len(db_datas) > 0:
        data = db_datas[0]
    return data
