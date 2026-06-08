package com.wsi.annotation.api.manager.domain.request.base;

import com.wsi.annotation.api.common.core.mvc.JqGridParam;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import io.swagger.annotations.ApiModelProperty;
import io.swagger.models.auth.In;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.annotations.Case;

/**
 * 
 * @author wxy
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaseInfoReq extends JqGridParam
{
    /** 根据状态排序  0升序 1降序 */
    private Integer statusSort = 0;

    /** 我是否参与 0全部 1参与 2未参与 */
    private Integer isJoin = 0;
    private String caseName;
    @ApiModelProperty("病例状态 0待标注 1标注中 2已标注 3已审核")
    private Integer caseStatus;
    @ApiModelProperty("所属数据集id")
    private String dataSetId;
}
