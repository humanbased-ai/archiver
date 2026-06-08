import time, uuid, json, os

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response
import traceback
from asyncer import asyncify

from tasks import change_data, check_submissions

app = FastAPI()

origins = [
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post('/api/submission/evidence/check')
async def evidence_check(request: Request):
    try:
        # {
        #     "network": "ethereum",
        #     "address": "0xceb69f6342ece283b2f5c9088ff249b5d0ae66ea",
        #     "entity": "",
        #     "link": "",
        #     "reason": "[{\"text\":\"1234\",\"files\":[{\"path\",\"https://pics0.baidu.com/feed"]}}]",
        # } to
        # {
        #     Image: v.Path(files), or  Webpage: evi.Link(Link),  #图片需要下载
        #     Entity: entity,
        #     Network: network,
        #     Address: address,
        # }
        # 1.检查图片是否重复,现在是md5算法
        # 2.   Claude3 ocr检查图片  返回结构
        # ImageOcrInfo
        # {CoinRelated
        # SendAddrs[]
        # SendEntity
        # RecvAddrs[]
        # RecvEntity
        # Network
        # Edited
        # FromPhone
        # GroundTruth
        # }
        # 3. 处理weblink
        # 4. 翻译为英语
        # 翻译结构  {
        # 	Usage  {
        # InputToken:''，OutputToken:''	}
        # 	Content [{
        # Type:'',Text:"{'Web3Related':'','Translation':''}"	}]
        # }

        data = await request.json()
        print(data)
        real_data = change_data(data)
        return_data = await asyncify(check_submissions)(real_data)
        print(return_data)
        imageTags = []

        check_results = []
        evidence = json.loads(data['evidence'])
        for d in return_data:
            if "translation" in d :
                if d['translation'] and "translation" in d['translation']:
                    evidence["translation"] = d["translation"]['translation']
                evidence["translation"]=None
            if "pic" in d and 'imageTag' in d['pic']:
                imageTags.append({d['pic']['url']: d['pic']['imageTag']})
            if "check_result" in d:
                check_results.append(d['check_result'])
        data["check_results"] = check_results
        data['evidence'] = evidence
        return {'code': 0, 'message': '', 'data': {'result': 'SUCCESS', 'reason': '', 'output': data,
                                                   'imageTags': json.dumps(imageTags)}}
    except Exception as e:
        traceback.print_exc()
        print(request.headers)
        return Response('server error ' + str(e), status_code=500, headers={'content-type': 'text/html; charset=UTF-8'})


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=80, log_level="info", reload=False,
                forwarded_allow_ips='*')
