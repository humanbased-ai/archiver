import setting
from utils import messageUtils
from utils import redisUtils

import threading
import time
from datetime import datetime
import json
from log import logger

# 记录每个接口超时次数
api_timeout_count = {}


def get_warn_times():
    warn_times = 2000
    try:
        warn_times = setting.api_timeout
    except Exception as e:
        print('error ', e)
    if warn_times is not None:
        warn_times = 2000
    return warn_times


def recordAPIcount(uri: str, usetime: int):

    global api_timeout_count

    warn_times = get_warn_times()
    ms_time = usetime
    if ms_time > warn_times:
        count = None
        if uri in api_timeout_count:
            count = api_timeout_count[uri]
        if count is None:
            count = 1
        else:
            count += 1
        api_timeout_count[uri] = count
    return ''


# 输出请求次数的函数
def output_request_count():
    global api_timeout_count
    if api_timeout_count is None or len(api_timeout_count) == 0:
        return 0

    date_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    api_timeout_count_str = json.dumps(api_timeout_count)
    # print(f'Request {date_str} count: {api_timeout_count}')

    warn_counts = 10
    warn_times = get_warn_times()
    contents = []
    for uri in api_timeout_count.keys():
        request_count = api_timeout_count[uri]
        if request_count is not None and request_count > warn_counts:
            row_content = f"uri:{uri}，次数:{request_count}"
            contents.append(row_content)
        api_timeout_count[uri] = 0
    api_timeout_count = {}
    title = f'服务消息 {date_str}'
    content = f'1分钟耗时超过【{warn_times}】毫秒且次数大于{warn_counts}次的接口列表:'+'\r\n'.join(contents)
    if len(contents) > 0:
        messageUtils.send_message(title, content)
    print(date_str, api_timeout_count_str, ' ', title, content)
    return 1


# 使用定时器每分钟输出请求次数
def timer():
    threading.Timer(60, timer).start()
    output_request_count()

timer()

