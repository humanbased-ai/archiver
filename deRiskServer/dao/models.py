from pydantic import BaseModel, Field
from asyncdb import *


#登录信息
class LoginInfo(BaseModel):
    id: str = None
    site_type: str = None
    site: str = None
    username: str = None
    password: str = None
    config: str = None
    login_time: str = None
    storage_state: str = None
    remarks: str = None

    @classmethod
    def table_name(cls):
        return "login_info"


# 用户任务
class UserSpiderTask(BaseModel):
    id: str = None
    gmt_create: str = None
    creator: str = None
    creator_name: str = None
    task_type: str = None
    status: str = None
    begin_time: str = None
    finish_time: str = None
    data_location: str = None
    config: str = None
    deleted: str = None
    count: str = None
    remarks: str = None

    @classmethod
    def table_name(cls):
        return "user_spider_task"


class SchedulerConfig(BaseModel):
    id: str = None
    name: str = None
    service: str = None
    method: str = None
    cron: str = None
    status: int = None
    remarks: str = None
    gmt_create: str = None
    gmt_modified: str = None


    @classmethod
    def table_name(cls):
        return "scheduler_config"

class AppAccount(BaseDbModel):
    id = IntegerField(primary_key=True, auto_inc=True)
    app_key = CharField(max_length=50)
    app_secret = CharField(max_length=100)

    status = CharField(max_length=32)
    config = JSONField()
    remarks = CharField(max_length=500)

    @classmethod
    def table_name(cls):
        return "app_account"


class RiskCheckLog(BaseDbModel):
    id = IntegerField(primary_key=True, auto_inc=True)
    param = CharField(max_length=2000)
    result = CharField(max_length=2000)
    mid_result = CharField(max_length=2000)

    request_time = DateTimeField()
    ip = CharField(max_length=50)
    server = CharField(max_length=50)
    uri = CharField(max_length=200)

    @classmethod
    def table_name(cls):
        return "risk_check_log"


class RiskMisReport(BaseDbModel):
    id = IntegerField(primary_key=True, auto_inc=True)
    gmt_create = DateTimeField()

    user_id = CharField(max_length=50)
    record_id = CharField(max_length=50)
    from_address = CharField(max_length=200)
    to_address = CharField(max_length=200)

    message = CharField(max_length=500)

    @classmethod
    def table_name(cls):
        return "risk_mis_report"