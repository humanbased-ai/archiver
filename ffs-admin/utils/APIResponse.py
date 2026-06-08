import json


class APIResponse:
    def __init__(self, code, data=None, message=None):
        self.code = code
        self.data = data
        self.message = message

    def set_api_dict(self):
        api_dict = {
            "code": self.code,
            "data": self.data,
            "message": self.message
        }
        return api_dict

    def set_codata_api_dict(self):
        success = True
        if self.code != 0:
            success = False
        api_dict = {
            "errorCode": self.code,
            "data": self.data,
            "errorMessage": self.message,
            "success": success
        }
        return api_dict
