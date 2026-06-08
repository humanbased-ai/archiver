package com.wsi.annotation.api.database.domain;

import com.wsi.annotation.api.database.domain.baseInner.InnerCompanyInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerDepartmentInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerOrgnizationInfo;
import com.wsi.annotation.api.database.domain.baseInner.InnerUserInfo;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;

import java.io.Serializable;
import java.util.Date;

/**
 * Entity基类
 * 
 * @author early
 */
@Data
public class BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    /** 删除标志（0代表存在 1代表删除） */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) // 可以接收，但是接口不返回
    @ApiModelProperty(hidden=true)
    private int delFlag;

    /** 公司信息 */
    @ApiModelProperty(hidden=true)
    private InnerCompanyInfo companyInfo;

    /** 机构信息 */
    @ApiModelProperty(hidden=true)
    private InnerOrgnizationInfo orgnizationInfo;

    /** 部门信息 */
    @ApiModelProperty(hidden=true)
    private InnerDepartmentInfo departmentInfo;

    /** 创建者 */
    @CreatedBy
    @ApiModelProperty(hidden=true)
    private InnerUserInfo createUser;

    /** 创建时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss",timezone = "GMT+8")
    @CreatedDate
    private Date createTime;

    /** 更新者 */
    @LastModifiedBy
    @ApiModelProperty(hidden=true)
    private InnerUserInfo updateUser;

    /** 更新时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss",timezone = "GMT+8")
    @LastModifiedDate
    @ApiModelProperty(hidden=true)
    private Date updateTime;

}
