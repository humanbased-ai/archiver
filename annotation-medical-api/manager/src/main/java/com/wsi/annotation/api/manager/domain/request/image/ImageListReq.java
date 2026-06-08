package com.wsi.annotation.api.manager.domain.request.image;

import com.wsi.annotation.api.common.core.mvc.BaseListSearch;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.List;

@Data
@ApiModel
public class ImageListReq extends BaseListSearch {
    private String instanceFilename;
    private List<String> tagIds;
    private String description;
    private String source;
    private String pathologyNumber;
    private Integer isMasked;
    @ApiModelProperty("器官")
    private String place;
    private Integer quality;
    private Integer id_num;
    private String cancer;
}
