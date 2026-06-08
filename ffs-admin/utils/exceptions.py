

"""自定义异常"""


class BusinessException(Exception):
    """This is a customized exception for business  """

    def __init__(self, code: int, msg: str):
        self.code = code
        self.msg = msg
