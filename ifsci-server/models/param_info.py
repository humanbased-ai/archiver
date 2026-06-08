from pydantic import BaseModel, Field


class ChatgptBase(BaseModel):
    id: str = None
    content: str = None


class ChatgptTest(BaseModel):
    content: str = None


class FfsTwitter(BaseModel):
    user_id: str = None
    link: str = None


class FfsAccount(BaseModel):
    user_id: str = None
    address: str = None
    sign: str = None
    code: str = None

