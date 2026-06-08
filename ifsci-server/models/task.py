from pydantic import BaseModel, Field


class ContentParam(BaseModel):
    content: str = None
    title: str = None
    url: str = None
    user_id: str = None
    html_type: str = None
    timezone: str = None
    agree_flag: int = None


class TaskConfigParam(BaseModel):
    id: str = Field(alias='id')
    name: str = None
    func: str = None
    trigger: str = None
    seconds: int = None
    replace_existing: str = None
    coalesce: int = None
    start_date: str = None
    end_date: str = None
    run_date: str = None


class SchedulerConfigParam(BaseModel):
    id: int = None
    name: str = None
    service: str = None
    method: str = None
    cron: str = None
    status: int = None
    remarks: str = None
    gmt_create: str = None
    gmt_modified: str = None
