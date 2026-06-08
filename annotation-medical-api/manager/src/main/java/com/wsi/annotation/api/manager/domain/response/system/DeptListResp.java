package com.wsi.annotation.api.manager.domain.response.system;

import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.wsi.annotation.api.manager.domain.response.base.BaseResp;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.beans.BeanUtils;

import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class DeptListResp extends BaseResp {

    private Long deptId;

    private String deptName;
    //节点类型，root,company,dept
    private String nodeType;
    /** 父部门ID */
    private Long parentId;
    /** 显示顺序 */
    private String orderNum;

    /** 部门状态:0正常,1停用 */
    private Integer status = 0;

    /** 父部门名称 */
    private String parentName;

    private ObjectId companyId;

    private String companyName;

    /**
     * 子部门
     */
    private List<DeptListResp> children;

    public DeptListResp(BasicDept dept) {
        BeanUtils.copyProperties(dept, this);
        this.setNodeType("dept");
        if (dept.getChildren() != null && dept.getChildren().size() > 0) {
            this.children = dept.getChildren().stream().map(DeptListResp::new).collect(Collectors.toList());
        }
    }
}
