from pydantic import BaseModel, Field
from asyncdb import *


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
