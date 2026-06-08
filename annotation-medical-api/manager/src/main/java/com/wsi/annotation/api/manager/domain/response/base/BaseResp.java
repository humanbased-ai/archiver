package com.wsi.annotation.api.manager.domain.response.base;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wsi.annotation.api.database.domain.baseInner.InnerCompanyInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerDepartmentInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerOrgnizationInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerUserInfo;
import lombok.Data;
import org.springframework.data.annotation.*;

import java.util.Date;

@Data
public class BaseResp {
    private static final long serialVersionUID = 1L;

    @Id
    private String id;
    /** 公司信息 */
    private InnerCompanyInfo companyInfo;

    /** 机构信息 */
    private InnerOrgnizationInfo orgnizationInfo;

    /** 部门信息 */
    private InnerDepartmentInfo departmentInfo;

    /** 创建者 */
    private InnerUserInfo createUser;

    /** 创建时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss",timezone = "GMT+8")
    private Date createTime;

    /** 更新者 */
    private InnerUserInfo updateUser;

    /** 更新时间 */
    private Date updateTime;
}
