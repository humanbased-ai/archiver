package com.wsi.annotation.api.manager.controller.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.core.domain.Page;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import com.wsi.annotation.api.manager.domain.request.cytomine.ConnectTagSaveReq;
import com.wsi.annotation.api.manager.domain.request.cytomine.TagListReq;
import com.wsi.annotation.api.manager.domain.request.cytomine.TagSaveReq;
import com.wsi.annotation.api.manager.domain.response.cytomine.AnnotationDetailResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ImageInstanceResp;
import com.wsi.annotation.api.manager.service.cytomine.IAnnotationService;
import com.wsi.annotation.api.manager.service.cytomine.IImageInstanceService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/")
@Api(tags = "annotation")
public class TagController {

    @Autowired
    private IAnnotationService annotationService;


    @Autowired
    private IImageInstanceService imageInstanceService;

//    @GetMapping(value = "/domain/{className}/{annotationId}/tag_domain_association.json")
//    @ApiOperation(value = " tag_domain_association", notes = " tag_domain_association", nickname = "tag_domain_association")
//    public JSONObject getTags(@PathVariable String className, @PathVariable String annotationId, int offset, int max) {
//        if (ImageInstanceResp.class.getName().equals(className)) {
//            return imageInstanceService.getImageTags(annotationId, offset, max);
//        } else if (AnnotationDetailResp.class.getName().equals(className)) {
//            return annotationService.getTags(annotationId, offset, max);
//        }
//        return new JSONObject();
//    }
//
//
//    @GetMapping(value = "/tag.json")
//    @ApiOperation(value = "获取所有标签", notes = "获取所有标签", nickname = "获取所有标签")
//    public JSONObject getAllTags(int offset, int max) {
//        return annotationService.getAllTags(offset, max);
//    }
//
//    @GetMapping(value = "/getTagsByType")
//    @ApiOperation(value = "根据类型获取标签", notes = "根据类型获取标签", nickname = "根据类型获取标签")
//    public List<Tag> getTagsByType(Integer type) {
//        return annotationService.getTagsByType(type);
//    }
//
//    @GetMapping(value = "/getTagByPosition")
//    @ApiOperation(value = "根据部位获取标签", notes = "获取所有标签", nickname = "获取所有标签")
//    public List<Tag> getTagByPosition(@RequestParam String position,@RequestParam(required = false) Integer type) {
//        return annotationService.getTagByPosition(position,type);
//    }
//
//    @GetMapping(value = "/getTagByCancer")
//    @ApiOperation(value = "根据部位获取标签", notes = "获取所有标签", nickname = "获取所有标签")
//    public List<Tag> getTagByCancer(@RequestParam String cancer,@RequestParam(required = false) Integer type) {
//        return annotationService.getTagByCancer(cancer,type);
//    }
//
//    @PostMapping(value = "/tag.json")
//    @ApiOperation(value = "添加标签", notes = "添加标签", nickname = "添加标签")
//    public JSONObject saveTag(@RequestBody TagSaveReq req) {
//        return annotationService.saveTag(req);
//    }
//
//    @PutMapping(value = "/tag.json")
//    @ApiOperation(value = "编辑标签", notes = "编辑标签", nickname = "编辑标签")
//    public JSONObject editTag(@RequestBody TagSaveReq req) {
//        return annotationService.editTag(req);
//    }
//
//    @PostMapping(value = "/tagList")
//    @ApiOperation(value = "标签列表", notes = "标签列表", nickname = "标签列表")
//    public Page<Tag> tagList(@RequestBody TagListReq req) {
//        return annotationService.tagList(req);
//    }
//
//    @DeleteMapping(value = "/tag.json")
//    @ApiOperation(value = "删除标签", notes = "删除标签", nickname = "删除标签")
//    public JSONObject delTag(@RequestParam String id) {
//        return annotationService.delTag(id);
//    }
//
//
//    @PostMapping(value = "/domain/{className}/{annotationId}/tag_domain_association.json")
//    @ApiOperation(value = " tag_domain_association_add", notes = " tag_domain_association_add", nickname = "tag_domain_association_add")
//    public JSONObject saveAnnotationTag(@PathVariable String className, @PathVariable String annotationId, @RequestBody ConnectTagSaveReq req) {
//        if (ImageInstanceResp.class.getName().equals(className)) {
//            return imageInstanceService.saveImageTag(annotationId, req);
//        } else if (AnnotationDetailResp.class.getName().equals(className)) {
//            return annotationService.saveAnnotationTag(annotationId, req);
//        }
//        return new JSONObject();
//
//    }
//
//    @DeleteMapping(value = "/tag_domain_association/{tagId}.json")
//    @ApiOperation(value = " tag_domain_association_del", notes = " tag_domain_association_del", nickname = "tag_domain_association_del")
//    public JSONObject delAnnotationTag(@PathVariable String tagId) {
//        return annotationService.delAnnotationTag(tagId);
//    }
}
