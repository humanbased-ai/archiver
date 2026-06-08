package com.wsi.annotation.api.manager.domain.response.cytomine;

import com.wsi.annotation.api.database.domain.cytomine.Tag;
import lombok.Data;

@Data
public class AnnotationDescriptionResp {
    private String domainIdent;
    private String data;
    private String id;
    private Tag tag;
}
