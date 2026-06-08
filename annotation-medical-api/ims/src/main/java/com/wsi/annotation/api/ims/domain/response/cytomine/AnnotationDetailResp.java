package com.wsi.annotation.api.ims.domain.response.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.mongodb.DBObject;
import com.wsi.annotation.api.common.config.ProjectConfig;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnnotationDetailResp {

    private String id;

    @ApiModelProperty("标注面积只对POLYGON有效")
    private Double area;

    @ApiModelProperty("面积单位3")
    private String areaUnit;

    @ApiModelProperty("图片Id")
    private String image;

    @ApiModelProperty("项目Id")
    public String project;

    private String location;

    @ApiModelProperty("周长")
    private Double perimeter;

    @ApiModelProperty("周长单位")
    private String perimeterUnit;

    private Double geometryCompression;

    private String container;

    private JSONObject centroid;

    private Double rate;

    private String cropURL;

    private String smallCropURL;

    private String url;

    private String imageURL;

    private boolean reviewed;

    private String user;

    private int nbComments;


//    private String getUserAnnotationCropWithAnnotationId(Long idAnnotation) {
//        return  ProjectConfig.getServerUrl() +"/api/userannotation/$idAnnotation/crop.jpg";
//    }
//
//    private String getUserAnnotationCropWithAnnotationIdWithMaxWithOrHeight(Long idAnnotation, int maxWidthOrHeight, def format="png") {
//        return ProjectConfig.getServerUrl() + "/api/userannotation/$idAnnotation/crop.$format?maxSize=$maxWidthOrHeight"
//    }
//    private String getAnnotationURL(Long idProject, Long idImage, Long idAnnotation) {
//        return  "${UIUrl()}/#/project/$idProject/image/$idImage/annotation/$idAnnotation"
//    }
}
