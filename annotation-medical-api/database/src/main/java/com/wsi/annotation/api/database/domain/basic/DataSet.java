package com.wsi.annotation.api.database.domain.basic;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModel;
import io.swagger.models.auth.In;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * 数据集表 data_set
 * 
 * @author wxy
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel
@Document(value = "data_set")
public class DataSet extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    /** 数据集ID */
    @AutoIncKey
    private Long incId;

    /** 数据集名 */
    private String setName;

    private String remark;

    private String organId;

    private String organName;

    /** 标注要求 */
    private String markRequire;

    /** 标注教程 */
    private String markCourse;
    /** 标注等级 */
    private Integer markLevel;
    /** 标注人数 */
    private Integer markNum;
    /** 审核等级 */
    private Integer auditLevel;

    /** 切片数量 */
    private Integer  sliceNum = 0;

    private Integer annotatedNum = 0;

    private Integer validatedNum = 0;

    private Integer status = 1;

    /** 管理人 */
    private String managerId;

}
