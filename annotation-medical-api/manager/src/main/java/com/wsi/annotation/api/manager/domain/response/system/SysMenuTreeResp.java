package com.wsi.annotation.api.manager.domain.response.system;


import com.wsi.annotation.api.database.domain.system.SysMenu;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

@Data
public class SysMenuTreeResp {

    /**
     * 菜单ID
     */
    private Long value;

    /**
     * 菜单名称
     */
    private String title;

    /**
     * 子菜单
     */
    private List<SysMenuTreeResp> children;

    public SysMenuTreeResp(SysMenu menu) {
        this.value=menu.getMenuId();
        this.title=menu.getMenuName();
        if (menu.getChildren() != null && menu.getChildren().size() > 0) {
            this.children = menu.getChildren().stream().map(SysMenuTreeResp::new).collect(Collectors.toList());
        }
    }
}
