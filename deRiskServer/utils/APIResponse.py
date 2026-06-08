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
