package com.wsi.annotation.api.database.domain.tcga.inner;

import lombok.Data;

@Data
public class InnerAnnotation {
    private String polyphen_impact;
    private String sift_impact;
    private String vep_impact;

}
