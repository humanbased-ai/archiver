from pydantic import BaseModel


class QuestionParam(BaseModel):
    network: str
    from_address: str
    to_address: str
    value: str


class QuestionResult(BaseModel):
    risk_level: str = "LOW"
    risk_info: str = ""
    advise: str = ""

class DataResult(BaseModel):
    text: str = ""

