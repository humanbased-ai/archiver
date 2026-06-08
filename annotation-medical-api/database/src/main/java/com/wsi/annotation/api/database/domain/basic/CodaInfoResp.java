package com.wsi.annotation.api.database.domain.basic;

import lombok.Data;

@Data
public class CodaInfoResp{
    private String username;
    private String user_id;
    private String avatar_url;
    private String code;
    private String status;
    private Integer suspicious;
    private String registerSource;
    private Boolean new_user;
}
