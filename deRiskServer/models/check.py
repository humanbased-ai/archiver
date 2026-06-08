from pydantic import BaseModel, Field


class ConfigObject(BaseModel):
    type: str = Field(examples=["配置类型"])
    data: object = None


class TxObject(BaseModel):
    from_address: str = Field(alias='from')
    # from_address: str
    to_address: str = Field(alias='to')
    to_address: str
    gas: int
    gas_price: str
    value: str
    data: str
    nonce: int
    hash: str = None


class CheckParam(BaseModel):
    id: str
    chain_id: str
    tx: TxObject
    config: list[ConfigObject] = []


class SubRiskInfo(BaseModel):
    risk_type: str = ""
    # sub_type_list: list[str] = Field(alias='list')
    risk_list: list[str] = []
    malice_address_list: list[str] = []


class SubAdvise(BaseModel):
    title: str = ""
    link: str = ""


class RiskResult(BaseModel):
    # 分数越高，风险越高，大于60分认为是高风险
    score: int = 30
    risk_level: str = "LOW"
    risk_info: list[SubRiskInfo] = []
    advise: list[SubAdvise] = []


class MidRiskResult(BaseModel):
    # 记录中间过程帮助分析
    goplus_risk_list: str = ""
    chaintool_risk_list: str = ""
    action_risk_list: str = ""


class ReportParam(BaseModel):
    user_id: str
    record_id: str
    message: str = None
    from_address: str = Field(alias='from')
    to_address: str = Field(alias='to')


