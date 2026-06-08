package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

/**
 * 公司表 sys_company
 * 
 * @author early
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel
@Document(value = "sys_company")
public class SysCompany extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    @Id
    private String id;

    /** 公司ID */
    @AutoIncKey
    private Long incId;

    /** 公司名称 */
    private String companyName;

    private String[] region;

    /** 详细地址 */
    private String address;

    /** 公司法人 */
    private String leader;

    /** 电话 */
    private String phone;

    /** 部门状态:0正常,1停用 */
    private Integer status;

    private String fax;

    private String businessLicense;

    private String payee;

    private String bankName;

    private String bankAccountName;

    private String bankAccount;

    private String cnaps;

    private BigDecimal discountRate;

    @Override
    public String toString() {
        return new ToStringBuilder(this,ToStringStyle.MULTI_LINE_STYLE)
            //.append("companyId", getCompanyId())
            .append("address", getAddress())
            .append("companyName", getCompanyName())
            .append("leader", getLeader())
            .append("phone", getPhone())
            .append("status", getStatus())
            .append("delFlag", getDelFlag())
            //.append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            //.append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .toString();
    }
}
