package com.wsi.annotation.api.manager.domain.response.cytomine;

import lombok.Data;

@Data
public class ConnectTagResp {
    private String domainClassName;
    private String domainIdent;
    private String id;
    private String tag;
    private String tagName;
}
