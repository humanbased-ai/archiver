package com.wsi.annotation.api.ims.domain.request.system;

import lombok.Data;
import org.springframework.data.annotation.Id;

@Data
public class Dept {
    @Id
    private String id;
    private String companyId;
    private String companyName;
    /** 部门名称 */
    private String deptName;
}
