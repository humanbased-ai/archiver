package com.wsi.annotation.api.manager.controller.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.manager.domain.request.cytomine.*;
import com.wsi.annotation.api.manager.domain.response.cytomine.AnnotationDescriptionResp;
import com.wsi.annotation.api.manager.service.cytomine.IAnnotationService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.locationtech.jts.io.ParseException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/imagecore/api")
@Api(tags = "annotation")
public class AnnotationController {

    @Autowired
    private IAnnotationService annotationService;

    @PostMapping(value = "/annotation/search.json", produces = {"application/json"})
    @ApiOperation(value = "标注搜索", notes = "标注搜索", nickname = "tile")
    public JSONObject search(@RequestBody AnnotationSearchReq req) {
        List<JSONObject> resps = annotationService.search(req);
        return getJsonObject(resps, req.getOffset(), req.getMax());
    }

    private JSONObject getJsonObject(List collection, int offset, int max) {
        JSONObject json = new JSONObject();
        json.put("collection", collection);
        json.put("offset", 0);
        json.put("perPage", Math.min(max, collection.size()));
        json.put("size", collection.size());
        json.put("totalPages:", max != 0 ? Math.ceil(collection.size() / max) : 0);
        return json;
    }

    @PostMapping(value = "/annotation.json", produces = {"application/json"})
    @ApiOperation(value = "标注新增", notes = "标注搜索", nickname = "tile")
    public JSONObject add(@RequestBody AnnotationAddReq req) {
        return annotationService.add(req);
    }

    @GetMapping(value = "/userannotation/{annotationId}/crop.{format}")
    @ApiOperation(value = " Get annotation user crop", notes = " Get annotation user crop", nickname = "thumb")
    public void crop(@PathVariable String annotationId, @PathVariable String format, Integer maxSize, boolean draw, boolean complete, double increaseArea) {
        try {
            annotationService.crop(annotationId, format, maxSize, draw, complete, increaseArea);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @GetMapping(value = "/domain/{className}/{annotationId}/description.json")
    @ApiOperation(value = " description", notes = " description", nickname = "description")
    public AnnotationDescriptionResp description(@PathVariable String className, @PathVariable String annotationId) {
        return annotationService.getDescription(annotationId);
    }


    @PutMapping(value = "/domain/{className}/{annotationId}/description.json")
    @ApiOperation(value = " description", notes = " description", nickname = "description")
    public void description(@PathVariable String className, @PathVariable String annotationId, @RequestBody AnnotationDescriptionSaveReq req) {
        try {
            annotationService.description(req);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PostMapping(value = "/domain/saveTag.json")
    @ApiOperation(value = " saveTag", notes = " saveTag", nickname = "saveTag")
    public void saveTag(@RequestBody AnnotationDescriptionSaveReq req) {
        try {
            annotationService.saveTag(req);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PostMapping(value = "/domain/getTag.json")
    @ApiOperation(value = " getTag", notes = " getTag", nickname = "getTag")
    public AnnotationDescriptionResp getTag(@RequestBody AnnotationDescriptionSaveReq req) {
        return annotationService.getTag(req);
    }

    @DeleteMapping(value = "/annotation/{id}.json", produces = {"application/json"})
    @ApiOperation(value = "标注删除", notes = "标注删除", nickname = "tile")
    public JSONObject del(@PathVariable String id) {
        return annotationService.del(id);
    }

    @GetMapping(value = "/annotation/{id}.json", produces = {"application/json"})
    @ApiOperation(value = "标注详情", notes = "标注详情", nickname = "detail")
    public JSONObject detail(@PathVariable String id) {
        return annotationService.detail(id);
    }

    @PutMapping(value = "/annotation/{id}.json", produces = {"application/json"})
    @ApiOperation(value = "修改", notes = "修改", nickname = "detail")
    public JSONObject update(@RequestBody AnnotationUpdateReq req) {
        try {
            return annotationService.update(req);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return null;
    }


    @GetMapping(value = "/annotation/property/key.json", produces = {"application/json"})
    @ApiOperation(value = "key", notes = "key", nickname = "key")
    public JSONObject key(String idImage, Boolean user, int offset, int max) {
        return getJsonObject(new ArrayList(), offset, max);
    }

    @PostMapping(value = "/annotation_action.json", produces = {"application/json"})
    @ApiOperation(value = "annotation_action_select", notes = "annotation_action_select", nickname = "annotation_action_select")
    public JSONObject select(@RequestBody AnnotationActionReq req) {

        return annotationService.actionSelect(req);
    }

    @GetMapping(value = "/command/{command}/undo.json", produces = {"application/json"})
    @ApiOperation(value = "annotation_undo", notes = "annotation_undo", nickname = "annotation_undo")
    public JSONObject undo(@PathVariable String command) {
        try {
            return annotationService.action(command, 1);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return null;
    }

    @GetMapping(value = "/command/{command}/redo.json", produces = {"application/json"})
    @ApiOperation(value = "annotation_redo", notes = "annotation_redo", nickname = "annotation_redo")
    public JSONObject redo(@PathVariable String command) {
        try {
            return annotationService.action(command, 2);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return null;
    }

    @GetMapping(value = "/annotation/{id}/term.json", produces = {"application/json"})
    @ApiOperation(value = "term", notes = "term", nickname = "term")
    public JSONObject term(@PathVariable String id, Integer max, Integer offset) {
        return getJsonObject(new ArrayList(), offset, max);
    }
}
