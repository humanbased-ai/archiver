package com.wsi.annotation.api.ims.domain.request.system;

import com.wsi.annotation.api.common.core.mvc.BaseListSearch;
import lombok.Data;

import java.util.List;

@Data
public class DeptListReq extends BaseListSearch {
    /** 部门名称 */
    private String deptName;
    private String companyId;
    private Integer status;
    private List<String> companyIds;
//
//    @ApiModelProperty(hidden = true)
//    @JsonIgnore
//    private DBObject dataScope;

}
