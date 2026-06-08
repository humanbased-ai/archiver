import requests
import json
import setting
from log import logger

def send_message(title: str, content: str):
    ret = ''
    if 'test' in setting.dbUrl:
        return ret
    try:
        url = setting.larkUrl
        if url is None:
            return None
        text = title+'\r\n'+content
        data = {
            "msg_type": "text",
            "content": {
                "text": text
            }
        }
        data_json = json.dumps(data)
        resp = requests.post(url, data=data_json)
        ret = resp.text
    except Exception as e:
        print(e)

    return ret


