package com.wsi.annotation.api.manager.domain.response.cytomine;

import lombok.Data;

@Data
public class ServerPingResp {
    private Boolean alive;
    private Boolean authenticated;
    private String version;
    private String serverURL;
    private String serverID;
    private String user;
}