package com.wsi.annotation.api.ims.domain.request.system;

import lombok.Data;
import org.springframework.data.annotation.Id;

import java.math.BigDecimal;

@Data
public class Company {

    @Id
    private String id;

    /** 公司名称 */
    private String companyName;

    private String[] region;

    /** 详细地址 */
    private String address;

    /** 公司法人 */
    private String leader;

    /** 电话 */
    private String phone;

    private String fax;

    private String businessLicense;

    private String payee;

    private String bankName;

    private String bankAccountName;

    private String bankAccount;

    private String cnaps;

    private BigDecimal discountRate;

}
