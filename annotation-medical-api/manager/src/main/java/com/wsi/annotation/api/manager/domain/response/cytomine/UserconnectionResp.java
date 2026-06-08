package com.wsi.annotation.api.manager.domain.response.cytomine;

import lombok.Data;

@Data
public class UserconnectionResp {
    private String browser;
    private String browserVersion;
    private String os;
    private String project;
    private String id;
}
