package com.wsi.annotation.api.manager.domain.request.ai;

import com.wsi.annotation.api.common.core.domain.BaseEntity;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;

@Data
public class AITask extends BaseEntity {

    @Id
    private String id;

    private String sliceId;

    @ApiModelProperty("处理状态 1 处理中 2 处理完成 3 处理失败")
    private Integer status;

    private String model;

    private Object param;

    private Object result;
}
