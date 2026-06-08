package com.wsi.annotation.api.common.core.domain;

import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import nonapi.io.github.classgraph.json.Id;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Treeselect树结构实体类
 *
 * @author early
 */
@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class TreeSelect {

    /**
     * ID
     */
    private Long value;

    /**
     * 名称
     */
    private String title;

    /**
     * 节点名称
     */
    private String label;

    @Id
    private String id;

    private Boolean selectable;
    private Boolean checkable;

    /**
     * 子节点
     */

    private List<TreeSelect> children;


    public TreeSelect(BasicDept dept) {
        this.value = dept.getDeptId();
        this.title = dept.getDeptName();
        this.setSelectable(true);
        this.setCheckable(true);
        if (dept.getChildren() != null && dept.getChildren().size() > 0) {
            this.children = dept.getChildren().stream().map(TreeSelect::new).collect(Collectors.toList());
        }



    }

    public TreeSelect(SysMenu menu) {
        this.value = menu.getMenuId();
        this.title = menu.getMenuName();
        this.id = menu.getId();
        this.setSelectable(true);
        this.setCheckable(true);
        if (menu.getChildren() != null && menu.getChildren().size() > 0) {
            this.children = menu.getChildren().stream().map(TreeSelect::new).collect(Collectors.toList());
        }

//        this.key=menu.getMenuId();
//        this.menuName=menu.getMenuName();
//        this.parentName=menu.getParentName();
//        this.path=menu.getPath();
//        this.component=menu.getComponent();
    }

//    public Long getId()
//    {
//        return id;
//    }
//
//    public void setId(Long id)
//    {
//        this.id = id;
//    }
//
//    public String getLabel()
//    {
//        return label;
//    }
//
//    public void setLabel(String label)
//    {
//        this.label = label;
//    }
//
//    public List<TreeSelect> getChildren()
//    {
//        return children;
//    }
//
//    public void setChildren(List<TreeSelect> children)
//    {
//        this.children = children;
//    }
//
//    public Long getKey() {
//        return key;
//    }
//
//    public void setKey(Long key) {
//        this.key = key;
//    }
//
//    public String getMenuName() {
//        return menuName;
//    }
//
//    public void setMenuName(String menuName) {
//        this.menuName = menuName;
//    }
//
//    public String getParentName() {
//        return parentName;
//    }
//
//    public void setParentName(String parentName) {
//        this.parentName = parentName;
//    }
//
//    public String getPath() {
//        return path;
//    }
//
//    public void setPath(String path) {
//        this.path = path;
//    }
//
//    public String getComponent() {
//        return component;
//    }
//
//    public void setComponent(String component) {
//        this.component = component;
//    }
}
