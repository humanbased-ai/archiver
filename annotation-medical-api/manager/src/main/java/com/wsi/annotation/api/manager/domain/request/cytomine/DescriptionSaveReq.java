package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

@Data
public class DescriptionSaveReq {
    private String domainIdent;
    private String data;
}
