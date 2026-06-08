from typing import Optional, Type

from pydantic import BaseModel

content_type_json = 'application/json'
success_key = 'success'
success_true_value = True
success_code_key = 'errorCode'

result_key_error_msg = 'errorMessage'
result_value_success = 'SUCCESS'
success_code = 0


class CommonResult(BaseModel):
    data: Optional[BaseModel] = None
    success: bool = success_true_value
    error_msg: str = result_value_success
    code: int = success_code

    _result_cls: Type

    def __init__(self, **kwargs):
        if "data" not in kwargs:
            data = self._result_cls(**kwargs)
            super(CommonResult, self).__init__(data=data)
        else:
            super(CommonResult, self).__init__(**kwargs)


def suc_enclosure(obj):
    return CommonResult(
        data=obj,
        success=success_true_value,
        error_msg=result_value_success,
        code=success_code)


def suc_enc(obj: dict):
    obj[success_key] = success_true_value
    obj[success_code_key] = success_code
    obj[result_key_error_msg] = result_value_success
    return obj
