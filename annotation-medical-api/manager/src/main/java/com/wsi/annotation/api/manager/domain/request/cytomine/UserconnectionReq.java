package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

@Data
public class UserconnectionReq {
    private String browser;
    private String browserVersion;
    private String os;
    private String project;
}
