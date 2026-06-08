package com.wsi.annotation.api.manager.domain.request.cytomine;

import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
public class TagSaveReq {
    @ApiModelProperty("名称")
    private String name;
    @ApiModelProperty("部位")
    private String position;
    @ApiModelProperty("颜色")
    private String color;
    private String id;
}
