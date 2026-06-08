package com.wsi.annotation.api.manager.domain.request.system;

import com.wsi.annotation.api.common.core.mvc.JqGridParam;
import lombok.Data;

@Data
public class CompanyListReq extends JqGridParam {

    private String OPCO;
    private Integer status;
}
