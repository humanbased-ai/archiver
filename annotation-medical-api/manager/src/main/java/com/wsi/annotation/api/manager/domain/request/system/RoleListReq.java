package com.wsi.annotation.api.manager.domain.request.system;

import com.wsi.annotation.api.common.core.mvc.BaseListSearch;
import lombok.Data;

@Data
public class RoleListReq extends BaseListSearch {
    /** 部门名称 */
    private String roleName;
    private Integer dataRoleScope;
    private Integer status;
//
//    @ApiModelProperty(hidden = true)
//    @JsonIgnore
//    private DBObject dataScope;

}
