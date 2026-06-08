package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

@Data
public class AnnotationUpdateReq {
    private String id;
    private String location;
}
