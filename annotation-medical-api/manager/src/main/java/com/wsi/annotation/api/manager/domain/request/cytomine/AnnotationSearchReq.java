package com.wsi.annotation.api.manager.domain.request.cytomine;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnnotationSearchReq {
    private String bbox;
    private String image;
    private Boolean kmeans;
    private Integer max;
    private Boolean notReviewedOnly;
    private Integer offset;
    private String user;
    private Boolean showDefault;
    private Boolean showGIS;
    private Boolean showTerm;
    private Boolean showWKT;
}
