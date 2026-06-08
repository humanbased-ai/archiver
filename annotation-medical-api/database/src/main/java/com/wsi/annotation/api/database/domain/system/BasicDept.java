package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * 部门表 sys_dept
 * 
 * @author early
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "sys_dept")
public class BasicDept extends BaseEntity implements Cloneable {
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    /** 部门ID */
    @AutoIncKey
    private Long deptId;

    /** 父部门ID */
    private Long parentId;

    /** 祖级列表
     * 一期功能暂时先不做，不需要这么复杂的结构即可满足业务需求 */
    private String ancestors;

    /** 部门名称 */
    private String deptName;

    /** 显示顺序 */
    private String orderNum;

    /** 部门状态:0正常,1停用 */
    private Integer status = 0;

    /** 父部门名称 */
    private String parentName;

    private ObjectId companyId;

    private String companyName;

    /** 子菜单 */
    @Transient
    private List<BasicDept> children;

}
