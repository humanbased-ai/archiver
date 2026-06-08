package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * 角色表 sys_role
 * 
 * @author early
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel
@Document(value = "sys_role")
public class SysRole extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    /** 角色ID */
    @AutoIncKey
    private Long roleId;

    /** 角色名称 */
    private String roleName;

    /** 角色权限 */
    private String roleKey;

    /** 角色排序 */
    private Integer roleSort;

    /** 根据DataScopeConstants中的定义来使用
     * 数据范围（1：所有数据权限；100：根据公司获取数据；1000：根据机构获取数据；1100：本部门及以下数据权限；1200：本部门数据权限；1300：本人数据） */
    private Integer dataRoleScope = 1;

    /** 角色状态（0正常 1隐藏） */
    private Integer status;

    /** 菜单组 */
    private List<Long> menuIds;

    /** 公司组（数据权限） (ObjectId)*/
    private List<String> companyOids;

    /** 部门组（数据权限） (ObjectId)*/
    private List<Long> deptOids;

    private String remark;

    /** 1：云藤公司用；100：机构用 */
    private Integer roleScope;
}
