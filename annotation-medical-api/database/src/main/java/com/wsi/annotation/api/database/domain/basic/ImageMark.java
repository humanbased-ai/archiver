package com.wsi.annotation.api.database.domain.basic;

import com.wsi.annotation.api.database.annotation.AutoIncKeyString;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * 标注表 image_mark
 * 
 * @author wxy
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(value = "image_mark")
public class ImageMark extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    @ApiModelProperty("标注编号")
    @AutoIncKeyString(access = AutoIncKeyString.Access.MNO)
    private String markNo;

    @ApiModelProperty("标注用户id")
    private String userId;

    @ApiModelProperty("标注标签id")
    @Transient
    private String tagId;

    @ApiModelProperty("标注标签")
    private Tag markTag;

    @ApiModelProperty("标注报告内容")
    private String markContent;

    @ApiModelProperty("标注图片id")
    private String imageId;

    @ApiModelProperty("案例id")
    private String caseId;

    @ApiModelProperty("标注打分")
    private Double markScore = 0.0;

    @ApiModelProperty("是否选中 0未选中 1选中")
    private Integer selected = 0;

}
