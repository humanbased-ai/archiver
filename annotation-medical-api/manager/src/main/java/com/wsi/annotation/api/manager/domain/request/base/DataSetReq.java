package com.wsi.annotation.api.manager.domain.request.base;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 数据集表 data_set
 * 
 * @author wxy
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSetReq extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private String id;

    /** 数据集ID */
    private Long incId;

    /** 数据集名 */
    private String setName;

    private String remark;

    private String organId;

    /** 标注要求 */
    private String markRequire;

    /** 标注教程 */
    private String markCourse;

    private Integer status = 1;

}
