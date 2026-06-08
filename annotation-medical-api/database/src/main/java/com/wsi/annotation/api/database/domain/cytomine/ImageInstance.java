package com.wsi.annotation.api.database.domain.cytomine;

import com.wsi.annotation.api.database.annotation.AutoConvertObjectId;
import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.cytomine.Inner.InnerTag;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "image_instance")
public class ImageInstance extends BaseEntity {

    @Id
    public String id;
    @AutoIncKey
    private Long id_num;
    /**
     * ObjectId
     */
    @AutoConvertObjectId
    private String baseImageId;
    private Integer baseImage;
    /**
     * ObjectId
     */
    @AutoConvertObjectId
    private String userId;
    private Integer user;
    /**
     * ObjectId
     */
    @AutoConvertObjectId
    private String projectId;
    private Integer project;
    private String instanceFilename;
    private double resolution;
    private Integer numberOfAnnotations;
    private Integer numberOfJobAnnotations;
    private Integer numberOfReviewedAnnotations;

    //==================图片文件基础信息=============
    private String filename;
    private Integer width;
    private Integer height;
    private String base_path;
    private String path;
    private String originalFilename;
    private Double magnification;

    //===========文件后缀=========
    private Integer mime_num;
    @AutoConvertObjectId
    private String mime;
    private String extension;
    private String mimeType;

    @AutoConvertObjectId
    private List<String> imageServerIds;

    private String description;

    private String place;

    private List<InnerTag> tags;
    private String hospital;
    private String pickingDetails;
    /**
     * 手术方式
     */
    private String operationMode;

    /**
     * TCGA,COREONE
     */
    private String source;
    /**
     * HE,IHC
     */
    private String wsiType;
    /**
     * 病理号
     */
    private String pathologyNumber;
    /**
     * 倍数
     */
    private Integer multiple;

    /**
     * 癌症名称
     */
    private String cancerName;


    /**
     * 癌症名称
     */
    private Boolean isShow;

    /**
     * 是否标注
     */
    private Integer isMasked = 0;

    @Field("slide_name")
    private String slideName;

    @Field("total_patch")
    private Integer totalPatch;

    private String markers;

    private Integer quality = 0;

    private List<String> case_id;

    private String tcga_id;

    @ApiModelProperty("数据类型 1：用于AI训练的数据 2：信息系统的数据")
    private Integer dataType=1;

//    @ApiModelProperty("图片文件名称")
//    public String instance_filename;
//    @ApiModelProperty("项目Id")
//    public String project_id;
//    @ApiModelProperty("用户Id")
//    private Integer user_id;
//    @ApiModelProperty("带随机数目录文件名称")
//    private String path;
//    @ApiModelProperty("图片高度")
//    private Integer height;
//    @ApiModelProperty("图片宽度")
//    private Integer width;
//    @ApiModelProperty("图片基础目录")
//    private String base_path;

}
