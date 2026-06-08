import json
import os
from concurrent.futures import ThreadPoolExecutor

# import anthropic
# import httpx
import requests
import traceback
import base64

from retry import retry
from anthropic import AnthropicVertex
from datasketch.minhash import MinHash
from lsh import MinHashLSH
from fake_useragent import UserAgent

project_id = os.environ.get("PROJECT_ID", "chaintool-etl")
region = os.environ.get("REGION", "us-central1")

client = AnthropicVertex(region=region, project_id=project_id)  # anthropic.Anthropic(api_key="") #

ocr_prompt = open("ocr.txt").read()
trans_prompt = open("trans.txt").read()

redis_host = os.environ.get("REDIS_HOST", "<INTERNAL_IP_REDACTED>")
redis_port = int(os.environ.get("REDIS_PORT", "36379"))
redis_db = int(os.environ.get("REDIS_DB", "6"))

storage_config = {
    'basename': 'checker'.encode("utf-8"),
    'type': 'redis',
    'redis': {'host': redis_host, 'port': redis_port, 'db': redis_db},
}
lsh = MinHashLSH(threshold=0.8, num_perm=512, storage_config=storage_config)

ua = UserAgent(browsers=['chrome', 'firefox', "edge"], os=["windows"])


def _check_image(image):
    m1 = MinHash(512, 8)
    m1.update(image)
    ret = lsh.query(m1)
    return ret


def _save_img(img_name, img):
    m1 = MinHash(512, 8)
    m1.update(img)

    with lsh.insertion_session() as s:
        s.insert(img_name, m1)


def ask_claude_text(text):
    try:
        message = client.messages.create(
            model="claude-3-sonnet@20240229",
            max_tokens=1024,
            # system=system,
            messages=[
                {"role": "user", "content": text}
            ]
        )
        return message
    except Exception as e:
        traceback.print_exc()


def ask_claude_with_img(text, image, image_type):
    try:
        message = client.messages.create(
            model="claude-3-opus@20240229",
            max_tokens=1024,
            messages=
            [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": image_type,
                                "data": image,
                            },
                        },
                        {
                            "type": "text",
                            "text": text
                        }
                    ],
                }
            ]
            ,
        )
        return message
    except Exception as e:
        traceback.print_exc()


def ask_gemini_text(text):
    try:
        import vertexai
        from vertexai.preview.generative_models import GenerativeModel, Image

        vertexai.init(project=project_id, location=region)

        generative_multimodal_model = GenerativeModel("gemini-1.5-flash-001")
        response = generative_multimodal_model.generate_content([text])

        # print(response)

        result_text = response.text.replace("```", "")
        if result_text.startswith("json"):
            result_text = result_text.replace("json", "")
        return json.loads(result_text)
    except Exception as e:
        traceback.print_exc()


def ask_gemini_with_img(text, image, image_type):
    try:
        import vertexai
        from vertexai.preview.generative_models import GenerativeModel, Image

        vertexai.init(project=project_id, location=region)

        image = Image.from_bytes(base64.b64decode(image))

        generative_multimodal_model = GenerativeModel("gemini-1.5-pro-001")
        response = generative_multimodal_model.generate_content([text, image])

        result_text = response.text.replace("```", "")
        if result_text.startswith("json"):
            result_text = result_text.replace("json", "")
        return json.loads(result_text)
    except Exception as e:
        traceback.print_exc()
        return {}


@retry(tries=3)
def download_img(url):
    res = requests.get(url)
    content = res.content
    img_type = "image/jpeg"
    if url.endswith("png"):
        img_type = "image/png"
    return content, img_type


def _download_imgs(urls: list):
    # 多线程下载所有图片
    thread_pool = ThreadPoolExecutor(max_workers=10)
    return thread_pool.map(download_img, urls)


def _check_text(text1, text2):
    m1 = MinHash()
    m2 = MinHash()
    for d in text1:
        m1.update(d.encode('utf8'))
    for d in text2:
        m2.update(d.encode('utf8'))
    # print("Estimated Jaccard for data1 and data2 is", m1.jaccard(m2))

    return m1.jaccard(m2)


