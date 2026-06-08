import json
from datetime import datetime

import requests

from utils.file_util import get_json_data

lark_base_notice_file = "./static/json/lark_base_notice.json"

lark_base_notice = get_json_data(lark_base_notice_file)


def make_error_notice(message):
    base_body = lark_base_notice['content']['post']['zh_cn']
    base_body['title'] = "测试通知"
    error_message = [[{"text": message, "tag": "text"}]]
    base_body['content'] = error_message
    send_post_request(lark_base_notice,
                            "<LARK_WEBHOOK_REDACTED>")


def send_post_request(json_data,
                            url="<LARK_WEBHOOK_REDACTED>"):
    # 设置请求头，指定 Content-Type 为 application/json
    headers = {"Content-Type": "application/json"}

    # 发送 POST 请求
    response = requests.post(url, data=json.dumps(json_data), headers=headers)

    print(response.text)
    if response.status_code == 200:
        print("POST 请求成功！")
        print("响应数据:", response.json())
    else:
        print(f"POST 请求失败，状态码: {response.status_code}")




if __name__ == '__main__':
    make_error_notice(f'aliyun Cron_Job 定时任务调度成功:调度时间{datetime.now()}')