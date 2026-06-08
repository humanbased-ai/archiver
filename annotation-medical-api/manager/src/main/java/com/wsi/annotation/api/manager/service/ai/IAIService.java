package com.wsi.annotation.api.manager.service.ai;


import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.manager.domain.request.ai.AddResultReq;

public interface IAIService {

    JSONObject addResult(AddResultReq addResultReq);

    JSONObject getTagByPlace(String module);

    JSONObject getResult(String imageId,String tagId);
}
