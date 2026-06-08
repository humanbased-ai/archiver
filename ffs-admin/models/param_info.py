from pydantic import BaseModel, Field
from typing import Optional


class chatgpt_base(BaseModel):
    id: str = None
    content: str = None


class chatgpt_test(BaseModel):
    content: list[dict] = None


class ffs_twitter(BaseModel):
    user_id: str = None
    link: str = None


class ffs_account(BaseModel):
    user_id: str = None
    address: str = None
    signature: str = None
    message: str = None
    page_no: int = 1
    page_size: int = 10


class ADAccount(BaseModel):
    user_id: str = None
    address: str = None
    signature: str = None
    message: str = None
    page_no: int = 1
    page_size: int = 10
    sol_address: str = None
    device_id: str = None
    secret_key: str = None
    type: str = None


class ADAccountParam(BaseModel):
    user_id: str = None
    type: str = None
    address: str = None
    signature: str = None
    message: str = None
    page_no: int = 1
    page_size: int = 10
    invite_code: str = None


class PostParam(BaseModel):
    uid: str = None
    code: str = None
    address: str = None
    content: str = None
    user_id: str = None
    comment_uid: str = None
    signature: str = None
    message: str = None
    page_no: int = 1
    page_size: int = 10
    status: str = None
    user_name: str = None
    annotation_user_id: str = None


class CheckinParam(BaseModel):
    user_id: str = None
    checkin_type: str = None
    start_time: str = None
    end_time: str = None


class ImageParam(BaseModel):
    name: str = None
    url: str = None


class AnnotationParam(BaseModel):

    address: str = None
    category: str = None
    region: str = None
    brand: str = None
    content: str = None
    images: list = []
    user_id: str = None
    comment_uid: str = None
    page_no: int = 1
    page_size: int = 10


class RewardParam(BaseModel):
    user_id: str = None
    page_no: int = 1
    page_size: int = 10
    status: str = None


class RedeemParam(BaseModel):
    user_id: str = None
    page_no: int = 1
    page_size: int = 10
    status: int = None


class ExchangeParam(BaseModel):
    user_id: str = None
    exchange_id: int = 1
    hash: str = None
    score: int = 10
    token: int = None
    claim_status: int = None


class OAuth2Param(BaseModel):
    grant_type: str = None
    client_id: str = None
    client_secret: str = None
    scope: str = None
    redirect_uri: str = 1
    state: str = None
    code: str = None


class APPCheckinParam(BaseModel):
    start_time: str = None
    end_time: str = None
    plan_id: int = None
    page_no: int = 1
    page_size: int = 10


class AIAvatarParam(BaseModel):
    content: str = None
    image_count: int = 3
    model: str = None
    page_no: int = 1
    page_size: int = 10
    account_id: int = None
    address: str = None
    image_url: str = None
    chain_hash: str = None
    record_id: int = None
    nft_name: str = None
    nft_description: str = None
    chain_fees: int = None
    tool: str = None


class ConfigParam(BaseModel):
    id: str = None
    name: str = None
    type: str = None
    data_type: str = None
    status: str = None
    page_no: int = 1
    page_size: int = 10
    remarks: str = None
    value: str = None


class CTChatParam(BaseModel):
    content: Optional[str] = None
    uid: Optional[str] = None
    task_id: Optional[str] = None
    evaluate: Optional[int] = None
    page_no: Optional[int] = 1
    page_size: Optional[int] = 10
    user_id: Optional[str] = None
    order_type: Optional[str] = None
    order_column: Optional[str] = None


