package com.wsi.annotation.api.ims.domain.response.system;

import lombok.Data;

import java.util.Date;

@Data
public class CompanyListResp {

    private Long incId;
    private String companyName;
    private String address;
    private String leader;
    private String phone;
    private String fax;
    private Date createTime;
    private String updateUser;
    private Integer status;
    private String id;
}
