package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

@Data
public class AnnotationActionReq {
    private String action;
    private String annotationIdent;
}
