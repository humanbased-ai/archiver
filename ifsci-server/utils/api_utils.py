import setting
from utils import message_utils
from utils import redis_utils

import threading
import time
from datetime import datetime
import json
from log import logger

# Record timeout count for each API endpoint
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


# Function to output request statistics
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
            row_content = f"uri:{uri}, count:{request_count}"
            contents.append(row_content)
        api_timeout_count[uri] = 0
    api_timeout_count = {}
    title = f'Service Status Report {date_str}'
    content = f'APIs with response time exceeding {warn_times}ms and request count over {warn_counts} in the last minute:'+'\r\n'.join(contents)
    if len(contents) > 0:
        message_utils.send_message(title, content)
    print(date_str, api_timeout_count_str, ' ', title, content)
    return 1


# Use timer to output request statistics every minute
def timer():
    threading.Timer(60, timer).start()
    output_request_count()

timer()
