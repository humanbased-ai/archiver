from pydantic import BaseModel, Field


class chatgpt_base(BaseModel):
    id: str = None
    content: str = None


class chatgpt_test(BaseModel):
    content: str = None

