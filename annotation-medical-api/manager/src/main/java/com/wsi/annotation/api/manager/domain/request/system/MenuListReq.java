package com.wsi.annotation.api.manager.domain.request.system;

import com.wsi.annotation.api.common.core.mvc.JqGridParam;
import lombok.Data;

import java.util.List;

@Data
public class MenuListReq extends JqGridParam {

    /** 菜单名称 */
    private String menuName;

    /** 菜单状态（0显示 1隐藏） */
    private Integer status;


    /** 类型（M目录 C菜单 F按钮） */
    private List<String> menuType;
}
