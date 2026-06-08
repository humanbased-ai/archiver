package com.wsi.annotation.api.ims.domain.request.cytomine;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnnotationAddReq {
    private String image;
    private String location;
    private String user;
}
