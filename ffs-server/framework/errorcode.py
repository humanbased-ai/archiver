# 错误码定义在这里

HTTP_PARAM_ILLEGAL = 400  # 请求参数非法
HTTP_NOT_ACCOUNT = 401  # 账号不存在
HTTP_NOT_PERMISSON = 403  # 账号没有权限
HTTP_RATE_LIMIT = 429  # 账号没有权限

# 1000-1999 公共错误
SUCCESS = 0  # 成功
ERROR = 500  # 服务错误
SYSTEM_ERROR = 1000  # 系统错误
REQUEST_PARAM_ILLEGAL = 1002  # 请求参数非法
USER_NOT_EXIST = 1003  # 用户不存在
USER_TOKEN_INVALID = 2011  # 用户token无效
DISCORD_TOKEN_FAILED = 2014  # Discord token 失效需要重新登录
USER_COMPOSURE_MSG_FAILED = 2013  # 账号处在冷静期
