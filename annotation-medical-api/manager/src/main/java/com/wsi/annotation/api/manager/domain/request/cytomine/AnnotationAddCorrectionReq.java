package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

@Data
public class AnnotationAddCorrectionReq {
    private String annotation;
    private String location;
    private boolean remove;
}
