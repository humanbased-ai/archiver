package com.wsi.annotation.api.manager.domain.response.system;

import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.manager.domain.response.base.BaseResp;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.BeanUtils;

import java.util.List;

@Data
@NoArgsConstructor
public class RoleListResp extends BaseResp {

    /** 角色ID */
    private Long roleId;

    /** 角色名称 */
    private String roleName;

    /** 角色权限 */
    private String roleKey;

    /** 角色排序 */
    private Integer roleSort;

    /** 根据DataScopeConstants中的定义来使用
     * 数据范围（1：所有数据权限；100：根据公司获取数据；1000：根据机构获取数据；1100：本部门及以下数据权限；1200：本部门数据权限；1300：本人数据） */
    private Integer dataRoleScope;

    /** 角色状态（0正常 1隐藏） */
    private Integer status;

    /** 用户是否存在此角色标识 默认不存在 */
    private boolean flag = false;

    private List<Long> menuIds;

    /** 公司组（数据权限） (ObjectId)*/
    private List<String> companyOids;

    /** 部门组（数据权限） (ObjectId)*/
    private List<Long> deptOids;

    private String remark;

    public RoleListResp(SysRole dept) {
        BeanUtils.copyProperties(dept, this);
    }
}
