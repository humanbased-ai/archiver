from pydantic import BaseModel, Field


class Content_param(BaseModel):
    content: str = None
    title: str = None
    url: str = None
    user_id: str = None
    html_type: str = None
    timezone: str = None
    agree_flag: int = None


class Task_config_param(BaseModel):
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


class scheduler_config_param(BaseModel):
    id: int = None
    name: str = None
    service: str = None
    method: str = None
    cron: str = None
    status: int = None
    remarks: str = None
    gmt_create: str = None
    gmt_modified: str = None


class Instagram_param(BaseModel):
    id: int = None
    url: str = None
    description: str = None
    uid: str = None


class Instagram_page_param(BaseModel):
    page_no: int = 1
    page_size: int = 10
    tags: str = None
    uids: str = None
    keywords: str = None
    max_count: int = 0
    total_page: int = 1
    type: str = None


class Instagram_file_param(BaseModel):
    path: str = None


class Task_user_param(BaseModel):
    page_no: int = 1
    page_size: int = 10
    user_names: str = None
    uids: str = None
    type: str = None
    user_id: str = None
    order_type: str = None


class Explore_param(BaseModel):
    page_no: int = 1
    page_size: int = 10
    tag: str = None
    uids: list = []
    tags: list = []



class Tag_param(BaseModel):
    link: str = None
    hashtag: str = None
    category: str = None
    url: str = None
    status: int = None
    remarks: str = None
    post_count: int = None


class Hashtag_param(BaseModel):
    platform: str = None
    tags: list[Tag_param] = []
