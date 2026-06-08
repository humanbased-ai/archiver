package com.wsi.annotation.api.manager.domain.response.cytomine;

import lombok.Data;

@Data
public class AnnotationActionSelectResp {
    private String action;
    private String annotationClassName;
    private String annotationCreator;
    private String annotationIdent;
    private String id;
    private String  image;
    private String project;
    private String user;
    private long created;
}
