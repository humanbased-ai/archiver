package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * 菜单权限表 sys_menu
 * 
 * @author early
 */

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel
@Document(value = "sys_menu")
public class SysMenu extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    /** 菜单ID */
    @AutoIncKey
    private Long menuId;

    /** 菜单名称 */
    private String menuName;

    /** 父菜单名称 */
    private String parentName;

    /** 父菜单ID */
    private Long parentId;

    /** 显示顺序 */
    private int orderNum;

    /** 路由地址 */
    private String path;

    /** 组件路径 */
    private String component;

    /** 是否为外链（0是 1否） */
    private Integer isFrame;

    /** 类型（M目录 C菜单 F按钮） */
    private String menuType;

    /** 显示状态（0显示 1隐藏） */
    private Integer visible;
    
    /** 菜单状态（0显示 1隐藏） */
    private Integer status;

    /** 权限字符串 */
    private String perms;

    /** 菜单图标 */
    private String icon;

    private String remark;

    /** 子菜单 */
    @Transient
    private List<SysMenu> children;
}
