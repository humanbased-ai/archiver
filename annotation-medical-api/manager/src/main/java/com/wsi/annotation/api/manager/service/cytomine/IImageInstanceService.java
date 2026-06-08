package com.wsi.annotation.api.manager.service.cytomine;


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
import org.locationtech.jts.io.ParseException;

import java.awt.image.BufferedImage;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.util.List;

public interface IImageInstanceService {
    ImageInstanceResp detail(String imageId);

    CollectionBaseResp<ImageInstanceResp> listByProject(ImageInstanceSearchReq req);

    Page<ImageInstanceResp> list(ImageListReq imageListReq);

    BufferedImage thumb(String id, int maxSize) throws UnsupportedEncodingException, MalformedURLException;

    ConsultationResp consultation(String image, String mode);

    JSONObject annotationindex(String image);

    PositionResp position(String image, PositionReq req) throws ParseException;

    List<String> online(String image, Boolean broadcast);

    PositionResp getPosition(String image, String user) throws ParseException;

    JSONObject getAIResult(String image);

    JSONObject getHeatmap(String image);

    JSONObject saveUserAIResult(String image,JSONObject userResult);

    //获取搜索结果
//    CommonResult getSvsSearchResult(ImageInstance imageInstance);
}
