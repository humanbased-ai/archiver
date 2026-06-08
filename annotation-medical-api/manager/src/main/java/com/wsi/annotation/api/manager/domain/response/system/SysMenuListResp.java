package com.wsi.annotation.api.manager.domain.response.system;


import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.wsi.annotation.api.manager.domain.response.base.BaseResp;
import lombok.Data;
import org.springframework.beans.BeanUtils;

import java.util.List;
import java.util.stream.Collectors;

@Data
public class SysMenuListResp extends BaseResp {

    /**
     * 菜单ID
     */
    private Long menuId;

    /**
     * 菜单名称
     */
    private String menuName;

    /**
     * 父菜单名称
     */
    private String parentName;

    /**
     * 父菜单ID
     */
    private Long parentId;

    /**
     * 显示顺序
     */
    private int orderNum;

    /**
     * 路由地址
     */
    private String path;

    /**
     * 组件路径
     */
    private String component;

    /**
     * 是否为外链（0是 1否）
     */
    private String isFrame;

    /**
     * 类型（M目录 C菜单 F按钮）
     */
    private String menuType;

    /**
     * 显示状态（0显示 1隐藏）
     */
    private Integer visible;

    /**
     * 菜单状态（0显示 1隐藏）
     */
    private Integer status;

    /**
     * 权限字符串
     */
    private String perms;

    /**
     * 菜单图标
     */
    private String icon;

    private String remark;

    /**
     * 子菜单
     */
    private List<SysMenuListResp> children;

    public SysMenuListResp(SysMenu menu) {
        BeanUtils.copyProperties(menu, this);
        if (menu.getChildren() != null && menu.getChildren().size() > 0) {
            this.children = menu.getChildren().stream().map(SysMenuListResp::new).collect(Collectors.toList());
        }
    }
}
