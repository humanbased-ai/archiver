from dao.models import AppAccount
from framework.errorcode import USER_NOT_EXIST
from framework.exceptions import BusinessException


async def get_app_count(app_key) -> AppAccount:
    app_count = await AppAccount.single('app_key = %s', app_key)
    if app_count is None:
        raise BusinessException(USER_NOT_EXIST, "user does not exist")
    return app_count
