package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

@Data
public class ConnectTagSaveReq {
    private String domainIdent;
    private String tag;
}
