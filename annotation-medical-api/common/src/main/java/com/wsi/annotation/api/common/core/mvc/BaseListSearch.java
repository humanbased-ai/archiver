package com.wsi.annotation.api.common.core.mvc;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.mongodb.DBObject;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import io.swagger.annotations.ApiParam;
import lombok.Data;
import org.springframework.web.bind.annotation.ModelAttribute;
import springfox.documentation.annotations.ApiIgnore;

import java.io.Serializable;


/**
 * @author : willow
 * @date : 16:22 2021/1/7
 */
@ApiModel(description = "列表搜索基础类")
@Data
public class BaseListSearch implements Serializable {
    @ApiModelProperty(value = "当前页码")
    private Integer current = 1;
    @ApiModelProperty(value = "单页数量")
    private Integer pageSize = 20;
    @ApiModelProperty(hidden = true)
    @ApiParam(hidden=true)
    @JsonIgnore
    private DBObject dataScope;
    private String sidx; // 排序 字段
    private String sord; // asc 或 desc
}
