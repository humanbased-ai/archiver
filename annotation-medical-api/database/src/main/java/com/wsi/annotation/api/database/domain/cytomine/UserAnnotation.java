package com.wsi.annotation.api.database.domain.cytomine;

import com.mongodb.DBObject;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.cytomine.Inner.InnerTag;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "user_annotation")
public class UserAnnotation  extends BaseEntity {

    @Id
    private String id;

    @ApiModelProperty("标注面积只对POLYGON有效")
    private Double area;

    @ApiModelProperty("面积单位3")
    private Integer area_unit;

    @ApiModelProperty("图片Id")
    private String image_id;

    @ApiModelProperty("项目Id")
    public String project_id;

    @ApiModelProperty("用户Id")
    private String user_id;

    private DBObject location;

    private String wkt_location;

    private String simplify_location;

    private Double geometryCompression;

    @ApiModelProperty("周长")
    private Double perimeter;

    @ApiModelProperty("周长单位")
    private Integer perimeter_unit;

    private Boolean reviewed;

    private String description;

    private List<InnerTag> annotationTags = new ArrayList<>();

    private Tag tag;
}
