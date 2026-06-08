package com.wsi.annotation.api.database.domain.system;

import com.wsi.annotation.api.database.annotation.AutoIncKeyString;
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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel
@Document(value = "sys_operator")
public class SysOperator extends BaseEntity {
    @Id
    private String id;

    private String[] region;

    private String companyId;

    private String companyName;

    /** 运营商编号 */
    @AutoIncKeyString(access = AutoIncKeyString.Access.OPE)
    private String operatorNumber;

    /** 运营商名称 */
    private String operatorName;

    /**发票类型   0：专票   1：普票*/
    private Integer invoiceType;

    private String bankName;

    private String bankAccountName;

    private String bankAccount;

    private String cnaps;

    /**税号*/
    private String taxNumber;

    /**联系人*/
    private String contacts;

    /**联系人地址*/
    private String contactAddress;

    private String contactPhone;

    private String fax;

    /**收件人*/
    private String addressee;

    /**收件人电话*/
    private String addresseePhone;

    /** 状态:0正常,1停用 */
    private Integer status;

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
                .append("region", getRegion())
                .append("companyName",getCompanyName())
                .append("companyId",getCompanyId())
                .append("operatorNumber", getOperatorName())
                .append("operatorName", getOperatorName())
                .append("invoiceType",getInvoiceType())
                .append("bankName", getBankName())
                .append("bankAccountName", getBankAccountName())
                .append("bankAccount",getBankAccount())
                .append("cnaps",getCnaps())
                .append("taxNumber",getTaxNumber())
                .append("contacts",getContacts())
                .append("contactAddress",getContactAddress())
                .append("contactPhone",getContactPhone())
                .append("fax", getFax())
                .append("addressee", getAddressee())
                .append("addresseePhone", getAddresseePhone())
                .append("status", getStatus())
                .append("delFlag", getDelFlag())
                .append("createTime", getCreateTime())
                .append("updateTime", getUpdateTime())
                .toString();
    }
}
