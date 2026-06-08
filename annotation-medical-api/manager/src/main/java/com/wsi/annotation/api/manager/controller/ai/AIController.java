package com.wsi.annotation.api.manager.controller.ai;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.manager.domain.request.ai.AddResultReq;
import com.wsi.annotation.api.manager.domain.request.ai.GetResultReq;
import com.wsi.annotation.api.manager.domain.request.image.UpdateQualityReq;
import com.wsi.annotation.api.manager.service.ai.IAIService;
import com.wsi.annotation.api.manager.service.ai.imp.AIService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

@RestController
@RequestMapping("/ai/")
@Api(tags = "ai")
public class AIController {

    @Resource
    private AIService aiService;

    @PostMapping(value = "/addResult", produces = {"application/json"})
    @ApiOperation(value = "添加AI处理结果", notes = "添加AI处理结果", nickname = "addResult")
    public JSONObject addResult(@RequestBody AddResultReq addResultReq) {
        return aiService.addResult(addResultReq);
    }

    @GetMapping(value = "/getTagByPlace", produces = {"application/json"})
    @ApiOperation(value = "获取AI标签", notes = "获取AI标签", nickname = "getTagByPlace")
    public JSONObject getTagByPlace(@RequestParam String module){
        return aiService.getTagByPlace(module);
    }

    @PostMapping(value = "/getResult", produces = {"application/json"})
    @ApiOperation(value = "获取AI处理结果", notes = "获取AI处理结果", nickname = "getResult")
    public JSONObject getResult(@RequestBody GetResultReq getResultReq){
        return aiService.getResult(getResultReq.getImageId(),getResultReq.getTagId());
    }
}
