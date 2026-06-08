package com.wsi.annotation.api.manager.controller.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.manager.domain.request.base.Page;
import com.wsi.annotation.api.manager.domain.request.cytomine.ImageInstanceSearchReq;
import com.wsi.annotation.api.manager.domain.request.cytomine.PositionReq;
import com.wsi.annotation.api.manager.domain.request.image.ImageListReq;
import com.wsi.annotation.api.manager.domain.response.base.CollectionBaseResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ConsultationResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ImageInstanceResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.PositionResp;
import com.wsi.annotation.api.manager.domain.response.result.CommonResult;
import com.wsi.annotation.api.manager.service.cytomine.IImageInstanceService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.locationtech.jts.io.ParseException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/imagecore/api/imageinstance")
@Api(tags = "imageInstance")
public class ImageInstanceController {

    @Autowired
    private IImageInstanceService imageService;


    @GetMapping(value = "/{image}.json", produces = {"application/json"})
    @ApiOperation(value = "获取项目图片信息", notes = "获取项目图片信息", nickname = "tile")
    public ImageInstanceResp detail(@PathVariable String image) {
        return imageService.detail(image);
    }


    @GetMapping(value = "/listByProject.json", produces = {"application/json"})
    @ApiOperation(value = "获取项目图片清单", notes = "获取静态图片地址", nickname = "listByProject")
    public CollectionBaseResp<ImageInstanceResp> listByProject(ImageInstanceSearchReq req) {
        return imageService.listByProject(req);
    }

    @PostMapping(value = "/list.json", produces = {"application/json"})
    @ApiOperation(value = "图片列表", notes = "获取静态图片地址", nickname = "tile")
    public Page<ImageInstanceResp> list(@RequestBody ImageListReq imageListReq) {
//        System.out.println("123");
        return imageService.list(imageListReq);
    }

    @GetMapping(value = "/all.json", produces = {"application/json"})
    @ApiOperation(value = "图片列表", notes = "获取静态图片地址", nickname = "tile")
    public Page<ImageInstanceResp> all() {
        ImageListReq imageListReq = new ImageListReq();
        imageListReq.setPageSize(9999);
        return imageService.list(imageListReq);
    }

    @PostMapping(value = "/{image}/consultation.json", produces = {"application/json"})
    @ApiOperation(value = "consultation", notes = "consultation", nickname = "consultation")
    public ConsultationResp consultation(@PathVariable String image, String mode) {
        return imageService.consultation(image, mode);
    }


    @GetMapping(value = "/{image}/annotationindex.json", produces = {"application/json"})
    @ApiOperation(value = "annotationindex", notes = "annotationindex", nickname = "annotationindex")
    public JSONObject annotationindex(@PathVariable String image) {
        return imageService.annotationindex(image);
    }

    @GetMapping(value = "/{image}/aiResult.json", produces = {"application/json"})
    @ApiOperation(value = "aiResult", notes = "aiResult", nickname = "aiResult")
    public JSONObject getAIResult(@PathVariable String image) {
        return imageService.getAIResult(image);
    }

    @GetMapping(value = "/{image}/heatmap.json", produces = {"application/json"})
    @ApiOperation(value = "heatmap", notes = "heatmap", nickname = "heatmap")
    public JSONObject heatmap(@PathVariable String image) {
        return imageService.getHeatmap(image);
    }

    @PostMapping(value = "/{image}/saveUserAIResult.json", produces = {"application/json"})
    @ApiOperation(value = "aiResult", notes = "aiResult", nickname = "aiResult")
    public JSONObject saveUserAIResult(@PathVariable String image,@RequestBody JSONObject userResult){
        return imageService.saveUserAIResult(image,userResult);
    }

    @PostMapping(value = "/{image}/position.json", produces = {"application/json"})
    @ApiOperation(value = "position", notes = "position", nickname = "position")
    public PositionResp position(@PathVariable String image, @RequestBody PositionReq req) {
        try {
            return imageService.position(image, req);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return null;
    }

    @GetMapping(value = "/{image}/online.json", produces = {"application/json"})
    @ApiOperation(value = "online", notes = "online", nickname = "online")
    public JSONObject online(@PathVariable String image, @RequestParam Boolean broadcast) {
        JSONObject jsonObject = new JSONObject();
        List<String> users = imageService.online(image, broadcast);
        jsonObject.put("users",users);
        return jsonObject;
    }
    @GetMapping(value = "/{image}/position/{user}.json", produces = {"application/json"})
    @ApiOperation(value = "online", notes = "online", nickname = "online")
    public PositionResp getPosition(@PathVariable String image,@PathVariable String user) {
        try {
            return imageService.getPosition(image, user);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return null;
    }

//    @PostMapping(value="/getSvsSearchResult.json",produces = {"application/json"})
//    @ApiOperation(value = "获取搜索结果" , notes = "获取静态图片地址", nickname = "tile")
//    public CommonResult getSvsSearchResult(@RequestBody ImageInstance imageInstance){
//        CommonResult result = CommonResult.failed();
//        try {
//            result = imageService.getSvsSearchResult(imageInstance);
//        } catch (Exception e) {
//            result = CommonResult.failed("初始化图片库异常");
//        }
//        return result;
//    }
}
