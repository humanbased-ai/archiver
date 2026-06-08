package com.wsi.annotation.api.manager.service.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.manager.domain.request.cytomine.*;
import com.wsi.annotation.api.manager.domain.response.cytomine.AnnotationDescriptionResp;
import org.locationtech.jts.io.ParseException;

import java.io.IOException;
import java.util.List;

public interface IAnnotationService {
    List<JSONObject> search(AnnotationSearchReq req);

    JSONObject add(AnnotationAddReq req);

    void crop(String annotationId, String format, Integer maxSize, boolean draw, boolean complete, double increaseArea) throws IOException;

    void description(AnnotationDescriptionSaveReq req);

    AnnotationDescriptionResp getDescription(String annotationId);

    void saveTag(AnnotationDescriptionSaveReq req);

    AnnotationDescriptionResp getTag(AnnotationDescriptionSaveReq req);

    JSONObject del(String id);

    JSONObject detail(String id);

    JSONObject actionSelect(AnnotationActionReq req);

//    JSONObject undo();

    JSONObject update(AnnotationUpdateReq req) throws ParseException;

    JSONObject action(String command,int type) throws ParseException;
}
