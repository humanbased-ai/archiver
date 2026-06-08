package com.wsi.annotation.api.manager.domain.request.cytomine;

import com.wsi.annotation.api.database.domain.cytomine.Tag;
import lombok.Data;

@Data
public class AnnotationDescriptionSaveReq {
    private String domainIdent;
    private String data;
    private String tagId;
}
