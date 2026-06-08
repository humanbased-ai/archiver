package com.wsi.annotation.api.database.domain.basic;

import lombok.Data;

@Data
public class CodaLoginResp {
    private CodaDataResp data;

    private Boolean success;

    private Integer errorCode;

    private String errorMessage;
}
