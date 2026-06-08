package com.wsi.annotation.api.manager.domain.response.base;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import lombok.Data;
import org.springframework.data.annotation.Id;

import java.util.List;

@Data
public class DataSetListResp {
    private String id;

    /** 数据集ID */
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

    private String managerId;
}