def _check_url(url, address):
    try:
        res = requests.get(url, headers={"User-Agent": ua.random})
        if res.status_code == 200:
            body = res.text
            if address in body:
                return True
        return False
    except Exception:
        return "Error"


def check_submission(data: dict):
    return_data = {}
    if "image" in data:
        try:
            (pic, pic_type) = download_img(data['image'])
        except Exception:
            return_data["check_result"] = {"type": "img_check", "msg": "image data not valid", "success": False}
            return return_data
        has_img = _check_image(pic)
        if has_img:
            print(has_img)
            return_data["check_result"] = {"type": "img_check", "msg": "image repeated", "success": False}
        else:
            _save_img(data['image'], pic)
            pic_ret = ask_gemini_with_img(ocr_prompt, base64.b64encode(pic).decode("utf-8"), pic_type)
            print(pic_ret)
            if not pic_ret:
                return_data["check_result"] = {"type": "img_check", "msg": "ai response unexpected data",
                                               "success": False}
                return return_data
            for k in ['noText', 'text']:
                if k not in pic_ret:
                    return_data["check_result"] = {"type": "img_check", "msg": "ai not data:" + k,
                                                   "success": False}
                    return return_data
            pic_ret["url"] = data['image']
            # 检查图片内容是否有文字
            return_data['pic'] = pic_ret
            return_data["imageTag"] = 1
            if pic_ret['noText']:
                return_data["check_result"] = {"type": "img_check", "msg": "image no matching text found",
                                               "success": False}
            if "check_result" not in return_data or not return_data['check_result']:
                return_data["check_result"] = {"type": "img_check", "msg": "ok", "success": True, "text": pic_ret['text']}
    if 'text' in data and data['text']:
        text_ret = ask_gemini_text(trans_prompt.replace("%s", data['text']))
        return_data['translation'] = text_ret
        return_data["check_result"] = {"type": "text_check", "msg": "ok", "success": True}

    return return_data


def check_submissions(datas: list):
    thread_pool = ThreadPoolExecutor(max_workers=10)
    ret = thread_pool.map(check_submission, datas)
    thread_pool.shutdown()
    return list(ret)


def change_data(data: dict):
    real_data = []
    v = json.loads(data["evidence"])
    if "entity" not in data:
        data['entity'] = None
    if "link" in v:
        real_data.append({"address": data['address'],
                          "entity": data['entity'], "network": data['network'], "webpage": v['link']})
    if "text" in v:
        real_data.append({"text": v['text']})
    if v.get("files"):
        for f in v["files"]:
            real_data.append({"address": data['address'], "image": f["path"],
                              "entity": data['entity'], "network": data['network']})

    return real_data


if __name__ == "__main__":
    # print(1)
    datas = {"address": "0x28c6c06298d514db089934071355e5743bf21d60",
             "network": "Ethereum",
             "evidence": '{"text":"交易对象敏感","files":[{"filename":"testEth2.png","path":"https://file.b18a.io/155346681847808_879421_.png"}],"hash":"0xd99d31d43cf5c16e6389852b4c8fe05d7c22225fda8d8e8b46cf7f7c8ecf4ed8","date":1718075533158}'
             }

    print(_check_text("0xaC64470C26aE348D869507608b72cb727532A930", "0xaC64418C26aE348D869587688872cb727532A938"))
    # real_dta = change_data(datas)
    # rets = check_submissions(real_dta)
    # print(rets)

    # image1_url = "https://file.b18a.io/78980389-8626-41a6-8836-163935f49c5c_924578_.png"
    # image1_media_type = "image/jpeg"
    # content = requests.get(image1_url).content
    # image1_data = base64.b64encode(content).decode("utf-8")
    # ret = _check_image(content)
    # print(ret)
    # if not ret:
    #     _save_img(image1_url, content)
    #     ret = _check_image(content)
    #     print(ret)

    # ret = ask_gemini_with_img("Describe this image.", image1_data, image1_media_type)
    # print(ret)
