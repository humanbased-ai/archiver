package com.wsi.annotation.api.manager.domain.response.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.mongodb.DBObject;
import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.enums.UnitEnum;
import com.wsi.annotation.api.common.utils.bean.BeanUtils;
import com.wsi.annotation.api.database.domain.cytomine.UserAnnotation;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnnotationDetailResp {

    private String id;
    private Long created;

    @ApiModelProperty("标注面积只对POLYGON有效")
    private Double area;

    private List<String> term = new ArrayList<>();

    @ApiModelProperty("面积单位3")
    private String areaUnit;

    @ApiModelProperty("图片Id")
    private String image;

    @ApiModelProperty("项目Id")
    private String project;

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

    private Boolean reviewed;

    private String user;

    private int nbComments;

    private double x;

    private double y;

    private String description;
    private List<String> color;
    private List<String> tagName;

    public AnnotationDetailResp(UserAnnotation annotation) {

        BeanUtils.copyBeanProp(this, annotation);
        this.created = annotation.getCreateTime().getTime();
        this.areaUnit = UnitEnum.findByCode(annotation.getArea_unit()).getName();
        this.perimeterUnit = UnitEnum.findByCode(annotation.getPerimeter_unit()).getName();
        this.image = annotation.getImage_id();
        this.project = annotation.getProject_id();
        this.user = annotation.getUser_id();
        this.location = annotation.getWkt_location();
        this.container = this.project;
        JSONObject centroid = new JSONObject();
        WKTReader reader = new WKTReader();
        try {
            Geometry geometry = reader.read(annotation.getWkt_location());
            this.x = geometry.getCentroid().getX();
            this.y = geometry.getCentroid().getY();
            centroid.put("x", this.x);
            centroid.put("y", this.y);
        } catch (Exception e) {
            e.printStackTrace();
        }
        this.centroid = centroid;
        this.rate = this.geometryCompression;
        this.cropURL = getUserAnnotationCropWithAnnotationId();
        this.smallCropURL = getUserAnnotationCropWithAnnotationIdWithMaxWithOrHeight();
        this.url = getUserAnnotationCropWithAnnotationId();
        this.imageURL = getAnnotationURL();

    }


    private String getUserAnnotationCropWithAnnotationId() {
        return ProjectConfig.getServerUrl() + "/cytomine/annotation/crop?annotationId=" + this.id + "&format=jpg";
    }

    private String getUserAnnotationCropWithAnnotationIdWithMaxWithOrHeight() {
        return ProjectConfig.getServerUrl() + "/cytomine/annotation/crop?annotationId=" + this.id + "&format=png&maxSize=256";
    }

    private String getAnnotationURL() {
        return ProjectConfig.getUiUrl() + "/#/project/" + this.project + "/image/" + this.image + "/annotation/" + this.id;
    }
}
