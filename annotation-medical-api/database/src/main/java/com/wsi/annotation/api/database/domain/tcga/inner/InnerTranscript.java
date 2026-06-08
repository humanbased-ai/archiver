package com.wsi.annotation.api.database.domain.tcga.inner;

import lombok.Data;

@Data
public class InnerTranscript {

    private InnerAnnotation annotation;
    private String consequence_type;
    private InnerGene gene;
    private Boolean is_canonical;
    private String aa_change;
}
